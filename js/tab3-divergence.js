/**
 * Tab 3: Divergence - Sources & Sinks
 * Interactive visualization showing how divergence measures spreading/collecting
 */

let particles = [];
let sources = [];
let clickMode = 'source';
let bgField = 'none';
let canvas;
let centerX, centerY;

const PARTICLE_COUNT = 200;
const GRID_SPACING = 35;

function setup() {
    const container = document.getElementById('divergence-demo');
    const width = container.offsetWidth;
    const height = 450;
    
    canvas = createCanvas(width, height);
    canvas.parent('divergence-demo');
    
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
        age: random(150),
        maxAge: random(150, 250),
        size: random(2, 4)
    };
}

// Get the vector field at a point, including contributions from sources/sinks
function getField(x, y) {
    let vx = 0, vy = 0;
    
    // Background field
    if (bgField === 'uniform') {
        vx += 1;
        vy += 0;
    } else if (bgField === 'shear') {
        vx += (y - centerY) / 100;
        vy += 0;
    }
    
    // Add contributions from sources and sinks
    for (let s of sources) {
        let dx = x - s.x;
        let dy = y - s.y;
        let dist = sqrt(dx * dx + dy * dy) + 10; // Avoid division by zero
        let strength = s.strength / (dist * dist) * 1000;
        
        // Limit strength near source
        strength = min(strength, 3);
        
        vx += dx / dist * strength;
        vy += dy / dist * strength;
    }
    
    return { x: vx, y: vy };
}

// Calculate divergence at a point numerically
function getDivergence(x, y) {
    let h = 5; // Small step for numerical derivative
    
    let fx_right = getField(x + h, y);
    let fx_left = getField(x - h, y);
    let fy_up = getField(x, y + h);
    let fy_down = getField(x, y - h);
    
    let dFx_dx = (fx_right.x - fx_left.x) / (2 * h);
    let dFy_dy = (fy_up.y - fy_down.y) / (2 * h);
    
    return dFx_dx + dFy_dy;
}

function draw() {
    // Background
    background(17, 24, 39);
    
    // Draw divergence field as colored background
    drawDivergenceField();
    
    // Draw vector field
    drawVectorField();
    
    // Update and draw particles
    updateAndDrawParticles();
    
    // Draw sources and sinks
    drawSources();
    
    // Info overlay
    fill(148, 163, 184);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Sources/Sinks: ${sources.length}`, 10, 10);
    text(`Click to add ${clickMode}`, 10, 26);
}

function drawDivergenceField() {
    noStroke();
    let cellSize = 20;
    
    for (let x = 0; x < width; x += cellSize) {
        for (let y = 0; y < height; y += cellSize) {
            let div = getDivergence(x + cellSize/2, y + cellSize/2);
            
            // Color based on divergence
            if (div > 0) {
                // Positive divergence: red
                let alpha = min(map(div, 0, 0.5, 0, 100), 100);
                fill(239, 68, 68, alpha);
            } else {
                // Negative divergence: blue
                let alpha = min(map(-div, 0, 0.5, 0, 100), 100);
                fill(59, 130, 246, alpha);
            }
            
            rect(x, y, cellSize, cellSize);
        }
    }
}

function drawVectorField() {
    for (let x = GRID_SPACING; x < width - GRID_SPACING/2; x += GRID_SPACING) {
        for (let y = GRID_SPACING; y < height - GRID_SPACING/2; y += GRID_SPACING) {
            let v = getField(x, y);
            let mag = sqrt(v.x * v.x + v.y * v.y);
            
            if (mag > 0.01) {
                let angle = atan2(v.y, v.x);
                let arrowLen = min(mag * 10, GRID_SPACING * 0.7);
                
                // Get divergence for coloring
                let div = getDivergence(x, y);
                let r, g, b;
                
                if (div > 0.01) {
                    r = 239; g = 68; b = 68; // Red for source
                } else if (div < -0.01) {
                    r = 59; g = 130; b = 246; // Blue for sink
                } else {
                    r = 6; g = 182; b = 212; // Cyan for neutral
                }
                
                stroke(r, g, b, 180);
                strokeWeight(1.5);
                
                let endX = x + cos(angle) * arrowLen;
                let endY = y + sin(angle) * arrowLen;
                line(x, y, endX, endY);
                
                // Arrow head
                let headSize = min(5, arrowLen * 0.4);
                let headAngle1 = angle + PI * 0.8;
                let headAngle2 = angle - PI * 0.8;
                line(endX, endY, endX + cos(headAngle1) * headSize, endY + sin(headAngle1) * headSize);
                line(endX, endY, endX + cos(headAngle2) * headSize, endY + sin(headAngle2) * headSize);
            }
        }
    }
}

function updateAndDrawParticles() {
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        
        // Get velocity at particle position
        let v = getField(p.x, p.y);
        
        // Update position
        p.x += v.x * 1.5;
        p.y += v.y * 1.5;
        p.age++;
        
        // Check if near a source/sink for respawning
        let nearSource = false;
        let nearSink = false;
        for (let s of sources) {
            let d = dist(p.x, p.y, s.x, s.y);
            if (d < 20) {
                if (s.strength > 0) nearSource = true;
                else nearSink = true;
            }
        }
        
        // Reset if out of bounds, too old, or entered a sink
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || 
            p.age > p.maxAge || nearSink) {
            
            // Respawn from sources if available, otherwise random
            let sourceList = sources.filter(s => s.strength > 0);
            if (sourceList.length > 0 && random() > 0.3) {
                let s = random(sourceList);
                let angle = random(TWO_PI);
                p.x = s.x + cos(angle) * random(15, 30);
                p.y = s.y + sin(angle) * random(15, 30);
            } else {
                p.x = random(width);
                p.y = random(height);
            }
            p.age = 0;
            p.maxAge = random(150, 250);
        }
        
        // Draw particle
        let speed = sqrt(v.x * v.x + v.y * v.y);
        let alpha = map(p.age, 0, p.maxAge, 255, 50);
        
        noStroke();
        fill(255, 255, 255, alpha);
        ellipse(p.x, p.y, p.size, p.size);
    }
}

function drawSources() {
    for (let s of sources) {
        let isSource = s.strength > 0;
        
        // Glow effect
        drawingContext.shadowBlur = 20;
        drawingContext.shadowColor = isSource ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)';
        
        // Outer ring
        noFill();
        stroke(isSource ? color(239, 68, 68) : color(59, 130, 246));
        strokeWeight(2);
        ellipse(s.x, s.y, 30, 30);
        
        // Inner circle
        fill(isSource ? color(239, 68, 68) : color(59, 130, 246));
        noStroke();
        ellipse(s.x, s.y, 10, 10);
        
        // Plus or minus sign
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text(isSource ? '+' : '−', s.x, s.y);
        
        drawingContext.shadowBlur = 0;
    }
}

function mousePressed() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        sources.push({
            x: mouseX,
            y: mouseY,
            strength: clickMode === 'source' ? 1 : -1
        });
    }
}

function windowResized() {
    const container = document.getElementById('divergence-demo');
    resizeCanvas(container.offsetWidth, 450);
    centerX = width / 2;
    centerY = height / 2;
}

// Control functions
function updateClickMode(mode) {
    clickMode = mode;
}

function updateBgField(field) {
    bgField = field;
    document.getElementById('bg-value').textContent = 
        field === 'none' ? 'None' : field.charAt(0).toUpperCase() + field.slice(1);
}

function clearSources() {
    sources = [];
    initParticles();
}

function resetDemo() {
    sources = [];
    bgField = 'none';
    clickMode = 'source';
    document.getElementById('click-mode').value = 'source';
    document.getElementById('bg-field').value = 'none';
    document.getElementById('bg-value').textContent = 'None';
    initParticles();
}


