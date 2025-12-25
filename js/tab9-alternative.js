/**
 * Tab 9: Alternative Formalizations
 * Discrete mesh demonstration showing discrete exterior calculus
 */

let vertices = [];
let edges = [];
let faces = [];
let selectedEdge = null;
let canvas;

function setup() {
    const container = document.getElementById('discrete-demo');
    if (!container) return;
    
    const width = container.offsetWidth;
    const height = 300;
    
    canvas = createCanvas(width, height);
    canvas.parent('discrete-demo');
    
    createMesh();
}

function createMesh() {
    vertices = [];
    edges = [];
    faces = [];
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;
    
    // Create a simple triangular mesh
    // Center vertex
    vertices.push({ x: centerX, y: centerY, id: 0 });
    
    // Ring of vertices
    const numOuter = 6;
    for (let i = 0; i < numOuter; i++) {
        const angle = (i / numOuter) * TWO_PI - HALF_PI;
        vertices.push({
            x: centerX + radius * cos(angle),
            y: centerY + radius * sin(angle),
            id: i + 1
        });
    }
    
    // Create edges and faces
    for (let i = 0; i < numOuter; i++) {
        const next = (i + 1) % numOuter;
        
        // Radial edges (from center)
        edges.push({
            v1: 0,
            v2: i + 1,
            flow: 0,
            isBoundary: false
        });
        
        // Boundary edges
        edges.push({
            v1: i + 1,
            v2: next + 1,
            flow: 0,
            isBoundary: true
        });
        
        // Faces (triangles)
        faces.push({
            vertices: [0, i + 1, next + 1],
            curl: 0
        });
    }
    
    // Initialize with a rotation field
    initializeRotationField();
}

function initializeRotationField() {
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let edge of edges) {
        const v1 = vertices[edge.v1];
        const v2 = vertices[edge.v2];
        
        // Midpoint of edge
        const mx = (v1.x + v2.x) / 2;
        const my = (v1.y + v2.y) / 2;
        
        // Edge vector
        const ex = v2.x - v1.x;
        const ey = v2.y - v1.y;
        const len = sqrt(ex * ex + ey * ey);
        
        // Rotation field: F = (-y, x)
        const fx = -(my - centerY);
        const fy = mx - centerX;
        
        // Flow = F · edge direction
        edge.flow = (fx * ex + fy * ey) / len * 0.02;
    }
    
    calculateCurl();
}

function calculateCurl() {
    // For each face, sum the flow around its edges
    for (let face of faces) {
        face.curl = 0;
        
        // Get the three edges of this triangular face
        for (let i = 0; i < 3; i++) {
            const v1Idx = face.vertices[i];
            const v2Idx = face.vertices[(i + 1) % 3];
            
            // Find the edge
            for (let edge of edges) {
                if ((edge.v1 === v1Idx && edge.v2 === v2Idx) ||
                    (edge.v1 === v2Idx && edge.v2 === v1Idx)) {
                    // Add flow (with sign depending on orientation)
                    const sign = (edge.v1 === v1Idx) ? 1 : -1;
                    face.curl += sign * edge.flow;
                    break;
                }
            }
        }
    }
}

function draw() {
    if (!canvas) return;
    
    background(17, 24, 39);
    
    // Draw faces with curl coloring
    for (let face of faces) {
        const v0 = vertices[face.vertices[0]];
        const v1 = vertices[face.vertices[1]];
        const v2 = vertices[face.vertices[2]];
        
        // Color based on curl
        if (face.curl > 0.001) {
            fill(16, 185, 129, map(face.curl, 0, 0.5, 30, 100));
        } else if (face.curl < -0.001) {
            fill(249, 115, 22, map(-face.curl, 0, 0.5, 30, 100));
        } else {
            fill(50, 60, 80, 50);
        }
        
        stroke(100, 116, 139, 100);
        strokeWeight(1);
        triangle(v0.x, v0.y, v1.x, v1.y, v2.x, v2.y);
    }
    
    // Draw edges with flow indication
    for (let edge of edges) {
        const v1 = vertices[edge.v1];
        const v2 = vertices[edge.v2];
        
        // Edge color based on boundary status and flow
        if (edge.isBoundary) {
            stroke(168, 85, 247);
            strokeWeight(3);
        } else {
            stroke(6, 182, 212);
            strokeWeight(2);
        }
        
        line(v1.x, v1.y, v2.x, v2.y);
        
        // Draw flow arrow
        if (abs(edge.flow) > 0.001) {
            const mx = (v1.x + v2.x) / 2;
            const my = (v1.y + v2.y) / 2;
            
            // Direction of flow
            let dx = v2.x - v1.x;
            let dy = v2.y - v1.y;
            const len = sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
            
            if (edge.flow < 0) {
                dx = -dx;
                dy = -dy;
            }
            
            // Draw arrow
            const arrowSize = 8 * abs(edge.flow) / 0.1;
            fill(edge.isBoundary ? color(168, 85, 247) : color(6, 182, 212));
            noStroke();
            
            push();
            translate(mx, my);
            rotate(atan2(dy, dx));
            triangle(arrowSize, 0, -arrowSize/2, -arrowSize/2, -arrowSize/2, arrowSize/2);
            pop();
        }
    }
    
    // Draw vertices
    for (let v of vertices) {
        fill(255);
        noStroke();
        ellipse(v.x, v.y, 8, 8);
    }
    
    // Draw info
    fill(148, 163, 184);
    textSize(11);
    textAlign(LEFT, TOP);
    
    // Calculate boundary circulation
    let boundaryCirc = 0;
    for (let edge of edges) {
        if (edge.isBoundary) {
            boundaryCirc += edge.flow;
        }
    }
    
    // Calculate total curl
    let totalCurl = 0;
    for (let face of faces) {
        totalCurl += face.curl;
    }
    
    text(`Boundary circulation: ${boundaryCirc.toFixed(3)}`, 10, 10);
    text(`Total interior curl: ${totalCurl.toFixed(3)}`, 10, 25);
    
    // Verification
    fill(abs(boundaryCirc - totalCurl) < 0.01 ? color(16, 185, 129) : color(249, 115, 22));
    text(abs(boundaryCirc - totalCurl) < 0.01 ? '✓ Discrete Stokes verified!' : '≈ Approximately equal', 10, 40);
}

function mousePressed() {
    if (!canvas) return;
    
    // Check if clicking on an edge
    for (let edge of edges) {
        const v1 = vertices[edge.v1];
        const v2 = vertices[edge.v2];
        
        // Distance from point to line segment
        const d = distToSegment(mouseX, mouseY, v1.x, v1.y, v2.x, v2.y);
        
        if (d < 10) {
            // Cycle flow value
            edge.flow += 0.1;
            if (edge.flow > 0.3) edge.flow = -0.3;
            calculateCurl();
            break;
        }
    }
}

function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    
    if (len2 === 0) return dist(px, py, x1, y1);
    
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = max(0, min(1, t));
    
    const nearX = x1 + t * dx;
    const nearY = y1 + t * dy;
    
    return dist(px, py, nearX, nearY);
}

function windowResized() {
    const container = document.getElementById('discrete-demo');
    if (!container) return;
    
    resizeCanvas(container.offsetWidth, 300);
    createMesh();
}


