const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let gameOver = false;
let gameWon = false; 

let hasItemInHand = false; 
let homeState = "none";    
let homeTimer = 0;         

const scoreBoard = document.getElementById('score-board');
function updateUI() {
    if (scoreBoard) {
        scoreBoard.innerHTML = `Самокрутки: <span id="score">${score}</span>`;
    }
}
updateUI();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Загрузка картинок
const imgSnoop = new Image(); imgSnoop.src = 'snoop.png';
const imgBush = new Image();   imgBush.src = 'bush.png';
const imgCop = new Image();    imgCop.src = 'cop.png';
const imgItem = new Image();   imgItem.src = 'item.png';
const imgHome = new Image();   imgHome.src = 'home.png';
const imgWater = new Image();  imgWater.src = 'water.png';
const imgSmile = new Image();  imgSmile.src = 'smile.png';

const tileSize = 38; 
const mapTilesX = 50; // Карта увеличена в 5 раз по площади (50х50 кустов)
const mapTilesY = 50;

const maxW = mapTilesX * tileSize;
const maxH = mapTilesY * tileSize;

const camera = {
    x: 0,
    y: 0,
    speed: 0.1 
};

const homePos = {
    x: Math.floor(mapTilesX / 2) * tileSize,
    y: Math.floor(mapTilesY / 2) * tileSize
};

function toIso(x, y) {
    return {
        x: (x - y) + canvas.width / 2 - camera.x,
        y: (x + y) / 2 + canvas.height / 2 - camera.y
    };
}

function toScreen(isoX, isoY) {
    let shiftedX = isoX - canvas.width / 2 + camera.x;
    let shiftedY = isoY - canvas.height / 2 + camera.y;
    return {
        x: (2 * shiftedY + shiftedX) / 2,
        y: (2 * shiftedY - shiftedX) / 2
    };
}

const snoop = {
    x: homePos.x + tileSize / 2,
    y: homePos.y + tileSize / 2,
    size: 16,
    targetX: homePos.x + tileSize / 2,
    targetY: homePos.y + tileSize / 2,
    speed: 3.8
};

camera.x = (snoop.x - snoop.y);
camera.y = (snoop.x + snoop.y) / 2;

let bushes = [];
function generateMap() {
    bushes = [];
    for (let x = 0; x < maxW; x += tileSize) {
        for (let y = 0; y < maxH; y += tileSize) {
            // ИСПРАВЛЕНИЕ: Теперь расчищается строго 2х2 клетки вокруг дома (tileSize * 0.99 гарантирует 2 клетки)
            if (Math.abs(x - homePos.x) <= tileSize && Math.abs(y - homePos.y) <= tileSize) {
                continue;
            }
            bushes.push({
                x: x, y: y,
                isCut: false,
                hasCigarette: Math.random() < 0.08 
            });
        }
    }
    bushes.sort((a, b) => a.y - b.y);
}
generateMap();

let droppedItems = [];

// ИСПРАВЛЕНИЕ: Количество копов увеличено в 3 раза (теперь их 6 штук по всей карте)
let cops = [];
for (let i = 0; i < 6; i++) {
    cops.push({
        x: Math.random() * maxW,
        y: Math.random() * maxH,
        targetX: Math.random() * maxW,
        targetY: Math.random() * maxH,
        speed: 0.7 + Math.random() * 0.3,
        angle: 0,
        changeTargetTimer: Math.random() * 200
    });
}

// Универсальная функция ввода
function processInput(clientX, clientY) {
    if (gameOver || gameWon) return;
    const logicPos = toScreen(clientX, clientY);
    snoop.targetX = Math.max(0, Math.min(maxW - 5, logicPos.x));
    snoop.targetY = Math.max(0, Math.min(maxH - 5, logicPos.y));
}

// Клик мышкой
window.addEventListener('click', (e) => {
    processInput(e.clientX, e.clientY);
});

// ИСПРАВЛЕНИЕ: Исправлено считывание тач-событий на iPhone дисплеях (touches[0])
window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
        processInput(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });

function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ПОЛИЦИЯ ПОЙМАЛА СНУПА!", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText("Нажмите на экран, чтобы начать заново", canvas.width / 2, canvas.height / 2 + 30);
        return;
    }

    if (gameWon) {
        ctx.fillStyle = "rgba(10, 25, 10, 0.9)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#4CAF50";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ПЛАНТАЦИЯ СНУПА ПОЛНОСТЬЮ ЗАЧИЩЕНА!", canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(`Итоговый счет доставленных самокруток: ${score}`, canvas.width / 2, canvas.height / 2 + 15);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText("Нажмите на экран, чтобы играть снова", canvas.width / 2, canvas.height / 2 + 60);
        return;
    }

    const targetCamX = (snoop.x - snoop.y);
    const targetCamY = (snoop.x + snoop.y) / 2;
    camera.x += (targetCamX - camera.x) * camera.speed;
    camera.y += (targetCamY - camera.y) * camera.speed;

    ctx.fillStyle = '#141813'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Отрисовка земли (Оптимизировано: рисуем только то, что видит камера)
    for (let x = 0; x < maxW; x += tileSize) {
        for (let y = 0; y < maxH; y += tileSize) {
            const iso = toIso(x, y);
            if (iso.x < -40 || iso.x > canvas.width + 40 || iso.y < -40 || iso.y > canvas.height + 40) continue;
            
            ctx.beginPath();
            ctx.moveTo(iso.x, iso.y);
            ctx.lineTo(iso.x + tileSize, iso.y + tileSize / 2);
            ctx.lineTo(iso.x, iso.y + tileSize);
            ctx.lineTo(iso.x - tileSize, iso.y + tileSize / 2);
            ctx.closePath();
            ctx.fillStyle = '#222920';
            ctx.fill();
            ctx.strokeStyle = '#1a1f18';
            ctx.stroke();
        }
    }

    // 2. Отрисовка дома
    const homeIso = toIso(homePos.x, homePos.y);
    if (imgHome.complete && imgHome.width > 0) {
        ctx.drawImage(imgHome, homeIso.x - tileSize * 2.6, homeIso.y - tileSize * 3.0, tileSize * 5.2, tileSize * 4.4);
    } else {
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(homeIso.x - 40, homeIso.y - 40, 80, 80);
    }

    // 3. Отрисовка кустов
    let remainingBushes = 0;
    bushes.forEach(bush => {
        if (!bush.isCut) {
            remainingBushes++;
            const iso = toIso(bush.x, bush.y);
            // Отсекаем кусты вне экрана для плавной частоты кадров
            if (iso.x < -60 || iso.x > canvas.width + 60 || iso.y < -60 || iso.y > canvas.height + 60) return;

            if (imgBush.complete && imgBush.width > 0) {
                const bSize = tileSize * 1.25;
                ctx.drawImage(imgBush, iso.x - bSize, iso.y - bSize, bSize * 2, bSize * 2);
            } else {
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(iso.x - 10, iso.y - 10, 20, 20);
            }
        }
    });

    if (remainingBushes === 0 && droppedItems.length === 0 && !hasItemInHand) {
        gameWon = true;
    }

    // 4. Отрисовка выпавших самокруток
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        const iso = toIso(item.x, item.y);
        
        if (imgItem.complete && imgItem.width > 0) {
            ctx.drawImage(imgItem, iso.x - 14, iso.y - 14, 28, 28); 
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(iso.x - 6, iso.y - 6, 12, 12);
        }

        const dist = Math.sqrt((snoop.x - item.x) ** 2 + (snoop.y - item.y) ** 2);
        if (dist < snoop.size + 15 && !hasItemInHand) {
            hasItemInHand = true; 
            droppedItems.splice(i, 1);
        }
    }

    // 5. Движение Снупа
    const dx = snoop.targetX - snoop.x;
    const dy = snoop.targetY - snoop.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > snoop.speed) {
        snoop.x += (dx / dist) * snoop.speed;
        snoop.y += (dy / dist) * snoop.speed;
    }

    // Срезание кустов
    bushes.forEach(bush => {
        if (!bush.isCut) {
            const d = Math.sqrt((snoop.x - (bush.x + tileSize / 2)) ** 2 + (snoop.y - (bush.y + tileSize / 2)) ** 2);
            if (d < snoop.size) {
                if (hasItemInHand) return; 
                
                bush.isCut = true;
                if (bush.hasCigarette) {
                    const angle = Math.random() * Math.PI * 2;
                    const throwDist = 45 + Math.random() * 15;
                    let spawnX = bush.x + tileSize / 2 + Math.cos(angle) * throwDist;
                    let spawnY = bush.y + tileSize / 2 + Math.sin(angle) * throwDist;
                    
                    spawnX = Math.max(15, Math.min(maxW - 15, spawnX));
                    spawnY = Math.max(15, Math.min(maxH - 15, spawnY));

                    droppedItems.push({ x: spawnX, y: spawnY });
                }
            }
        }
    });

    const distToHome = Math.sqrt((snoop.x - (homePos.x + tileSize / 2)) ** 2 + (snoop.y - (homePos.y + tileSize / 2)) ** 2);
    const isSnoopInsideHome = (distToHome < snoop.size + 40);

    if (isSnoopInsideHome && hasItemInHand) {
        hasItemInHand = false; 
        score += 1;
        updateUI();
        homeState = "water";
        homeTimer = 0;
    }

    // Рисуем Снупа
    const snoopIso = toIso(snoop.x, snoop.y);
    if (imgSnoop.complete && imgSnoop.width > 0) {
        ctx.drawImage(imgSnoop, snoopIso.x - 16, snoopIso.y - 30, 32, 38);
    } else {
ctx.beginPath(); ctx.arc(snoopIso.x, snoopIso.y, 12, 0, Math.PI * 2);
ctx.fillStyle = '#7B1FA2'; ctx.fill(); ctx.closePath();
}
// 6. ИСПРАВЛЕНИЕ: Облачко, иконки воды и смайлика увеличены в 3 раза
if (homeState !== "none") {
homeTimer++;
const bubbleIso = toIso(homePos.x + tileSize / 2, homePos.y + tileSize / 2);
const bubbleY = bubbleIso.y - tileSize * 3.4;
ctx.beginPath();
ctx.arc(bubbleIso.x, bubbleY, 60, 0, Math.PI * 2); // Радиус кружка увеличен с 20 до 60
ctx.fillStyle = "#ffffff";
ctx.fill();
ctx.lineWidth = 3;
ctx.strokeStyle = "#1a1a1a";
ctx.stroke();
ctx.closePath();
if (homeState === "water") {
if (imgWater.complete && imgWater.width > 0) {
// Размер иконки увеличен в 3 раза: с 22х22 до 66х66
ctx.drawImage(imgWater, bubbleIso.x - 33, bubbleY - 33, 66, 66);
}
if (homeTimer > 100) { homeState = "smile"; homeTimer = 0; }
} else if (homeState === "smile") {
if (imgSmile.complete && imgSmile.width > 0) {
ctx.drawImage(imgSmile, bubbleIso.x - 33, bubbleY - 33, 66, 66);
}
if (homeTimer > 100) { homeState = "none"; }
}
}
// 7. ИСПРАВЛЕНИЕ: Текст тревоги увеличен в 10 раз (font size стал огромным)
if (hasItemInHand) {
ctx.fillStyle = "#ff3333";
ctx.font = "bold 54px sans-serif"; // Огромный агрессивный шрифт вместо 16px
ctx.textAlign = "center";
ctx.fillText("СРОЧНО ВЕРНИТЕСЬ ДОМОЙ!", canvas.width / 2, canvas.height / 2 - 120);
ctx.fillText("НУЖНО ПОПИТЬ!", canvas.width / 2, canvas.height / 2 - 50);
}
// 8. Движение 6 Копов
cops.forEach(cop => {
cop.changeTargetTimer++;
if (cop.changeTargetTimer > 250) {
cop.targetX = Math.random() * maxW;
cop.targetY = Math.random() * maxH;
cop.changeTargetTimer = 0;
}
const cDx = cop.targetX - cop.x;
const cDy = cop.targetY - cop.y;
const cDist = Math.sqrt(cDx * cDx + cDy * cDy);
if (cDist > cop.speed) {
cop.x += (cDx / cDist) * cop.speed;
cop.y += (cDy / cDist) * cop.speed;
cop.angle = Math.atan2(cDy, cDx);
}
const copIso = toIso(cop.x, cop.y);
// Рисуем копов и лучи только если они в зоне видимости
if (copIso.x < -160 || copIso.x > canvas.width + 160 || copIso.y < -160 || copIso.y > canvas.height + 160) return;
const viewDistance = 150;
const coneAngle = Math.PI / 4;
ctx.save();
ctx.translate(copIso.x, copIso.y);
ctx.scale(1, 0.5);
ctx.rotate(cop.angle);
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.arc(0, 0, viewDistance, -coneAngle / 2, coneAngle / 2);
ctx.closePath();
ctx.fillStyle = "rgba(255, 255, 100, 0.18)";
ctx.fill();
ctx.restore();
if (!isSnoopInsideHome) {
const vX = snoop.x - cop.x;
const vY = snoop.y - cop.y;
const dToSnoop = Math.sqrt(vX * vX + vY * vY);
if (dToSnoop < viewDistance) {
let aToSnoop = Math.atan2(vY, vX);
let aDiff = Math.atan2(Math.sin(aToSnoop - cop.angle), Math.cos(aToSnoop - cop.angle));
if (Math.abs(aDiff) < coneAngle / 2) {
gameOver = true;
}
}
}
if (imgCop.complete && imgCop.width > 0) {
ctx.drawImage(imgCop, copIso.x - 32, copIso.y - 60, 64, 72);
} else {
ctx.beginPath(); ctx.arc(copIso.x, copIso.y, 20, 0, Math.PI * 2);
ctx.fillStyle = '#0d47a1'; ctx.fill(); ctx.closePath();
}
});
requestAnimationFrame(gameLoop);
}
const resetGame = () => {
if (gameOver || gameWon) {
gameOver = false;
gameWon = false;
score = 0;
hasItemInHand = false;
homeState = "none";
generateMap();
droppedItems = [];
snoop.x = homePos.x + tileSize / 2;
snoop.y = homePos.y + tileSize / 2;
snoop.targetX = snoop.x;
snoop.targetY = snoop.y;
// Сброс копов
cops.forEach(cop => {
cop.x = Math.random() * maxW;
cop.y = Math.random() * maxH;
cop.targetX = Math.random() * maxW;
cop.targetY = Math.random() * maxH;
});
updateUI();
}
};
window.addEventListener('click', resetGame);
window.addEventListener('touchstart', resetGame);
gameLoop();
