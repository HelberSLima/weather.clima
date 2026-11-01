const apiKey = 'e64abe25abae31a31c63a762e7bdbfee';

document.querySelector('.busca').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    let input = document.querySelector('#searchInput').value.trim();
    if (input !== '') {
        getWeatherData(input, 'city');
    }
});

// Quick city buttons
document.querySelectorAll('.city-tag').forEach(button => {
    button.addEventListener('click', () => {
        let city = button.getAttribute('data-city');
        document.querySelector('#searchInput').value = city;
        getWeatherData(city, 'city');
    });
});

// Geolocation button
document.querySelector('#geoBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
        showWarning('Obtendo sua localização...');
        navigator.geolocation.getCurrentPosition(
            position => {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;
                getWeatherData({ lat, lon }, 'coords');
            },
            error => {
                showWarning('Não foi possível obter sua localização. Verifique as permissões.');
            }
        );
    } else {
        showWarning('Geolocalização não é suportada pelo seu navegador.');
    }
});

async function getWeatherData(query, type) {
    clearInfo();
    showWarning('Carregando...');

    let currentWeatherUrl = '';
    let forecastUrl = '';

    if (type === 'city') {
        currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURI(query)}&appid=${apiKey}&units=metric&lang=pt_br`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURI(query)}&appid=${apiKey}&units=metric&lang=pt_br`;
    } else {
        currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${query.lat}&lon=${query.lon}&appid=${apiKey}&units=metric&lang=pt_br`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${query.lat}&lon=${query.lon}&appid=${apiKey}&units=metric&lang=pt_br`;
    }

    try {
        let [currentRes, forecastRes] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastUrl)
        ]);

        let currentJson = await currentRes.json();
        let forecastJson = await forecastRes.json();

        if (currentJson.cod === 200 && forecastJson.cod === "200") {
            if (type === 'coords') {
                document.querySelector('#searchInput').value = currentJson.name;
            }
            showCurrentInfo(currentJson);
            showHourlyInfo(forecastJson.list);
            showDailyInfo(forecastJson.list);
        } else {
            clearInfo();
            showWarning('Não encontramos esta localização. Verifique o nome digitado.');
        }
    } catch (error) {
        clearInfo();
        showWarning('Erro ao conectar com o serviço de clima.');
    }
}

function showCurrentInfo(json) {
    showWarning('');

    document.querySelector('.titulo').innerHTML = `${json.name}, ${json.sys.country}`;
    document.querySelector('.descricao-clima').innerHTML = json.weather[0].description;

    document.querySelector('.tempInfo').innerHTML = `${Math.round(json.main.temp)} <sup>ºC</sup>`;
    document.querySelector('.temp-sensacao').innerHTML = `Sensação térmica: ${Math.round(json.main.feels_like)} ºC`;

    document.querySelector('.ventoInfo').innerHTML = `${Math.round(json.wind.speed * 3.6)} km/h`;
    document.querySelector('.umidadeInfo').innerHTML = `${json.main.humidity}%`;
    document.querySelector('.pressaoInfo').innerHTML = `${json.main.pressure} hPa`;

    let visibilityKm = json.visibility ? (json.visibility / 1000).toFixed(1) : '--';
    document.querySelector('.visibilidadeInfo').innerHTML = `${visibilityKm} km`;

    document.querySelector('.card-metric img').setAttribute('src', `https://openweathermap.org/img/wn/${json.weather[0].icon}@2x.png`);
    document.querySelector('.ventoPonto').style.transform = `rotate(${json.wind.deg - 90}deg)`;

    document.querySelector('.resultado').style.display = 'block';
}

function showHourlyInfo(list) {
    let hourlyScroll = document.querySelector('#hourlyScroll');
    hourlyScroll.innerHTML = '';

    // Next 8 items (approx 24 hours of 3-hour intervals)
    let nextHours = list.slice(0, 8);

    nextHours.forEach(item => {
        let date = new Date(item.dt * 1000);
        let hours = date.getHours().toString().padStart(2, '0') + ':00';
        let temp = Math.round(item.main.temp);
        let icon = item.weather[0].icon;

        let div = document.createElement('div');
        div.classList.add('hourly-item');
        div.innerHTML = `
            <div class="hourly-time">${hours}</div>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="ícone" />
            <div class="hourly-temp">${temp}ºC</div>
        `;
        hourlyScroll.appendChild(div);
    });

    document.querySelector('.hourly-container').style.display = 'block';
}

function showDailyInfo(list) {
    let forecastList = document.querySelector('#forecastList');
    forecastList.innerHTML = '';

    let dailyMap = {};

    list.forEach(item => {
        let dateObj = new Date(item.dt * 1000);
        let dateString = dateObj.toISOString().split('T')[0];

        if (!dailyMap[dateString]) {
            dailyMap[dateString] = {
                temps: [],
                weather: item.weather[0],
                dt: item.dt
            };
        }
        dailyMap[dateString].temps.push(item.main.temp);
    });

    // Take up to 5 days (maximum provided by free OpenWeatherMap forecast endpoint)
    let daysArray = Object.keys(dailyMap).slice(0, 5);

    daysArray.forEach((dateStr, index) => {
        let dayData = dailyMap[dateStr];
        let maxTemp = Math.round(Math.max(...dayData.temps));
        let minTemp = Math.round(Math.min(...dayData.temps));
        let icon = dayData.weather.icon;
        let desc = dayData.weather.description;

        let dateObj = new Date(dayData.dt * 1000);
        let options = { weekday: 'short', day: 'numeric', month: 'numeric' };
        let dayName = index === 0 ? 'Hoje' : dateObj.toLocaleDateString('pt-BR', options);
        // Capitalize weekday
        dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

        let div = document.createElement('div');
        div.classList.add('forecast-item');
        div.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-weather">
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="ícone" />
                <span class="forecast-desc">${desc}</span>
            </div>
            <div class="forecast-temps">
                <span>${maxTemp}º</span>
                <span class="forecast-temp-min">${minTemp}º</span>
            </div>
        `;
        forecastList.appendChild(div);
    });

    document.querySelector('.forecast-container').style.display = 'block';
}

function clearInfo() {
    showWarning('');
    document.querySelector('.resultado').style.display = 'none';
    document.querySelector('.hourly-container').style.display = 'none';
    document.querySelector('.forecast-container').style.display = 'none';
}

function showWarning(msg) {
    let avisoEl = document.querySelector('.aviso');
    if (msg === '+`' || msg === '') {
        avisoEl.style.display = 'none';
        avisoEl.innerHTML = '';
    } else {
        avisoEl.style.display = 'block';
        avisoEl.innerHTML = msg;
    }
}
