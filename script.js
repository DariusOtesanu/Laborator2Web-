
const cityInput = document.getElementById("city");
const cityOptions = document.getElementById("city-options");
const searchButton = document.getElementById("search-button");
const statusText = document.getElementById("status");

let searchTimer;
let searchController;

const weatherUrl = "https://api.open-meteo.com/v1/forecast";
const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";

const popularCities = [
    "București", "Cluj-Napoca", "Timișoara", "Iași",
    "Constanța", "Craiova", "Brașov", "Sibiu",
    "Oradea", "Arad", "Pitești", "Ploiești",
    "Galați", "Bacău", "Suceava", "Alba Iulia",
    "Deva", "Târgu Mureș", "Baia Mare", "Buzău",
    "Botoșani", "Focșani", "Târgu Jiu",
    "Drobeta-Turnu Severin", "Reșița", "Vaslui",
    "Zalău", "Slatina", "Tulcea", "Bistrița",
    "Miercurea Ciuc", "Sfântu Gheorghe", "Alexandria",
    "Giurgiu", "Călărași", "Piatra Neamț", "Mediaș",
    "Turda", "Lugoj", "Mangalia", "Petroșani",
    "Sighișoara", "Făgăraș", "Câmpina", "Râmnicu Vâlcea"
];

function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.toggle("error", isError);
}

function weatherDescription(code) {
    if (code === 0) return "Senin";
    if (code === 1) return "Predominant senin";
    if (code === 2) return "Parțial noros";
    if (code === 3) return "Înnorat";
    if ([45, 48].includes(code)) return "Ceață";
    if ([51, 53, 55].includes(code)) return "Burniță";
    if ([56, 57].includes(code)) return "Burniță înghețată";
    if ([61, 63, 65].includes(code)) return "Ploaie";
    if ([66, 67].includes(code)) return "Ploaie înghețată";
    if ([71, 73, 75, 77].includes(code)) return "Ninsoare";
    if ([80, 81, 82].includes(code)) return "Averse de ploaie";
    if ([85, 86].includes(code)) return "Averse de ninsoare";
    if ([95, 96, 99].includes(code)) return "Furtună";
    return "Condiții meteo variabile";
}

function weatherIcon(code) {
    if (code === 0) return "☀️";
    if (code === 1) return "🌤️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";
    if ([71, 73, 75, 77].includes(code)) return "❄️";
    if ([80, 81, 82].includes(code)) return "🌧️";
    if ([85, 86].includes(code)) return "🌨️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌡️";
}

function formatTime(value) {
    if (!value) return "--:--";
    return value.slice(11, 16);
}

function formatDate(dateString, options = {}) {
    return new Date(dateString + "T12:00:00").toLocaleDateString(
        "ro-RO",
        options
    );
}

function addCityOption(name, admin1 = "") {
    const option = document.createElement("option");
    option.value = name;
    if (admin1) option.label = `${name} — ${admin1}`;
    cityOptions.appendChild(option);
}

async function searchCities(query) {
    if (query.trim().length < 2) return;

    if (searchController) searchController.abort();
    searchController = new AbortController();

    try {
        const url = new URL(geocodingUrl);
        url.search = new URLSearchParams({
            name: query.trim(),
            count: "100",
            language: "ro",
            format: "json",
            countryCode: "RO"
        });

        const response = await fetch(url, {
            signal: searchController.signal
        });

        if (!response.ok) throw new Error("Căutarea localităților a eșuat.");

        const data = await response.json();
        const results = data.results || [];

        cityOptions.replaceChildren();

        results.forEach(place => {
            addCityOption(
                place.name,
                [place.admin1, place.admin2].filter(Boolean).join(", ")
            );
        });

        if (results.length === 0) {
            setStatus("Nu am găsit localități pentru această căutare.", true);
            return;
        }

        setStatus(`Am găsit ${results.length} rezultat(e). Alege localitatea.`);
    } catch (error) {
        if (error.name !== "AbortError") {
            setStatus(
                "Nu am putut încărca sugestiile. Poți alege un oraș popular.",
                true
            );
        }
    }
}

function loadPopularCities() {
    cityOptions.replaceChildren();
    popularCities.forEach(name => addCityOption(name));
}

async function getWeather(cityName) {
    const city = cityName.trim();

    if (!city) {
        setStatus("Alege sau introdu numele unui oraș.", true);
        return;
    }

    searchButton.disabled = true;
    setStatus("Se încarcă vremea pentru " + city + "...");
    document.getElementById("weather").hidden = true;
    document.getElementById("forecast-section").hidden = true;

    try {
        const geoUrl = new URL(geocodingUrl);
        geoUrl.search = new URLSearchParams({
            name: city,
            count: "10",
            language: "ro",
            format: "json",
            countryCode: "RO"
        });

        const geoResponse = await fetch(geoUrl);

        if (!geoResponse.ok) {
            throw new Error("Serviciul de căutare nu este disponibil.");
        }

        const geoData = await geoResponse.json();
        const places = geoData.results || [];

        if (places.length === 0) {
            throw new Error("Localitatea nu a fost găsită. Încearcă alt nume.");
        }

        const normalizedCity = city.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "").toLowerCase();

        const place = places.find(item =>
            item.name.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "").toLowerCase() === normalizedCity
        ) || places[0];

        const url = new URL(weatherUrl);
        url.search = new URLSearchParams({
            latitude: place.latitude,
            longitude: place.longitude,
            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "wind_speed_10m"
            ].join(","),
            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max",
                "uv_index_max",
                "sunrise",
                "sunset"
            ].join(","),
            forecast_days: "7",
            timezone: "auto"
        });

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Nu am putut prelua datele meteo.");
        }

        const data = await response.json();

        displayCurrentWeather(place, data);
        displayForecast(data);

        document.getElementById("weather").hidden = false;
        document.getElementById("forecast-section").hidden = false;

        const locationParts = [
            place.name,
            place.admin1,
            place.country
        ].filter(Boolean);

        document.getElementById("city-name").textContent =
            [...new Set(locationParts)].join(", ");

        setStatus("Datele meteo au fost actualizate.");
    } catch (error) {
        setStatus(error.message || "A apărut o eroare. Verifică internetul.", true);
    } finally {
        searchButton.disabled = false;
    }
}

function displayCurrentWeather(place, data) {
    const current = data.current;
    const daily = data.daily;
    const code = current.weather_code;

    document.getElementById("weather-icon").textContent = weatherIcon(code);
    document.getElementById("description").textContent = weatherDescription(code);
    document.getElementById("temperature").textContent =
        `${Math.round(current.temperature_2m)}°C`;
    document.getElementById("feels-like").textContent =
        `Resimțită: ${Math.round(current.apparent_temperature)}°C`;
    document.getElementById("humidity").textContent =
        `${current.relative_humidity_2m}%`;
    document.getElementById("wind").textContent =
        `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById("rain").textContent =
        `${current.precipitation} mm`;
    document.getElementById("uv").textContent =
        daily.uv_index_max[0] ?? "--";
    document.getElementById("sunrise").textContent =
        formatTime(daily.sunrise[0]);
    document.getElementById("sunset").textContent =
        formatTime(daily.sunset[0]);

    document.getElementById("current-date").textContent =
        formatDate(daily.time[0], {
            weekday: "long",
            day: "numeric",
            month: "long"
        });
}

function displayForecast(data) {
    const forecast = document.getElementById("forecast");
    forecast.replaceChildren();

    data.daily.time.forEach((date, index) => {
        const code = data.daily.weather_code[index];

        const card = document.createElement("article");
        card.className = "forecast-day";

        const dayName = document.createElement("p");
        dayName.className = "day-name";
        dayName.textContent = index === 0
            ? "Astăzi"
            : formatDate(date, { weekday: "short" });

        const dayDate = document.createElement("p");
        dayDate.className = "day-date";
        dayDate.textContent = formatDate(date, {
            day: "numeric",
            month: "short"
        });

        const icon = document.createElement("p");
        icon.className = "forecast-icon";
        icon.textContent = weatherIcon(code);

        const description = document.createElement("p");
        description.className = "forecast-description";
        description.textContent = weatherDescription(code);

        const rain = document.createElement("p");
        rain.className = "rain-chance";
        rain.textContent =
            `🌧️ ${data.daily.precipitation_probability_max[index] ?? 0}%`;

        const temperatures = document.createElement("p");
        temperatures.className = "temperatures";

        const max = document.createElement("span");
        max.className = "max-temp";
        max.textContent = `${Math.round(data.daily.temperature_2m_max[index])}°`;

        const min = document.createElement("span");
        min.className = "min-temp";
        min.textContent = `${Math.round(data.daily.temperature_2m_min[index])}°`;

        temperatures.append(max, min);
        card.append(dayName, dayDate, icon, description, rain, temperatures);
        forecast.appendChild(card);
    });
}

cityInput.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        searchCities(cityInput.value);
    }, 350);
});

searchButton.addEventListener("click", () => {
    getWeather(cityInput.value);
});

cityInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        getWeather(cityInput.value);
    }
});

loadPopularCities();
getWeather("București");
