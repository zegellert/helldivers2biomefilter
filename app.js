const devmode = true;

const sidebarWidth = 380;
const canvas = document.getElementById("planetCanvas");
const ctx = canvas.getContext("2d");

let scale = 1;
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let dragStartX, dragStartY;

function updateCanvasSize() {
    const width = window.innerWidth - sidebarWidth;
    const height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
}

updateCanvasSize();
window.addEventListener('resize', () => {
    updateCanvasSize();
    clampOffset();
    drawPlanets();
});

let allPlanets = [];
let playablePlanetsSet = new Set();
let selectedBiome = null;
const planetRadius = 8;
let hoveredPlanet = null;

const backgroundImg = new Image();
backgroundImg.src = 'images/sectors_upscaled_dimmed.png';
backgroundImg.onload = () => drawPlanets();

const biomeImageCache = new Map();

const ownerColors = {
    "Humans": "cyan",
    "Automaton": "red",
    "Terminids": "yellow",
    "Illuminate": "purple"
};

const hideUnplayableMap = new Map();
let hideUnplayable = false;

const pinnedBiomesMap = new Map();

fetch('biomes.json').then(r => r.json()).then(biomes => {
    const biomeList = document.getElementById("biomeList");
    biomes.sort((a, b) => b.hippos - a.hippos);

    const defaultImg = new Image();
    defaultImg.src = "images/default.jpg";
    biomeImageCache.set("", defaultImg);

    const defaultBtn = document.createElement("div");
    defaultBtn.className = "biome selected";
    defaultBtn.dataset.name = "";
    const defaultImgElem = document.createElement("img");
    defaultImgElem.src = "images/default.jpg";
    defaultImgElem.alt = "All Biomes";
    defaultImgElem.title = "Show All Planets";
    defaultBtn.appendChild(defaultImgElem);

    const defaultToggleWrapper = document.createElement("div");
    defaultToggleWrapper.className = "toggle-wrapper";

    const defaultToggle = document.createElement("div");
    defaultToggle.className = "toggle off";
    defaultToggleWrapper.appendChild(defaultToggle);

    const defaultToggleCircle = document.createElement("div");
    defaultToggleCircle.className = "toggle-circle";
    defaultToggle.appendChild(defaultToggleCircle);

    const defaultUnplayableCircle = document.createElement("div");
    defaultUnplayableCircle.className = "unplayable-indicator";
    defaultToggleWrapper.appendChild(defaultUnplayableCircle);

    defaultBtn.appendChild(defaultToggleWrapper);

    const defaultHoverName = document.createElement("div");
    defaultHoverName.className = "hover-name";
    defaultBtn.appendChild(defaultHoverName);

    const defaultDots = document.createElement("div");
    defaultDots.className = "hippo-dots";
    const defaultDot = document.createElement("div");
    defaultDot.className = "hippo-dot";
    defaultDots.appendChild(defaultDot);
    defaultBtn.appendChild(defaultDots);

    biomeList.appendChild(defaultBtn);

    pinnedBiomesMap.set("", false);
    biomes.forEach(b => pinnedBiomesMap.set(b.name, false));

    function updateHoverName(div, biomeName) {
        const pin = pinnedBiomesMap.get(biomeName);
        const baseText = biomeName === "" ? "All Biomes" : biomeName;
        div.querySelector(".hover-name").textContent = pin ? baseText + " (Pinned)" : baseText;
    }

    function updateToggle(div, biomeName) {
        const pin = pinnedBiomesMap.get(biomeName);
        const toggle = div.querySelector(".toggle");
        if (!toggle) return;

        if (pin) {
            toggle.classList.add("on");
            toggle.classList.remove("off");
        } else {
            toggle.classList.remove("on");
            toggle.classList.add("off");
        }
    }

    updateHoverName(defaultBtn, "");
    updateToggle(defaultBtn, "");

    defaultBtn.addEventListener("click", () => {
        const biomeName = "";
        if (selectedBiome === null) { // Re-click on All Biomes button
            // const current = hideUnplayableMap.get(biomeName);
            // hideUnplayableMap.set(biomeName, !current);
            // updateHoverName(defaultBtn, biomeName);
            // updateToggle(defaultBtn, biomeName);
            // drawPlanets();
        } else { // First click on All Biomes button
            selectedBiome = null;
            updateSelection(defaultBtn);
            updateHoverName(defaultBtn, biomeName);
            updateToggle(defaultBtn, biomeName);
            document.querySelectorAll(".biome").forEach(el => {
                if (el !== defaultBtn) el.classList.remove("selected");
            });
            drawPlanets();
        }
    });


    biomes.forEach(biome => {
        const div = document.createElement("div");
        div.className = "biome";
        div.dataset.name = biome.name;

        const img = new Image();
        img.src = biome.image;
        biomeImageCache.set(biome.name, img);

        const imgElem = document.createElement("img");
        imgElem.src = biome.image;
        imgElem.alt = biome.name;
        imgElem.title = biome.name;

        div.appendChild(imgElem);

        const toggleWrapper = document.createElement("div");
        toggleWrapper.className = "toggle-wrapper";

        const toggle = document.createElement("div");
        toggle.className = "toggle off";
        toggleWrapper.appendChild(toggle);

        const toggleCircle = document.createElement("div");
        toggleCircle.className = "toggle-circle";
        toggle.appendChild(toggleCircle);

        const unplayableCircle = document.createElement("div");
        unplayableCircle.className = "unplayable-indicator";
        toggleWrapper.appendChild(unplayableCircle);

        div.appendChild(toggleWrapper);

        const hoverName = document.createElement("div");
        hoverName.className = "hover-name";
        div.appendChild(hoverName);

        const dotsContainer = document.createElement("div");
        dotsContainer.className = "hippo-dots";

        if (biome.hippos > 0) {
            const count = Math.min(biome.hippos, 5);
            for (let i = 0; i < count; i++) {
                const dot = document.createElement("div");
                dot.className = "hippo-dot yellow";
                dotsContainer.appendChild(dot);
            }
        } else {
            const dot = document.createElement("div");
            dot.className = "hippo-dot";
            dotsContainer.appendChild(dot);
        }

        div.appendChild(dotsContainer);
        biomeList.appendChild(div);

        updateHoverName(div, biome.name);
        updateToggle(div, biome.name);

        div.addEventListener("click", () => {
            const biomeName = biome.name;
            // Clicking on biome button first, or from different biome
            if (selectedBiome !== biomeName) {
                selectedBiome = biomeName;
                updateSelection(div);
                updateHoverName(div, biomeName);
                updateToggle(div, biomeName);
                defaultBtn.classList.remove("selected"); // Remove selection visual
                drawPlanets();
                // Re-clicking on biome button again when selected
            } else {
                const current = pinnedBiomesMap.get(biomeName);
                pinnedBiomesMap.set(biomeName, !current);
                updateHoverName(div, biomeName);
                updateToggle(div, biomeName);
                drawPlanets();
            }
        });
    });

    // Selected only controls the selection visual
    function updateSelection(selectedDiv) {
        document.querySelectorAll(".biome").forEach(el => el.classList.remove("selected"));
        selectedDiv.classList.add("selected");
    }
});


async function loadPlanetsData() {
    if (devmode) {
        try {
            const planets = await fetch('planets.json').then(r => r.json());
            const playablePlanets = await fetch('playable_planets.json').then(r => r.json());

            allPlanets = planets;
            playablePlanetsSet = new Set(playablePlanets.map(p => p.planet.index));
            drawPlanets();
        } catch (e) {
            console.error("Failed to load local planets or playable_planets", e);
        }
    } else {
        try {
            const randomId = Math.random().toString(36).substring(2, 10);
            const planetsResp = await fetch('https://api.helldivers2.dev/api/v1/planets', {
                headers: {
                    'accept': 'application/json',
                    'X-Super-Client': randomId,
                    'X-Super-Contact': randomId
                }
            });
            const planets = await planetsResp.json();

            const campaignsResp = await fetch('https://api.helldivers2.dev/api/v1/campaigns', {
                headers: {
                    'accept': 'application/json',
                    'X-Super-Client': randomId,
                    'X-Super-Contact': randomId
                }
            });
            const campaigns = await campaignsResp.json();

            allPlanets = planets;
            playablePlanetsSet = new Set(campaigns.map(c => c.planet.index));
            drawPlanets();

        } catch (e) {
            console.error("Failed to load planets or campaigns data", e);
        }
    }
}

loadPlanetsData();

function clampOffset() {
    if (!canvas.width || !canvas.height) return;

    const margin = 500;
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;

    const minOffsetX = Math.min(margin, canvas.width - scaledWidth - margin);
    const maxOffsetX = Math.max(margin, margin);

    const minOffsetY = Math.min(margin, canvas.height - scaledHeight - margin);
    const maxOffsetY = Math.max(margin, margin);

    if (scaledWidth <= canvas.width) {
        offsetX = Math.min(maxOffsetX, Math.max(minOffsetX, offsetX));
    } else {
        offsetX = Math.min(margin, Math.max(canvas.width - scaledWidth - margin, offsetX));
    }

    if (scaledHeight <= canvas.height) {
        offsetY = Math.min(maxOffsetY, Math.max(minOffsetY, offsetY));
    } else {
        offsetY = Math.min(margin, Math.max(canvas.height - scaledHeight - margin, offsetY));
    }
}

//#region Mouse Controls

canvas.addEventListener("wheel", e => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const wx = (mouseX - offsetX) / scale;
    const wy = (mouseY - offsetY) / scale;

    const zoomAmount = e.deltaY < 0 ? 1.1 : 0.9;
    scale *= zoomAmount;

    scale = Math.min(Math.max(scale, 0.5), 10);

    offsetX = mouseX - wx * scale;
    offsetY = mouseY - wy * scale;

    clampOffset();

    drawPlanets();
}, { passive: false });

canvas.addEventListener("mousedown", e => {
    isDragging = true;
    dragStartX = e.clientX - offsetX;
    dragStartY = e.clientY - offsetY;
    canvas.style.cursor = "grabbing";
});
window.addEventListener("mouseup", e => {
    isDragging = false;
    canvas.style.cursor = "grab";
});
window.addEventListener("mousemove", e => {
    if (isDragging) {
        offsetX = e.clientX - dragStartX;
        offsetY = e.clientY - dragStartY;
        clampOffset();
        drawPlanets();
    }
});

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    hoveredPlanet = null;

    for (const planet of allPlanets) {
        const isPinned = pinnedBiomesMap.get(planet.biome.name) === true;
        if (selectedBiome && planet.biome.name !== selectedBiome && !isPinned) continue;

        const hideUnplayable = hideUnplayableMap.get(selectedBiome ?? "") ?? false;
        if (hideUnplayable && !playablePlanetsSet.has(planet.index)) continue;

        const x = ((planet.position.x + 1) / 2) * canvas.width * scale + offsetX;
        const y = (1 - ((planet.position.y + 1) / 2)) * canvas.height * scale + offsetY;

        const dx = mouseX - x;
        const dy = mouseY - y;

        if (Math.sqrt(dx * dx + dy * dy) <= planetRadius * scale) {
            hoveredPlanet = planet;
            break;
        }
    }

    drawPlanets();
});

//#endregion

//#region Touch Controls

let lastTouchDist = null;
let lastTouchCenter = null;
let isTouchPanning = false;

canvas.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
        isDragging = true;
        dragStartX = e.touches[0].clientX - offsetX;
        dragStartY = e.touches[0].clientY - offsetY;
        isTouchPanning = true;
    } else if (e.touches.length === 2) {
        isDragging = false;
        isTouchPanning = false;
        lastTouchDist = getTouchDist(e.touches);
        lastTouchCenter = getTouchCenter(e.touches);
    }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    if (e.touches.length === 1 && isTouchPanning) {
        offsetX = e.touches[0].clientX - dragStartX;
        offsetY = e.touches[0].clientY - dragStartY;
        clampOffset();
        drawPlanets();
    } else if (e.touches.length === 2) {
        const newDist = getTouchDist(e.touches);
        const newCenter = getTouchCenter(e.touches);

        if (lastTouchDist && lastTouchCenter) {
            const zoomAmount = newDist / lastTouchDist;
            const newScale = Math.min(Math.max(scale * zoomAmount, 0.5), 10);

            const wx = (newCenter.x - offsetX) / scale;
            const wy = (newCenter.y - offsetY) / scale;

            scale = newScale;

            offsetX = newCenter.x - wx * scale;
            offsetY = newCenter.y - wy * scale;

            clampOffset();
            drawPlanets();
        }

        lastTouchDist = newDist;
        lastTouchCenter = newCenter;
        isTouchPanning = false;
    }
}, { passive: false });

canvas.addEventListener("touchend", e => {
    if (e.touches.length < 2) {
        lastTouchDist = null;
        lastTouchCenter = null;
    }
    if (e.touches.length === 0) {
        isDragging = false;
        isTouchPanning = false;
    }
});

function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    };
}

//#endregion

function drawPlanets() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    allPlanets.filter(planet => {
        if (hideUnplayable && !playablePlanetsSet.has(planet.index)) return false;
        if (pinnedBiomesMap.get(planet.biome.name) === true) {
            return true;
        }
        if (selectedBiome && planet.biome.name !== selectedBiome) return false;
        return true;
    })


        .forEach(planet => {
            const x = ((planet.position.x + 1) / 2) * canvas.width * scale + offsetX;
            const y = (1 - ((planet.position.y + 1) / 2)) * canvas.height * scale + offsetY;

            ctx.beginPath();
            ctx.arc(x, y, planetRadius * scale, 0, Math.PI * 2);

            const isPlayable = playablePlanetsSet.has(planet.index);
            ctx.fillStyle = isPlayable
                ? (ownerColors[planet.currentOwner] || "white")
                : "grey";

            ctx.fill();

            ctx.fillStyle = isPlayable ? "white" : "#777";
            ctx.font = `${12 * scale}px Arial`;
            ctx.textBaseline = "alphabetic";
            ctx.fillText(planet.name, x + 10 * scale, y + 4 * scale);
        });

    if (hoveredPlanet) {
        drawPopup(hoveredPlanet);
    }
}

function drawPopup(planet) {
    const x = ((planet.position.x + 1) / 2) * canvas.width * scale + offsetX;
    const y = (1 - ((planet.position.y + 1) / 2)) * canvas.height * scale + offsetY;

    const padding = 10 * scale;
    const imgWidth = 140 * scale;
    const imgHeight = 60 * scale;

    const textHeight = 24 * scale;
    const lineHeight = 2 * scale;
    const hazardLineHeight = 18 * scale; // height per hazard line
    const extraSpaceUnderImage = 10 * scale; // space under image before hazards start

    const hazardsCount = planet.hazards ? planet.hazards.length : 0;

    const boxWidth = imgWidth + padding * 2;
    // box height includes: two text lines + separator + image + space + hazards lines + padding top/bottom
    const boxHeight = textHeight * 2 + lineHeight + imgHeight + extraSpaceUnderImage + hazardsCount * hazardLineHeight + padding * 2;

    const radius = 10 * scale;

    ctx.fillStyle = "rgba(0, 122, 204, 0.8)";
    roundRect(ctx, x + 15 * scale, y - boxHeight / 2, boxWidth, boxHeight, radius);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = `bold ${16 * scale}px Arial`;
    ctx.textBaseline = "top";

    // First line (planet.name)
    ctx.fillText(planet.name, x + 15 * scale + padding, y - boxHeight / 2 + padding);

    // Draw separator line
    const lineY = y - boxHeight / 2 + padding + textHeight;
    ctx.strokeStyle = "white";
    ctx.lineWidth = lineHeight;
    ctx.beginPath();
    ctx.moveTo(x + 15 * scale + padding, lineY);
    ctx.lineTo(x + 15 * scale + boxWidth - padding, lineY);
    ctx.stroke();

    // Second line (biome.name)
    const biomeTextY = lineY + padding;
    ctx.fillText(planet.biome.name, x + 15 * scale + padding, biomeTextY);

    // Draw image below biome name
    const imgY = biomeTextY + textHeight;
    const img = biomeImageCache.get(planet.biome.name);
    if (img && img.complete) {
        ctx.drawImage(img, x + 15 * scale + padding, imgY, imgWidth, imgHeight);
    }

    // Draw hazards lines under image, with some space
    if (hazardsCount > 0) {
        ctx.font = `${14 * scale}px Arial`;
        ctx.textBaseline = "top";
        const hazardsStartY = imgY + imgHeight + extraSpaceUnderImage;
        planet.hazards.forEach((hazard, idx) => {
            ctx.fillText(`• ${hazard.name}`, x + 15 * scale + padding, hazardsStartY + idx * hazardLineHeight);
        });
    }
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

//#region Hamburger Button

const hamburgerBtn = document.getElementById("hamburgerBtn");
const biomeList = document.getElementById("biomeList");

// Start open
biomeList.classList.remove("closed");
hamburgerBtn.classList.remove("closed");
hamburgerBtn.setAttribute("aria-expanded", "true");

// Updates the canvas when hamburger button is pressed
function updateCanvasRight() {
    const isClosed = biomeList.classList.contains("closed");
    const vw = window.innerWidth;

    if (vw <= 480) {
        // small screen
        canvas.style.right = isClosed ? "0" : "80vw";
    } else {
        // desktop
        canvas.style.right = isClosed ? "0" : "380px";
    }
}

hamburgerBtn.addEventListener("click", () => {
    biomeList.classList.toggle("closed");
    hamburgerBtn.classList.toggle("closed");
    hideBtn.classList.toggle("closed");

    const expanded = !biomeList.classList.contains("closed");
    hamburgerBtn.setAttribute("aria-expanded", expanded ? "true" : "false");

    // Update canvas CSS position (you already do this)
    updateCanvasRight();

    // Update canvas pixel size based on biomeList state:
    const vw = window.innerWidth;
    const sidebarWidth = expanded
        ? (vw <= 480 ? vw * 0.8 : 380)
        : 0;

    // Resize canvas pixel size properly:
    canvas.width = vw - sidebarWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = (vw - sidebarWidth) + "px";
    canvas.style.height = window.innerHeight + "px";

    // Re-draw to reflect size change:
    clampOffset();
    drawPlanets();
});


// Sync on window resize too
window.addEventListener("resize", updateCanvasRight);

//#endregion

//#region Hide Button

const hideBtn = document.getElementById("hideBtn");

hideBtn.addEventListener("click", () => {
    hideUnplayable = !hideUnplayable;
    hideBtn.classList.toggle("on");
    drawPlanets();
});

//#endregion
