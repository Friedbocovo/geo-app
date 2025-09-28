import { useState } from "react";

export default function LocationInput() {
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [coords, setCoords] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Recherche (ville ou quartier)
  const searchLocation = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          input
        )}&addressdetails=1&limit=1`
      );
      const data = await res.json();

      if (data.length > 0) {
        const place = data[0];
        setCoords({ lat: place.lat, lon: place.lon });

        const address = place.address || {};

        if (address.suburb || address.neighbourhood) {
          setDistrict(address.suburb || address.neighbourhood);
          setCity(address.city || address.town || address.village || "Ville inconnue");
        } else {
          setCity(address.city || address.town || address.village || place.display_name);
          setDistrict("---");
        }
      } else {
        setCity("Introuvable");
        setDistrict("---");
      }
    } catch (err) {
      console.error("Erreur recherche lieu:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Localisation automatique via GPS
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          const address = data.address || {};

          if (address.suburb || address.neighbourhood) {
            setDistrict(address.suburb || address.neighbourhood);
            setCity(address.city || address.town || address.village || "Ville inconnue");
          } else {
            setCity(address.city || address.town || address.village || data.display_name);
            setDistrict("---");
          }
        } catch (err) {
          console.error("Erreur reverse geocoding:", err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        alert("Impossible de récupérer la localisation : " + err.message);
        setLoading(false);
      }
    );
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white shadow rounded-xl">
      <h2 className="text-lg font-bold mb-2">Choisir un lieu</h2>

      {/* Champ de recherche */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Rechercher une ville ou un quartier..."
          className="flex-1 p-2 border rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={searchLocation}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Rechercher
        </button>
      </div>

      {/* Bouton GPS */}
      <button
        onClick={useMyLocation}
        className="w-full py-2 mb-3 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Utiliser ma position GPS
      </button>

      {/* Indicateur de chargement */}
      {loading && <p className="text-gray-500 mb-2">⏳ Chargement...</p>}

      {/* Résultats */}
      {city && (
        <div className="p-3 border rounded bg-gray-50">
          <p>📍 <strong>Ville :</strong> {city}</p>
          <p>🏘️ <strong>Quartier :</strong> {district}</p>
          {coords && (
            <p>🌍 Lat: {coords.lat}, Lon: {coords.lon}</p>
          )}
        </div>
      )}
    </div>
  );
}
