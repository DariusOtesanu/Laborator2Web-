
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city");
const statusText = document.getElementById("status");

form.addEventListener("submit", function (event) {
    event.preventDefault();
    getWeather(cityInput.value.trim());
});

async function getWeather(city) {
    if (!city) return;

    statusText.textContent = "Se încarcă datele...";
    document.getElementById("weather").hidden = true;
    document.getElementById("forecast").replaceChildren();

    try {
        // Căutăm orașul și coordonatele sale
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ro&format=json`
        );

        if (!geoResponse.ok) {
            throw new Error("Nu am putut căuta orașul.");
        }

        const geoData = await geoResponse.json();
        const place = geoData.results?.[0];

        if (!place) {
            throw new Error("Orașul nu a fost găsit.");
        }

        // Cerem vremea actuală și prognoza pe 5 zile
        const url = new URL("https://api.open-meteo.com/v1/forecast");

        url.search = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
            daily: "weather_code,temperature_2m_max,temperature_2m_min",
            forecast_days: "5",
            timezone: "auto"
        });

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Nu am putut prelua vremea.");
        }

        const data = await response.json();

        // Afișăm vremea actuală
        document.getElementById("city-name").textContent =
            `${place.name}, ${place.country}`;

        document.getElementById("temperature").textContent =
            `${Math.round(data.current.temperature_2m)} °C`;

        document.getElementById("humidity").textContent =
            `${data.current.relative_humidity_2m}%`;

        document.getElementById("wind").textContent =
            `${data.current.wind_speed_10m} km/h`;

        document.getElementById("description").textContent =
            getDescription(data.current.weather_code);

        document.getElementById("weather").hidden = false;

        // Construim prognoza pentru următoarele 5 zile
        const forecast = document.getElementById("forecast");

        data.daily.time.forEach((date, index) => {
            const card = document.createElement("article");
            card.className = "forecast-day";

            const day = document.createElement("p");
            day.textContent = new Date(date + "T12:00:00")
                .toLocaleDateString("ro-RO", {
                    weekday: "short",
                    day: "numeric",
                    month: "short"
                });

            const symbol = document.createElement("p");
            symbol.className = "symbol";
            symbol.textContent = getIcon(data.daily.weather_code[index]);

            const description = document.createElement("p");
            description.textContent = getDescription(
                data.daily.weather_code[index]
            );

            const temperatures = document.createElement("strong");
            temperatures.textContent =
                `${Math.round(data.daily.temperature_2m_max[index])}° / ` +
                `${Math.round(data.daily.temperature_2m_min[index])}°`;

            card.append(day, symbol, description, temperatures);
            forecast.appendChild(card);
        });

        statusText.textContent = "Datele meteo au fost actualizate.";

    } catch (error) {
        statusText.textContent = error.message;
    }
}

function getDescription(code) {
    if (code === 0) return "Senin";
    if ([1, 2].includes(code)) return "Parțial noros";
    if (code === 3) return "Noros";
    if ([45, 48].includes(code)) return "Ceață";
    if ([51, 53, 55, 56, 57].includes(code)) return "Burniță";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Ploaie";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Ninsoare";
    if ([95, 96, 99].includes(code)) return "Furtună";
    return "Condiții meteo variabile";
}

function getIcon(code) {
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return "🌧️";
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌡️";
}

// Afișăm automat vremea pentru București la deschiderea paginii
getWeather("București");
