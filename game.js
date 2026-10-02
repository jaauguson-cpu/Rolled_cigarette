const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let gameOver = false;

// Состояния сушняка Снупа
let hasItemInHand = false; 
let homeState = "none";    // "none", "water", "smile"
let homeTimer = 0;         

// Настройка текста вверху экрана строго по запросу
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
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Загрузка картинок (Оставляем жесткую привязку)
const imgSnoop = new Image(); imgSnoop.src = 'snoop.png';
const imgBush = new Image();   imgBush.src = 'bush.png';
const imgCop = new Image();    imgCop.src = 'cop.png';
const imgItem = new Image();   imgItem.src = 'item.png';
const imgHome = new Image();   imgHome.src = 'home.png';
const imgWater = new Image();  imgWater.src = 'water.png';
const imgSmile = new Image();  imgSmile.src = 'smile.png';

const tileSize = 40; 
const mapTilesX = 20; // Изометрическое поле 20 на 10 квадратов
const mapTilesY = 10;

const maxW = mapTilesX * tileSize;
const maxH = mapTilesY * tileSize;

// Координаты дома (Строго по центру этой сетки)
const homePos = {
    x: Math.floor(mapTilesX / 2) * tileSize,
    y: Math.floor(mapTilesY / 2) * tileSize
};

// Исправленная функция перевода в Изометрию (Центрирует ромб ровно посередине экрана телефона)
function toIso(x, y) {
    const mapWidthPixels = mapTilesX * tileSize;
    const mapHeightPixels = mapTilesY * tileSize;
    return {
        x: (x - y) + canvas.width / 2,
        y: (x + y) / 2 + (canvas.height / 2 - (mapWidthPixels + mapHeightPixels) / 4)
    };
}

// Перевод тапов из экрана в логику игры
function toScreen(isoX, isoY) {
    const mapWidthPixels = mapTilesX * tileSize;
    const mapHeightPixels = mapTilesY * tileSize;
    let shiftedX = isoX - canvas.width / 2;
    let shiftedY = isoY - (canvas.height / 2 - (mapWidthPixels + mapHeightPixels) / 4);
    return {
        x: (2 * shiftedY + shiftedX) / 2,
        y: (2 * shiftedY - shiftedX) / 2
    };
}

// Снуп Догг стартует из центра дома
const snoop = {
    x: homePos.x + tileSize / 2,
    y: homePos.y + tileSize / 2,
    size: 20,
    targetX: homePos.x + tileSize / 2,
    targetY: homePos.y + tileSize / 2,
    speed: 3.5
};

// Заполнение кустами
let bushes = [];
for (let x = 0; x < maxW; x += tileSize) {
    for (let y = 0; y < maxH; y += tileSize) {
        if (x === homePos.x && y === homePos.y) continue;
        bushes.push({
            x: x, y: y,
            isCut: false,
            hasCigarette: Math.random() < 0.08 // Шанс увеличен в 4 раза (8%)
        });
    }
}

let droppedItems = [];

// 1 Коп — хаотичный патрульный
let cops = [{
    x: 40,
    y: 40,
    targetX: Math.random() * maxW,
    targetY: Math.random() * maxH,
    speed: 0.7,
    angle: 0,
    changeTargetTimer: 0
}];

function handleInput(clientX, clientY) {
    if (gameOver) return;
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

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Отрисовка изометрической плитки-земли
    for (let x = 0; x < maxW; x += tileSize) {
        for (let y = 0; y < maxH; y += tileSize) {
            const iso = toIso(x, y);
            ctx.beginPath();
            ctx.moveTo(iso.x, iso.y);
            ctx.lineTo(iso.x + tileSize, iso.y + tileSize / 2);
            ctx.lineTo(iso.x, iso.y + tileSize);
            ctx.lineTo(iso.x - tileSize, iso.y + tileSize / 2);
            ctx.closePath();
            ctx.fillStyle = '#252e22';
            ctx.fill();
            ctx.strokeStyle = '#1f261c';
            ctx.stroke();
        }
    }

    // 2. Отрисовка дома в центре карты
    const homeIso = toIso(homePos.x, homePos.y);
    if (imgHome.complete && imgHome.width > 0) {
        ctx.drawImage(imgHome, homeIso.x - tileSize, homeIso.y - tileSize * 1.5, tileSize * 2, tileSize * 2.5);
    } else {
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(homeIso.x - 15, homeIso.y - 15, 30, 30);
    }

    // 3. Отрисовка изометрических кустов
    bushes.forEach(bush => {
        const iso = toIso(bush.x, bush.y);
        if (!bush.isCut) {
            if (imgBush.complete && imgBush.width > 0) {
                ctx.drawImage(imgBush, iso.x - tileSize, iso.y - tileSize, tileSize * 2, tileSize * 2);
            } else {
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(iso.x - 10, iso.y - 10, 20, 20);
            }
        }
    });

    // 4. Отрисовка выпавших самокруток (Крупно, лежат на земле)
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        const iso = toIso(item.x, item.y);
        
        if (imgItem.complete && imgItem.width > 0) {
            ctx.drawImage(imgItem, iso.x - 20, iso.y - 20, 40, 40); 
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
                    droppedItems.push({ 
                        x: bush.x + (Math.random() * 40 - 20), 
                        y: bush.y + (Math.random() * 40 - 20)
                    });
                }
            }
        }
    });

    // Снуп пришел домой с самокруткой
    const distToHome = Math.sqrt((snoop.x - (homePos.x + tileSize / 2)) ** 2 + (snoop.y - (homePos.y + tileSize / 2)) ** 2);
    if (distToHome < snoop.size + 10 && hasItemInHand) {
        hasItemInHand = false; 
        score += 1;
        updateUI();
        homeState = "water";
        homeTimer = 0;
    }

    // Отрисовка Снупа
    const snoopIso = toIso(snoop.x, snoop.y);
    if (imgSnoop.complete && imgSnoop.width > 0) {
        ctx.drawImage(imgSnoop, snoopIso.x - 20, snoopIso.y - 35, 40, 45);
    } else {
        ctx.beginPath(); ctx.arc(snoopIso.x, snoopIso.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#7B1FA2'; ctx.fill(); ctx.closePath();
    }

    // 6. Отрисовка Воды/Смайлика в кружке над домом
    if (homeState !== "none") {
        homeTimer++;
        const bubbleIso = toIso(homePos.x + tileSize / 2, homePos.y + tileSize / 2);
        const bubbleY = bubbleIso.y - tileSize * 1.8;

        ctx.beginPath();
        ctx.arc(bubbleIso.x, bubbleY, 22, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#1a1a1a";
        ctx.stroke();
        ctx.closePath();

        if (homeState === "water") {
            if (imgWater.complete && imgWater.width > 0) {
                ctx.drawImage(imgWater, bubbleIso.x - 12, bubbleY - 12, 24, 24);
            }
            if (homeTimer > 120) { 
                homeState = "smile";
                homeTimer = 0;
            }
        } else if (homeState === "smile") {
            if (imgSmile.complete && imgSmile.width > 0) {
                ctx.drawImage(imgSmile, bubbleIso.x - 12, bubbleY - 12, 24, 24);
            }
            if (homeTimer > 120) { 
                homeState = "none";
            }
        }
    }

    // 7. Красный текст ТРЕВОГИ
    if (hasItemInHand) {
        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("СРОЧНО ВЕРНИТЕСЬ ДОМОЙ! НУЖНО ПОПИТЬ!", canvas.width / 2, 80);
    }

    // 8. Движение ОДНОГО Копа
    cops.forEach(cop => {
        cop.changeTargetTimer++;
        if (cop.changeTargetTimer > 300) {
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
if (imgCop.complete && imgCop.width > 0) {
ctx.drawImage(imgCop, copIso.x - 18, copIso.y - 32, 36, 40);
} else {
ctx.beginPath(); ctx.arc(copIso.x, copIso.y, 10, 0, Math.PI * 2);
ctx.fillStyle = '#0d47a1'; ctx.fill(); ctx.closePath();
}
});
requestAnimationFrame(gameLoop);
}
// Сброс игры по тапу после проигрыша
const resetGame = () => {
if (gameOver) {
gameOver = false;
score = 0;
hasItemInHand = false;
homeState = "none";
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
