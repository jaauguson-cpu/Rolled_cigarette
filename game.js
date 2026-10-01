%%javascript
// Game configuration and state
const canvas = document.querySelector('canvas') || document.createElement('canvas');
if (!canvas.parentElement) {
    document.body.appendChild(canvas);
}
const ctx = canvas.getContext('2d');

const scoreElement = document.getElementById('score');
let score = 0;

function updateScore(points) {
    score += points;
    if (scoreElement) {
        scoreElement.textContent = score;
    }
}

// Character configuration (Snoop Dogg)
const player = {
    x: 0,
    y: 0,
    radius: 15,
    speed: 4, // pixels per frame
    targetX: 0,
    targetY: 0,
    isMoving: false
};

// Grid and Bushes
const tileSize = 40;
let bushes = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Position player in the center on load/resize if not moving
    if (!player.isMoving) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.targetX = player.x;
        player.targetY = player.y;
    }
    
    generateGrid();
}

function generateGrid() {
    bushes = [];
    const cols = Math.ceil(canvas.width / tileSize);
    const rows = Math.ceil(canvas.height / tileSize);
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const bushX = c * tileSize;
            const bushY = r * tileSize;
            
            // Check if this bush overlaps with player starting center zone
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const distToCenter = Math.hypot((bushX + tileSize/2) - centerX, (bushY + tileSize/2) - centerY);
            
            // Keep center area clear so the player is visible initially
            if (distToCenter > 60) {
                bushes.push({
                    x: bushX,
                    y: bushY,
                    width: tileSize,
                    height: tileSize,
                    hasJoint: Math.random() < 0.2, // 20% chance to hide a joint
                    active: true
                });
            }
        }
    }
}

// Handle Taps / Clicks
function handleInput(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    player.targetX = clientX - rect.left;
    player.targetY = clientY - rect.top;
    player.isMoving = true;
}

window.addEventListener('click', handleInput);
window.addEventListener('touchstart', handleInput, { passive: false });
window.addEventListener('resize', resizeCanvas);

// Update Game Objects
function update() {
    if (player.isMoving) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > player.speed) {
            player.x += (dx / distance) * player.speed;
            player.y += (dy / distance) * player.speed;
        } else {
            player.x = player.targetX;
            player.y = player.targetY;
            player.isMoving = false;
        }
        
        checkCollisions();
    }
}

// Check if Snoop Dogg overlaps with active bush squares
function checkCollisions() {
    bushes.forEach(bush => {
        if (!bush.active) return;
        
        // Find closest point on bush rectangle to circle center
        const closestX = Math.max(bush.x, Math.min(player.x, bush.x + bush.width));
        const closestY = Math.max(bush.y, Math.min(player.y, bush.y + bush.height));
        
        const distance = Math.hypot(player.x - closestX, player.y - closestY);
        
        if (distance < player.radius) {
            bush.active = false; // Bush is cut/disappears
            if (bush.hasJoint) {
                updateScore(1);
            }
        }
    });
}

// Draw Game Objects
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Bushes
    ctx.fillStyle = '#2d7a29'; // Darker green for bushes
    bushes.forEach(bush => {
        if (bush.active) {
            ctx.fillRect(bush.x + 2, bush.y + 2, bush.width - 4, bush.height - 4);
        }
    });
    
    // Draw Snoop Dogg (Green circle)
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#4af626'; // Bright green
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

// Game Loop
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Init
resizeCanvas();
loop();
