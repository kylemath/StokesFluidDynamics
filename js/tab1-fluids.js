/**
 * Tab 1: What is a Fluid?
 * Interactive particle simulation demonstrating viscosity and fluid behavior
 */

let particles = [];
let viscosity = 0.5;
let particleCount = 100;
let canvas;
let mouseForce = { x: 0, y: 0, active: false };
let prevMouseX = 0, prevMouseY = 0;

function setup() {
    const container = document.getElementById('fluid-demo');
    const width = container.offsetWidth;
    const height = 400;
    
    canvas = createCanvas(width, height);
    canvas.parent('fluid-demo');
    
    initParticles();
}

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: random(width),
            y: random(height),
            vx: random(-1, 1),
            vy: random(-1, 1),
            size: random(4, 8),
            hue: random(180, 220) // Blue range
        });
    }
}

function draw() {
    // Dark background with subtle gradient
    background(17, 24, 39);
    
    // Draw subtle grid
    stroke(30, 41, 59, 50);
    strokeWeight(1);
    for (let x = 0; x < width; x += 30) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 30) {
        line(0, y, width, y);
    }
    
    // Update and draw particles
    for (let p of particles) {
        // Apply mouse force if dragging
        if (mouseForce.active && mouseIsPressed) {
            let dx = mouseX - p.x;
            let dy = mouseY - p.y;
            let dist = sqrt(dx * dx + dy * dy);
            if (dist < 100 && dist > 0) {
                let force = (100 - dist) / 100;
                p.vx += (mouseForce.x * force * 0.3) / viscosity;
                p.vy += (mouseForce.y * force * 0.3) / viscosity;
            }
        }
        
        // Apply viscosity (damping)
        let damping = map(viscosity, 0.1, 2, 0.99, 0.9);
        p.vx *= damping;
        p.vy *= damping;
        
        // Random brownian motion (reduced by viscosity)
        p.vx += random(-0.1, 0.1) / viscosity;
        p.vy += random(-0.1, 0.1) / viscosity;
        
        // Limit velocity
        let maxVel = 5 / viscosity;
        let vel = sqrt(p.vx * p.vx + p.vy * p.vy);
        if (vel > maxVel) {
            p.vx = (p.vx / vel) * maxVel;
            p.vy = (p.vy / vel) * maxVel;
        }
        
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off walls
        if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
        if (p.x > width) { p.x = width; p.vx *= -0.5; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
        if (p.y > height) { p.y = height; p.vy *= -0.5; }
        
        // Draw particle
        let speed = sqrt(p.vx * p.vx + p.vy * p.vy);
        let alpha = map(speed, 0, 3, 150, 255);
        
        // Color based on speed: cyan for fast, blue for slow
        let r = map(speed, 0, 3, 59, 6);
        let g = map(speed, 0, 3, 130, 182);
        let b = map(speed, 0, 3, 246, 212);
        
        noStroke();
        fill(r, g, b, alpha);
        
        // Draw with glow effect
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ellipse(p.x, p.y, p.size, p.size);
        drawingContext.shadowBlur = 0;
        
        // Draw velocity trail
        stroke(r, g, b, 100);
        strokeWeight(1);
        line(p.x, p.y, p.x - p.vx * 5, p.y - p.vy * 5);
    }
    
    // Draw mouse influence area when dragging
    if (mouseIsPressed && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        noFill();
        stroke(6, 182, 212, 50);
        strokeWeight(2);
        ellipse(mouseX, mouseY, 200, 200);
        
        // Draw force direction
        stroke(6, 182, 212, 150);
        strokeWeight(2);
        let arrowLen = min(50, sqrt(mouseForce.x * mouseForce.x + mouseForce.y * mouseForce.y) * 3);
        if (arrowLen > 5) {
            let angle = atan2(mouseForce.y, mouseForce.x);
            line(mouseX, mouseY, mouseX + cos(angle) * arrowLen, mouseY + sin(angle) * arrowLen);
        }
    }
    
    // Update mouse force
    if (frameCount % 2 === 0) {
        mouseForce.x = mouseX - prevMouseX;
        mouseForce.y = mouseY - prevMouseY;
        prevMouseX = mouseX;
        prevMouseY = mouseY;
    }
    
    // Info display
    fill(148, 163, 184);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Particles: ${particles.length}`, 10, 10);
    text(`Viscosity: ${viscosity.toFixed(1)}`, 10, 26);
    
    // Viscosity label
    let viscLabel = viscosity < 0.5 ? "Like water" : 
                    viscosity < 1 ? "Like oil" : 
                    viscosity < 1.5 ? "Like honey" : "Like molasses";
    fill(6, 182, 212);
    text(viscLabel, 10, 42);
}

function mousePressed() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        mouseForce.active = true;
        prevMouseX = mouseX;
        prevMouseY = mouseY;
    }
}

function mouseReleased() {
    mouseForce.active = false;
}

function windowResized() {
    const container = document.getElementById('fluid-demo');
    resizeCanvas(container.offsetWidth, 400);
}

// Control functions called from HTML
function updateViscosity(val) {
    viscosity = parseFloat(val);
    document.getElementById('viscosity-value').textContent = viscosity.toFixed(1);
}

function updateCount(val) {
    particleCount = parseInt(val);
    document.getElementById('count-value').textContent = particleCount;
    initParticles();
}

function resetDemo() {
    viscosity = 0.5;
    particleCount = 100;
    document.getElementById('viscosity-slider').value = 0.5;
    document.getElementById('count-slider').value = 100;
    document.getElementById('viscosity-value').textContent = '0.5';
    document.getElementById('count-value').textContent = '100';
    initParticles();
}


