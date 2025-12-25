/**
 * Tab 7: Green's Theorem
 * Visual demonstration showing equality between boundary and area integrals
 */

let fieldType = 'rotation';
let gridResolution = 10;
let canvas;
let centerX, centerY;
let region;

// Results
let boundaryIntegral = 0;
let areaIntegral = 0;

function setup() {
    const container = document.getElementById('greens-demo');
    const width = container.offsetWidth;
    const height = 450;
    
    canvas = createCanvas(width, height);
    canvas.parent('greens-demo');
    
    centerX = width / 2;
    centerY = height / 2;
    
    // Define the region as a rectangle
    region = {
        x: width * 0.2,
        y: height * 0.2,
        w: width * 0.6,
        h: height * 0.6
    };
    
    calculateIntegrals();
}

// Vector field function
function getField(x, y) {
    let nx = (x - centerX) / 100;
    let ny = (y - centerY) / 100;
    let vx = 0, vy = 0;
    
    switch(fieldType) {
        case 'rotation':
            // F = (-y, x), curl = 2
            vx = -ny;
            vy = nx;
            break;
            
        case 'shear':
            // F = (y, 0), curl = -1
            vx = ny;
            vy = 0;
            break;
            
        case 'vortex':
            // Point vortex - curl concentrated at center
            let dist = sqrt(nx * nx + ny * ny) + 0.05;
            let strength = 1 / (dist * dist + 0.1);
            vx = -ny * strength;
            vy = nx * strength;
            break;
            
        case 'uniform':
            // F = (1, 0.5), curl = 0
            vx = 1;
            vy = 0.5;
            break;
    }
    
    return { x: vx, y: vy };
}

// Calculate curl at a point
function getCurl(x, y) {
    let h = 3;
    
    let fy_right = getField(x + h, y);
    let fy_left = getField(x - h, y);
    let fx_up = getField(x, y + h);
    let fx_down = getField(x, y - h);
    
    let dFy_dx = (fy_right.y - fy_left.y) / (2 * h);
    let dFx_dy = (fx_up.x - fx_down.x) / (2 * h);
    
    return dFy_dx - dFx_dy;
}

function calculateIntegrals() {
    // Calculate boundary integral (circulation around rectangle)
    boundaryIntegral = 0;
    const numSteps = 100;
    
    // Bottom edge (left to right)
    for (let i = 0; i < numSteps; i++) {
        let t1 = i / numSteps;
        let t2 = (i + 1) / numSteps;
        let x1 = region.x + t1 * region.w;
        let x2 = region.x + t2 * region.w;
        let y = region.y + region.h;
        
        let v = getField((x1 + x2) / 2, y);
        boundaryIntegral += v.x * (x2 - x1) / 100;
    }
    
    // Right edge (bottom to top)
    for (let i = 0; i < numSteps; i++) {
        let t1 = i / numSteps;
        let t2 = (i + 1) / numSteps;
        let y1 = region.y + region.h - t1 * region.h;
        let y2 = region.y + region.h - t2 * region.h;
        let x = region.x + region.w;
        
        let v = getField(x, (y1 + y2) / 2);
        boundaryIntegral += v.y * (y2 - y1) / 100;
    }
    
    // Top edge (right to left)
    for (let i = 0; i < numSteps; i++) {
        let t1 = i / numSteps;
        let t2 = (i + 1) / numSteps;
        let x1 = region.x + region.w - t1 * region.w;
        let x2 = region.x + region.w - t2 * region.w;
        let y = region.y;
        
        let v = getField((x1 + x2) / 2, y);
        boundaryIntegral += v.x * (x2 - x1) / 100;
    }
    
    // Left edge (top to bottom)
    for (let i = 0; i < numSteps; i++) {
        let t1 = i / numSteps;
        let t2 = (i + 1) / numSteps;
        let y1 = region.y + t1 * region.h;
        let y2 = region.y + t2 * region.h;
        let x = region.x;
        
        let v = getField(x, (y1 + y2) / 2);
        boundaryIntegral += v.y * (y2 - y1) / 100;
    }
    
    // Calculate area integral (sum of curl over cells)
    areaIntegral = 0;
    let cellW = region.w / gridResolution;
    let cellH = region.h / gridResolution;
    let cellArea = (cellW * cellH) / 10000; // Scale factor
    
    for (let i = 0; i < gridResolution; i++) {
        for (let j = 0; j < gridResolution; j++) {
            let cx = region.x + (i + 0.5) * cellW;
            let cy = region.y + (j + 0.5) * cellH;
            
            let curl = getCurl(cx, cy);
            areaIntegral += curl * cellArea;
        }
    }
    
    // Update displays
    document.getElementById('boundary-value').textContent = boundaryIntegral.toFixed(2);
    document.getElementById('area-int-value').textContent = areaIntegral.toFixed(2);
    
    // Check if they match (within tolerance)
    let diff = abs(boundaryIntegral - areaIntegral);
    let matchIndicator = document.getElementById('match-indicator');
    if (diff < 0.5) {
        matchIndicator.textContent = '✓ Green\'s Theorem verified!';
        matchIndicator.style.color = '#10b981';
    } else {
        matchIndicator.textContent = `Difference: ${diff.toFixed(2)} (increase grid resolution)`;
        matchIndicator.style.color = '#fbbf24';
    }
}

function draw() {
    // Background
    background(17, 24, 39);
    
    // Draw vector field
    drawVectorField();
    
    // Draw curl cells
    drawCurlCells();
    
    // Draw boundary with direction arrows
    drawBoundary();
    
    // Info
    fill(148, 163, 184);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Field: ${fieldType}`, 10, 10);
}

function drawVectorField() {
    const spacing = 35;
    
    for (let x = spacing/2; x < width; x += spacing) {
        for (let y = spacing/2; y < height; y += spacing) {
            let v = getField(x, y);
            let mag = sqrt(v.x * v.x + v.y * v.y);
            
            if (mag > 0.01) {
                let angle = atan2(v.y, v.x);
                let arrowLen = min(mag * 12, spacing * 0.6);
                
                stroke(6, 182, 212, 60);
                strokeWeight(1);
                
                let endX = x + cos(angle) * arrowLen;
                let endY = y + sin(angle) * arrowLen;
                line(x, y, endX, endY);
            }
        }
    }
}

function drawCurlCells() {
    let cellW = region.w / gridResolution;
    let cellH = region.h / gridResolution;
    
    for (let i = 0; i < gridResolution; i++) {
        for (let j = 0; j < gridResolution; j++) {
            let cx = region.x + i * cellW;
            let cy = region.y + j * cellH;
            let centerX = cx + cellW / 2;
            let centerY = cy + cellH / 2;
            
            let curl = getCurl(centerX, centerY);
            
            // Color based on curl
            if (curl > 0.001) {
                let alpha = min(map(abs(curl), 0, 0.05, 50, 200), 200);
                fill(16, 185, 129, alpha);
                stroke(16, 185, 129, 100);
            } else if (curl < -0.001) {
                let alpha = min(map(abs(curl), 0, 0.05, 50, 200), 200);
                fill(249, 115, 22, alpha);
                stroke(249, 115, 22, 100);
            } else {
                fill(100, 116, 139, 30);
                stroke(100, 116, 139, 50);
            }
            
            strokeWeight(1);
            rect(cx, cy, cellW, cellH);
            
            // Draw small rotation indicator
            if (abs(curl) > 0.005) {
                noFill();
                strokeWeight(1.5);
                let arcRadius = min(cellW, cellH) * 0.25;
                if (curl > 0) {
                    stroke(16, 185, 129, 200);
                    arc(centerX, centerY, arcRadius * 2, arcRadius * 2, -PI * 0.7, PI * 0.3);
                    // Arrow head
                    let arrowX = centerX + cos(PI * 0.3) * arcRadius;
                    let arrowY = centerY + sin(PI * 0.3) * arcRadius;
                    line(arrowX, arrowY, arrowX - 4, arrowY - 4);
                } else {
                    stroke(249, 115, 22, 200);
                    arc(centerX, centerY, arcRadius * 2, arcRadius * 2, PI * 0.7, TWO_PI - PI * 0.3);
                    // Arrow head (clockwise)
                    let arrowX = centerX + cos(-PI * 0.3) * arcRadius;
                    let arrowY = centerY + sin(-PI * 0.3) * arcRadius;
                    line(arrowX, arrowY, arrowX - 4, arrowY + 4);
                }
            }
        }
    }
}

function drawBoundary() {
    // Thick boundary line
    noFill();
    stroke(168, 85, 247);
    strokeWeight(4);
    
    // Glow effect
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = 'rgba(168, 85, 247, 0.5)';
    
    rect(region.x, region.y, region.w, region.h);
    
    drawingContext.shadowBlur = 0;
    
    // Direction arrows on boundary (counterclockwise)
    const arrowSpacing = 50;
    strokeWeight(2);
    
    // Bottom edge (left to right)
    for (let x = region.x + arrowSpacing; x < region.x + region.w; x += arrowSpacing) {
        drawArrowHead(x, region.y + region.h, 0);
    }
    
    // Right edge (up)
    for (let y = region.y + region.h - arrowSpacing; y > region.y; y -= arrowSpacing) {
        drawArrowHead(region.x + region.w, y, -HALF_PI);
    }
    
    // Top edge (right to left)
    for (let x = region.x + region.w - arrowSpacing; x > region.x; x -= arrowSpacing) {
        drawArrowHead(x, region.y, PI);
    }
    
    // Left edge (down)
    for (let y = region.y + arrowSpacing; y < region.y + region.h; y += arrowSpacing) {
        drawArrowHead(region.x, y, HALF_PI);
    }
}

function drawArrowHead(x, y, angle) {
    let size = 8;
    stroke(168, 85, 247);
    fill(168, 85, 247);
    
    push();
    translate(x, y);
    rotate(angle);
    triangle(0, 0, -size, -size/2, -size, size/2);
    pop();
}

function windowResized() {
    const container = document.getElementById('greens-demo');
    resizeCanvas(container.offsetWidth, 450);
    centerX = width / 2;
    centerY = height / 2;
    
    region = {
        x: width * 0.2,
        y: height * 0.2,
        w: width * 0.6,
        h: height * 0.6
    };
    
    calculateIntegrals();
}

// Control functions
function updateFieldType(type) {
    fieldType = type;
    calculateIntegrals();
}

function updateGrid(val) {
    gridResolution = parseInt(val);
    document.getElementById('grid-value').textContent = gridResolution;
    calculateIntegrals();
}

function resetDemo() {
    fieldType = 'rotation';
    gridResolution = 10;
    
    document.getElementById('field-type').value = 'rotation';
    document.getElementById('grid-slider').value = 10;
    document.getElementById('grid-value').textContent = '10';
    
    calculateIntegrals();
}


