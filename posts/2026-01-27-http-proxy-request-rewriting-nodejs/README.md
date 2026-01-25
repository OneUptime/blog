# How to Build an HTTP Proxy with Request Rewriting in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, HTTP Proxy, Middleware, Networking, Backend

Description: Learn how to build an HTTP proxy server in Node.js with request and response rewriting, header manipulation, and traffic routing.

---

HTTP proxies sit between clients and servers, intercepting and modifying traffic. They enable API gateways, load balancers, caching layers, and security filters. Building your own proxy gives you complete control over how requests are transformed and routed.

This guide covers building a production-ready HTTP proxy in Node.js: forwarding requests, rewriting URLs and headers, modifying response bodies, and handling WebSocket upgrades.

## Basic Proxy Server

Start with a simple proxy that forwards requests to a target server:

```typescript
// proxy/basicProxy.ts
import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';

interface ProxyOptions {
  target: string; // Base URL of the upstream server
}

function createProxy(options: ProxyOptions) {
  const targetUrl = new URL(options.target);
  const isHttps = targetUrl.protocol === 'https:';

  return http.createServer((clientReq: IncomingMessage, clientRes: ServerResponse) => {
    // Build the upstream request URL
    const upstreamUrl = new URL(clientReq.url || '/', options.target);

    // Copy headers from client, but remove hop-by-hop headers
    const headers = { ...clientReq.headers };
    delete headers['host'];
    delete headers['connection'];
    delete headers['keep-alive'];
    delete headers['proxy-authenticate'];
    delete headers['proxy-authorization'];
    delete headers['transfer-encoding'];
    delete headers['upgrade'];

    // Set correct host header for upstream
    headers['host'] = targetUrl.host;

    const proxyReq = (isHttps ? https : http).request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: upstreamUrl.pathname + upstreamUrl.search,
        method: clientReq.method,
        headers,
      },
      (proxyRes) => {
        // Forward status and headers to client
        clientRes.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

        // Pipe response body to client
        proxyRes.pipe(clientRes);
      }
    );

    // Handle errors
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      }
      clientRes.end(JSON.stringify({ error: 'Bad Gateway' }));
    });

    // Pipe request body to upstream
    clientReq.pipe(proxyReq);
  });
}

// Usage
const proxy = createProxy({ target: 'https://api.example.com' });
proxy.listen(8080, () => {
  console.log('Proxy server running on port 8080');
});
```

## Request Rewriting

Transform incoming requests before forwarding them upstream. This is useful for URL routing, authentication injection, and request normalization.

```typescript
// proxy/requestRewriter.ts
import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';

interface RewriteRule {
  match: RegExp;
  target: string;
  pathRewrite?: (path: string, match: RegExpMatchArray) => string;
  headers?: Record<string, string>;
}

interface ProxyConfig {
  rules: RewriteRule[];
  defaultTarget?: string;
}

class RewritingProxy {
  private config: ProxyConfig;

  constructor(config: ProxyConfig) {
    this.config = config;
  }

  // Find the matching rule for a request path
  private findRule(path: string): { rule: RewriteRule; match: RegExpMatchArray } | null {
    for (const rule of this.config.rules) {
      const match = path.match(rule.match);
      if (match) {
        return { rule, match };
      }
    }
    return null;
  }

  // Rewrite the request path based on the rule
  private rewritePath(path: string, rule: RewriteRule, match: RegExpMatchArray): string {
    if (rule.pathRewrite) {
      return rule.pathRewrite(path, match);
    }
    return path;
  }

  handleRequest(clientReq: IncomingMessage, clientRes: ServerResponse): void {
    const originalPath = clientReq.url || '/';
    const result = this.findRule(originalPath);

    if (!result && !this.config.defaultTarget) {
      clientRes.writeHead(404, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'No route found' }));
      return;
    }

    const target = result?.rule.target || this.config.defaultTarget!;
    const targetUrl = new URL(target);
    const isHttps = targetUrl.protocol === 'https:';

    // Rewrite the path if a rule matched
    const rewrittenPath = result
      ? this.rewritePath(originalPath, result.rule, result.match)
      : originalPath;

    // Build headers
    const headers = { ...clientReq.headers };
    delete headers['host'];
    headers['host'] = targetUrl.host;

    // Add custom headers from the rule
    if (result?.rule.headers) {
      Object.assign(headers, result.rule.headers);
    }

    // Add proxy headers
    headers['x-forwarded-for'] = clientReq.socket.remoteAddress || '';
    headers['x-forwarded-proto'] = 'http';
    headers['x-forwarded-host'] = clientReq.headers.host || '';

    console.log(`[Proxy] ${clientReq.method} ${originalPath} -> ${target}${rewrittenPath}`);

    const proxyReq = (isHttps ? https : http).request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: rewrittenPath,
        method: clientReq.method,
        headers,
      },
      (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(clientRes);
      }
    );

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502);
      }
      clientRes.end('Bad Gateway');
    });

    clientReq.pipe(proxyReq);
  }

  createServer(): http.Server {
    return http.createServer((req, res) => this.handleRequest(req, res));
  }
}

// Example configuration
const proxy = new RewritingProxy({
  rules: [
    {
      // Route /api/v1/* to the API server
      match: /^\/api\/v1\/(.*)/,
      target: 'https://api-v1.internal.example.com',
      pathRewrite: (path, match) => `/${match[1]}`,
    },
    {
      // Route /api/v2/* to the new API server
      match: /^\/api\/v2\/(.*)/,
      target: 'https://api-v2.internal.example.com',
      pathRewrite: (path, match) => `/${match[1]}`,
      headers: {
        'X-API-Version': '2',
      },
    },
    {
      // Route /auth/* to the auth service
      match: /^\/auth\/(.*)/,
      target: 'https://auth.internal.example.com',
      pathRewrite: (path, match) => `/${match[1]}`,
    },
    {
      // Redirect legacy endpoints
      match: /^\/legacy\/(.*)/,
      target: 'https://api-v1.internal.example.com',
      pathRewrite: (path, match) => `/compat/${match[1]}`,
    },
  ],
  defaultTarget: 'https://default.internal.example.com',
});

proxy.createServer().listen(8080);
```

## Response Rewriting

Modify response bodies before sending them to clients. This enables content transformation, data filtering, and API versioning.

```typescript
// proxy/responseRewriter.ts
import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';
import zlib from 'zlib';

interface ResponseTransform {
  // Return true to apply this transform
  match: (res: IncomingMessage, path: string) => boolean;
  // Transform the response body
  transform: (body: Buffer, res: IncomingMessage) => Buffer | Promise<Buffer>;
}

class ResponseRewritingProxy {
  private target: string;
  private transforms: ResponseTransform[];

  constructor(target: string, transforms: ResponseTransform[]) {
    this.target = target;
    this.transforms = transforms;
  }

  private async applyTransforms(
    body: Buffer,
    proxyRes: IncomingMessage,
    path: string
  ): Promise<Buffer> {
    let result = body;

    for (const transform of this.transforms) {
      if (transform.match(proxyRes, path)) {
        result = await transform.transform(result, proxyRes);
      }
    }

    return result;
  }

  handleRequest(clientReq: IncomingMessage, clientRes: ServerResponse): void {
    const targetUrl = new URL(this.target);
    const isHttps = targetUrl.protocol === 'https:';
    const path = clientReq.url || '/';

    const headers = { ...clientReq.headers };
    delete headers['host'];
    headers['host'] = targetUrl.host;
    // Remove accept-encoding to get uncompressed response
    delete headers['accept-encoding'];

    const proxyReq = (isHttps ? https : http).request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path,
        method: clientReq.method,
        headers,
      },
      async (proxyRes) => {
        // Check if any transform applies
        const needsTransform = this.transforms.some((t) =>
          t.match(proxyRes, path)
        );

        if (!needsTransform) {
          // No transform needed, stream directly
          clientRes.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
          proxyRes.pipe(clientRes);
          return;
        }

        // Buffer the response for transformation
        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk) => chunks.push(chunk));

        proxyRes.on('end', async () => {
          try {
            let body = Buffer.concat(chunks);

            // Decompress if needed
            const encoding = proxyRes.headers['content-encoding'];
            if (encoding === 'gzip') {
              body = zlib.gunzipSync(body);
            } else if (encoding === 'deflate') {
              body = zlib.inflateSync(body);
            }

            // Apply transforms
            const transformed = await this.applyTransforms(body, proxyRes, path);

            // Update content-length and remove encoding headers
            const responseHeaders = { ...proxyRes.headers };
            responseHeaders['content-length'] = transformed.length.toString();
            delete responseHeaders['content-encoding'];
            delete responseHeaders['transfer-encoding'];

            clientRes.writeHead(proxyRes.statusCode || 500, responseHeaders);
            clientRes.end(transformed);
          } catch (error) {
            console.error('Transform error:', error);
            clientRes.writeHead(500);
            clientRes.end('Internal Server Error');
          }
        });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502);
      }
      clientRes.end('Bad Gateway');
    });

    clientReq.pipe(proxyReq);
  }

  createServer(): http.Server {
    return http.createServer((req, res) => this.handleRequest(req, res));
  }
}

// Example transforms
const transforms: ResponseTransform[] = [
  {
    // Add metadata to JSON responses
    match: (res) => {
      const contentType = res.headers['content-type'] || '';
      return contentType.includes('application/json');
    },
    transform: (body, res) => {
      try {
        const json = JSON.parse(body.toString());
        json._metadata = {
          timestamp: new Date().toISOString(),
          version: '1.0',
        };
        return Buffer.from(JSON.stringify(json));
      } catch {
        return body;
      }
    },
  },
  {
    // Filter sensitive fields from user responses
    match: (res, path) => path.startsWith('/api/users'),
    transform: (body) => {
      try {
        const json = JSON.parse(body.toString());
        // Remove sensitive fields
        if (json.password) delete json.password;
        if (json.ssn) delete json.ssn;
        if (json.creditCard) delete json.creditCard;
        return Buffer.from(JSON.stringify(json));
      } catch {
        return body;
      }
    },
  },
  {
    // Rewrite URLs in HTML responses
    match: (res) => {
      const contentType = res.headers['content-type'] || '';
      return contentType.includes('text/html');
    },
    transform: (body) => {
      let html = body.toString();
      // Rewrite internal URLs to go through proxy
      html = html.replace(
        /https:\/\/api\.example\.com/g,
        'http://localhost:8080'
      );
      return Buffer.from(html);
    },
  },
];

const proxy = new ResponseRewritingProxy('https://api.example.com', transforms);
proxy.createServer().listen(8080);
```

## Authentication and Rate Limiting

Add middleware for authentication and rate limiting:

```typescript
// proxy/middleware.ts
import http, { IncomingMessage, ServerResponse } from 'http';

type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => void;

class MiddlewareProxy {
  private middlewares: Middleware[] = [];
  private handler: (req: IncomingMessage, res: ServerResponse) => void;

  constructor(handler: (req: IncomingMessage, res: ServerResponse) => void) {
    this.handler = handler;
  }

  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  private runMiddlewares(
    req: IncomingMessage,
    res: ServerResponse,
    index: number
  ): void {
    if (index >= this.middlewares.length) {
      this.handler(req, res);
      return;
    }

    this.middlewares[index](req, res, () => {
      this.runMiddlewares(req, res, index + 1);
    });
  }

  createServer(): http.Server {
    return http.createServer((req, res) => {
      this.runMiddlewares(req, res, 0);
    });
  }
}

// API Key authentication middleware
function apiKeyAuth(validKeys: Set<string>): Middleware {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey || !validKeys.has(apiKey)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid API key' }));
      return;
    }

    next();
  };
}

// Rate limiting middleware using sliding window
function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
}): Middleware {
  const requests: Map<string, number[]> = new Map();

  return (req, res, next) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Get request timestamps for this client
    let timestamps = requests.get(clientIp) || [];

    // Filter to only requests within the window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= options.maxRequests) {
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(options.windowMs / 1000).toString(),
      });
      res.end(JSON.stringify({ error: 'Too many requests' }));
      return;
    }

    // Add current request
    timestamps.push(now);
    requests.set(clientIp, timestamps);

    // Clean up old entries periodically
    if (requests.size > 10000) {
      for (const [ip, ts] of requests) {
        if (ts.every((t) => t <= windowStart)) {
          requests.delete(ip);
        }
      }
    }

    next();
  };
}

// Logging middleware
function requestLogger(): Middleware {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.url} ${res.statusCode} ${duration}ms`
      );
    });

    next();
  };
}

// CORS middleware
function cors(options: { origins: string[]; methods: string[] }): Middleware {
  return (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && options.origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader(
        'Access-Control-Allow-Methods',
        options.methods.join(', ')
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-API-Key'
      );
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  };
}

// Usage example
const validApiKeys = new Set(['key-123', 'key-456']);

const proxy = new MiddlewareProxy((req, res) => {
  // Your proxy handler here
  res.end('Proxied');
});

proxy
  .use(requestLogger())
  .use(
    cors({
      origins: ['http://localhost:3000', 'https://app.example.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })
  )
  .use(
    rateLimit({
      windowMs: 60000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    })
  )
  .use(apiKeyAuth(validApiKeys));

proxy.createServer().listen(8080);
```

## WebSocket Proxy

Handle WebSocket upgrades for real-time applications:

```typescript
// proxy/websocketProxy.ts
import http, { IncomingMessage } from 'http';
import net from 'net';
import { URL } from 'url';

class WebSocketProxy {
  private target: string;

  constructor(target: string) {
    this.target = target;
  }

  handleUpgrade(
    clientReq: IncomingMessage,
    clientSocket: net.Socket,
    head: Buffer
  ): void {
    const targetUrl = new URL(this.target);

    // Connect to upstream WebSocket server
    const proxySocket = net.connect(
      {
        host: targetUrl.hostname,
        port: parseInt(targetUrl.port) || 80,
      },
      () => {
        // Build the upgrade request
        const headers = Object.entries(clientReq.headers)
          .filter(([key]) => !['host', 'connection'].includes(key.toLowerCase()))
          .map(([key, value]) => `${key}: ${value}`)
          .join('\r\n');

        const request = [
          `${clientReq.method} ${clientReq.url} HTTP/1.1`,
          `Host: ${targetUrl.host}`,
          'Connection: Upgrade',
          headers,
          '',
          '',
        ].join('\r\n');

        proxySocket.write(request);

        if (head.length > 0) {
          proxySocket.write(head);
        }

        // Pipe data between client and upstream
        proxySocket.pipe(clientSocket);
        clientSocket.pipe(proxySocket);
      }
    );

    proxySocket.on('error', (err) => {
      console.error('WebSocket proxy error:', err);
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      console.error('Client socket error:', err);
      proxySocket.end();
    });
  }

  createServer(): http.Server {
    const server = http.createServer((req, res) => {
      // Handle regular HTTP requests
      res.writeHead(426);
      res.end('Upgrade Required');
    });

    server.on('upgrade', (req, socket, head) => {
      this.handleUpgrade(req, socket as net.Socket, head);
    });

    return server;
  }
}

// Usage
const wsProxy = new WebSocketProxy('ws://websocket.example.com');
wsProxy.createServer().listen(8080);
```

## Load Balancing

Distribute requests across multiple backend servers:

```typescript
// proxy/loadBalancer.ts
import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';

interface Backend {
  url: string;
  weight: number;
  healthy: boolean;
}

class LoadBalancer {
  private backends: Backend[];
  private currentIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout;

  constructor(backends: { url: string; weight?: number }[]) {
    this.backends = backends.map((b) => ({
      url: b.url,
      weight: b.weight || 1,
      healthy: true,
    }));

    // Start health checks
    this.healthCheckInterval = setInterval(() => this.checkHealth(), 10000);
    this.checkHealth();
  }

  // Round-robin with weights
  private selectBackend(): Backend | null {
    const healthyBackends = this.backends.filter((b) => b.healthy);
    if (healthyBackends.length === 0) return null;

    // Simple round-robin for now
    this.currentIndex = (this.currentIndex + 1) % healthyBackends.length;
    return healthyBackends[this.currentIndex];
  }

  // Health check all backends
  private async checkHealth(): Promise<void> {
    for (const backend of this.backends) {
      try {
        const url = new URL('/health', backend.url);
        const isHttps = url.protocol === 'https:';

        await new Promise<void>((resolve, reject) => {
          const req = (isHttps ? https : http).get(url.toString(), (res) => {
            backend.healthy = res.statusCode === 200;
            res.resume();
            resolve();
          });
          req.on('error', () => {
            backend.healthy = false;
            resolve();
          });
          req.setTimeout(5000, () => {
            backend.healthy = false;
            req.destroy();
            resolve();
          });
        });
      } catch {
        backend.healthy = false;
      }
    }

    const healthyCount = this.backends.filter((b) => b.healthy).length;
    console.log(`Health check: ${healthyCount}/${this.backends.length} healthy`);
  }

  handleRequest(clientReq: IncomingMessage, clientRes: ServerResponse): void {
    const backend = this.selectBackend();

    if (!backend) {
      clientRes.writeHead(503, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'No healthy backends' }));
      return;
    }

    const targetUrl = new URL(backend.url);
    const isHttps = targetUrl.protocol === 'https:';

    const headers = { ...clientReq.headers };
    headers['host'] = targetUrl.host;

    const proxyReq = (isHttps ? https : http).request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: clientReq.url,
        method: clientReq.method,
        headers,
      },
      (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(clientRes);
      }
    );

    proxyReq.on('error', () => {
      backend.healthy = false;
      if (!clientRes.headersSent) {
        clientRes.writeHead(502);
      }
      clientRes.end('Bad Gateway');
    });

    clientReq.pipe(proxyReq);
  }

  createServer(): http.Server {
    return http.createServer((req, res) => this.handleRequest(req, res));
  }

  destroy(): void {
    clearInterval(this.healthCheckInterval);
  }
}

// Usage
const lb = new LoadBalancer([
  { url: 'http://backend1.internal:8080', weight: 2 },
  { url: 'http://backend2.internal:8080', weight: 1 },
  { url: 'http://backend3.internal:8080', weight: 1 },
]);

lb.createServer().listen(8080);
```

## Summary

Building HTTP proxies in Node.js enables powerful traffic manipulation:

| Feature | Use Case |
|---------|----------|
| **Request rewriting** | URL routing, path transformation |
| **Response rewriting** | Content filtering, API versioning |
| **Authentication** | API key validation, token verification |
| **Rate limiting** | Protect backends from overload |
| **Load balancing** | Distribute traffic across servers |
| **WebSocket proxy** | Real-time application support |

These patterns form the foundation of API gateways, service meshes, and edge proxies. Combine them with caching, circuit breakers, and observability for production-grade infrastructure.
