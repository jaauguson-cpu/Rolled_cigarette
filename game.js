const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let gameOver = false;

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

// Фиксируем холст и адаптивно растягиваем под экран любого iPhone
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

// Рассчитываем размер сетки под фиксированное количество кустов (22 на 9)
const mapTilesX = 22; 
const mapTilesY = 9;

// Динамический размер клетки, чтобы 22х9 кустов занимали ровно весь экран смартфона
const tileW = window.innerWidth / mapTilesX;
const tileH = window.innerHeight / mapTilesY;

// Вытянутый дом строго в центре сетки 22х9
const homePos = {
    x: Math.floor(mapTilesX / 2) * tileW - (tileW * 1.5),
    y: Math.floor(mapTilesY / 2) * tileH - tileH,
    w: tileW * 4, 
    h: tileH * 2  
};

// Снуп Догг
const snoop = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 12,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    speed: 4
};

// Генерируем фиксированную сетку 22 на 9 кустов
let bushes = [];
for (let c = 0; c < mapTilesX; c++) {
    for (let r = 0; r < mapTilesY; r++) {
        let posX = c * tileW;
        let posY = r * tileH;

        // Пропускаем зону дома в центре
        if (posX >= homePos.x - 5 && posX < homePos.x + homePos.w && posY >= homePos.y - 5 && posY < homePos.y + homePos.h) {
            continue;
        }

        bushes.push({
            x: posX,
            y: posY,
            isCut: false,
            hasCigarette: Math.random() < 0.08 // Шанс 8%
        });
    }
}

// Сортировка кустов сверху вниз (по Y) для красивого 3D-перекрытия верхними рядами нижних
bushes.sort((a, b) => a.y - b.y);

let droppedItems = [];

// 1 Коп
let cop = {
    x: 40,
    y: 40,
    targetX: Math.random() * window.innerWidth,
    targetY: Math.random() * window.innerHeight,
    speed: 1.2,
    angle: 0,
    changeTargetTimer: 0
};

function getMousePos(e) {
    const clientX = e.touches ? e.touches.clientX : e.clientX;
    const clientY = e.touches ? e.touches.clientY : e.clientY;
    return { x: clientX, y: clientY };
}

function handleInput(e) {
    if (gameOver) return;
    const pos = getMousePos(e);
    snoop.targetX = Math.max(10, Math.min(window.innerWidth - 10, pos.x));
    snoop.targetY = Math.max(10, Math.min(window.innerHeight - 10, pos.y));
}

window.addEventListener('click', handleInput);
window.addEventListener('touchstart', handleInput, { passive: true });

function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ПОЛИЦИЯ ПОЙМАЛА СНУПА!", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px sans-serif";
        ctx.fillText("Нажмите на экран, чтобы начать заново", canvas.width / 2, canvas.height / 2 + 30);
        return;
    }

    // Земля (фон под кустами)
    ctx.fillStyle = '#1e231c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Отрисовка дома
    if (imgHome.complete && imgHome.width > 0) {
        ctx.drawImage(imgHome, homePos.x, homePos.y - tileH, homePos.w, homePos.h + tileH);
    } else {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(homePos.x, homePos.y, homePos.w, homePos.h);
    }

    // 2. Отрисовка кустов С УВЕЛИЧЕННЫМ РАЗМЕРОМ (чтобы перекрывали зазоры)
    bushes.forEach(bush => {
        if (!bush.isCut) {
            if (imgBush.complete && imgBush.width > 0) {
                // Делаем кусты на 40% больше клетки по ширине и высоте для плотного наложения друг на друга
                const bWidth = tileW * 1.4;
                const bHeight = tileH * 1.4;
                // Смещаем картинку влево и вверх, чтобы визуально компенсировать нахлест
                ctx.drawImage(imgBush, bush.x - (bWidth - tileW) / 2, bush.y - (bHeight - tileH), bWidth, bHeight);
            } else {
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(bush.x + 1, bush.y + 1, tileW - 2, tileH - 2);
            }
        }
    });

    // 3. Отрисовка выпавших самокруток
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        if (imgItem.complete && imgItem.width > 0) {
            ctx.drawImage(imgItem, item.x - 16, item.y - 16, 32, 32); 
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(item.x - 8, item.y - 8, 16, 16);
        }

        const dist = Math.sqrt((snoop.x - item.x)**2 + (snoop.y - item.y)**2);
        if (dist < snoop.radius + 15 && !hasItemInHand) {
            hasItemInHand = true; 
            droppedItems.splice(i, 1);
        }
    }

    // 4. Движение Снупа
    const dx = snoop.targetX - snoop.x;
    const dy = snoop.targetY - snoop.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > snoop.speed) {
        snoop.x += (dx / dist) * snoop.speed;
        snoop.y += (dy / dist) * snoop.speed;
    }

    // Срезание кустов и вылет самокруток подальше
    bushes.forEach(bush => {
        if (!bush.isCut) {
            const closestX = Math.max(bush.x, Math.min(snoop.x, bush.x + tileW));
            const closestY = Math.max(bush.y, Math.min(snoop.y, bush.y + tileH));
            const d = Math.sqrt((snoop.x - closestX)**2 + (snoop.y - closestY)**2);
            
            if (d < snoop.radius) {
                bush.isCut = true;
                if (bush.hasCigarette) {
                    const angle = Math.random() * Math.PI * 2;
                    const throwDist = 50 + Math.random() * 20; // Отлетает подальше
                    let spawnX = bush.x + tileW / 2 + Math.cos(angle) * throwDist;
                    let spawnY = bush.y + tileH / 2 + Math.sin(angle) * throwDist;
                    
                    spawnX = Math.max(20, Math.min(window.innerWidth - 20, spawnX));
                    spawnY = Math.max(20, Math.min(window.innerHeight - 20, spawnY));

                    droppedItems.push({ x: spawnX, y: spawnY });
                }
            }
        }
    });

    // Проверка нахождения в доме
    const isSnoopInsideHome = (snoop.x >= homePos.x && snoop.x <= homePos.x + homePos.w &&
                               snoop.y >= homePos.y && snoop.y <= homePos.y + homePos.h);

    if (isSnoopInsideHome && hasItemInHand) {
        hasItemInHand = false;
        score += 1;
        updateUI();
        homeState = "water";
        homeTimer = 0;
    }

    // Отрисовка Снупа
    if (imgSnoop.complete && imgSnoop.width > 0) {
        ctx.drawImage(imgSnoop, snoop.x - 16, snoop.y - 22, 32, 38);
    } else {
        ctx.beginPath(); ctx.arc(snoop.x, snoop.y, snoop.radius, 0, Math.PI*2);
        ctx.fillStyle = '#7B1FA2'; ctx.fill(); ctx.closePath();
    }

    // 5. Иконка сушняка над домом
    if (homeState !== "none") {
        homeTimer++;
        const iconY = homePos.y - 25;
        const iconX = homePos.x + homePos.w / 2;

        ctx.beginPath(); ctx.arc(iconX, iconY, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#000"; ctx.stroke(); ctx.closePath();

        if (homeState === "water") {
            if (imgWater.complete && imgWater.width > 0) {
                ctx.drawImage(imgWater, iconX - 10, iconY - 10, 20, 20);
            }
            if (homeTimer > 120) { homeState = "smile"; homeTimer = 0; }
        } else if (homeState === "smile") {
            if (imgSmile.complete && imgSmile.width > 0) {
                ctx.drawImage(imgSmile, iconX - 10, iconY - 10, 20, 20);
            }
            if (homeTimer > 120) { homeState = "none"; }
        }
    }

    // 6. Надпись тревоги
    if (hasItemInHand) {
        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("СРОЧНО ВЕРНИТЕСЬ ДОМОЙ! НУЖНО ПОПИТЬ!", canvas.width / 2, 35);
    }

    // 7. Логика Копа
    cop.changeTargetTimer++;
    if (cop.changeTargetTimer > 200) {
        cop.targetX = Math.random() * window.innerWidth;
        cop.targetY = Math.random() * window.innerHeight;
        cop.changeTargetTimer = 0;
    }

    const cDx = cop.targetX - cop.x;
    const cDy = cop.targetY - cop.y;
    const cDist = Math.sqrt(cDx*cDx + cDy*cDy);

    if (cDist > cop.speed) {
        cop.x += (cDx / cDist) * cop.speed;
        cop.y += (cDy / cDist) * cop.speed;
        cop.angle = Math.atan2(cDy, cDx);
    }

    // Фонарик копа
    const viewDistance = 80;
    const coneAngle = Math.PI / 4;

    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.rotate(cop.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, viewDistance, -coneAngle/2, coneAngle/2);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 100, 0.22)";
    ctx.fill();
    ctx.restore();

    if (!isSnoopInsideHome) {
        const vX = snoop.x - cop.x;
const vY = snoop.y - cop.y;
const dToSnoop = Math.sqrt(vXvX + vYvY);
if (dToSnoop < viewDistance) {
let aToSnoop = Math.atan2(vY, vX);
let aDiff = Math.atan2(Math.sin(aToSnoop - cop.angle), Math.cos(aToSnoop - cop.angle));
if (Math.abs(aDiff) < coneAngle / 2) {
gameOver = true;
}
}
}
// Рисуем копа
if (imgCop.complete && imgCop.width > 0) {
ctx.drawImage(imgCop, cop.x - 15, cop.y - 18, 30, 35);
} else {
ctx.beginPath(); ctx.arc(cop.x, cop.y, 10, 0, Math.PI*2);
ctx.fillStyle = '#0d47a1'; ctx.fill(); ctx.closePath();
}
requestAnimationFrame(gameLoop);
}
const restartAction = () => {
if (gameOver) {
gameOver = false;
score = 0;
hasItemInHand = false;
homeState = "none";
snoop.x = window.innerWidth / 2;
snoop.y = window.innerHeight / 2;
snoop.targetX = snoop.x;
snoop.targetY = snoop.y;
updateUI();
}
};
window.addEventListener('click', restartAction);
window.addEventListener('touchstart', restartAction);
gameLoop();
