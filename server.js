import { createServer } from 'http';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { extname, join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Security: Define allowed origins based on environment
const getAllowedOrigins = () => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (nodeEnv === 'production') {
        // In production, use specific origins from environment variable
        const allowedOrigins = process.env.ALLOWED_ORIGINS;
        return allowedOrigins ? allowedOrigins.split(',') : ['https://yourdomain.com'];
    } else {
        // In development, allow localhost and common dev ports
        return [
            'http://localhost:3000',
            'http://localhost:3001', 
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            '*' // Allow all in development
        ];
    }
};

const allowedOrigins = getAllowedOrigins();

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json'
};

// Security: Validate and sanitize file paths
const isPathSafe = (requestedPath, basePath) => {
    try {
        const resolvedPath = resolve(basePath, requestedPath);
        const relativePath = relative(basePath, resolvedPath);
        
        // Ensure the resolved path is within the base directory
        return !relativePath.startsWith('..') && !relativePath.includes('..');
    } catch {
        return false;
    }
};

const server = createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Security: Handle CORS with configurable origins
    const origin = req.headers.origin;
    if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    let requestedPath = req.url === '/' ? '/index.html' : req.url;
    
    // Security: Validate the requested path
    if (!isPathSafe(requestedPath, __dirname)) {
        console.warn(`Blocked potentially unsafe path: ${requestedPath}`);
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
    }
    
    const filePath = join(__dirname, requestedPath);
    
    try {
        // Use async file access check
        await access(filePath, constants.F_OK);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
    }
    
    const ext = extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    try {
        // Use async file reading
        const content = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(content);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press Ctrl+C to stop');
});
