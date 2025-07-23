import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import image8 from "../assets/images/image-8.jpg";

export default function HandMirrorPage() {
  const [selectedType, setSelectedType] = useState("Type 1");
  const [price, setPrice] = useState(1000);
  const [currency, setCurrency] = useState("USD");
  const navigate = useNavigate();

  const types = ["Type 1", "Type 2", "Type 3", "TYPE 4"];

  return (
    <div className="min-h-screen bg-white text-black font-sans relative px-4 sm:px-6 md:px-10 py-6 md:py-8">
      <h1 className="text-center text-lg sm:text-xl font-semibold tracking-wide mb-6 sm:mb-10">
        TRIMOSS HANDMIRROR
      </h1>

      <div className="absolute top-6 left-6 hidden md:block">
        <svg
          className="w-5 h-5 text-black"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
          />
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr_1fr] gap-6 md:gap-8 max-w-7xl mx-auto mt-4 md:mt-12">
        {/* Side Type Selector */}
        <div className="mt-2 md:mt-12 flex md:block justify-center gap-4 sm:gap-6">
          <ul className="flex md:flex-col space-x-4 md:space-x-0 md:space-y-4 text-sm">
            {types.map((type) => (
              <li
                key={type}
                onClick={() => setSelectedType(type)}
                className={`cursor-pointer ${
                  selectedType === type
                    ? "font-bold text-black"
                    : "text-gray-500"
                }`}
              >
                {type}
              </li>
            ))}
          </ul>
        </div>

        {/* Product Details */}
        <div className="max-w-prose">
          <h2 className="font-semibold mb-4 text-base sm:text-lg">Details</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
            ever since the 1500s.
          </p>
        </div>

        {/* Product Image */}
        <div className="flex justify-center items-center">
          <img
            src={image8}
            alt="Hand Mirror"
            className="w-60 sm:w-64 md:w-80 h-auto object-cover rounded shadow"
          />
        </div>

        {/* Purchase Section */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2">
            HandMirror
          </h2>
          <p className="text-sm text-gray-700 mb-4">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry.
          </p>
          <p className="text-md mb-4 font-medium">
            {price} {currency}
          </p>

          <div className="relative w-full max-w-[130px] mb-4">
            <select className="appearance-none w-full border border-gray-300 px-4 py-2 pr-8 rounded text-sm">
              <option>Large</option>
              <option>Medium</option>
              <option>Small</option>
            </select>
            <ChevronDown className="absolute top-1/2 right-2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>

          <button className="w-full bg-black text-white py-2 my-2 rounded hover:bg-gray-900">
            Add to Cart
          </button>

          <button
            onClick={() =>
              navigate("/address", {
                state: { price, currency },
              })
            }
            className="w-full bg-[#B8956A] text-[#350000] py-2 my-2 rounded hover:bg-[#bb8c57]"
          >
            BUY NOW
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="hidden md:flex justify-between absolute bottom-6 left-6 right-6">
        <div className="w-8 h-8 border rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </div>
        <div className="w-8 h-8 border rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-100">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
