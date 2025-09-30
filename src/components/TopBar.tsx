export type FacilityType = "diaper" | "nursing";

interface TopBarProps {
  selectedType: FacilityType;
  onTypeChange: (type: FacilityType) => void;
}

export default function TopBar({ selectedType, onTypeChange }: TopBarProps) {
  return (
    <div className="absolute top-4 left-0 right-0 z-10 px-4">
      <div className="flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-1 flex gap-1">
          <button
            onClick={() => onTypeChange("nursing")}
            className={`px-6 py-2 rounded-xl font-medium text-sm transition-all ${
              selectedType === "nursing"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            수유실
          </button>
          <button
            onClick={() => onTypeChange("diaper")}
            className={`px-6 py-2 rounded-xl font-medium text-sm transition-all ${
              selectedType === "diaper"
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            기저귀교환대
          </button>
        </div>
      </div>
    </div>
  );
}
