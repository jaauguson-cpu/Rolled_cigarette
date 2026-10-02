const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let currentLevel = 1;
let gameOver = false;

// Создаем красивый читаемый интерфейс
const scoreBoard = document.getElementById('score-board');
function updateUI() {
    if (scoreBoard) {
        scoreBoard.innerHTML = `Уровень: ${currentLevel} | Самокрутки: <span id="score">${score}</span>`;
    }
}
updateUI();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Загрузка ассетов
const imgSnoop = new Image(); imgSnoop.src = 'snoop.png';
const imgBush = new Image();   imgBush.src = 'bush.png';
const imgCop = new Image();    imgCop.src = 'cop.png';
const imgItem = new Image();   imgItem.src = 'item.png';

const tileSize = 40; 
let mapTilesX = 6; // Начальный размер поля (6х6 кустов)
let mapTilesY = 6;

// Перевод координат в Изометрию (центрирование по экрану)
function toIso(x, y) {
    const mapWidthPixels = mapTilesX * tileSize;
    return {
        x: (x - y) + canvas.width / 2,
        y: (x + y) / 2 + (canvas.height / 4)
    };
}

function toScreen(isoX, isoY) {
    let shiftedX = isoX - canvas.width / 2;
    let shiftedY = isoY - (canvas.height / 4);
    return {
        x: (2 * shiftedY + shiftedX) / 2,
        y: (2 * shiftedY - shiftedX) / 2
    };
}

// Снуп Догг
const snoop = {
    x: 0,
    y: 0,
    size: 20,
    targetX: 0,
    targetY: 0,
    speed: 3.5
};

let bushes = [];
let droppedItems = [];
let cops = [];

// Функция старта уровня
function startLevel(level) {
    currentLevel = level;
    mapTilesX = 5 + level; // С каждым уровнем поле растет
    mapTilesY = 5 + level;
    
    // Снуп всегда стартует в центре карты
    snoop.x = (mapTilesX * tileSize) / 2;
    snoop.y = (mapTilesY * tileSize) / 2;
    snoop.targetX = snoop.x;
    snoop.targetY = snoop.y;
    
    // Генерируем кусты
    bushes = [];
    for (let x = 0; x < mapTilesX * tileSize; x += tileSize) {
        for (let y = 0; y < mapTilesY * tileSize; y += tileSize) {
            bushes.push({
                x: x, y: y,
                isCut: false,
                hasCigarette: Math.random() < 0.02 // Шанс 2%
            });
        }
    }
    
    droppedItems = [];
    
    // Генерируем 3 копов в случайных углах карты
    cops = [];
    const corners = [
        {x: 20, y: 20},
        {x: (mapTilesX*tileSize) - 30, y: 20},
        {x: 20, y: (mapTilesY*tileSize) - 30},
        {x: (mapTilesX*tileSize) - 30, y: (mapTilesY*tileSize) - 30}
    ];
    
    for (let i = 0; i < 3; i++) {
        let startPos = corners[i % corners.length];
        cops.push({
            x: startPos.x,
            y: startPos.y,
            targetX: Math.random() * (mapTilesX * tileSize),
            targetY: Math.random() * (mapTilesY * tileSize),
            speed: 0.8, // Сделали копов медленными (было 1.5 - 2)
            angle: 0,
            changeTargetTimer: 0
        });
    }
    updateUI();
}

// Запускаем 1 уровень
startLevel(1);

function handleInput(clientX, clientY) {
    if (gameOver) return;
    const logicPos = toScreen(clientX, clientY);
    const maxW = mapTilesX * tileSize;
    const maxH = mapTilesY * tileSize;
    snoop.targetX = Math.max(0, Math.min(maxW, logicPos.x));
    snoop.targetY = Math.max(0, Math.min(maxH, logicPos.y));
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
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ПОЛИЦИЯ ПОЙМАЛА СНУПА!", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "18px sans-serif";
        ctx.fillText(`Вы дошли до ${currentLevel} уровня`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText("Тапните по экрану, чтобы начать заново", canvas.width / 2, canvas.height / 2 + 60);
        
        // Перезапуск по клику на экран проигрыша
        const restart = () => {
            gameOver = false;
            score = 0;
            startLevel(1);
            window.removeEventListener('click', restart);
            window.removeEventListener('touchstart', restart);
        };
        window.addEventListener('click', restart);
        window.addEventListener('touchstart', restart);
        return;
    }

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Рисуем Изометрическую плитку-землю под кустами
    for (let x = 0; x < mapTilesX * tileSize; x += tileSize) {
        for (let y = 0; y < mapTilesY * tileSize; y += tileSize) {
            const iso = toIso(x, y);
            ctx.beginPath();
            ctx.moveTo(iso.x, iso.y);
            ctx.lineTo(iso.x + tileSize, iso.y + tileSize/2);
            ctx.lineTo(iso.x, iso.y + tileSize);
            ctx.lineTo(iso.x - tileSize, iso.y + tileSize/2);
            ctx.closePath();
            ctx.fillStyle = '#252e22';
            ctx.fill();
            ctx.strokeStyle = '#1f261c';
            ctx.stroke();
        }
    }

    // 2. Отрисовка кустов
    let remainingBushes = 0;
    bushes.forEach(bush => {
        const iso = toIso(bush.x, bush.y);
        if (!bush.isCut) {
            remainingBushes++;
            if (imgBush.complete && imgBush.width > 0) {
                ctx.drawImage(imgBush, iso.x - tileSize, iso.y - tileSize, tileSize * 2, tileSize * 2);
            } else {
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(iso.x - 10, iso.y - 10, 20, 20);
            }
        }
    });

    // Проверка победы на уровне: если все кусты срезаны
    if (remainingBushes === 0) {
        startLevel(currentLevel + 1);
        return;
    }

    // 3. Отрисовка выпавших самокруток
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        const iso = toIso(item.x, item.y);
        
        if (imgItem.complete && imgItem.width > 0) {
            // Крупный размер 35х35 чтобы рассмотреть на экране iPhone
            ctx.drawImage(imgItem, iso.x - 17, iso.y - 17, 35, 35);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(iso.x - 6, iso.y - 6, 12, 12);
        }

        // Логика подбора предмета Снупом
        const dist = Math.sqrt((snoop.x - item.x)**2 + (snoop.y - item.y)**2);
        if (dist < snoop.size + 10) {
            score += 1;
            updateUI();
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

    // Срезание кустов
    bushes.forEach(bush => {
        if (!bush.isCut) {
            const d = Math.sqrt((snoop.x - (bush.x + tileSize/2))**2 + (snoop.y - (bush.y + tileSize/2))**2);
            if (d < snoop.size) {
                bush.isCut = true;
                if (bush.hasCigarette) {
                    // Выталкиваем предмет чуть в сторону, чтобы игрок его заметил
                    droppedItems.push({ 
                        x: bush.x + tileSize/2 + (Math.random() * 20 - 10), 
                        y: bush.y + tileSize/2 + (Math.random() * 20 - 10)
                    });
                }
            }
        }
    });

    // Отрисовка Снупа
    const snoopIso = toIso(snoop.x, snoop.y);
    if (imgSnoop.complete && imgSnoop.width > 0) {
        ctx.drawImage(imgSnoop, snoopIso.x - 20, snoopIso.y - 35, 40, 45);
    } else {
        ctx.beginPath(); ctx.arc(snoopIso.x, snoopIso.y, 12, 0, Math.PI*2);
        ctx.fillStyle = '#7B1FA2'; ctx.fill(); ctx.closePath();
    }

    // 5. Логика копов (Хаотичное блуждание)
    cops.forEach(cop => {
        cop.changeTargetTimer++;
        
        // Каждые 4 секунды (240 кадров) коп выбирает случайную новую цель на карте
        if (cop.changeTargetTimer > 240) {
            cop.targetX = Math.random() * (mapTilesX * tileSize);
            cop.targetY = Math.random() * (mapTilesY * tileSize);
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

        const copIso = toIso(cop.x, cop.y);

        // Отрисовка фонарика копа
        const viewDistance = 90; // Чуть уменьшили дальность луча фонарика
        const coneAngle = Math.PI / 4; 

        ctx.save();
        ctx.translate(copIso.x, copIso.y);
        ctx.scale(1, 0.5); 
        ctx.rotate(cop.angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, viewDistance, -coneAngle/2, coneAngle/2);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 255, 100, 0.25)";
        ctx.fill();
        ctx.restore();

        // Проверка поимки
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
        
        // Рисуем копа
if (imgCop.complete && imgCop.width > 0) {
ctx.drawImage(imgCop, copIso.x - 20, copIso.y - 35, 40, 45);
} else {
ctx.beginPath(); ctx.arc(copIso.x, copIso.y, 10, 0, Math.PI*2);
ctx.fillStyle = '#0d47a1'; ctx.fill(); ctx.closePath();
}
});
requestAnimationFrame(gameLoop);
}
gameLoop();

