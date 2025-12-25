/**
 * Tab 2: Vector Fields & Flow
 * Interactive vector field visualization with particle tracing
 */

let particles = [];
let fieldType = 'uniform';
let fieldStrength = 1.0;
let showParticles = true;
let showVectors = true;
let canvas;
let centerX, centerY;

const PARTICLE_COUNT = 150;
const GRID_SPACING = 40;

function setup() {
    const container = document.getElementById('vector-demo');
    const width = container.offsetWidth;
    const height = 450;
    
    canvas = createCanvas(width, height);
    canvas.parent('vector-demo');
    
    centerX = width / 2;
    centerY = height / 2;
    
    initParticles();
}

function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
    }
}

function createParticle() {
    return {
        x: random(width),
        y: random(height),
        age: random(100),
        maxAge: random(100, 200),
        size: random(2, 4)
    };
}

// Vector field function - returns velocity at point (x, y)
function getField(x, y) {
    // Normalize coordinates around center
    let nx = (x - centerX) / 100;
    let ny = (y - centerY) / 100;
    let vx = 0, vy = 0;
    
    switch(fieldType) {
        case 'uniform':
            // Constant flow to the right
            vx = 1;
            vy = 0.3;
            break;
            
        case 'rotation':
            // Circular rotation (vortex)
            // v = (-y, x) rotates counterclockwise
            vx = -ny;
            vy = nx;
            break;
            
        case 'source':
            // Radially outward from center
            let distSource = sqrt(nx * nx + ny * ny) + 0.1;
            vx = nx / distSource;
            vy = ny / distSource;
            break;
            
        case 'sink':
            // Radially inward to center
            let distSink = sqrt(nx * nx + ny * ny) + 0.1;
            vx = -nx / distSink;
            vy = -ny / distSink;
            break;
            
        case 'saddle':
            // Saddle point: x outward, y inward
            vx = nx;
            vy = -ny;
            break;
            
        case 'shear':
            // Shear flow: velocity depends on y position
            vx = ny;
            vy = 0;
            break;
    }
    
    return { x: vx * fieldStrength, y: vy * fieldStrength };
}

function draw() {
    // Background
    background(17, 24, 39);
    
    // Draw vector field grid
    if (showVectors) {
        drawVectorField();
    }
    
    // Update and draw particles
    if (showParticles) {
        updateAndDrawParticles();
    }
    
    // Draw center marker for relevant fields
    if (fieldType !== 'uniform' && fieldType !== 'shear') {
        noFill();
        stroke(6, 182, 212, 150);
        strokeWeight(2);
        ellipse(centerX, centerY, 10, 10);
        
        // Draw crosshairs
        stroke(6, 182, 212, 50);
        line(centerX - 20, centerY, centerX + 20, centerY);
        line(centerX, centerY - 20, centerX, centerY + 20);
    }
    
    // Info overlay
    fill(148, 163, 184);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Field: ${fieldType}`, 10, 10);
    text(`Strength: ${fieldStrength.toFixed(1)}`, 10, 26);
}

function drawVectorField() {
    for (let x = GRID_SPACING; x < width - GRID_SPACING/2; x += GRID_SPACING) {
        for (let y = GRID_SPACING; y < height - GRID_SPACING/2; y += GRID_SPACING) {
            let v = getField(x, y);
            let mag = sqrt(v.x * v.x + v.y * v.y);
            
            // Normalize and scale arrow
            let arrowLen = min(mag * 15, GRID_SPACING * 0.8);
            
            if (mag > 0.01) {
                let angle = atan2(v.y, v.x);
                
                // Color based on magnitude
                let alpha = map(mag, 0, 2, 100, 255);
                let hue = map(mag, 0, 2, 200, 180); // Blue to cyan
                
                // Arrow body
                stroke(6, 182, 212, alpha * 0.6);
                strokeWeight(1.5);
                
                let endX = x + cos(angle) * arrowLen;
                let endY = y + sin(angle) * arrowLen;
                line(x, y, endX, endY);
                
                // Arrow head
                let headSize = min(6, arrowLen * 0.4);
                let headAngle1 = angle + PI * 0.8;
                let headAngle2 = angle - PI * 0.8;
                
                line(endX, endY, endX + cos(headAngle1) * headSize, endY + sin(headAngle1) * headSize);
                line(endX, endY, endX + cos(headAngle2) * headSize, endY + sin(headAngle2) * headSize);
            }
            
            // Draw dot at grid point
            noStroke();
            fill(100, 116, 139, 100);
            ellipse(x, y, 3, 3);
        }
    }
}

function updateAndDrawParticles() {
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        
        // Get velocity at particle position
        let v = getField(p.x, p.y);
        
        // Update position
        p.x += v.x * 2;
        p.y += v.y * 2;
        p.age++;
        
        // Reset if out of bounds or too old
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.age > p.maxAge) {
            // For source field, respawn at center
            if (fieldType === 'source') {
                p.x = centerX + random(-20, 20);
                p.y = centerY + random(-20, 20);
            }
            // For sink field, respawn at edges
            else if (fieldType === 'sink') {
                let side = floor(random(4));
                switch(side) {
                    case 0: p.x = 0; p.y = random(height); break;
                    case 1: p.x = width; p.y = random(height); break;
                    case 2: p.x = random(width); p.y = 0; break;
                    case 3: p.x = random(width); p.y = height; break;
                }
            }
            // For other fields, respawn randomly
            else {
                p.x = random(width);
                p.y = random(height);
            }
            p.age = 0;
            p.maxAge = random(100, 200);
        }
        
        // Draw particle with trail effect
        let speed = sqrt(v.x * v.x + v.y * v.y);
        let alpha = map(p.age, 0, p.maxAge, 255, 50);
        
        // Color based on speed
        let r = map(speed, 0, 2, 59, 34);
        let g = map(speed, 0, 2, 130, 211);
        let b = map(speed, 0, 2, 246, 238);
        
        noStroke();
        fill(r, g, b, alpha);
        
        // Glow effect
        drawingContext.shadowBlur = 8;
        drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ellipse(p.x, p.y, p.size, p.size);
        drawingContext.shadowBlur = 0;
    }
}

function windowResized() {
    const container = document.getElementById('vector-demo');
    resizeCanvas(container.offsetWidth, 450);
    centerX = width / 2;
    centerY = height / 2;
}

// Control functions
function updateFieldType(val) {
    fieldType = val;
    initParticles();
}

function updateStrength(val) {
    fieldStrength = parseFloat(val);
    document.getElementById('strength-value').textContent = fieldStrength.toFixed(1);
}

function toggleParticles(show) {
    showParticles = show;
}

function toggleVectors(show) {
    showVectors = show;
}

function resetDemo() {
    fieldType = 'uniform';
    fieldStrength = 1.0;
    showParticles = true;
    showVectors = true;
    
    document.getElementById('field-type').value = 'uniform';
    document.getElementById('strength-slider').value = 1;
    document.getElementById('strength-value').textContent = '1.0';
    document.getElementById('show-particles').checked = true;
    document.getElementById('show-vectors').checked = true;
    
    initParticles();
}


