import { useState } from "react";
import LocationInput from "./components/LocationInput";

function App() {
  const [coords, setCoords] = useState(null);

  const handleLocationSelected = (location) => {
    console.log("Localisation choisie ✅ :", location);
    setCoords(location);
    // Appeler le backend ici avec fetch()
  };

  return (

        <LocationInput onLocationSelected={handleLocationSelected} />
      ) 
}

export default App;
