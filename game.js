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

// Полное динамическое заполнение экрана iPhone от края до края
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
}
window.addEventListener('resize', () => {
    resizeCanvas();
    // Пересобирать сетку при изменении экрана не нужно, чтобы не ломать игру
});
resizeCanvas();

// Загрузка картинок
const imgSnoop = new Image(); imgSnoop.src = 'snoop.png';
const imgBush = new Image();   imgBush.src = 'bush.png';
const imgCop = new Image();    imgCop.src = 'cop.png';
const imgItem = new Image();   imgItem.src = 'item.png';
const imgHome = new Image();   imgHome.src = 'home.png';
const imgWater = new Image();  imgWater.src = 'water.png';
const imgSmile = new Image();  imgSmile.src = 'smile.png';

const tileSize = 36; // Оптимальный размер куста для плотной сетки

// Вытянутый дом строго по центру динамического экрана
const homePos = {
    x: Math.floor(window.innerWidth / 2) - (tileSize * 2.5),
    y: Math.floor(window.innerHeight / 2) - tileSize,
    w: tileSize * 5, // Сделали дом еще шире, чтобы убрать сплющивание
    h: tileSize * 2  
};

// Снуп Догг стартует из центра дома
const snoop = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 12,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    speed: 4
};

// Заполняем абсолютно весь прямоугольник экрана кустами
let bushes = [];
for (let x = 0; x < window.innerWidth + tileSize; x += tileSize) {
    for (let y = 0; y < window.innerHeight + tileSize; y += tileSize) {
        // Пропускаем зону дома
        if (x >= homePos.x - 10 && x < homePos.x + homePos.w && y >= homePos.y - 10 && y < homePos.y + homePos.h) {
            continue;
        }
        bushes.push({
            x: x,
            y: y,
            isCut: false,
            hasCigarette: Math.random() < 0.08 // Шанс 8%
        });
    }
}

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
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
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

    // Земля подстраивается под размеры экрана
    ctx.fillStyle = '#1e231c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Отрисовка дома (вытянут по ширине)
    if (imgHome.complete && imgHome.width > 0) {
        ctx.drawImage(imgHome, homePos.x, homePos.y - tileSize, homePos.w, homePos.h + tileSize);
    } else {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(homePos.x, homePos.y, homePos.w, homePos.h);
    }

    // 2. Отрисовка кустов
    bushes.forEach(bush => {
        if (!bush.isCut) {
            if (imgBush.complete && imgBush.width > 0) {
                ctx.drawImage(imgBush, bush.x - 2, bush.y - 10, tileSize + 4, tileSize + 12);
            } else {
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(bush.x + 1, bush.y + 1, tileSize - 2, tileSize - 2);
            }
        }
    });

    // 3. Отрисовка выпавших самокруток
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        if (imgItem.complete && imgItem.width > 0) {
            ctx.drawImage(imgItem, item.x - 16, item.y - 16, 32, 32); // Крупная четкая иконка
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
            const closestX = Math.max(bush.x, Math.min(snoop.x, bush.x + tileSize));
            const closestY = Math.max(bush.y, Math.min(snoop.y, bush.y + tileSize));
            const d = Math.sqrt((snoop.x - closestX)**2 + (snoop.y - closestY)**2);
            
            if (d < snoop.radius) {
                bush.isCut = true;
                if (bush.hasCigarette) {
                    // Выталкиваем самокрутку по направлению от Снупа на расстояние 45-60 пикселей, чтобы её точно заметили
                    const angle = Math.random() * Math.PI * 2;
                    const throwDist = 45 + Math.random() * 15;
                    let spawnX = bush.x + tileSize / 2 + Math.cos(angle) * throwDist;
                    let spawnY = bush.y + tileSize / 2 + Math.sin(angle) * throwDist;
                    
                    // Удерживаем выпавшую самокрутку в границах экрана
                    spawnX = Math.max(20, Math.min(window.innerWidth - 20, spawnX));
                    spawnY = Math.max(20, Math.min(window.innerHeight - 20, spawnY));

                    droppedItems.push({ x: spawnX, y: spawnY });
                }
            }
        }
    });

    // Проверяем безопасность в доме
    const isSnoopInsideHome = (snoop.x >= homePos.x && snoop.x <= homePos.x + homePos.w &&
                               snoop.y >= homePos.y && snoop.y <= homePos.y + homePos.h);

    if (isSnoopInsideHome && hasItemInHand) {
        hasItemInHand = false;
        score += 1;
        updateUI();
        homeState = "water";
        homeTimer = 0;
    }

    // Рисуем Снупа
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

    // Защита: ловим только если Снуп НЕ в доме!
    if (!isSnoopInsideHome) {
        const vX = snoop.x - cop.x;
        const vY = snoop.y - cop.y;
        const dToSnoop = Math.sqrt(vX*vX + vY*vY);

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
