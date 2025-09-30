import "./App.css";
import KakaoMap from "./components/KakaoMap";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <KakaoMap useCurrentLocation fallbackCenter={undefined} onGeolocationError={(e) => console.warn("geo error", e?.code, e?.message || e)} />
    </div>
  );
}

export default App;
