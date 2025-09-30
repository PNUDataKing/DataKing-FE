import "./App.css";
import KakaoMap from "./components/KakaoMap";
import TopBar from "./components/TopBar";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <KakaoMap
        useCurrentLocation
        center={{ lat: 35.2313, lng: 129.0845 }}
        fallbackCenter={{ lat: 35.2313, lng: 129.0845 }}
        onGeolocationError={(e: GeolocationPositionError | Error) => {
          const err = "code" in e ? (e as GeolocationPositionError) : undefined;
          const code = err ? err.code : undefined;
          const message = "message" in e ? (e as Error).message : String(e);
          console.warn("geo error", code, message);
        }}
      />
    <div className="relative w-screen h-screen">
      <KakaoMap useCurrentLocation fallbackCenter={undefined} onGeolocationError={(e) => console.warn("geo error", e?.code, e?.message || e)} />
      <TopBar />
    </div>
  );
}

export default App;
