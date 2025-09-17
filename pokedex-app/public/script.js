const URL = 'https://pokeapi.co/api/v2/pokemon/';
const TYPE_URL = 'https://pokeapi.co/api/v2/type/';
const SPECIES_URL = 'https://pokeapi.co/api/v2/pokemon-species/';
const pokedex = document.getElementById("pokedex");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");
const filterSelect = document.getElementById("filterType");

let offset = 0;
const limit = 20;
let loading = false;

let isFiltering = false;
let filteredList = [];
let filteredOffset = 0;

const typeColors = {
  fire: "#F5A572", grass: "#9CD88B", electric: "#F9E27C",
  water: "#86BDF2", ground: "#E8D29C", rock: "#C6B785",
  fairy: "#F5B6C8", poison: "#B175B9", bug: "#C5D86D",
  dragon: "#9A79F7", psychic: "#F48BAA", flying: "#B7A9F5",
  fighting: "#D6786F", normal: "#C9C9A9", ice: "#A3E5F5",
  dark: "#8A7A8A", steel: "#B8B8D0", ghost: "#7D6B9D"
};

async function fetchPokemons() {
  if (loading || isFiltering) return;
  loading = true;
  try {
    const res = await fetch(`${URL}?offset=${offset}&limit=${limit}`);
    const data = await res.json();
    for (const pokemon of data.results) {
      const pokeData = await fetchPokemonData(pokemon.url);
      createCard(pokeData);
    }
    offset += limit;
  } catch (error) {
    console.error("Error al cargar los Pokémon:", error);
  } finally {
    loading = false;
  }
}

async function fetchPokemonData(url) {
  const res = await fetch(url);
  return res.json();
}

function createCard(pokemon) {
  const card = document.createElement("div");
  card.classList.add("pokemon");
  let bgColor = typeColors[pokemon.types[0].type.name] || "#eee";
  if (pokemon.types.length > 1) {
    const secondColor = typeColors[pokemon.types[1].type.name] || "#ddd";
    bgColor = `linear-gradient(135deg, ${bgColor}, ${secondColor})`;
  }
  card.style.background = bgColor;
  const image = pokemon.sprites.other["official-artwork"].front_default;
  card.innerHTML = `
    <div class="card-img">
      <img src="${image}" alt="${pokemon.name}">
    </div>
    <div class="card-info">
      <h3>#${pokemon.id} - ${pokemon.name.toUpperCase()}</h3>
      <div class="types">
        ${pokemon.types.map(t => `<span class="type ${t.type.name}">${t.type.name}</span>`).join(" ")}
      </div>
      <p><strong>Altura:</strong> ${(pokemon.height / 10).toFixed(1)} m</p>
      <p><strong>Peso:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</p>
    </div>
  `;
  card.addEventListener("click", () => showModal(pokemon));
  pokedex.appendChild(card);
}

async function fetchSpeciesData(id) {
  const res = await fetch(SPECIES_URL + id);
  return res.json();
}

async function fetchEvolutionData(url) {
  const res = await fetch(url);
  return res.json();
}

async function showModal(pokemon) {
  const speciesData = await fetchSpeciesData(pokemon.id);
  const flavorEntry = speciesData.flavor_text_entries.find(e => e.language.name === "es") 
                    || speciesData.flavor_text_entries[0];
  const description = flavorEntry ? flavorEntry.flavor_text.replace(/\f/g, " ") : "Sin descripción.";
  let evoHTML = "<p>No tiene evoluciones</p>";
  if (speciesData.evolution_chain) {
    const evoData = await fetchEvolutionData(speciesData.evolution_chain.url);
    let chain = evoData.chain;
    const evoList = [];
    do {
      evoList.push(chain.species.name);
      chain = chain.evolves_to[0];
    } while (chain && chain.hasOwnProperty("evolves_to"));
    const evoDetails = await Promise.all(
      evoList.map(async name => {
        const res = await fetch(URL + name);
        const data = await res.json();
        return `
          <div class="evo-card">
            <img src="${data.sprites.other['official-artwork'].front_default}" alt="${name}">
            <p>${name.toUpperCase()}</p>
          </div>
        `;
      })
    );
    evoHTML = `<div class="evolutions">${evoDetails.join(" ➝ ")}</div>`;
  }
  let bgColor = typeColors[pokemon.types[0].type.name] || "#eee";
  if (pokemon.types.length > 1) {
    const secondColor = typeColors[pokemon.types[1].type.name] || "#ddd";
    bgColor = `linear-gradient(135deg, ${bgColor}, ${secondColor})`;
  }
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <div class="modal-content" style="background:${bgColor}">
      <span class="close">&times;</span>
      <div class="modal-header">
        <img src="${pokemon.sprites.front_default}" class="modal-img">
        <h2>#${pokemon.id} ${pokemon.name.toUpperCase()}</h2>
        <div class="types">
          ${pokemon.types.map(t => `<span class="type ${t.type.name}">${t.type.name}</span>`).join("")}
        </div>
      </div>
      <p><em>${description}</em></p>
      <p><strong>Hábitat:</strong> ${speciesData.habitat ? speciesData.habitat.name : "Desconocido"}</p>
      <p><strong>Color:</strong> ${speciesData.color.name}</p>
      <p><strong>Habilidades:</strong> ${pokemon.abilities.map(a => a.ability.name).join(", ")}</p>
      <h3>Estadísticas</h3>
      <div class="stats">
        ${pokemon.stats.map(s => `
          <div class="stat">
            <span>${s.stat.name.toUpperCase()}</span>
            <div class="bar">
              <div class="fill" style="--value:${s.base_stat}"></div>
            </div>
          </div>
        `).join("")}
      </div>
      <h3>Evoluciones</h3>
      ${evoHTML}
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".close").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

async function searchPokemon() {
  const searched = searchInput.value.toLowerCase().trim();
  if (!searched) {
    resetAll();
    return;
  }
  try {
    const res = await fetch(URL + searched);
    if (!res.ok) {
      pokedex.innerHTML = `<p class="error">No se encontró ningún Pokémon llamado "${searched}"</p>`;
      return;
    }
    const data = await res.json();
    pokedex.innerHTML = "";
    createCard(data);
  } catch (error) {
    console.error("Error en la búsqueda:", error);
  }
}

async function filterByType(type) {
  if (!type) {
    resetAll();
    return;
  }
  try {
    const res = await fetch(`${TYPE_URL}${type}`);
    const data = await res.json();
    filteredList = data.pokemon.map(p => p.pokemon);
    filteredOffset = 0;
    isFiltering = true;
    pokedex.innerHTML = "";
    loadMoreFiltered();
  } catch (error) {
    console.error("Error al filtrar:", error);
  }
}

async function loadMoreFiltered() {
  if (loading || !isFiltering) return;
  loading = true;
  const nextBatch = filteredList.slice(filteredOffset, filteredOffset + limit);
  for (const p of nextBatch) {
    const pokeData = await fetchPokemonData(p.url);
    createCard(pokeData);
  }
  filteredOffset += limit;
  loading = false;
}

function resetAll() {
  pokedex.innerHTML = "";
  offset = 0;
  isFiltering = false;
  filteredList = [];
  fetchPokemons();
}

searchBtn.addEventListener("click", searchPokemon);
searchInput.addEventListener("keypress", e => {
  if (e.key === "Enter") searchPokemon();
});
filterSelect.addEventListener("change", e => filterByType(e.target.value));

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    if (isFiltering) {
      loadMoreFiltered();
    } else {
      fetchPokemons();
    }
  }
});

fetchPokemons();
