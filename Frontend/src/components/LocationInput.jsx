import React, { useEffect, useRef, useState } from "react";

export default function LocationInput({ onLocationSelected }) {
  const [manualLocation, setManualLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedPlace, setDetectedPlace] = useState(null);
  const watchIdRef = useRef(null);
  const timeoutRef = useRef(null);

  // paramètres pour la recherche GPS
  const DESIRED_ACCURACY = 50; // m — objectif idéal
  const MAX_WAIT_MS = 10000; // ms — durée max d'attente pour affiner la position

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Utilisation du GPS — collecte plusieurs fixes et prend le meilleur (plus petite accuracy)
  const handleGpsSearch = async () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }

    setLoading(true);
    setDetectedPlace(null);

    let bestPosition = null;

    // callback success pour watchPosition
    const successCb = async (position) => {
      // position.coords: latitude, longitude, accuracy (m)
      // On garde le "meilleur" fix (la plus petite accuracy)
      if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
        bestPosition = position;
        // afficher temporairement lat/lon/accuracy pour feedback utilisateur
        setDetectedPlace({
          city: null,
          district: null,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "gps",
        });
      }

      // Si la précision est bonne, on s'arrête et on fait le reverse geocoding
      if (position.coords.accuracy <= DESIRED_ACCURACY) {
        finishWithPosition(bestPosition);
      }
    };

    const errorCb = (err) => {
      console.error("Erreur geolocation:", err);
      alert("Impossible d'obtenir la position. Vérifie les permissions / GPS.");
      cleanup();
      setLoading(false);
    };

    // start watching
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(successCb, errorCb, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: MAX_WAIT_MS,
      });
    } catch (e) {
      console.error("watchPosition error:", e);
      alert("Erreur lors de la demande de position.");
      setLoading(false);
      return;
    }

    // timeout fallback : après MAX_WAIT_MS, on prend le meilleur reçu (s'il y en a)
    timeoutRef.current = setTimeout(() => {
      if (bestPosition) {
        finishWithPosition(bestPosition);
      } else {
        alert("Impossible d'obtenir une position précise. Essaie de réessayer ou de saisir manuellement.");
        cleanup();
        setLoading(false);
      }
    }, MAX_WAIT_MS);
  };

  const cleanup = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // prend la position finale et fait le reverse geocoding
  const finishWithPosition = async (position) => {
    cleanup();
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    try {
      // Nominatim reverse — format=jsonv2 + zoom élevé pour obtenir quartier
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=fr`
      );
      const data = await resp.json();
      const addr = data.address || {};

      // Choix du nom de ville lisible
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.hamlet ||
        addr.municipality ||
        addr.county ||
        addr.state ||
        addr.country ||
        data.name ||
        "Lieu inconnu";

      // quartier/suburb/district/neighbourhood
      const district =
        addr.suburb ||
        addr.neighbourhood ||
        addr.district ||
        addr.city_district ||
        addr.quarter ||
        "";

      const place = {
        city,
        district,
        lat,
        lon,
        accuracy,
        source: "gps",
      };

      setDetectedPlace(place);
      // envoi au parent (inclut accuracy)
      onLocationSelected({ ...place, radius: 500 });
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      alert("Erreur lors de la récupération du nom du lieu.");
      // on envoie quand même coords bruts (utile si reverse échoue)
      const place = { city: null, district: null, lat, lon, accuracy, source: "gps" };
      setDetectedPlace(place);
      onLocationSelected({ ...place, radius: 500 });
    } finally {
      setLoading(false);
    }
  };

  // Recherche manuelle (Nominatim search) — limite 1 résultat & récupère addressdetails
  const handleManualSearch = async (e) => {
    e.preventDefault();
    if (!manualLocation) {
      alert("Merci d'entrer un lieu !");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          manualLocation
        )}&addressdetails=1&limit=1&accept-language=fr`
      );
      const data = await response.json();
      if (data.length === 0) {
        alert("Lieu introuvable ❌");
        setLoading(false);
        return;
      }
      const item = data[0];
      const addr = item.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.hamlet ||
        addr.county ||
        addr.state ||
        addr.country ||
        item.display_name ||
        manualLocation;
      const district = addr.suburb || addr.neighbourhood || addr.district || "";
      const coords = {
        city,
        district,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        accuracy: item.importance ? Math.max(10, 100 - item.importance * 100) : null,
        source: "search",
      };
      setDetectedPlace(coords);
      onLocationSelected({ ...coords, radius: 500 });
    } catch (err) {
      console.error("Manual search error:", err);
      alert("Erreur lors de la recherche du lieu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Choisir un lieu</h2>

      {/* Formulaire manuel */}
      <form onSubmit={handleManualSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Ex: Paris, Cotonou..."
          value={manualLocation}
          onChange={(e) => setManualLocation(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? "..." : "Rechercher"}
        </button>
      </form>

      {/* Boutons GPS / retry */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleGpsSearch}
          disabled={loading}
          className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? "Localisation..." : "Utiliser ma position GPS"}
        </button>
        <button
          onClick={() => {
            // réinitialiser
            setDetectedPlace(null);
            setManualLocation("");
          }}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          Réinitialiser
        </button>
      </div>

      {/* Affichage du lieu détecté */}
      {detectedPlace && (
        <div className="mt-4 p-3 border rounded-lg bg-gray-50">
          <p className="font-medium text-gray-700">
            📍 Ville :{" "}
            <span className="text-blue-600">{detectedPlace.city || "—"}</span>
          </p>
          {detectedPlace.district ? (
            <p className="text-gray-600">
              🏘️ Quartier :{" "}
              <span className="text-green-600">{detectedPlace.district}</span>
            </p>
          ) : (
            <p className="text-gray-500 text-sm">🏘️ Quartier : non disponible</p>
          )}
          <p className="text-sm text-gray-500">
            🌐 Lat: {detectedPlace.lat.toFixed(6)}, Lon: {detectedPlace.lon.toFixed(6)}
          </p>
          {detectedPlace.accuracy != null && (
            <p className="text-sm text-gray-500">Précision : {Math.round(detectedPlace.accuracy)} m</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                // renvoyer explicitement au parent si utilisateur veut confirmer
                onLocationSelected({ ...detectedPlace, radius: 500 });
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Confirmer
            </button>

            <button
              onClick={() => {
                // permettre corrective manuelle
                setDetectedPlace(null);
              }}
              className="bg-gray-200 px-3 py-1 rounded"
            >
              Corriger manuellement
            </button>
          </div>
        </div>
      )}

      {/* Aide / conseils */}
      <p className="mt-3 text-xs text-gray-400">
        Astuce : pour une localisation précise utilisez un appareil mobile avec le GPS activé, désactivez VPN et autorisez la géolocalisation dans les paramètres du navigateur.
      </p>
    </div>
  );
}
