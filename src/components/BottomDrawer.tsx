import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function BottomDrawer() {
  return (
    <Drawer open={true} modal={false}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>명륜동 행정복지센터 수유실</DrawerTitle>
          <p className="text-sm text-gray-500">부산광역시 동구 00로 000-0</p>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto max-h-80">
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-1">명륜동 행정복지센터 수유실</h3>
              <p className="text-sm text-gray-500">
                부산광역시 동구 00로 000-0
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-1">명륜동 행정복지센터 수유실</h3>
              <p className="text-sm text-gray-500">
                부산광역시 동구 00로 000-0
              </p>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
