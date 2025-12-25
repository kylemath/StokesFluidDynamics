/**
 * Tab 5: Line Integrals & Work
 * Interactive path drawing with real-time line integral calculation
 */

let pathPoints = [];
let isDrawing = false;
let lineIntegral = 0;
let fieldType = 'uniform';
let canvas;
let centerX, centerY;

const GRID_SPACING = 40;

function setup() {
    const container = document.getElementById('lineintegral-demo');
    const width = container.offsetWidth;
    const height = 450;
    
    canvas = createCanvas(width, height);
    canvas.parent('lineintegral-demo');
    
    centerX = width / 2;
    centerY = height / 2;
}

// Vector field function
function getField(x, y) {
    let nx = (x - centerX) / 100;
    let ny = (y - centerY) / 100;
    let vx = 0, vy = 0;
    
    switch(fieldType) {
        case 'uniform':
            // Constant rightward flow
            vx = 1;
            vy = 0;
            break;
            
        case 'radial':
            // Radially outward from center
            let dist = sqrt(nx * nx + ny * ny) + 0.1;
            vx = nx / dist;
            vy = ny / dist;
            break;
            
        case 'rotation':
            // Counterclockwise rotation
            vx = -ny;
            vy = nx;
            break;
            
        case 'gradient':
            // Gradient of f(x,y) = x^2 + y^2 (conservative field)
            // grad f = (2x, 2y)
            vx = nx;
            vy = ny;
            break;
    }
    
    return { x: vx, y: vy };
}

function draw() {
    // Background
    background(17, 24, 39);
    
    // Draw vector field
    drawVectorField();
    
    // Draw the user's path with color coding
    drawPath();
    
    // Draw current path points
    if (pathPoints.length > 0) {
        // Start point
        fill(6, 182, 212);
        noStroke();
        ellipse(pathPoints[0].x, pathPoints[0].y, 12, 12);
        
        // End point
        if (pathPoints.length > 1) {
            let end = pathPoints[pathPoints.length - 1];
            fill(168, 85, 247);
            ellipse(end.x, end.y, 12, 12);
        }
    }
    
    // Info overlay
    fill(148, 163, 184);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Field: ${fieldType}`, 10, 10);
    text(`Path points: ${pathPoints.length}`, 10, 26);
    
    // Show if field is conservative
    if (fieldType === 'gradient') {
        fill(16, 185, 129);
        text('Conservative field!', 10, 42);
    }
}

function drawVectorField() {
    for (let x = GRID_SPACING/2; x < width; x += GRID_SPACING) {
        for (let y = GRID_SPACING/2; y < height; y += GRID_SPACING) {
            let v = getField(x, y);
            let mag = sqrt(v.x * v.x + v.y * v.y);
            
            if (mag > 0.01) {
                let angle = atan2(v.y, v.x);
                let arrowLen = min(mag * 15, GRID_SPACING * 0.7);
                
                stroke(6, 182, 212, 100);
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

function drawPath() {
    if (pathPoints.length < 2) return;
    
    // Draw path segments with color based on contribution
    strokeWeight(4);
    
    for (let i = 1; i < pathPoints.length; i++) {
        let p1 = pathPoints[i - 1];
        let p2 = pathPoints[i];
        
        // Direction of travel
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        let segmentLength = sqrt(dx * dx + dy * dy);
        
        if (segmentLength > 0) {
            // Normalize
            let nx = dx / segmentLength;
            let ny = dy / segmentLength;
            
            // Field at midpoint
            let midX = (p1.x + p2.x) / 2;
            let midY = (p1.y + p2.y) / 2;
            let v = getField(midX, midY);
            
            // Dot product: component of field in direction of travel
            let dotProduct = v.x * nx + v.y * ny;
            
            // Color based on sign
            if (dotProduct > 0) {
                // Field helps: green
                let intensity = map(abs(dotProduct), 0, 1.5, 100, 255);
                stroke(16, 185, 129, intensity);
            } else {
                // Field opposes: red
                let intensity = map(abs(dotProduct), 0, 1.5, 100, 255);
                stroke(239, 68, 68, intensity);
            }
            
            line(p1.x, p1.y, p2.x, p2.y);
        }
    }
    
    // Draw glow on path
    drawingContext.shadowBlur = 0;
}

function calculateLineIntegral() {
    if (pathPoints.length < 2) {
        lineIntegral = 0;
        updateIntegralDisplay();
        return;
    }
    
    lineIntegral = 0;
    
    for (let i = 1; i < pathPoints.length; i++) {
        let p1 = pathPoints[i - 1];
        let p2 = pathPoints[i];
        
        // dr = (dx, dy)
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        
        // Field at midpoint (for better approximation)
        let midX = (p1.x + p2.x) / 2;
        let midY = (p1.y + p2.y) / 2;
        let v = getField(midX, midY);
        
        // F · dr = Fx*dx + Fy*dy
        // Scale down by 100 for nicer numbers
        lineIntegral += (v.x * dx + v.y * dy) / 100;
    }
    
    updateIntegralDisplay();
}

function updateIntegralDisplay() {
    let display = document.getElementById('integral-value');
    display.textContent = lineIntegral.toFixed(2);
    
    // Color based on sign
    if (lineIntegral > 0.1) {
        display.style.color = '#10b981'; // Green
    } else if (lineIntegral < -0.1) {
        display.style.color = '#ef4444'; // Red
    } else {
        display.style.color = '#94a3b8'; // Neutral
    }
}

function mousePressed() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        isDrawing = true;
        pathPoints = [{ x: mouseX, y: mouseY }];
        lineIntegral = 0;
        updateIntegralDisplay();
    }
}

function mouseDragged() {
    if (isDrawing && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        let lastPoint = pathPoints[pathPoints.length - 1];
        let d = dist(mouseX, mouseY, lastPoint.x, lastPoint.y);
        
        // Only add point if we've moved enough (reduces noise)
        if (d > 5) {
            pathPoints.push({ x: mouseX, y: mouseY });
            calculateLineIntegral();
        }
    }
}

function mouseReleased() {
    isDrawing = false;
}

function windowResized() {
    const container = document.getElementById('lineintegral-demo');
    resizeCanvas(container.offsetWidth, 450);
    centerX = width / 2;
    centerY = height / 2;
}

// Control functions
function updateFieldType(type) {
    fieldType = type;
    pathPoints = [];
    lineIntegral = 0;
    updateIntegralDisplay();
}

function clearPath() {
    pathPoints = [];
    lineIntegral = 0;
    updateIntegralDisplay();
}

function resetDemo() {
    fieldType = 'uniform';
    pathPoints = [];
    lineIntegral = 0;
    
    document.getElementById('field-type').value = 'uniform';
    updateIntegralDisplay();
}


