/**
 * Tab 11: Advanced 3D Simulations
 * Three.js-based simulations for smoke, fluids, interfaces, and membranes
 */

// Global variables for scenes
let smokeScene, smokeCamera, smokeRenderer, smokeControls;
let fluidScene, fluidCamera, fluidRenderer, fluidControls;
let interfaceScene, interfaceCamera, interfaceRenderer, interfaceControls;
let membraneScene, membraneCamera, membraneRenderer, membraneControls;

// Simulation parameters
let params = {
    buoyancy: 0.5,
    vorticity: 0.3,
    smokeDiffusion: 0.01,
    viscosity: 0.001,
    flowSpeed: 1.0,
    tension: 0.5,
    densityRatio: 2.0,
    stiffness: 0.5,
    damping: 0.1,
    wind: 0.5,
    dropletSize: 0.5,
    waterDamping: 0.98
};

// Smoke particles
let smokeParticles = [];
let smokeGeometry, smokeMaterial, smokePointCloud;
const NUM_SMOKE_PARTICLES = 2000;

// Fluid mode
let fluidMode = 'streamlines';

// ============================================
// SMOKE SIMULATION
// ============================================

function initSmokeSimulation() {
    const container = document.getElementById('smoke-demo');
    if (!container) {
        console.log('Smoke container not found yet');
        return;
    }
    
    console.log('Initializing smoke simulation');
    
    // Check if THREE.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded');
        return;
    }
    
    // Scene setup
    smokeScene = new THREE.Scene();
    smokeScene.background = new THREE.Color(0x0a0e17);
    
    // Camera
    smokeCamera = new THREE.PerspectiveCamera(
        60,
        container.offsetWidth / 500,
        0.1,
        1000
    );
    smokeCamera.position.set(5, 5, 10);
    
    // Renderer
    smokeRenderer = new THREE.WebGLRenderer({ antialias: true });
    smokeRenderer.setSize(container.offsetWidth, 500);
    container.appendChild(smokeRenderer.domElement);
    
    // Controls
    if (THREE.OrbitControls) {
        smokeControls = new THREE.OrbitControls(smokeCamera, smokeRenderer.domElement);
        smokeControls.enableDamping = true;
    } else {
        console.warn('OrbitControls not available, using fixed camera');
    }
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    smokeScene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x06b6d4, 1, 100);
    pointLight.position.set(0, 10, 0);
    smokeScene.add(pointLight);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1e293b,
        side: THREE.DoubleSide 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = 0;
    smokeScene.add(ground);
    
    // Smoke source (cylinder)
    const sourceGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
    const sourceMaterial = new THREE.MeshPhongMaterial({ color: 0xf97316 });
    const source = new THREE.Mesh(sourceGeometry, sourceMaterial);
    source.position.y = 0.1;
    smokeScene.add(source);
    
    // Initialize smoke particles
    initSmokeParticles();
    
    // Setup controls
    setupSmokeControls();
    
    // Animation loop
    animateSmoke();
}

function initSmokeParticles() {
    smokeParticles = [];
    
    // Create particle geometry
    smokeGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(NUM_SMOKE_PARTICLES * 3);
    const colors = new Float32Array(NUM_SMOKE_PARTICLES * 3);
    const sizes = new Float32Array(NUM_SMOKE_PARTICLES);
    
    for (let i = 0; i < NUM_SMOKE_PARTICLES; i++) {
        const particle = {
            position: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                0.1,
                (Math.random() - 0.5) * 0.5
            ),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.5 + 0.5,
                (Math.random() - 0.5) * 0.1
            ),
            life: Math.random(),
            size: Math.random() * 0.5 + 0.2
        };
        
        smokeParticles.push(particle);
        
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;
        
        const intensity = 0.5 + Math.random() * 0.5;
        colors[i * 3] = intensity;
        colors[i * 3 + 1] = intensity;
        colors[i * 3 + 2] = intensity;
        
        sizes[i] = particle.size;
    }
    
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    smokeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    smokeGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create material with transparency
    smokeMaterial = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    smokePointCloud = new THREE.Points(smokeGeometry, smokeMaterial);
    smokeScene.add(smokePointCloud);
}

function updateSmokeParticles() {
    const positions = smokeGeometry.attributes.position.array;
    const colors = smokeGeometry.attributes.color.array;
    const sizes = smokeGeometry.attributes.size.array;
    
    for (let i = 0; i < NUM_SMOKE_PARTICLES; i++) {
        const particle = smokeParticles[i];
        
        // Update life
        particle.life -= 0.005;
        
        // Reset if dead
        if (particle.life <= 0) {
            particle.position.set(
                (Math.random() - 0.5) * 0.5,
                0.1,
                (Math.random() - 0.5) * 0.5
            );
            particle.velocity.set(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.5 + 0.5,
                (Math.random() - 0.5) * 0.1
            );
            particle.life = 1.0;
        }
        
        // Apply buoyancy (upward force)
        particle.velocity.y += params.buoyancy * 0.01;
        
        // Apply vorticity (swirl)
        const dist = Math.sqrt(particle.position.x * particle.position.x + 
                              particle.position.z * particle.position.z);
        if (dist > 0.1) {
            const angle = Math.atan2(particle.position.z, particle.position.x);
            particle.velocity.x += params.vorticity * 0.01 * Math.cos(angle + Math.PI / 2);
            particle.velocity.z += params.vorticity * 0.01 * Math.sin(angle + Math.PI / 2);
        }
        
        // Apply diffusion (random walk)
        particle.velocity.x += (Math.random() - 0.5) * params.smokeDiffusion;
        particle.velocity.z += (Math.random() - 0.5) * params.smokeDiffusion;
        
        // Damping
        particle.velocity.multiplyScalar(0.99);
        
        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(0.1));
        
        // Update buffer
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;
        
        // Fade out based on life
        const alpha = particle.life;
        colors[i * 3] = alpha * 0.8;
        colors[i * 3 + 1] = alpha * 0.9;
        colors[i * 3 + 2] = alpha * 1.0;
        
        sizes[i] = particle.size * (0.5 + particle.life * 0.5);
    }
    
    smokeGeometry.attributes.position.needsUpdate = true;
    smokeGeometry.attributes.color.needsUpdate = true;
    smokeGeometry.attributes.size.needsUpdate = true;
}

function animateSmoke() {
    requestAnimationFrame(animateSmoke);
    
    if (!smokeScene) return;
    
    updateSmokeParticles();
    if (smokeControls) smokeControls.update();
    smokeRenderer.render(smokeScene, smokeCamera);
}

function setupSmokeControls() {
    const buoyancySlider = document.getElementById('buoyancy-slider');
    const vorticitySlider = document.getElementById('vorticity-slider');
    const diffusionSlider = document.getElementById('smoke-diffusion-slider');
    
    if (buoyancySlider) {
        buoyancySlider.addEventListener('input', (e) => {
            params.buoyancy = parseFloat(e.target.value);
            document.getElementById('buoyancy-val').textContent = params.buoyancy.toFixed(1);
        });
    }
    
    if (vorticitySlider) {
        vorticitySlider.addEventListener('input', (e) => {
            params.vorticity = parseFloat(e.target.value);
            document.getElementById('vorticity-val').textContent = params.vorticity.toFixed(1);
        });
    }
    
    if (diffusionSlider) {
        diffusionSlider.addEventListener('input', (e) => {
            params.smokeDiffusion = parseFloat(e.target.value);
            document.getElementById('smoke-diffusion-val').textContent = params.smokeDiffusion.toFixed(2);
        });
    }
}

function resetSmoke() {
    initSmokeParticles();
}

// ============================================
// 3D FLUID FLOW SIMULATION
// ============================================

let fluidArrows = [];
let fluidStreamlines = [];
let fluidTracers = [];

function initFluidSimulation() {
    const container = document.getElementById('fluid-demo');
    if (!container) {
        console.log('Fluid container not found yet');
        return;
    }
    console.log('Initializing fluid simulation');
    
    // Scene setup
    fluidScene = new THREE.Scene();
    fluidScene.background = new THREE.Color(0x0a0e17);
    
    // Camera
    fluidCamera = new THREE.PerspectiveCamera(
        60,
        container.offsetWidth / 500,
        0.1,
        1000
    );
    fluidCamera.position.set(8, 8, 8);
    
    // Renderer
    fluidRenderer = new THREE.WebGLRenderer({ antialias: true });
    fluidRenderer.setSize(container.offsetWidth, 500);
    container.appendChild(fluidRenderer.domElement);
    
    // Controls
    if (THREE.OrbitControls) {
        fluidControls = new THREE.OrbitControls(fluidCamera, fluidRenderer.domElement);
        fluidControls.enableDamping = true;
    }
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    fluidScene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x06b6d4, 1, 100);
    pointLight.position.set(10, 10, 10);
    fluidScene.add(pointLight);
    
    // Create vector field
    createVectorField();
    
    // Setup controls
    setupFluidControls();
    
    // Animation loop
    animateFluid();
}

function createVectorField() {
    // Clear existing
    fluidArrows.forEach(arrow => fluidScene.remove(arrow));
    fluidArrows = [];
    
    const gridSize = 5;
    const spacing = 2;
    const time = Date.now() * 0.001;
    
    for (let x = -gridSize; x <= gridSize; x += spacing) {
        for (let y = -gridSize; y <= gridSize; y += spacing) {
            for (let z = -gridSize; z <= gridSize; z += spacing) {
                // Create interesting 3D vector field (vortex ring)
                const r = Math.sqrt(x * x + z * z);
                const theta = Math.atan2(z, x);
                
                // Velocity field: vortex ring
                const vx = -Math.sin(theta) * (1 / (1 + r * r)) + Math.cos(time * 0.5) * 0.2;
                const vy = Math.sin(y * 0.3 + time) * 0.5;
                const vz = Math.cos(theta) * (1 / (1 + r * r)) + Math.sin(time * 0.5) * 0.2;
                
                const velocity = new THREE.Vector3(vx, vy, vz);
                const speed = velocity.length();
                
                if (speed > 0.01) {
                    const direction = velocity.normalize();
                    const arrowLength = Math.min(speed * params.flowSpeed, 1.5);
                    
                    const arrowHelper = new THREE.ArrowHelper(
                        direction,
                        new THREE.Vector3(x, y, z),
                        arrowLength,
                        new THREE.Color().setHSL(0.55 - speed * 0.3, 0.8, 0.6),
                        arrowLength * 0.2,
                        arrowLength * 0.15
                    );
                    
                    fluidScene.add(arrowHelper);
                    fluidArrows.push(arrowHelper);
                }
            }
        }
    }
}

function animateFluid() {
    requestAnimationFrame(animateFluid);
    
    if (!fluidScene) return;
    
    // Update vector field periodically
    if (Math.random() < 0.05) {
        createVectorField();
    }
    
    if (fluidControls) fluidControls.update();
    fluidRenderer.render(fluidScene, fluidCamera);
}

function setupFluidControls() {
    const viscositySlider = document.getElementById('viscosity-slider');
    const flowSpeedSlider = document.getElementById('flow-speed-slider');
    
    if (viscositySlider) {
        viscositySlider.addEventListener('input', (e) => {
            params.viscosity = parseFloat(e.target.value);
            document.getElementById('viscosity-val').textContent = params.viscosity.toFixed(3);
        });
    }
    
    if (flowSpeedSlider) {
        flowSpeedSlider.addEventListener('input', (e) => {
            params.flowSpeed = parseFloat(e.target.value);
            document.getElementById('flow-speed-val').textContent = params.flowSpeed.toFixed(1);
            createVectorField();
        });
    }
}

function setFluidMode(mode) {
    fluidMode = mode;
    // Could implement different visualization modes here
}

// ============================================
// FLUID INTERFACE SIMULATION
// ============================================

let interfaceMesh, interfaceVertices;
let droplets = [];
let waterBody;

function initInterfaceSimulation() {
    const container = document.getElementById('interface-demo');
    if (!container) {
        console.log('Interface container not found yet');
        return;
    }
    console.log('Initializing interface simulation');
    
    // Scene setup
    interfaceScene = new THREE.Scene();
    
    // Sky background
    interfaceScene.background = new THREE.Color(0x88bbdd);
    
    // Add fog for atmosphere
    interfaceScene.fog = new THREE.Fog(0x88bbdd, 60, 200);
    
    // Camera - positioned to see the larger circular pool
    interfaceCamera = new THREE.PerspectiveCamera(
        55,
        container.offsetWidth / 500,
        0.1,
        500
    );
    interfaceCamera.position.set(40, 30, 50);
    interfaceCamera.lookAt(0, -2, 0);
    
    // Renderer
    interfaceRenderer = new THREE.WebGLRenderer({ antialias: true });
    interfaceRenderer.setSize(container.offsetWidth, 500);
    container.appendChild(interfaceRenderer.domElement);
    
    // Controls
    if (THREE.OrbitControls) {
        interfaceControls = new THREE.OrbitControls(interfaceCamera, interfaceRenderer.domElement);
        interfaceControls.enableDamping = true;
        interfaceControls.maxPolarAngle = Math.PI / 2.1; // Limit looking under water
    }
    
    // Lights - bright daylight
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    interfaceScene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffee, 1.0);
    sunLight.position.set(10, 30, 20);
    interfaceScene.add(sunLight);
    
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-10, 10, -10);
    interfaceScene.add(fillLight);
    
    // Create the basin/pool structure
    createBasin();
    
    // Create interface surface (water surface)
    createInterface();
    
    // Initialize droplets array
    droplets = [];
    
    // Setup controls
    setupInterfaceControls();
    
    // Animation loop
    animateInterface();
}

function createBasin() {
    const poolRadius = 30;  // 3x bigger, circular pool
    const poolDepth = 6;
    const waterLevel = 0;
    
    // Pool floor - circular
    const floorGeometry = new THREE.CircleGeometry(poolRadius, 64);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1155aa,
        shininess: 30,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -poolDepth;
    interfaceScene.add(floor);
    
    // Water volume - cylinder
    const waterVolumeGeometry = new THREE.CylinderGeometry(poolRadius, poolRadius, poolDepth, 64);
    const waterVolumeMaterial = new THREE.MeshPhongMaterial({
        color: 0x0066bb,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    waterBody = new THREE.Mesh(waterVolumeGeometry, waterVolumeMaterial);
    waterBody.position.y = waterLevel - poolDepth / 2;
    interfaceScene.add(waterBody);
    
    // Pool wall - cylinder (open top and bottom)
    const wallGeometry = new THREE.CylinderGeometry(poolRadius, poolRadius, poolDepth, 64, 1, true);
    const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0x3388bb,
        shininess: 20,
        side: THREE.DoubleSide
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = -poolDepth / 2;
    interfaceScene.add(wall);
    
    // Pool edge/coping - ring around the top
    const copingGeometry = new THREE.TorusGeometry(poolRadius + 1, 1.5, 8, 64);
    const copingMaterial = new THREE.MeshPhongMaterial({
        color: 0xddeeff,
        shininess: 60
    });
    const coping = new THREE.Mesh(copingGeometry, copingMaterial);
    coping.rotation.x = Math.PI / 2;
    coping.position.y = waterLevel + 0.3;
    interfaceScene.add(coping);
    
    // Underwater lights arranged in circle
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const light = new THREE.PointLight(0x44aaff, 0.5, 40);
        light.position.set(
            Math.cos(angle) * poolRadius * 0.6,
            -poolDepth + 1,
            Math.sin(angle) * poolRadius * 0.6
        );
        interfaceScene.add(light);
    }
}

function createInterface() {
    const poolRadius = 29.5;  // Slightly smaller than pool to fit inside
    const radialSegments = 80;
    const ringSegments = 40;
    
    // Create circular geometry using a disc
    const geometry = new THREE.CircleGeometry(poolRadius, radialSegments, 0, Math.PI * 2);
    
    // Rotate to be horizontal (XZ plane)
    geometry.rotateX(-Math.PI / 2);
    
    // Subdivide for wave simulation - we need a grid-like structure
    // Use a plane and mask to circular
    const gridSize = poolRadius * 2;
    const segments = 80;
    const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments);
    planeGeometry.rotateX(-Math.PI / 2);
    
    // Store original positions and mark which are inside the circle
    const positions = planeGeometry.attributes.position.array;
    interfaceVertices = [];
    
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        interfaceVertices.push({
            x: x,
            y: positions[i + 1],
            z: z,
            vy: 0,
            distFromCenter: distFromCenter,
            isInPool: distFromCenter <= poolRadius
        });
    }
    
    // Water surface material
    const material = new THREE.MeshPhongMaterial({
        color: 0x3399dd,
        side: THREE.DoubleSide,
        wireframe: false,
        transparent: true,
        opacity: 0.5,
        shininess: 100,
        specular: 0xaaddff
    });
    
    interfaceMesh = new THREE.Mesh(planeGeometry, material);
    interfaceMesh.position.y = 0;
    interfaceScene.add(interfaceMesh);
}

function createDroplet() {
    // Size based on slider (0.1 to 1.0 maps to 0.05 to 0.25 radius)
    const baseSize = 0.05 + params.dropletSize * 0.2;
    const sizeVariation = baseSize * 0.3 * Math.random();
    const dropletGeometry = new THREE.SphereGeometry(baseSize + sizeVariation, 12, 12);
    
    const dropletMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.9,
        shininess: 200,
        specular: 0xffffff
    });
    
    const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
    
    // Random position above the circular pool (within inner 70% to stay away from edges)
    const poolRadius = 30;
    const maxDropRadius = poolRadius * 0.7;  // Drop within center 70%
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * maxDropRadius;
    
    droplet.position.x = Math.cos(angle) * r;
    droplet.position.y = 15 + Math.random() * 10;  // Higher drop for bigger pool
    droplet.position.z = Math.sin(angle) * r;
    
    // Store velocity and size for splash calculation
    droplet.userData = {
        vy: -0.08 - Math.random() * 0.05,
        vx: (Math.random() - 0.5) * 0.02,
        vz: (Math.random() - 0.5) * 0.02,
        size: baseSize + sizeVariation
    };
    
    interfaceScene.add(droplet);
    droplets.push(droplet);
}

function createSplash(x, z, dropletSize) {
    // Simulate droplet penetrating the surface membrane
    // Creates high-frequency, localized disturbance
    
    // The droplet pushes down at center, water rises in a ring around it
    const dropletRadius = dropletSize * 2;  // Physical size of droplet impact
    const impactStrength = dropletSize * 0.15;  // Strength of the push
    
    interfaceVertices.forEach(vertex => {
        if (!vertex.isInPool) return;
        
        const dx = vertex.x - x;
        const dz = vertex.z - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Only affect a small, localized area (high frequency)
        if (dist < dropletRadius * 3) {
            if (dist < dropletRadius) {
                // Center depression - droplet pushes water down
                // Sharper falloff for higher frequency
                const centerFactor = 1 - (dist / dropletRadius);
                const depression = centerFactor * centerFactor * impactStrength;
                vertex.vy -= depression;
                vertex.y -= depression * 0.5;  // Immediate displacement too
            } else if (dist < dropletRadius * 2) {
                // Ring of upward splash around the impact
                // This creates the "crown" effect
                const ringDist = (dist - dropletRadius) / dropletRadius;
                const ringFactor = Math.sin(ringDist * Math.PI);  // Peak at middle of ring
                const uplift = ringFactor * impactStrength * 0.5;
                vertex.vy += uplift;
            } else {
                // Outer ring - slight downward to conserve volume
                const outerDist = (dist - dropletRadius * 2) / dropletRadius;
                const outerFactor = 1 - outerDist;
                vertex.vy -= outerFactor * impactStrength * 0.1;
            }
        }
    });
}

function updateInterface() {
    const positions = interfaceMesh.geometry.attributes.position.array;
    const segments = 81;  // segments + 1
    const poolRadius = 29.5;
    
    // Spawn new droplets occasionally
    if (Math.random() < 0.025) {
        createDroplet();
    }
    
    // Update droplets
    for (let i = droplets.length - 1; i >= 0; i--) {
        const droplet = droplets[i];
        
        // Apply gravity
        droplet.userData.vy -= 0.008;
        
        // Update position
        droplet.position.x += droplet.userData.vx;
        droplet.position.y += droplet.userData.vy;
        droplet.position.z += droplet.userData.vz;
        
        // Check if hit the water surface (within circular pool bounds)
        const distFromCenter = Math.sqrt(droplet.position.x * droplet.position.x + 
                                        droplet.position.z * droplet.position.z);
        const inBounds = distFromCenter < poolRadius;
        
        if (droplet.position.y < 0.15 && inBounds) {
            // Create splash based on droplet size
            createSplash(droplet.position.x, droplet.position.z, droplet.userData.size);
            
            // Remove droplet
            interfaceScene.remove(droplet);
            droplets.splice(i, 1);
        }
        
        // Remove if too far below or out of bounds
        if (droplet.position.y < -8 || (!inBounds && droplet.position.y < 0)) {
            interfaceScene.remove(droplet);
            droplets.splice(i, 1);
        }
    }
    
    // Update water surface with wave propagation
    // Water starts still and returns to still (no constant agitation)
    for (let i = 0; i < interfaceVertices.length; i++) {
        const vertex = interfaceVertices[i];
        const idx = i * 3;
        const row = Math.floor(i / segments);
        const col = i % segments;
        
        // Skip vertices outside the circular pool
        if (!vertex.isInPool) {
            positions[idx + 1] = -10;  // Hide outside vertices below view
            continue;
        }
        
        // Calculate edge damping (radial - waves absorbed at pool edge)
        const normalizedDist = vertex.distFromCenter / poolRadius;
        const edgeDamping = normalizedDist > 0.85 ? Math.max(0, 1 - (normalizedDist - 0.85) / 0.15) : 1;
        
        // Wave propagation from neighbors (2D wave equation)
        let neighborSum = 0;
        let neighborCount = 0;
        
        // Check all 4 neighbors, but only if they're in the pool
        if (col > 0 && interfaceVertices[i - 1].isInPool) {
            neighborSum += interfaceVertices[i - 1].y;
            neighborCount++;
        }
        if (col < segments - 1 && interfaceVertices[i + 1].isInPool) {
            neighborSum += interfaceVertices[i + 1].y;
            neighborCount++;
        }
        if (row > 0 && interfaceVertices[i - segments].isInPool) {
            neighborSum += interfaceVertices[i - segments].y;
            neighborCount++;
        }
        if (row < segments - 1 && interfaceVertices[i + segments].isInPool) {
            neighborSum += interfaceVertices[i + segments].y;
            neighborCount++;
        }
        
        if (neighborCount > 0) {
            const avgNeighbor = neighborSum / neighborCount;
            // Wave equation: acceleration proportional to curvature (Laplacian)
            // Higher coefficient = faster wave propagation
            const waveForce = (avgNeighbor - vertex.y) * 0.45;
            vertex.vy += waveForce;
        }
        
        // Surface tension (restoring force toward flat/still water)
        // Stronger surface tension helps maintain sharper wavefronts
        vertex.vy -= vertex.y * params.tension * 0.04;
        
        // Viscous damping - energy dissipation (entropy)
        // This gradually removes energy, making waves die out over time
        vertex.vy *= params.waterDamping;
        
        // Additional damping for very small movements (settle to rest)
        if (Math.abs(vertex.vy) < 0.00005) vertex.vy = 0;
        if (Math.abs(vertex.y) < 0.0002 && Math.abs(vertex.vy) < 0.0005) vertex.y = 0;
        
        // Edge damping (waves absorbed at pool walls)
        vertex.vy *= edgeDamping;
        if (normalizedDist > 0.9) {
            vertex.y *= edgeDamping;
        }
        
        // Update position
        vertex.y += vertex.vy;
        
        // Clamp to reasonable bounds
        vertex.y = Math.max(-0.5, Math.min(0.5, vertex.y));
        
        positions[idx + 1] = vertex.y;
    }
    
    interfaceMesh.geometry.attributes.position.needsUpdate = true;
    interfaceMesh.geometry.computeVertexNormals();
}

function animateInterface() {
    requestAnimationFrame(animateInterface);
    
    if (!interfaceScene) return;
    
    updateInterface();
    if (interfaceControls) interfaceControls.update();
    interfaceRenderer.render(interfaceScene, interfaceCamera);
}

function setupInterfaceControls() {
    const tensionSlider = document.getElementById('tension-slider');
    const dropletSizeSlider = document.getElementById('droplet-size-slider');
    const waterDampingSlider = document.getElementById('water-damping-slider');
    
    if (tensionSlider) {
        tensionSlider.addEventListener('input', (e) => {
            params.tension = parseFloat(e.target.value);
            document.getElementById('tension-val').textContent = params.tension.toFixed(1);
        });
    }
    
    if (dropletSizeSlider) {
        dropletSizeSlider.addEventListener('input', (e) => {
            params.dropletSize = parseFloat(e.target.value);
            document.getElementById('droplet-size-val').textContent = params.dropletSize.toFixed(1);
        });
    }
    
    if (waterDampingSlider) {
        waterDampingSlider.addEventListener('input', (e) => {
            params.waterDamping = parseFloat(e.target.value);
            document.getElementById('water-damping-val').textContent = params.waterDamping.toFixed(3);
        });
    }
}

function resetInterface() {
    // Reset water surface
    interfaceVertices.forEach(v => {
        v.y = 0;
        v.vy = 0;
    });
    
    // Clear all droplets
    droplets.forEach(droplet => {
        interfaceScene.remove(droplet);
    });
    droplets = [];
}

// ============================================
// ELASTIC MEMBRANE SIMULATION
// ============================================

let membraneMesh, membraneVertices;
let mouseRaycaster, mouseVector;

function initMembraneSimulation() {
    const container = document.getElementById('membrane-demo');
    if (!container) {
        console.log('Membrane container not found yet');
        return;
    }
    console.log('Initializing membrane simulation');
    
    // Scene setup
    membraneScene = new THREE.Scene();
    membraneScene.background = new THREE.Color(0x0a0e17);
    
    // Camera
    membraneCamera = new THREE.PerspectiveCamera(
        60,
        container.offsetWidth / 500,
        0.1,
        1000
    );
    membraneCamera.position.set(0, 0, 15);
    
    // Renderer
    membraneRenderer = new THREE.WebGLRenderer({ antialias: true });
    membraneRenderer.setSize(container.offsetWidth, 500);
    container.appendChild(membraneRenderer.domElement);
    
    // Controls
    if (THREE.OrbitControls) {
        membraneControls = new THREE.OrbitControls(membraneCamera, membraneRenderer.domElement);
        membraneControls.enableDamping = true;
    }
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    membraneScene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x06b6d4, 1, 100);
    pointLight1.position.set(10, 10, 10);
    membraneScene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xf97316, 0.5, 100);
    pointLight2.position.set(-10, -10, 10);
    membraneScene.add(pointLight2);
    
    // Create membrane
    createMembrane();
    
    // Mouse interaction
    mouseRaycaster = new THREE.Raycaster();
    mouseVector = new THREE.Vector2();
    
    membraneRenderer.domElement.addEventListener('mousemove', onMembraneMouseMove);
    membraneRenderer.domElement.addEventListener('click', onMembraneClick);
    
    // Setup controls
    setupMembraneControls();
    
    // Animation loop
    animateMembrane();
}

function createMembrane() {
    const segments = 30;
    const size = 8;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Store vertex data
    const positions = geometry.attributes.position.array;
    membraneVertices = [];
    
    for (let i = 0; i < positions.length; i += 3) {
        membraneVertices.push({
            x: positions[i],
            y: positions[i + 1],
            z: 0,
            vz: 0,
            originalX: positions[i],
            originalY: positions[i + 1]
        });
    }
    
    const material = new THREE.MeshPhongMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        wireframe: false,
        flatShading: false,
        shininess: 80
    });
    
    membraneMesh = new THREE.Mesh(geometry, material);
    membraneScene.add(membraneMesh);
    
    // Add wireframe overlay
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ 
        color: 0x06b6d4, 
        transparent: true, 
        opacity: 0.3 
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    membraneMesh.add(wireframe);
}

function updateMembrane() {
    const positions = membraneMesh.geometry.attributes.position.array;
    const segments = Math.sqrt(membraneVertices.length);
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < membraneVertices.length; i++) {
        const vertex = membraneVertices[i];
        const idx = i * 3;
        
        // Wind force (sinusoidal)
        const windForce = Math.sin(vertex.x * 0.5 + time * 2) * 
                         Math.cos(vertex.y * 0.5 + time * 1.5) * 
                         params.wind * 0.02;
        
        // Elastic restoring force
        const elasticForce = -(vertex.z) * params.stiffness * 0.1;
        
        // Calculate neighbor forces (simple springs)
        let neighborForce = 0;
        const row = Math.floor(i / segments);
        const col = i % segments;
        
        // Sample a few neighbors
        if (col > 0) {
            const neighbor = membraneVertices[i - 1];
            neighborForce += (neighbor.z - vertex.z) * 0.05;
        }
        if (col < segments - 1) {
            const neighbor = membraneVertices[i + 1];
            neighborForce += (neighbor.z - vertex.z) * 0.05;
        }
        if (row > 0) {
            const neighbor = membraneVertices[i - segments];
            neighborForce += (neighbor.z - vertex.z) * 0.05;
        }
        if (row < segments - 1) {
            const neighbor = membraneVertices[i + segments];
            neighborForce += (neighbor.z - vertex.z) * 0.05;
        }
        
        // Update velocity
        vertex.vz += windForce + elasticForce + neighborForce;
        vertex.vz *= (1 - params.damping); // Damping
        
        // Update position
        vertex.z += vertex.vz;
        
        positions[idx + 2] = vertex.z;
    }
    
    membraneMesh.geometry.attributes.position.needsUpdate = true;
    membraneMesh.geometry.computeVertexNormals();
}

function onMembraneMouseMove(event) {
    if (!membraneMesh) return;
    
    // Only interact when Shift is held - this lets you rotate freely otherwise
    if (!event.shiftKey) return;
    
    const rect = membraneRenderer.domElement.getBoundingClientRect();
    mouseVector.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVector.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    mouseRaycaster.setFromCamera(mouseVector, membraneCamera);
    const intersects = mouseRaycaster.intersectObject(membraneMesh);
    
    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // Apply force to nearby vertices
        membraneVertices.forEach(vertex => {
            const dx = vertex.x - point.x;
            const dy = vertex.y - point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 1.5) {
                const force = (1 - dist / 1.5) * 0.8;
                vertex.vz += force;
            }
        });
    }
}

// Also handle click events for stronger pokes
function onMembraneClick(event) {
    if (!membraneMesh || !event.shiftKey) return;
    
    const rect = membraneRenderer.domElement.getBoundingClientRect();
    mouseVector.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVector.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    mouseRaycaster.setFromCamera(mouseVector, membraneCamera);
    const intersects = mouseRaycaster.intersectObject(membraneMesh);
    
    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // Apply stronger impulse on click
        membraneVertices.forEach(vertex => {
            const dx = vertex.x - point.x;
            const dy = vertex.y - point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 2.0) {
                const force = (1 - dist / 2.0) * 2.0;
                vertex.vz += force;
            }
        });
    }
}

function animateMembrane() {
    requestAnimationFrame(animateMembrane);
    
    if (!membraneScene) return;
    
    updateMembrane();
    if (membraneControls) membraneControls.update();
    membraneRenderer.render(membraneScene, membraneCamera);
}

function setupMembraneControls() {
    const stiffnessSlider = document.getElementById('stiffness-slider');
    const dampingSlider = document.getElementById('damping-slider');
    const windSlider = document.getElementById('wind-slider');
    
    if (stiffnessSlider) {
        stiffnessSlider.addEventListener('input', (e) => {
            params.stiffness = parseFloat(e.target.value);
            document.getElementById('stiffness-val').textContent = params.stiffness.toFixed(1);
        });
    }
    
    if (dampingSlider) {
        dampingSlider.addEventListener('input', (e) => {
            params.damping = parseFloat(e.target.value);
            document.getElementById('damping-val').textContent = params.damping.toFixed(2);
        });
    }
    
    if (windSlider) {
        windSlider.addEventListener('input', (e) => {
            params.wind = parseFloat(e.target.value);
            document.getElementById('wind-val').textContent = params.wind.toFixed(1);
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Track which simulations have been initialized
let simulationsInitialized = {
    smoke: false,
    fluid: false,
    interface: false,
    membrane: false
};

// Initialize a specific simulation
window.initSimulation = function(simType) {
    console.log('Initializing simulation:', simType);
    
    if (simulationsInitialized[simType]) {
        console.log('Already initialized:', simType);
        return;
    }
    
    switch(simType) {
        case 'smoke':
            initSmokeSimulation();
            simulationsInitialized.smoke = true;
            break;
        case 'fluid':
            initFluidSimulation();
            simulationsInitialized.fluid = true;
            break;
        case 'interface':
            initInterfaceSimulation();
            simulationsInitialized.interface = true;
            break;
        case 'membrane':
            initMembraneSimulation();
            simulationsInitialized.membrane = true;
            break;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize the first (default) simulation
    setTimeout(() => {
        initSmokeSimulation();
        simulationsInitialized.smoke = true;
    }, 100);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (smokeRenderer) {
            const container = document.getElementById('smoke-demo');
            if (container) {
                smokeCamera.aspect = container.offsetWidth / 500;
                smokeCamera.updateProjectionMatrix();
                smokeRenderer.setSize(container.offsetWidth, 500);
            }
        }
        
        if (fluidRenderer) {
            const container = document.getElementById('fluid-demo');
            if (container) {
                fluidCamera.aspect = container.offsetWidth / 500;
                fluidCamera.updateProjectionMatrix();
                fluidRenderer.setSize(container.offsetWidth, 500);
            }
        }
        
        if (interfaceRenderer) {
            const container = document.getElementById('interface-demo');
            if (container) {
                interfaceCamera.aspect = container.offsetWidth / 500;
                interfaceCamera.updateProjectionMatrix();
                interfaceRenderer.setSize(container.offsetWidth, 500);
            }
        }
        
        if (membraneRenderer) {
            const container = document.getElementById('membrane-demo');
            if (container) {
                membraneCamera.aspect = container.offsetWidth / 500;
                membraneCamera.updateProjectionMatrix();
                membraneRenderer.setSize(container.offsetWidth, 500);
            }
        }
    });
});

