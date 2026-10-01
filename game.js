const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

let score = 0;

// Подстраиваем размер игрового поля под экран телефона или компьютера
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Настройки игры
const tileSize = 40; // Размер квадрата снега
const frog = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    targetX: canvas.width / 2,
    targetY: canvas.height / 2,
    speed: 5
};

// Генерация карты снега
let snowTiles = [];
const cols = Math.ceil(canvas.width / tileSize);
const rows = Math.ceil(canvas.height / tileSize);

for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
        snowTiles.push({
            x: c * tileSize,
            y: r * tileSize,
            isDug: false,
            hasGold: Math.random() < 0.15 // 15% шанс, что под снегом есть золото
        });
    }
}

// Управление тапами/кликами
function moveTo(clientX, clientY) {
    frog.targetX = clientX;
    frog.targetY = clientY;
}

window.addEventListener('click', (e) => moveTo(e.clientX, e.clientY));
window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
        moveTo(e.touches[0].clientX, e.touches[0].clientY);
    }
});

// Главный игровой цикл (обновление и рисование)
function gameLoop() {
    // 1. Очистка экрана
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Рисуем снег
    snowTiles.forEach(tile => {
        if (!tile.isDug) {
            ctx.fillStyle = '#e0f4f7'; // Цвет снега
            ctx.fillRect(tile.x + 1, tile.y + 1, tileSize - 2, tileSize - 2);
        }
    });

    // 3. Движение лягушки к точке тапа
    const dx = frog.targetX - frog.x;
    const dy = frog.targetY - frog.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > frog.speed) {
        frog.x += (dx / distance) * frog.speed;
        frog.y += (dy / distance) * frog.speed;
    } else {
        frog.x = frog.targetX;
        frog.y = frog.targetY;
    }

    // 4. Проверка столкновения лягушки со снегом (раскопка)
    snowTiles.forEach(tile => {
        if (!tile.isDug) {
            // Проверяем, заходит ли круг лягушки на квадрат снега
            const closestX = Math.max(tile.x, Math.min(frog.x, tile.x + tileSize));
            const closestY = Math.max(tile.y, Math.min(frog.y, tile.y + tileSize));
            const distChunks = Math.sqrt((frog.x - closestX) ** 2 + (frog.y - closestY) ** 2);

            if (distChunks < frog.radius) {
                tile.isDug = true; // Снег убран
                if (tile.hasGold) {
                    score += 1;
                    scoreElement.innerText = score; // Обновляем счетчик
                }
            }
        }
    });

    // 5. Рисуем лягушку (зеленый кружок)
    ctx.beginPath();
    ctx.arc(frog.x, frog.y, frog.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#4CAF50'; // Зеленый цвет лягушки
    ctx.fill();
    ctx.closePath();

    requestAnimationFrame(gameLoop);
}

// Запуск игры
gameLoop();
