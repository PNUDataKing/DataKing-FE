import "./App.css";
import KakaoMap from "./components/KakaoMap";
import TopBar from "./components/TopBar";

function App() {
  return (
    <div className="relative w-screen h-screen">
      <KakaoMap useCurrentLocation fallbackCenter={undefined} onGeolocationError={(e) => console.warn("geo error", e?.code, e?.message || e)} />
      <TopBar />
    </div>
  );
}

export default App;
