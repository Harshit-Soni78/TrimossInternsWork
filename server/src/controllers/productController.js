import Product from '../models/Product.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';

// Get all products with filtering, sorting, and pagination
export const getProducts = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const {
      category, subcategory, style, minPrice, maxPrice, inStock,
      featured, search, tags, page = 1, limit = 20,
      sortBy = 'createdAt', order = 'desc'
    } = req.query;

    const query = { isActive: true };
    if (category) query['categories'] = category;
    if (subcategory) query['categories'] = subcategory;
    if (featured !== undefined) query.isFeatured = featured === 'true';
    if (inStock === 'true') query['inventory.status'] = { $in: ['in-stock', 'low-stock'] };
    if (tags) query.tags = { $in: tags.split(',') };

    if (minPrice || maxPrice) {
      query['pricing.basePrice'] = {};
      if (minPrice) query['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'description.short': { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    if (sortBy === 'price') sortOptions['pricing.basePrice'] = order === 'desc' ? -1 : 1;
    else if (sortBy === 'popularity') sortOptions['salesData.totalSold'] = order === 'desc' ? -1 : 1;
    else sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('relatedProducts', 'name images.primary.url pricing.basePrice sku')
        .lean(),
      Product.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    res.status(200).json({
      success: true,
      data: { products, pagination: { currentPage: parseInt(page), totalPages, totalProducts, hasNext: parseInt(page) < totalPages, hasPrev: parseInt(page) > 1 } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
};

// Get single product by ID or slug
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let product;
    if (mongoose.isValidObjectId(id)) {
      product = await Product.findById(id)
        .populate('relatedProducts', 'name images.primary.url pricing.basePrice sku')
        .lean();
    } else {
      product = await Product.findOne({ 'seo.slug': id, isActive: true })
        .populate('relatedProducts', 'name images.primary.url pricing.basePrice sku')
        .lean();
    }

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching product', error: error.message });
  }
};

// Create new product


const buildImages = async (files) => {
  const primary = files.primary?.[0]
    ? await uploadToCloudinary(files.primary[0])
    : undefined;

  const gallery = files.gallery
    ? await Promise.all(files.gallery.map(uploadToCloudinary))
    : [];

  const technical = files.technical
    ? await Promise.all(files.technical.map(uploadToCloudinary))
    : [];

  const roomScenes = files.roomScenes
    ? await Promise.all(files.roomScenes.map(uploadToCloudinary))
    : [];

  return { primary, gallery, technical, roomScenes };
};

export const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

    const files = req.files;
    
    console.log( req.files);

    const images = await buildImages(files);

    console.log(  images);
    console.log( "isFiles available ", files!= undefined)
    const product = new Product({
      ...req.body,
      images,
      dynamicAttributes: req.body.dynamicAttributes || []
    });

    await product.save();
    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field} already exists` });
    }
    res.status(500).json({ success: false, message: 'Error creating product', error: error.message });
  }
};

// Update product (handles image replacement and attribute updates)
export const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Handle dynamic attributes merge
    if (req.body.dynamicAttributes) {
      req.body.dynamicAttributes.forEach(attr => {
        const index = product.dynamicAttributes.findIndex(a => a.key === attr.key);
        if (index >= 0) product.dynamicAttributes[index].value = attr.value;
        else product.dynamicAttributes.push(attr);
      });
    }

    // Handle image replacement: delete old only if new provided
    const files = req.files;
    const replaceField = async (field) => {
      if (files[field]) {
        const old = product.images[field];
        if (Array.isArray(old)) await Promise.all(old.map(o => o.public_id && cloudinary.v2.uploader.destroy(o.public_id)));
        else if (old?.public_id) await cloudinary.v2.uploader.destroy(old.public_id);
        product.images[field] = files[field].length === 1
          ? { url: files[field][0].path, public_id: files[field][0].filename }
          : files[field].map(f => ({ url: f.path, public_id: f.filename }));
      }
    };


    for (const f of ['primary', 'gallery', 'technical', 'roomScenes']) await replaceField(f);

    // Merge other fields
    Object.keys(req.body).forEach(key => {
      if (!['dynamicAttributes'].includes(key)) product[key] = req.body[key];
    });

    await product.save();
    res.status(200).json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field} already exists` });
    }
    res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
  }
};

// Soft delete product (hide from frontend without deleting images)
export const deleteProduct = async (req, res) => {
  try {

    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.isActive = false;
    await product.save();

    res.status(200).json({ success: true, message: 'Product hidden successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error hiding product', error: error.message });
  }
};

// Permanent delete (remove from DB and Cloudinary)
export const permanentDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const ids = [];
    ['primary','gallery','technical','roomScenes'].forEach(field => {
      const data = product.images[field];
      if (Array.isArray(data)) data.forEach(d => d.public_id && ids.push(d.public_id));
      else if (data?.public_id) ids.push(data.public_id);
    });
    if (ids.length) await cloudinary.v2.api.delete_resources(ids);

    await product.deleteOne();
    res.status(200).json({ success: true, message: 'Product permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error permanently deleting product', error: error.message });
  }
};

// Update inventory
export const updateInventory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

    const { id } = req.params;
    const { quantity, operation } = req.body;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    switch (operation) {
      case 'set': product.inventory.quantity = quantity; break;
      case 'add': product.inventory.quantity += quantity; break;
      case 'subtract':
        if (product.inventory.quantity < quantity)
          return res.status(400).json({ success: false, message: 'Insufficient inventory' });
        product.inventory.quantity -= quantity;
        break;
    }

    await product.save();
    res.status(200).json({ success: true, message: 'Inventory updated', data: { productId: product._id, newQuantity: product.inventory.quantity, status: product.inventory.status } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating inventory', error: error.message });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .limit(8)
      .select('name images.primary.url pricing.basePrice sku categories')
      .lean();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching featured products', error: error.message });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category, subcategory } = req.params;
    const products = await Product.find({ categories: subcategory, isActive: true })
      .select('name images.primary.url pricing.basePrice sku')
      .lean();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching products by category', error: error.message });
  }
};
