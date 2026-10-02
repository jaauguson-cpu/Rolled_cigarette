const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

const scoreBoard = document.getElementById('score-board');
if (scoreBoard) {
    scoreBoard.innerHTML = 'Самокрутки: <span id="score">0</span>';
}
const updatedScoreElement = document.getElementById('score');

let score = 0;
let gameOver = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Загрузка изометрических ассетов
const imgSnoop = new Image(); imgSnoop.src = 'snoop.png';
const imgBush = new Image();   imgBush.src = 'bush.png';
const imgCop = new Image();    imgCop.src = 'cop.png';
const imgItem = new Image();   imgItem.src = 'item.png';

const tileSize = 50; // Размер плитки в изометрии

// Функции перевода координат в Изометрию
function toIso(x, y) {
    return {
        x: (x - y) + canvas.width / 2,
        y: (x + y) / 2 + 100
    };
}
function toScreen(isoX, isoY) {
    let shiftedX = isoX - canvas.width / 2;
    let shiftedY = isoY - 100;
    return {
        x: (2 * shiftedY + shiftedX) / 2,
        y: (2 * shiftedY - shiftedX) / 2
    };
}

// Персонаж Снуп Догг (координаты в 2D пространстве логики)
const snoop = {
    x: 100,
    y: 100,
    size: 30,
    targetX: 100,
    targetY: 100,
    speed: 4
};

// Сетка кустов
let bushes = [];
const worldSize = 400; // Размеры карты в пикселях
for (let x = 0; x < worldSize; x += tileSize) {
    for (let y = 0; y < worldSize; y += tileSize) {
        bushes.push({
            x: x, y: y,
            isCut: false,
            // Шанс уменьшен в 10 раз: с 20% до 2% (0.02)
            hasCigarette: Math.random() < 0.02 
        });
    }
}

// Массив выпавших на землю самокруток
let droppedItems = [];

// Враги: 3 полицейских
let cops = [
    { x: 50, y: 300, targetX: 350, targetY: 300, speed: 1.5, angle: 0, direction: 1 },
    { x: 300, y: 50, targetX: 300, targetY: 350, speed: 1.2, angle: Math.PI/2, direction: 1 },
    { x: 200, y: 200, targetX: 200, targetY: 50, speed: 2, angle: -Math.PI/2, direction: -1 }
];

function handleInput(clientX, clientY) {
    if (gameOver) return;
    const logicPos = toScreen(clientX, clientY);
    snoop.targetX = Math.max(0, Math.min(worldSize - 10, logicPos.x));
    snoop.targetY = Math.max(0, Math.min(worldSize - 10, logicPos.y));
}

window.addEventListener('click', (e) => handleInput(e.clientX, e.clientY));
window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });

function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ПОЛИЦИЯ ПОЙМАЛА СНУПА!", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "#ffffff";
        ctx.font = "18px sans-serif";
        ctx.fillText("Обновите страницу, чтобы начать заново", canvas.width / 2, canvas.height / 2 + 40);
        return;
    }

    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Отрисовка изометрической земли и кустов
    bushes.forEach(bush => {
        const iso = toIso(bush.x, bush.y);
        if (!bush.isCut) {
            if (imgBush.complete && imgBush.width > 0) {
                ctx.drawImage(imgBush, iso.x - tileSize, iso.y - tileSize, tileSize * 2, tileSize * 2);
            } else {
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(iso.x - 15, iso.y - 15, 30, 30);
            }
        }
    });

    // 2. Отрисовка выпавших самокруток
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        let item = droppedItems[i];
        const iso = toIso(item.x, item.y);
        
        if (imgItem.complete && imgItem.width > 0) {
            ctx.drawImage(imgItem, iso.x - 15, iso.y - 15, 30, 30);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(iso.x - 5, iso.y - 5, 10, 10);
        }

        // Логика подбора предмета Снупом
        const dist = Math.sqrt((snoop.x - item.x)**2 + (snoop.y - item.y)**2);
        if (dist < snoop.size) {
            score += 1;
            if (updatedScoreElement) updatedScoreElement.innerText = score;
            droppedItems.splice(i, 1);
        }
    }

    // 3. Движение Снупа
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
                    droppedItems.push({ x: bush.x + tileSize/2, y: bush.y + tileSize/2 });
                }
            }
        }
    });

    // Отрисовка Снупа в изометрии
    const snoopIso = toIso(snoop.x, snoop.y);
    if (imgSnoop.complete && imgSnoop.width > 0) {
        ctx.drawImage(imgSnoop, snoopIso.x - 20, snoopIso.y - 40, 40, 50);
    } else {
        ctx.beginPath(); ctx.arc(snoopIso.x, snoopIso.y, 15, 0, Math.PI*2);
        ctx.fillStyle = '#7B1FA2'; ctx.fill(); ctx.closePath();
    }

    // 4. Логика и отрисовка копов с фонариками
    cops.forEach(cop => {
        // Патрулирование туда-сюда
        if (cop.direction === 1) {
            const dX = cop.targetX - cop.x; const dY = cop.targetY - cop.y;
            const distance = Math.sqrt(dX*dX + dY*dY);
            if (distance > cop.speed) {
                cop.x += (dX / distance) * cop.speed; cop.y += (dY / distance) * cop.speed;
                cop.angle = Math.atan2(dY, dX);
            } else { cop.direction = -1; }
        } else {
            const startX = (cop === cops[0]) ? 50 : (cop === cops[1] ? 300 : 200);
            const startY = (cop === cops[0]) ? 300 : (cop === cops[1] ? 50 : 200);
            const dX = startX - cop.x; const dY = startY - cop.y;
            const distance = Math.sqrt(dX*dX + dY*dY);
            if (distance > cop.speed) {
                cop.x += (dX / distance) * cop.speed; cop.y += (dY / distance) * cop.speed;
                cop.angle = Math.atan2(dY, dX);
            } else { cop.direction = 1; }
        }

        const copIso = toIso(cop.x, cop.y);

        // Расчет и отрисовка конуса света фонарика
        const viewDistance = 120; 
        const coneAngle = Math.PI / 4; 

        ctx.save();
        ctx.translate(copIso.x, copIso.y);
        // В изометрии углы сжимаются по вертикали в 2 раза
        ctx.scale(1, 0.5); 
        ctx.rotate(cop.angle);

        // Рисуем полупрозрачный луч фонаря
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, viewDistance, -coneAngle/2, coneAngle/2);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 255, 0, 0.25)";
        ctx.fill();
        ctx.restore();

        // Проверка: попал ли Снуп в луч фонаря копа?
        const vectorX = snoop.x - cop.x;
        const vectorY = snoop.y - cop.y;
        const distanceToSnoop = Math.sqrt(vectorX*vectorX + vectorY*vectorY);

        if (distanceToSnoop < viewDistance) {
            let angleToSnoop = Math.atan2(vectorY, vectorX);
            let angleDiff = Math.atan2(Math.sin(angleToSnoop - cop.angle), Math.cos(angleToSnoop - cop.angle));
            
            if (Math.abs(angleDiff) < coneAngle / 2) {
                gameOver = true; // Поймали!
            }
        }

        // Рисуем самого копа
        if (imgCop.complete && imgCop.width > 0) {
            ctx.drawImage(imgCop, copIso.x - 20, copIso.y - 35, 40, 45);
        } else {
            ctx.beginPath(); ctx.arc(copIso.x, copIso.y, 12, 0, Math.PI*2);
            ctx.fillStyle = '#0d47a1'; ctx.fill(); ctx.closePath();
        }
    });

    requestAnimationFrame(gameLoop);
}

gameLoop();
