const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Автоматически меняем текст счетчика под новую тематику
const scoreBoard = document.getElementById('score-board');
if (scoreBoard) {
    scoreBoard.innerHTML = 'Самокрутки: <span id="score">0</span>';
}
const updatedScoreElement = document.getElementById('score');

let score = 0;

// Настройка размеров экрана
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const tileSize = 40; // Размер квадрата кустов

// Персонаж: Снуп Догг
const snoop = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 15,
    targetX: window.innerWidth / 2,
    targetY: window.innerHeight / 2,
    speed: 5 // Скорость перемещения Снупа
};

// Генерация сетки из кустов
let bushes = [];
const cols = Math.ceil(window.innerWidth / tileSize) + 1;
const rows = Math.ceil(window.innerHeight / tileSize) + 1;

for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
        bushes.push({
            x: c * tileSize,
            y: r * tileSize,
            isCut: false, // Срезан ли куст
            hasCigarette: Math.random() < 0.20 // 20% шанс найти самокрутку в кустах
        });
    }
}

// Функция считывания координат для движения
function handleInput(clientX, clientY) {
    snoop.targetX = clientX;
    snoop.targetY = clientY;
}

// Управление для ПК
window.addEventListener('click', (e) => {
    handleInput(e.clientX, e.clientY);
});

// Управление для iPhone (Тапы)
window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });

// Игровой цикл
function gameLoop() {
    // Задний фон (земля после срезания кустов)
    ctx.fillStyle = '#1e251c'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Отрисовка кустов
    bushes.forEach(bush => {
        if (!bush.isCut) {
            ctx.fillStyle = '#2E7D32'; // Зеленый цвет кустов
            ctx.fillRect(bush.x + 1, bush.y + 1, tileSize - 2, tileSize - 2);
            
            // Легкий внутренний узор для текстуры куста
            ctx.fillStyle = '#1B5E20';
            ctx.fillRect(bush.x + 10, bush.y + 10, tileSize - 20, tileSize - 20);
        }
    });

    // 2. Логика плавного движения Снуп Догга
    const dx = snoop.targetX - snoop.x;
    const dy = snoop.targetY - snoop.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > snoop.speed) {
        snoop.x += (dx / distance) * snoop.speed;
        snoop.y += (dy / distance) * snoop.speed;
    } else {
        snoop.x = snoop.targetX;
        snoop.y = snoop.targetY;
    }

    // 3. Проверка столкновения с кустами (срезание кустов и сбор самокруток)
    bushes.forEach(bush => {
        if (!bush.isCut) {
            const closestX = Math.max(bush.x, Math.min(snoop.x, bush.x + tileSize));
            const closestY = Math.max(bush.y, Math.min(snoop.y, bush.y + tileSize));
            const dist = Math.sqrt((snoop.x - closestX) ** 2 + (snoop.y - closestY) ** 2);

            if (dist < snoop.radius) {
                bush.isCut = true; // Куст срезан
                if (bush.hasCigarette) {
                    score += 1;
                    if (updatedScoreElement) updatedScoreElement.innerText = score;
                }
            }
        }
    });

    // 4. Отрисовка персонажа (Снуп Догг)
    ctx.beginPath();
    ctx.arc(snoop.x, snoop.y, snoop.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#7B1FA2'; // Фиолетовый цвет худи Снупа
    ctx.fill();
    
    // Золотая обводка/цепь персонажа
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFD700'; 
    ctx.stroke();
    ctx.closePath();

    requestAnimationFrame(gameLoop);
}

// Старт игры
gameLoop();
