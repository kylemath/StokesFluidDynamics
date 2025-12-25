/**
 * Tab 6: Circulation & Flux
 * Interactive demonstration of circulation around moveable loops
 */

let particles = [];
let loopCenter;
let loopRadius = 80;
let isDragging = false;
let fieldType = 'rotation';
let canvas;
let centerX, centerY;
let circulation = 0;
let avgCurl = 0;

const PARTICLE_COUNT = 120;
const GRID_SPACING = 45;

function setup() {
    const container = document.getElementById('circulation-demo');
    const width = container.offsetWidth;
    const height = 450;
    
    canvas = createCanvas(width, height);
    canvas.parent('circulation-demo');
    
    centerX = width / 2;
    centerY = height / 2;
    loopCenter = createVector(centerX, centerY);
    
    initParticles();
    calculateCirculation();
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

// Vector field function
function getField(x, y) {
    let nx = (x - centerX) / 100;
    let ny = (y - centerY) / 100;
    let vx = 0, vy = 0;
    
    switch(fieldType) {
        case 'rotation':
            // Constant rotation - F = (-y, x)
            vx = -ny;
            vy = nx;
            break;
            
        case 'uniform':
            // Uniform flow - no curl
            vx = 1;
            vy = 0.3;
            break;
            
        case 'radial':
            // Radial outward - no curl (conservative)
            let dist = sqrt(nx * nx + ny * ny) + 0.1;
            vx = nx / dist;
            vy = ny / dist;
            break;
            
        case 'shear':
            // Shear flow - has negative curl
            vx = ny;
            vy = 0;
            break;
    }
    
    return { x: vx, y: vy };
}

// Calculate curl at a point
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

function calculateCirculation() {
    // Numerically integrate around the circle
    const numPoints = 100;
    circulation = 0;
    
    for (let i = 0; i < numPoints; i++) {
        let angle1 = (i / numPoints) * TWO_PI;
        let angle2 = ((i + 1) / numPoints) * TWO_PI;
        
        // Points on circle
        let x1 = loopCenter.x + cos(angle1) * loopRadius;
        let y1 = loopCenter.y + sin(angle1) * loopRadius;
        let x2 = loopCenter.x + cos(angle2) * loopRadius;
        let y2 = loopCenter.y + sin(angle2) * loopRadius;
        
        // dr = (dx, dy)
        let dx = x2 - x1;
        let dy = y2 - y1;
        
        // Field at midpoint
        let mx = (x1 + x2) / 2;
        let my = (y1 + y2) / 2;
        let v = getField(mx, my);
        
        // F · dr
        circulation += (v.x * dx + v.y * dy) / 100;
    }
    
    // Calculate average curl inside the loop
    const gridStep = 10;
    let curlSum = 0;
    let count = 0;
    
    for (let x = loopCenter.x - loopRadius; x <= loopCenter.x + loopRadius; x += gridStep) {
        for (let y = loopCenter.y - loopRadius; y <= loopCenter.y + loopRadius; y += gridStep) {
            let d = dist(x, y, loopCenter.x, loopCenter.y);
            if (d <= loopRadius) {
                curlSum += getCurl(x, y);
                count++;
            }
        }
    }
    
    avgCurl = count > 0 ? curlSum / count : 0;
    
    // Update displays
    document.getElementById('circulation-value').textContent = circulation.toFixed(2);
    document.getElementById('curl-value').textContent = avgCurl.toFixed(4);
    
    // Color based on sign
    let circDisplay = document.getElementById('circulation-value');
    let curlDisplay = document.getElementById('curl-value');
    
    circDisplay.style.color = circulation > 0.01 ? '#10b981' : 
                              circulation < -0.01 ? '#ef4444' : '#94a3b8';
    curlDisplay.style.color = avgCurl > 0.0001 ? '#10b981' : 
                              avgCurl < -0.0001 ? '#ef4444' : '#94a3b8';
}

function draw() {
    // Background
    background(17, 24, 39);
    
    // Draw curl field as background
    drawCurlField();
    
    // Draw vector field
    drawVectorField();
    
    // Update and draw particles
    updateAndDrawParticles();
    
    // Draw the circulation loop
    drawLoop();
    
    // Info overlay
    fill(148, 163, 184);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Field: ${fieldType}`, 10, 10);
}

function drawCurlField() {
    noStroke();
    let cellSize = 30;
    
    for (let x = 0; x < width; x += cellSize) {
        for (let y = 0; y < height; y += cellSize) {
            let curl = getCurl(x + cellSize/2, y + cellSize/2);
            
            if (curl > 0.0001) {
                let alpha = min(map(curl, 0, 0.02, 0, 40), 40);
                fill(16, 185, 129, alpha);
            } else if (curl < -0.0001) {
                let alpha = min(map(-curl, 0, 0.02, 0, 40), 40);
                fill(249, 115, 22, alpha);
            } else {
                fill(0, 0, 0, 0);
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
                let arrowLen = min(mag * 15, GRID_SPACING * 0.6);
                
                stroke(6, 182, 212, 80);
                strokeWeight(1);
                
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

function updateAndDrawParticles() {
    for (let p of particles) {
        let v = getField(p.x, p.y);
        
        p.x += v.x * 2;
        p.y += v.y * 2;
        p.age++;
        
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.age > p.maxAge) {
            p.x = random(width);
            p.y = random(height);
            p.age = 0;
        }
        
        let alpha = map(p.age, 0, p.maxAge, 180, 50);
        noStroke();
        fill(255, 255, 255, alpha);
        ellipse(p.x, p.y, p.size, p.size);
    }
}

function drawLoop() {
    // Draw filled region (slightly)
    let insideColor = circulation > 0.01 ? color(16, 185, 129, 20) : 
                      circulation < -0.01 ? color(249, 115, 22, 20) : 
                      color(100, 116, 139, 20);
    fill(insideColor);
    noStroke();
    ellipse(loopCenter.x, loopCenter.y, loopRadius * 2, loopRadius * 2);
    
    // Draw loop with circulation direction arrows
    let loopColor = circulation > 0.01 ? color(16, 185, 129) : 
                    circulation < -0.01 ? color(249, 115, 22) : 
                    color(100, 116, 139);
    
    noFill();
    stroke(loopColor);
    strokeWeight(3);
    ellipse(loopCenter.x, loopCenter.y, loopRadius * 2, loopRadius * 2);
    
    // Draw direction arrows on the loop
    const numArrows = 8;
    for (let i = 0; i < numArrows; i++) {
        let angle = (i / numArrows) * TWO_PI;
        let x = loopCenter.x + cos(angle) * loopRadius;
        let y = loopCenter.y + sin(angle) * loopRadius;
        
        // Tangent direction (counterclockwise)
        let tx = -sin(angle);
        let ty = cos(angle);
        
        // Draw small arrow
        let arrowLen = 15;
        let arrowX = x + tx * arrowLen;
        let arrowY = y + ty * arrowLen;
        
        stroke(loopColor);
        strokeWeight(2);
        line(x, y, arrowX, arrowY);
        
        // Arrow head
        let headAngle = atan2(ty, tx);
        let headSize = 5;
        line(arrowX, arrowY, 
             arrowX + cos(headAngle + PI * 0.75) * headSize, 
             arrowY + sin(headAngle + PI * 0.75) * headSize);
        line(arrowX, arrowY, 
             arrowX + cos(headAngle - PI * 0.75) * headSize, 
             arrowY + sin(headAngle - PI * 0.75) * headSize);
    }
    
    // Draw center handle
    fill(loopColor);
    noStroke();
    ellipse(loopCenter.x, loopCenter.y, 15, 15);
    
    // Drag hint
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(10);
    text('↔', loopCenter.x, loopCenter.y);
}

function mousePressed() {
    let d = dist(mouseX, mouseY, loopCenter.x, loopCenter.y);
    if (d < loopRadius + 20) {
        isDragging = true;
    }
}

function mouseDragged() {
    if (isDragging) {
        loopCenter.x = constrain(mouseX, loopRadius + 10, width - loopRadius - 10);
        loopCenter.y = constrain(mouseY, loopRadius + 10, height - loopRadius - 10);
        calculateCirculation();
    }
}

function mouseReleased() {
    isDragging = false;
}

function windowResized() {
    const container = document.getElementById('circulation-demo');
    resizeCanvas(container.offsetWidth, 450);
    centerX = width / 2;
    centerY = height / 2;
    if (!isDragging) {
        loopCenter.x = constrain(loopCenter.x, loopRadius + 10, width - loopRadius - 10);
        loopCenter.y = constrain(loopCenter.y, loopRadius + 10, height - loopRadius - 10);
    }
    calculateCirculation();
}

// Control functions
function updateFieldType(type) {
    fieldType = type;
    initParticles();
    calculateCirculation();
}

function updateRadius(val) {
    loopRadius = parseInt(val);
    document.getElementById('radius-value').textContent = loopRadius;
    loopCenter.x = constrain(loopCenter.x, loopRadius + 10, width - loopRadius - 10);
    loopCenter.y = constrain(loopCenter.y, loopRadius + 10, height - loopRadius - 10);
    calculateCirculation();
}

function resetDemo() {
    fieldType = 'rotation';
    loopRadius = 80;
    loopCenter.x = centerX;
    loopCenter.y = centerY;
    
    document.getElementById('field-type').value = 'rotation';
    document.getElementById('radius-slider').value = 80;
    document.getElementById('radius-value').textContent = '80';
    
    initParticles();
    calculateCirculation();
}


