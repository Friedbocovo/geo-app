import { useState } from "react";
import Swal from "sweetalert2";

export default function LocationInput() {
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [coords, setCoords] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Vérifier connexion Internet
  const isOnline = () => navigator.onLine;

  // 🔹 Popup erreur
  const showError = (message) => {
    Swal.fire({
      icon: "error",
      title: "Erreur",
      text: message,
      confirmButtonColor: "#d33",
    });
  };

  // 🔹 Recherche (ville ou quartier)
  const searchLocation = async () => {
    if (!input.trim()) return;

    if (!isOnline()) {
      showError("Pas de connexion Internet. Vérifie ton réseau.");
      return;
    }

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
        showError("Lieu introuvable. Essaie un autre nom.");
        setCity("Introuvable");
        setDistrict("---");
      }
    } catch (err) {
      console.error("Erreur recherche lieu:", err);
      showError("Impossible de rechercher ce lieu (problème réseau).");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Localisation automatique via GPS
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showError("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    if (!isOnline()) {
      showError("Pas de connexion Internet. Vérifie ton réseau.");
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
          showError("Impossible de récupérer l'adresse (réseau indisponible).");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        showError("Impossible de récupérer la localisation : " + err.message);
        setLoading(false);
      }
    );
  };

  return (
    <div className="flex h-screen md:pr-40 justify-center w-screen md:justify-end items-center">
      <div className="text-center  md:w-[500px] p-4 bg-white/50 shadow rounded-xl">
        <h2 className="md:text-5xl text-xl font-bold mb-2 text-black opacity-100 Itim">
          Anticipez L'Extreme
        </h2>
        <p className="text-gray-700 md:text-xl text-xs mb-2 Itim">
          Identifier les risques météorologiques extrêmes <br /> pour un lieu et une période spécifique
        </p>

        {/* Bouton GPS */}
        <button
          onClick={useMyLocation}
          className="md:w-full py-2 mb-3 w-2xs text-base bg-blue-600 Itim text-white rounded hover:bg-blue-800"
        >
          Utiliser ma position GPS
        </button>

        {/* Champ recherche */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Rechercher une ville ou un quartier..."
            className="flex-1 px-3 border-0 bg-gray-300 rounded outline-0 text-xs "
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={searchLocation}
            className="px-3 py-2  bg-green-200 md:bg-green-800 text-white rounded hover:bg-green-700"
          >
            <span className="hidden md:flex Itim">Rechercher</span>
            <span className="md:hidden flex">🔍</span>
          </button>
        </div>

        {/* Indicateur de chargement */}
        {loading && <p className="text-gray-500 mb-2 Itim">⏳ Chargement...</p>}

        {/* Résultats */}
        {city && (
          <div className="p-3 border border-bg-green-800 rounded  Itim bg-gray-50/40">
            <p className="Itim">📍 <strong className="Itim">Ville :</strong> {city}</p>
            <p className="Itim">🏘️ <strong className="Itim">Quartier :</strong> {district}</p>
            {coords && (
              <p className="Itim">🌍 Lat: {coords.lat}, Lon: {coords.lon}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
