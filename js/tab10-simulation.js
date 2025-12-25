/**
 * Tab 10: Realistic Fluid Simulation
 * WebGL-based Navier-Stokes fluid simulation using Stable Fluids algorithm
 */

// Simulation state
let gl;
let canvas;
let programs = {};
let textures = {};
let framebuffers = {};

// Simulation parameters
let simParams = {
    viscosity: 0.1,
    diffusion: 0.2,
    pressureIterations: 20,
    displayMode: 'dye'
};

let isPaused = false;
let mousePos = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let isMouseDown = false;

// Resolution
const SIM_RESOLUTION = 256;
const DYE_RESOLUTION = 512;

// Shader sources
const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    
    void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const copyShader = `
    precision highp float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    
    void main() {
        gl_FragColor = texture2D(u_texture, v_uv);
    }
`;

const clearShader = `
    precision highp float;
    uniform vec4 u_color;
    
    void main() {
        gl_FragColor = u_color;
    }
`;

const splatShader = `
    precision highp float;
    uniform sampler2D u_texture;
    uniform vec2 u_point;
    uniform vec3 u_color;
    uniform float u_radius;
    uniform float u_aspectRatio;
    varying vec2 v_uv;
    
    void main() {
        vec2 p = v_uv - u_point;
        p.x *= u_aspectRatio;
        float d = length(p);
        float splash = exp(-d * d / u_radius);
        vec3 base = texture2D(u_texture, v_uv).rgb;
        gl_FragColor = vec4(base + splash * u_color, 1.0);
    }
`;

const advectionShader = `
    precision highp float;
    uniform sampler2D u_velocity;
    uniform sampler2D u_source;
    uniform vec2 u_texelSize;
    uniform float u_dt;
    uniform float u_dissipation;
    varying vec2 v_uv;
    
    void main() {
        vec2 vel = texture2D(u_velocity, v_uv).xy;
        vec2 coord = v_uv - u_dt * vel * u_texelSize;
        gl_FragColor = u_dissipation * texture2D(u_source, coord);
    }
`;

const divergenceShader = `
    precision highp float;
    uniform sampler2D u_velocity;
    uniform vec2 u_texelSize;
    varying vec2 v_uv;
    
    void main() {
        float L = texture2D(u_velocity, v_uv - vec2(u_texelSize.x, 0.0)).x;
        float R = texture2D(u_velocity, v_uv + vec2(u_texelSize.x, 0.0)).x;
        float B = texture2D(u_velocity, v_uv - vec2(0.0, u_texelSize.y)).y;
        float T = texture2D(u_velocity, v_uv + vec2(0.0, u_texelSize.y)).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

const pressureShader = `
    precision highp float;
    uniform sampler2D u_pressure;
    uniform sampler2D u_divergence;
    uniform vec2 u_texelSize;
    varying vec2 v_uv;
    
    void main() {
        float L = texture2D(u_pressure, v_uv - vec2(u_texelSize.x, 0.0)).x;
        float R = texture2D(u_pressure, v_uv + vec2(u_texelSize.x, 0.0)).x;
        float B = texture2D(u_pressure, v_uv - vec2(0.0, u_texelSize.y)).x;
        float T = texture2D(u_pressure, v_uv + vec2(0.0, u_texelSize.y)).x;
        float C = texture2D(u_divergence, v_uv).x;
        float pressure = (L + R + B + T - C) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

const gradientSubtractShader = `
    precision highp float;
    uniform sampler2D u_pressure;
    uniform sampler2D u_velocity;
    uniform vec2 u_texelSize;
    varying vec2 v_uv;
    
    void main() {
        float L = texture2D(u_pressure, v_uv - vec2(u_texelSize.x, 0.0)).x;
        float R = texture2D(u_pressure, v_uv + vec2(u_texelSize.x, 0.0)).x;
        float B = texture2D(u_pressure, v_uv - vec2(0.0, u_texelSize.y)).x;
        float T = texture2D(u_pressure, v_uv + vec2(0.0, u_texelSize.y)).x;
        vec2 vel = texture2D(u_velocity, v_uv).xy;
        vel -= vec2(R - L, T - B) * 0.5;
        gl_FragColor = vec4(vel, 0.0, 1.0);
    }
`;

const curlShader = `
    precision highp float;
    uniform sampler2D u_velocity;
    uniform vec2 u_texelSize;
    varying vec2 v_uv;
    
    void main() {
        float L = texture2D(u_velocity, v_uv - vec2(u_texelSize.x, 0.0)).y;
        float R = texture2D(u_velocity, v_uv + vec2(u_texelSize.x, 0.0)).y;
        float B = texture2D(u_velocity, v_uv - vec2(0.0, u_texelSize.y)).x;
        float T = texture2D(u_velocity, v_uv + vec2(0.0, u_texelSize.y)).x;
        float curl = (R - L) - (T - B);
        gl_FragColor = vec4(curl * 0.5, 0.0, 0.0, 1.0);
    }
`;

const displayDyeShader = `
    precision highp float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    
    void main() {
        vec3 c = texture2D(u_texture, v_uv).rgb;
        gl_FragColor = vec4(c, 1.0);
    }
`;

const displayVelocityShader = `
    precision highp float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    
    void main() {
        vec2 vel = texture2D(u_texture, v_uv).xy;
        float mag = length(vel) * 3.0;
        vec3 c = vec3(
            0.5 + 0.5 * vel.x * 3.0,
            0.5 + 0.5 * vel.y * 3.0,
            0.5 + 0.5 * mag
        );
        gl_FragColor = vec4(c, 1.0);
    }
`;

const displayPressureShader = `
    precision highp float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    
    void main() {
        float p = texture2D(u_texture, v_uv).x * 0.5 + 0.5;
        vec3 c = vec3(p, 0.2, 1.0 - p);
        gl_FragColor = vec4(c, 1.0);
    }
`;

const displayCurlShader = `
    precision highp float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    
    void main() {
        float curl = texture2D(u_texture, v_uv).x;
        vec3 c;
        if (curl > 0.0) {
            c = vec3(0.06, 0.72, 0.53) * curl * 5.0;
        } else {
            c = vec3(0.98, 0.45, 0.09) * (-curl) * 5.0;
        }
        gl_FragColor = vec4(c, 1.0);
    }
`;

function init() {
    canvas = document.getElementById('fluid-canvas');
    if (!canvas) return;
    
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }
    
    // Enable extensions
    gl.getExtension('OES_texture_float');
    gl.getExtension('OES_texture_float_linear');
    
    // Set canvas size
    resizeCanvas();
    
    // Compile shaders
    compileShaders();
    
    // Create textures
    createTextures();
    
    // Create quad buffer
    createQuadBuffer();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start render loop
    render();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = 500;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function createProgram(fragSource) {
    const vertShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fragSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }
    
    return program;
}

function compileShaders() {
    programs.copy = createProgram(copyShader);
    programs.clear = createProgram(clearShader);
    programs.splat = createProgram(splatShader);
    programs.advection = createProgram(advectionShader);
    programs.divergence = createProgram(divergenceShader);
    programs.pressure = createProgram(pressureShader);
    programs.gradientSubtract = createProgram(gradientSubtractShader);
    programs.curl = createProgram(curlShader);
    programs.displayDye = createProgram(displayDyeShader);
    programs.displayVelocity = createProgram(displayVelocityShader);
    programs.displayPressure = createProgram(displayPressureShader);
    programs.displayCurl = createProgram(displayCurlShader);
}

function createDoubleFBO(w, h) {
    let fbo1 = createFBO(w, h);
    let fbo2 = createFBO(w, h);
    return {
        read: fbo1,
        write: fbo2,
        swap: function() {
            let temp = this.read;
            this.read = this.write;
            this.write = temp;
        }
    };
}

function createFBO(w, h) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, null);
    
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    return { texture, fbo, width: w, height: h };
}

function createTextures() {
    textures.velocity = createDoubleFBO(SIM_RESOLUTION, SIM_RESOLUTION);
    textures.pressure = createDoubleFBO(SIM_RESOLUTION, SIM_RESOLUTION);
    textures.divergence = createFBO(SIM_RESOLUTION, SIM_RESOLUTION);
    textures.curl = createFBO(SIM_RESOLUTION, SIM_RESOLUTION);
    textures.dye = createDoubleFBO(DYE_RESOLUTION, DYE_RESOLUTION);
}

function createQuadBuffer() {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        -1, 1,
        1, 1,
        1, -1
    ]), gl.STATIC_DRAW);
}

function blit(target) {
    if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width, target.height);
    } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function setupEventListeners() {
    canvas.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        updateMousePos(e);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        updateMousePos(e);
    });
    
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isMouseDown = true;
        updateMousePos(e.touches[0]);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        updateMousePos(e.touches[0]);
    });
    
    canvas.addEventListener('touchend', () => {
        isMouseDown = false;
    });
    
    window.addEventListener('resize', resizeCanvas);
}

function updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    lastMousePos.x = mousePos.x;
    lastMousePos.y = mousePos.y;
    mousePos.x = (e.clientX - rect.left) / rect.width;
    mousePos.y = 1.0 - (e.clientY - rect.top) / rect.height;
}

function splat(x, y, dx, dy, color) {
    // Splat velocity
    gl.useProgram(programs.splat);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,-1,1,1,1,1,-1]), gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(programs.splat, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform1i(gl.getUniformLocation(programs.splat, 'u_texture'), 0);
    gl.uniform2f(gl.getUniformLocation(programs.splat, 'u_point'), x, y);
    gl.uniform3f(gl.getUniformLocation(programs.splat, 'u_color'), dx * 10, dy * 10, 0);
    gl.uniform1f(gl.getUniformLocation(programs.splat, 'u_radius'), 0.002);
    gl.uniform1f(gl.getUniformLocation(programs.splat, 'u_aspectRatio'), canvas.width / canvas.height);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.texture);
    blit(textures.velocity.write);
    textures.velocity.swap();
    
    // Splat dye
    const hue = (Date.now() * 0.001) % 1;
    const rgb = hslToRgb(hue, 0.8, 0.5);
    gl.uniform1i(gl.getUniformLocation(programs.splat, 'u_texture'), 0);
    gl.uniform2f(gl.getUniformLocation(programs.splat, 'u_point'), x, y);
    gl.uniform3f(gl.getUniformLocation(programs.splat, 'u_color'), rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(gl.getUniformLocation(programs.splat, 'u_radius'), 0.003);
    
    gl.bindTexture(gl.TEXTURE_2D, textures.dye.read.texture);
    blit(textures.dye.write);
    textures.dye.swap();
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
}

function step(dt) {
    // Process mouse input
    if (isMouseDown) {
        const dx = mousePos.x - lastMousePos.x;
        const dy = mousePos.y - lastMousePos.y;
        splat(mousePos.x, mousePos.y, dx, dy);
    }
    
    // Setup common uniforms helper
    const setupProgram = (program, velTex, texelSize) => {
        gl.useProgram(program);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        if (texelSize) {
            gl.uniform2f(gl.getUniformLocation(program, 'u_texelSize'), 
                1.0 / SIM_RESOLUTION, 1.0 / SIM_RESOLUTION);
        }
    };
    
    // Advect velocity
    setupProgram(programs.advection, null, true);
    gl.uniform1i(gl.getUniformLocation(programs.advection, 'u_velocity'), 0);
    gl.uniform1i(gl.getUniformLocation(programs.advection, 'u_source'), 1);
    gl.uniform1f(gl.getUniformLocation(programs.advection, 'u_dt'), dt);
    gl.uniform1f(gl.getUniformLocation(programs.advection, 'u_dissipation'), 1.0 - simParams.viscosity * 0.1);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.texture);
    blit(textures.velocity.write);
    textures.velocity.swap();
    
    // Advect dye
    gl.uniform1f(gl.getUniformLocation(programs.advection, 'u_dissipation'), 1.0 - simParams.diffusion * 0.01);
    gl.uniform2f(gl.getUniformLocation(programs.advection, 'u_texelSize'), 
        1.0 / DYE_RESOLUTION, 1.0 / DYE_RESOLUTION);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.dye.read.texture);
    blit(textures.dye.write);
    textures.dye.swap();
    
    // Divergence
    setupProgram(programs.divergence, null, true);
    gl.uniform1i(gl.getUniformLocation(programs.divergence, 'u_velocity'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.texture);
    blit(textures.divergence);
    
    // Clear pressure
    setupProgram(programs.clear, null, false);
    gl.uniform4f(gl.getUniformLocation(programs.clear, 'u_color'), 0, 0, 0, 1);
    blit(textures.pressure.read);
    
    // Pressure solve (Jacobi iteration)
    setupProgram(programs.pressure, null, true);
    gl.uniform1i(gl.getUniformLocation(programs.pressure, 'u_pressure'), 0);
    gl.uniform1i(gl.getUniformLocation(programs.pressure, 'u_divergence'), 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.divergence.texture);
    
    for (let i = 0; i < simParams.pressureIterations; i++) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures.pressure.read.texture);
        blit(textures.pressure.write);
        textures.pressure.swap();
    }
    
    // Gradient subtraction
    setupProgram(programs.gradientSubtract, null, true);
    gl.uniform1i(gl.getUniformLocation(programs.gradientSubtract, 'u_pressure'), 0);
    gl.uniform1i(gl.getUniformLocation(programs.gradientSubtract, 'u_velocity'), 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.pressure.read.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.texture);
    blit(textures.velocity.write);
    textures.velocity.swap();
    
    // Compute curl for display
    setupProgram(programs.curl, null, true);
    gl.uniform1i(gl.getUniformLocation(programs.curl, 'u_velocity'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.texture);
    blit(textures.curl);
}

function display() {
    let displayProgram;
    let displayTexture;
    
    switch (simParams.displayMode) {
        case 'velocity':
            displayProgram = programs.displayVelocity;
            displayTexture = textures.velocity.read.texture;
            break;
        case 'pressure':
            displayProgram = programs.displayPressure;
            displayTexture = textures.pressure.read.texture;
            break;
        case 'curl':
            displayProgram = programs.displayCurl;
            displayTexture = textures.curl.texture;
            break;
        default:
            displayProgram = programs.displayDye;
            displayTexture = textures.dye.read.texture;
    }
    
    gl.useProgram(displayProgram);
    const posLoc = gl.getAttribLocation(displayProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(gl.getUniformLocation(displayProgram, 'u_texture'), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, displayTexture);
    blit(null);
}

function render() {
    if (!isPaused) {
        step(0.016);
    }
    display();
    requestAnimationFrame(render);
}

// Control functions
function updateViscosity(val) {
    simParams.viscosity = parseFloat(val);
    document.getElementById('visc-value').textContent = val;
}

function updateDiffusion(val) {
    simParams.diffusion = parseFloat(val);
    document.getElementById('diff-value').textContent = val;
}

function updateIterations(val) {
    simParams.pressureIterations = parseInt(val);
    document.getElementById('iter-value').textContent = val;
}

function updateDisplayMode(mode) {
    simParams.displayMode = mode;
}

function clearFluid() {
    // Clear all textures
    gl.useProgram(programs.clear);
    const posLoc = gl.getAttribLocation(programs.clear, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(gl.getUniformLocation(programs.clear, 'u_color'), 0, 0, 0, 1);
    
    blit(textures.velocity.read);
    blit(textures.velocity.write);
    blit(textures.pressure.read);
    blit(textures.pressure.write);
    blit(textures.dye.read);
    blit(textures.dye.write);
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pause-text').textContent = isPaused ? 'Resume' : 'Pause';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


