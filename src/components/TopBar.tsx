import { useState } from "react";

type FacilityType = "diaper" | "nursing";

export default function TopBar() {
  const [selectedType, setSelectedType] = useState<FacilityType>("diaper");

  return (
    <div className="absolute top-4 left-0 right-0 z-10 px-4">
      <div className="flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-1 flex gap-1">
          <button
            onClick={() => setSelectedType("diaper")}
            className={`px-6 py-2 rounded-xl font-medium text-sm transition-all ${
              selectedType === "diaper"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            기저귀교환대
          </button>
          <button
            onClick={() => setSelectedType("nursing")}
            className={`px-6 py-2 rounded-xl font-medium text-sm transition-all ${
              selectedType === "nursing"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            수유실
          </button>
        </div>
      </div>
    </div>
  );
}
