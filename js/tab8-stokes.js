/**
 * Tab 8: Stokes' Theorem (3D)
 * Three.js visualization of surfaces and their boundary curves
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let surfaceMesh, boundaryCurve, vectorArrows;
let surfaceType = 'flat';
let fieldType = 'rotation';

function init() {
    const container = document.getElementById('stokes-demo');
    if (!container) return;
    
    const width = container.offsetWidth;
    const height = 400;
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    
    // Camera
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    // Add coordinate axes
    addAxes();
    
    // Create initial surface and boundary
    createSurface();
    createBoundary();
    createVectorField();
    
    // Calculate integrals
    calculateIntegrals();
    
    // Animation loop
    animate();
    
    // Handle resize
    window.addEventListener('resize', onWindowResize);
}

function addAxes() {
    const axesLength = 2;
    
    // X axis (red)
    const xGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(axesLength, 0, 0)
    ]);
    const xMat = new THREE.LineBasicMaterial({ color: 0xff4444, opacity: 0.5, transparent: true });
    scene.add(new THREE.Line(xGeom, xMat));
    
    // Y axis (green)
    const yGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, axesLength, 0)
    ]);
    const yMat = new THREE.LineBasicMaterial({ color: 0x44ff44, opacity: 0.5, transparent: true });
    scene.add(new THREE.Line(yGeom, yMat));
    
    // Z axis (blue)
    const zGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, axesLength)
    ]);
    const zMat = new THREE.LineBasicMaterial({ color: 0x4444ff, opacity: 0.5, transparent: true });
    scene.add(new THREE.Line(zGeom, zMat));
}

function createSurface() {
    if (surfaceMesh) {
        scene.remove(surfaceMesh);
    }
    
    const radius = 1.5;
    const segments = 40;
    
    let geometry;
    
    switch(surfaceType) {
        case 'flat':
            geometry = new THREE.CircleGeometry(radius, segments);
            geometry.rotateX(-Math.PI / 2); // Lay flat in xz plane
            break;
            
        case 'hemisphere':
            // Create custom hemisphere geometry
            geometry = new THREE.SphereGeometry(radius, segments, segments / 2, 0, Math.PI * 2, 0, Math.PI / 2);
            geometry.rotateX(Math.PI);
            geometry.translate(0, 0, 0);
            break;
            
        case 'paraboloid':
            geometry = createParaboloid(radius, segments);
            break;
            
        case 'wavy':
            geometry = createWavySurface(radius, segments);
            break;
    }
    
    const material = new THREE.MeshPhongMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        wireframe: false
    });
    
    surfaceMesh = new THREE.Mesh(geometry, material);
    scene.add(surfaceMesh);
    
    // Add wireframe overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    surfaceMesh.add(wireframe);
}

function createParaboloid(radius, segments) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    // Create paraboloid z = r^2 where r is distance from center
    for (let i = 0; i <= segments; i++) {
        const r = (i / segments) * radius;
        for (let j = 0; j <= segments; j++) {
            const theta = (j / segments) * Math.PI * 2;
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            const y = -r * r * 0.3; // Paraboloid shape (bowl down)
            vertices.push(x, y, z);
        }
    }
    
    // Create faces
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;
            
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
}

function createWavySurface(radius, segments) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    for (let i = 0; i <= segments; i++) {
        const r = (i / segments) * radius;
        for (let j = 0; j <= segments; j++) {
            const theta = (j / segments) * Math.PI * 2;
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            const y = 0.2 * Math.sin(3 * theta) * (r / radius); // Wavy
            vertices.push(x, y, z);
        }
    }
    
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;
            
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
}

function createBoundary() {
    if (boundaryCurve) {
        scene.remove(boundaryCurve);
    }
    
    const radius = 1.5;
    const segments = 100;
    const points = [];
    
    // Boundary is always a circle in the xz plane at y=0
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
            radius * Math.cos(theta),
            0,
            radius * Math.sin(theta)
        ));
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
        color: 0xa855f7, 
        linewidth: 3 
    });
    
    boundaryCurve = new THREE.Line(geometry, material);
    scene.add(boundaryCurve);
    
    // Add direction arrows on boundary
    addBoundaryArrows(radius, segments);
}

function addBoundaryArrows(radius, numArrows) {
    const arrowGroup = new THREE.Group();
    
    for (let i = 0; i < 8; i++) {
        const theta = (i / 8) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);
        
        // Tangent direction (counterclockwise)
        const tx = -Math.sin(theta);
        const tz = Math.cos(theta);
        
        const arrowLength = 0.2;
        const arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(tx, 0, tz),
            new THREE.Vector3(x, 0, z),
            arrowLength,
            0xa855f7,
            0.1,
            0.05
        );
        arrowGroup.add(arrowHelper);
    }
    
    boundaryCurve.add(arrowGroup);
}

let vectorDisplayMode = 'volume'; // 'plane', 'surface', 'volume'

function createVectorField() {
    if (vectorArrows) {
        scene.remove(vectorArrows);
    }
    
    vectorArrows = new THREE.Group();
    
    if (vectorDisplayMode === 'plane') {
        // Vectors on a single plane at y=0
        createPlaneVectors();
    } else if (vectorDisplayMode === 'surface') {
        // Vectors on the actual surface
        createSurfaceVectors();
    } else {
        // Volumetric 3D grid of vectors
        createVolumeVectors();
    }
    
    scene.add(vectorArrows);
}

function createPlaneVectors() {
    const gridSize = 5;
    const spacing = 0.6;
    
    for (let i = -gridSize/2; i <= gridSize/2; i++) {
        for (let j = -gridSize/2; j <= gridSize/2; j++) {
            const x = i * spacing;
            const z = j * spacing;
            const y = 0;
            
            addVectorArrow(x, y, z, 0x06b6d4, 0.5);
        }
    }
}

function createSurfaceVectors() {
    const radius = 1.5;
    const numRadial = 4;
    const numAngular = 12;
    
    for (let r = 0; r <= numRadial; r++) {
        const rad = (r / numRadial) * radius;
        const numAtRadius = r === 0 ? 1 : numAngular;
        
        for (let a = 0; a < numAtRadius; a++) {
            const theta = (a / numAtRadius) * Math.PI * 2;
            const x = rad * Math.cos(theta);
            const z = rad * Math.sin(theta);
            
            // Get y position based on surface type
            let y = 0;
            if (surfaceType === 'hemisphere') {
                const rNorm = rad / radius;
                y = -Math.sqrt(Math.max(0, 1 - rNorm * rNorm)) * radius;
            } else if (surfaceType === 'paraboloid') {
                y = -rad * rad * 0.3;
            } else if (surfaceType === 'wavy') {
                y = 0.2 * Math.sin(3 * theta) * (rad / radius);
            }
            
            addVectorArrow(x, y, z, 0x22d3ee, 0.7);
        }
    }
}

function createVolumeVectors() {
    const gridSize = 4;
    const spacing = 0.8;
    const yLevels = [-0.8, 0, 0.8];
    
    for (const y of yLevels) {
        const opacity = y === 0 ? 0.6 : 0.3;
        const color = y === 0 ? 0x06b6d4 : 0x3b82f6;
        
        for (let i = -gridSize/2; i <= gridSize/2; i++) {
            for (let j = -gridSize/2; j <= gridSize/2; j++) {
                const x = i * spacing;
                const z = j * spacing;
                
                addVectorArrow(x, y, z, color, opacity);
            }
        }
    }
}

function addVectorArrow(x, y, z, color, opacity) {
    const v = getField(x, y, z);
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    
    if (mag > 0.01) {
        const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
        const length = Math.min(mag * 0.3, 0.4);
        
        const arrow = new THREE.ArrowHelper(
            dir,
            new THREE.Vector3(x, y, z),
            length,
            color,
            0.08,
            0.04
        );
        arrow.line.material.transparent = true;
        arrow.line.material.opacity = opacity;
        arrow.cone.material.transparent = true;
        arrow.cone.material.opacity = opacity;
        vectorArrows.add(arrow);
    }
}

function getField(x, y, z) {
    switch(fieldType) {
        case 'rotation':
            // F = (-z, 0, x) - rotation around y-axis
            return { x: -z, y: 0, z: x };
            
        case 'helix':
            // Helical field
            return { x: -z, y: 0.5, z: x };
            
        case 'radial':
            // Radial outward in xz plane
            const r = Math.sqrt(x * x + z * z) + 0.1;
            return { x: x / r, y: 0, z: z / r };
            
        default:
            return { x: 0, y: 0, z: 0 };
    }
}

function getCurl(x, y, z) {
    const h = 0.01;
    
    // Numerical curl computation
    const fx1 = getField(x, y, z + h);
    const fx2 = getField(x, y, z - h);
    const fy1 = getField(x, y + h, z);
    const fy2 = getField(x, y - h, z);
    const fz1 = getField(x + h, y, z);
    const fz2 = getField(x - h, y, z);
    
    const curlX = (fx1.y - fx2.y) / (2 * h) - (fy1.z - fy2.z) / (2 * h);
    const curlY = (fy1.x - fy2.x) / (2 * h) - (fz1.y - fz2.y) / (2 * h);
    const curlZ = (fz1.y - fz2.y) / (2 * h) - (fx1.x - fx2.x) / (2 * h);
    
    return { x: curlX, y: curlY, z: curlZ };
}

function calculateIntegrals() {
    // Calculate boundary integral
    const radius = 1.5;
    const numSteps = 100;
    let boundaryIntegral = 0;
    
    for (let i = 0; i < numSteps; i++) {
        const theta1 = (i / numSteps) * Math.PI * 2;
        const theta2 = ((i + 1) / numSteps) * Math.PI * 2;
        
        const x1 = radius * Math.cos(theta1);
        const z1 = radius * Math.sin(theta1);
        const x2 = radius * Math.cos(theta2);
        const z2 = radius * Math.sin(theta2);
        
        const dx = x2 - x1;
        const dz = z2 - z1;
        
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        
        const v = getField(mx, 0, mz);
        boundaryIntegral += v.x * dx + v.z * dz;
    }
    
    // Calculate surface integral (approximate)
    // For simplicity, we integrate over the flat disk (same boundary)
    let surfaceIntegral = 0;
    const gridSize = 30;
    const cellSize = (2 * radius) / gridSize;
    const cellArea = cellSize * cellSize;
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = -radius + (i + 0.5) * cellSize;
            const z = -radius + (j + 0.5) * cellSize;
            
            if (x * x + z * z <= radius * radius) {
                const curl = getCurl(x, 0, z);
                // For flat surface, normal is (0, 1, 0)
                surfaceIntegral += curl.y * cellArea;
            }
        }
    }
    
    // Update displays
    document.getElementById('boundary-3d-value').textContent = boundaryIntegral.toFixed(2);
    document.getElementById('surface-3d-value').textContent = surfaceIntegral.toFixed(2);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('stokes-demo');
    if (!container) return;
    
    const width = container.offsetWidth;
    const height = 400;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Control functions - expose to global scope for HTML onclick handlers
window.updateSurface = function(type) {
    surfaceType = type;
    createSurface();
    calculateIntegrals();
};

window.updateField = function(type) {
    fieldType = type;
    createVectorField();
    calculateIntegrals();
};

window.resetCamera = function() {
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);
    controls.reset();
};

window.updateVectorDisplay = function(mode) {
    vectorDisplayMode = mode;
    createVectorField();
};

window.resetDemo = function() {
    surfaceType = 'flat';
    fieldType = 'rotation';
    vectorDisplayMode = 'volume';
    
    document.getElementById('surface-type').value = 'flat';
    document.getElementById('field-type').value = 'rotation';
    const vectorSelect = document.getElementById('vector-display');
    if (vectorSelect) vectorSelect.value = 'volume';
    
    createSurface();
    createVectorField();
    calculateIntegrals();
    window.resetCamera();
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
