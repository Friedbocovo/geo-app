import { useState } from "react";
import LocationInput from "./components/LocationInput";

function App() {
  const [coords, setCoords] = useState(null);

  const handleLocationSelected = (location) => {
    console.log("Localisation choisie ✅ :", location);
    setCoords(location);
    // Ici tu pourras appeler ton backend avec fetch()
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
      {!coords ? (
        <LocationInput onLocationSelected={handleLocationSelected} />
      ) : (
        <div className="text-center bg-white p-6 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800">📊 Localisation sélectionnée</h1>
          <p className="mt-2 text-gray-600">
            Latitude: {coords.lat} <br />
            Longitude: {coords.lon} <br />
            Rayon: {coords.radius} m
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
