const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let gameOver = false;
let gameWon = false; // Состояние победы

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

const tileSize = 32; 
const mapTilesX = 22; 
const mapTilesY = 22;

const maxW = mapTilesX * tileSize;
const maxH = mapTilesY * tileSize;

// Координаты камеры
const camera = {
    x: 0,
    y: 0,
    speed: 0.1 // Плавность следования за игроком
};

const homePos = {
    x: Math.floor(mapTilesX / 2) * tileSize,
    y: Math.floor(mapTilesY / 2) * tileSize
};

// Изометрические координаты с учетом смещения камеры
function toIso(x, y) {
    return {
        x: (x - y) + canvas.width / 2 - camera.x,
        y: (x + y) / 2 + canvas.height / 2 - camera.y
    };
}

// Перевод тапов экрана в логику с учетом смещения камеры
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
    size: 18,
    targetX: homePos.x + tileSize / 2,
    targetY: homePos.y + tileSize / 2,
    speed: 3.8
};

// Инициализация камеры в центре поля при старте
camera.x = (snoop.x - snoop.y);
camera.y = (snoop.x + snoop.y) / 2;

let bushes = [];
for (let x = 0; x < maxW; x += tileSize) {
    for (let y = 0; y < maxH; y += tileSize) {
        if (x === homePos.x && y === homePos.y) continue;
        bushes.push({
            x: x, y: y,
            isCut: false,
            hasCigarette: Math.random() < 0.08 
        });
    }
}
bushes.sort((a, b) => a.y - b.y);

let droppedItems = [];

let cops = [{
    x: 30,
    y: 30,
    targetX: Math.random() * maxW,
    targetY: Math.random() * maxH,
    speed: 0.8,
    angle: 0,
    changeTargetTimer: 0
}];

function handleInput(clientX, clientY) {
    if (gameOver || gameWon) return;
    const logicPos = toScreen(clientX, clientY);
    snoop.targetX = Math.max(0, Math.min(maxW - 5, logicPos.x));
    snoop.targetY = Math.max(0, Math.min(maxH - 5, logicPos.y));
}

window.addEventListener('click', (e) => handleInput(e.clientX, e.clientY));
window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });

function gameLoop() {
    // Экран проигрыша
    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ПОЛИЦИЯ ПОЙМАЛА СНУПА!", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText("Нажмите на экран, чтобы начать заново", canvas.width / 2, canvas.height / 2 + 30);
        return;
    }

    // КРАСИВЫЙ ЭКРАН ПОБЕДЫ
    if (gameWon) {
        ctx.fillStyle = "rgba(10, 25, 10, 0.9)"; // Полупрозрачный темно-зеленый фон
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#4CAF50";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ПЛАНТАЦИЯ ПОЛНОСТЬЮ ЗАЧИЩЕНА!", canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(`Снуп Догг собрал самокруток: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText("Снуп доволен. Нажмите для новой игры", canvas.width / 2, canvas.height / 2 + 60);
        return;
    }

    // Плавное следование камеры за Снупом в изометрическом пространстве
    const targetCamX = (snoop.x - snoop.y);
    const targetCamY = (snoop.x + snoop.y) / 2;
    camera.x += (targetCamX - camera.x) * camera.speed;
    camera.y += (targetCamY - camera.y) * camera.speed;

    ctx.fillStyle = '#141813'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Сетка земли
    for (let x = 0; x < maxW; x += tileSize) {
        for (let y = 0; y < maxH; y += tileSize) {
            const iso = toIso(x, y);
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
        ctx.drawImage(imgHome, homeIso.x - tileSize * 1.4, homeIso.y - tileSize * 1.6, tileSize * 2.8, tileSize * 2.4);
    } else {
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(homeIso.x - 20, homeIso.y - 20, 40, 40);
    }

    // 3. Отрисовка кустов
    let remainingBushes = 0;
    bushes.forEach(bush => {
        const iso = toIso(bush.x, bush.y);
        if (!bush.isCut) {
            remainingBushes++;
            if (imgBush.complete && imgBush.width > 0) {
                const bSize = tileSize * 1.55;
                ctx.drawImage(imgBush, iso.x - bSize, iso.y - bSize, bSize * 2, bSize * 2);
            } else {
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(iso.x - 12, iso.y - 12, 24, 24);
            }
        }
    });

    // Условие триггера победы
    if (remainingBushes === 0 && droppedItems.length === 0 && !hasItemInHand) {
        gameWon = true;
    }

    // 4. Отрисовка самокруток
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        const iso = toIso(item.x, item.y);
        
        if (imgItem.complete && imgItem.width > 0) {
            ctx.drawImage(imgItem, iso.x - 16, iso.y - 16, 32, 32); 
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(iso.x - 8, iso.y - 8, 16, 16);
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
    const isSnoopInsideHome = (distToHome < snoop.size + 20);

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
        ctx.drawImage(imgSnoop, snoopIso.x - 20, snoopIso.y - 35, 40, 45);
    } else {
        ctx.beginPath(); ctx.arc(snoopIso.x, snoopIso.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#7B1FA2'; ctx.fill(); ctx.closePath();
    }

    // 6. Иконки над домом
    if (homeState !== "none") {
        homeTimer++;
        const bubbleIso = toIso(homePos.x + tileSize / 2, homePos.y + tileSize / 2);
        const bubbleY = bubbleIso.y - tileSize * 1.9;

        ctx.beginPath();
        ctx.arc(bubbleIso.x, bubbleY, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#1a1a1a";
        ctx.stroke();
        ctx.closePath();

        if (homeState === "water") {
            if (imgWater.complete && imgWater.width > 0) {
ctx.drawImage(imgWater, bubbleIso.x - 11, bubbleY - 11, 22, 22);
}
if (homeTimer > 120) { homeState = "smile"; homeTimer = 0; }
} else if (homeState === "smile") {
if (imgSmile.complete && imgSmile.width > 0) {
ctx.drawImage(imgSmile, bubbleIso.x - 11, bubbleY - 11, 22, 22);
}
if (homeTimer > 120) { homeState = "none"; }
}
}
// 7. Текст ТРЕВОГИ
if (hasItemInHand) {
ctx.fillStyle = "#ff3333";
ctx.font = "bold 18px sans-serif";
ctx.textAlign = "center";
ctx.fillText("СРОЧНО ВЕРНИТЕСЬ ДОМОЙ! НУЖНО ПОПИТЬ!", canvas.width / 2, 75);
}
// 8. Движение Копа
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
const viewDistance = 80;
const coneAngle = Math.PI / 4;
ctx.save();
ctx.translate(copIso.x, copIso.y);
ctx.scale(1, 0.5);
ctx.rotate(cop.angle);
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.arc(0, 0, viewDistance, -coneAngle / 2, coneAngle / 2);
ctx.closePath();
ctx.fillStyle = "rgba(255, 255, 100, 0.22)";
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
ctx.drawImage(imgCop, copIso.x - 18, copIso.y - 32, 36, 40);
} else {
ctx.beginPath(); ctx.arc(copIso.x, copIso.y, 10, 0, Math.PI * 2);
ctx.fillStyle = '#0d47a1'; ctx.fill(); ctx.closePath();
}
});
requestAnimationFrame(gameLoop);
}
// Перезапуск игры при тапе по экранам GameOver/Win
const resetGame = () => {
if (gameOver || gameWon) {
gameOver = false;
gameWon = false;
score = 0;
hasItemInHand = false;
homeState = "none";
// Пересобираем кусты заново
bushes = [];
for (let x = 0; x < maxW; x += tileSize) {
for (let y = 0; y < maxH; y += tileSize) {
if (x === homePos.x && y === homePos.y) continue;
bushes.push({ x: x, y: y, isCut: false, hasCigarette: Math.random() < 0.08 });
}
}
bushes.sort((a, b) => a.y - b.y);
droppedItems = [];
snoop.x = homePos.x + tileSize / 2;
snoop.y = homePos.y + tileSize / 2;
snoop.targetX = snoop.x;
snoop.targetY = snoop.y;
updateUI();
}
};
window.addEventListener('click', resetGame);
window.addEventListener('touchstart', resetGame);
gameLoop();
