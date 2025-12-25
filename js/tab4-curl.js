/**
 * Tab 4: Curl - Rotation & Spin
 * Interactive visualization with paddle wheels showing local rotation
 */

let particles = [];
let vortices = [];
let fieldType = 'rotation';
let fieldStrength = 1.0;
let showPaddles = true;
let paddleAngles = [];
let canvas;
let centerX, centerY;

const PARTICLE_COUNT = 150;
const GRID_SPACING = 50;

function setup() {
    const container = document.getElementById('curl-demo');
    const width = container.offsetWidth;
    const height = 450;
    
    canvas = createCanvas(width, height);
    canvas.parent('curl-demo');
    
    centerX = width / 2;
    centerY = height / 2;
    
    initParticles();
    initPaddleAngles();
}

function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: random(width),
            y: random(height),
            age: random(100),
            maxAge: random(100, 180),
            size: random(2, 4)
        });
    }
}

function initPaddleAngles() {
    paddleAngles = [];
    for (let x = GRID_SPACING; x < width; x += GRID_SPACING) {
        for (let y = GRID_SPACING; y < height; y += GRID_SPACING) {
            paddleAngles.push({
                x: x,
                y: y,
                angle: random(TWO_PI)
            });
        }
    }
}

// Vector field function
function getField(x, y) {
    let nx = (x - centerX) / 100;
    let ny = (y - centerY) / 100;
    let vx = 0, vy = 0;
    
    switch(fieldType) {
        case 'rotation':
            // Counterclockwise rotation: F = (-y, x)
            vx = -ny;
            vy = nx;
            break;
            
        case 'rotation-cw':
            // Clockwise rotation: F = (y, -x)
            vx = ny;
            vy = -nx;
            break;
            
        case 'shear':
            // Shear flow: F = (y, 0)
            vx = ny;
            vy = 0;
            break;
            
        case 'uniform':
            // Uniform flow: F = (1, 0)
            vx = 1;
            vy = 0;
            break;
            
        case 'vortex':
            // Point vortex: tangential velocity that decreases with distance
            let dist = sqrt(nx * nx + ny * ny) + 0.1;
            vx = -ny / dist;
            vy = nx / dist;
            break;
            
        case 'custom':
            // Add contributions from user-placed vortices
            for (let v of vortices) {
                let dx = x - v.x;
                let dy = y - v.y;
                let d = sqrt(dx * dx + dy * dy) + 20;
                let strength = v.strength * 2000 / (d * d);
                strength = min(strength, 3);
                vx += -dy / d * strength;
                vy += dx / d * strength;
            }
            break;
    }
    
    return { x: vx * fieldStrength, y: vy * fieldStrength };
}

// Calculate curl at a point numerically
function getCurl(x, y) {
    let h = 5;
    
    let fy_right = getField(x + h, y);
    let fy_left = getField(x - h, y);
    let fx_up = getField(x, y + h);
    let fx_down = getField(x, y - h);
    
    let dFy_dx = (fy_right.y - fy_left.y) / (2 * h);
    let dFx_dy = (fx_up.x - fx_down.x) / (2 * h);
    
    return dFy_dx - dFx_dy;
}

function draw() {
    // Background
    background(17, 24, 39);
    
    // Draw curl field as colored background
    drawCurlField();
    
    // Draw vector field
    drawVectorField();
    
    // Update and draw paddle wheels
    if (showPaddles) {
        updateAndDrawPaddles();
    }
    
    // Update and draw particles
    updateAndDrawParticles();
    
    // Draw vortices for custom mode
    if (fieldType === 'custom') {
        drawVortices();
    }
    
    // Info overlay
    fill(148, 163, 184);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Field: ${fieldType}`, 10, 10);
    
    // Show curl value at mouse
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        let curl = getCurl(mouseX, mouseY);
        text(`Curl at cursor: ${curl.toFixed(3)}`, 10, 26);
    }
}

function drawCurlField() {
    noStroke();
    let cellSize = 25;
    
    for (let x = 0; x < width; x += cellSize) {
        for (let y = 0; y < height; y += cellSize) {
            let curl = getCurl(x + cellSize/2, y + cellSize/2);
            
            if (curl > 0) {
                // Positive curl (CCW): green
                let alpha = min(map(curl, 0, 0.05, 0, 80), 80);
                fill(16, 185, 129, alpha);
            } else {
                // Negative curl (CW): orange
                let alpha = min(map(-curl, 0, 0.05, 0, 80), 80);
                fill(249, 115, 22, alpha);
            }
            
            rect(x, y, cellSize, cellSize);
        }
    }
}

function drawVectorField() {
    for (let x = GRID_SPACING/2; x < width; x += GRID_SPACING) {
        for (let y = GRID_SPACING/2; y < height; y += GRID_SPACING) {
            let v = getField(x, y);
            let mag = sqrt(v.x * v.x + v.y * v.y);
            
            if (mag > 0.01) {
                let angle = atan2(v.y, v.x);
                let arrowLen = min(mag * 12, GRID_SPACING * 0.6);
                
                stroke(6, 182, 212, 150);
                strokeWeight(1.5);
                
                let endX = x + cos(angle) * arrowLen;
                let endY = y + sin(angle) * arrowLen;
                line(x, y, endX, endY);
                
                // Arrow head
                let headSize = min(4, arrowLen * 0.3);
                let headAngle1 = angle + PI * 0.8;
                let headAngle2 = angle - PI * 0.8;
                line(endX, endY, endX + cos(headAngle1) * headSize, endY + sin(headAngle1) * headSize);
                line(endX, endY, endX + cos(headAngle2) * headSize, endY + sin(headAngle2) * headSize);
            }
        }
    }
}

function updateAndDrawPaddles() {
    for (let paddle of paddleAngles) {
        let curl = getCurl(paddle.x, paddle.y);
        
        // Update paddle angle based on curl (curl determines angular velocity)
        paddle.angle += curl * 2;
        
        // Draw paddle wheel
        let size = min(20, max(8, abs(curl) * 500));
        
        push();
        translate(paddle.x, paddle.y);
        rotate(paddle.angle);
        
        // Color based on curl direction
        if (curl > 0.001) {
            stroke(16, 185, 129); // Green for CCW
            fill(16, 185, 129, 100);
        } else if (curl < -0.001) {
            stroke(249, 115, 22); // Orange for CW
            fill(249, 115, 22, 100);
        } else {
            stroke(100, 116, 139);
            fill(100, 116, 139, 50);
        }
        
        strokeWeight(2);
        
        // Draw paddle blades
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * HALF_PI);
            line(0, 0, size, 0);
            // Blade
            beginShape();
            vertex(size * 0.3, -2);
            vertex(size, -3);
            vertex(size, 3);
            vertex(size * 0.3, 2);
            endShape(CLOSE);
            pop();
        }
        
        // Center hub
        noStroke();
        ellipse(0, 0, 6, 6);
        
        pop();
    }
}

function updateAndDrawParticles() {
    for (let p of particles) {
        let v = getField(p.x, p.y);
        
        p.x += v.x * 2;
        p.y += v.y * 2;
        p.age++;
        
        // Reset if out of bounds or too old
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.age > p.maxAge) {
            p.x = random(width);
            p.y = random(height);
            p.age = 0;
        }
        
        // Draw particle
        let alpha = map(p.age, 0, p.maxAge, 200, 50);
        noStroke();
        fill(255, 255, 255, alpha);
        ellipse(p.x, p.y, p.size, p.size);
    }
}

function drawVortices() {
    for (let v of vortices) {
        let isPositive = v.strength > 0;
        
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = isPositive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(249, 115, 22, 0.5)';
        
        noFill();
        stroke(isPositive ? color(16, 185, 129) : color(249, 115, 22));
        strokeWeight(2);
        ellipse(v.x, v.y, 25, 25);
        
        // Rotation arrow
        let arrowAngle = isPositive ? -HALF_PI : HALF_PI;
        arc(v.x, v.y, 35, 35, arrowAngle - 0.5, arrowAngle + 1.5);
        
        drawingContext.shadowBlur = 0;
    }
}

function mousePressed() {
    if (fieldType === 'custom' && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        // Left click = CCW vortex, we'll use positive strength
        vortices.push({
            x: mouseX,
            y: mouseY,
            strength: 1
        });
    }
}

function windowResized() {
    const container = document.getElementById('curl-demo');
    resizeCanvas(container.offsetWidth, 450);
    centerX = width / 2;
    centerY = height / 2;
    initPaddleAngles();
}

// Control functions
function updateFieldType(type) {
    fieldType = type;
    vortices = [];
    initParticles();
    initPaddleAngles();
}

function updateStrength(val) {
    fieldStrength = parseFloat(val);
    document.getElementById('strength-value').textContent = fieldStrength.toFixed(1);
}

function togglePaddles(show) {
    showPaddles = show;
}

function resetDemo() {
    fieldType = 'rotation';
    fieldStrength = 1.0;
    showPaddles = true;
    vortices = [];
    
    document.getElementById('field-type').value = 'rotation';
    document.getElementById('strength-slider').value = 1;
    document.getElementById('strength-value').textContent = '1.0';
    document.getElementById('show-paddles').checked = true;
    
    initParticles();
    initPaddleAngles();
}


