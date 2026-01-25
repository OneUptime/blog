# How to Implement WebSocket Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: WebSocket, Testing, Real-time, Socket.IO, DevOps

Description: Learn to test WebSocket connections effectively, including connection lifecycle, message handling, reconnection logic, and load testing for real-time applications.

---

WebSocket testing presents unique challenges compared to HTTP APIs. Connections are long-lived, messages flow bidirectionally, and reconnection behavior matters for reliability. This guide covers testing strategies for WebSocket applications, including raw WebSockets and Socket.IO.

## WebSocket Testing Challenges

| Challenge | Impact |
|-----------|--------|
| **Stateful connections** | Tests must manage connection lifecycle |
| **Async messages** | Race conditions in test assertions |
| **Reconnection** | Complex recovery scenarios |
| **Scaling** | Multiple server instances |

## Test Server Setup

Create a test environment for WebSocket servers:

```typescript
// test-server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server } from 'http';

interface TestServerContext {
    server: Server;
    wss: WebSocketServer;
    port: number;
    url: string;
    stop: () => Promise<void>;
}

export async function createTestServer(): Promise<TestServerContext> {
    const server = createServer();
    const wss = new WebSocketServer({ server });

    // Handle connections
    wss.on('connection', (ws, request) => {
        console.log('Client connected');

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            handleMessage(ws, message);
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });

    // Start server on random port
    const port = await new Promise<number>((resolve) => {
        server.listen(0, () => {
            const address = server.address() as any;
            resolve(address.port);
        });
    });

    return {
        server,
        wss,
        port,
        url: `ws://localhost:${port}`,
        stop: () => new Promise((resolve) => {
            wss.close(() => {
                server.close(() => resolve());
            });
        }),
    };
}

function handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
        case 'echo':
            ws.send(JSON.stringify({ type: 'echo', payload: message.payload }));
            break;
        case 'subscribe':
            // Store subscription
            (ws as any).subscriptions = (ws as any).subscriptions || [];
            (ws as any).subscriptions.push(message.channel);
            ws.send(JSON.stringify({ type: 'subscribed', channel: message.channel }));
            break;
        case 'broadcast':
            // Send to all clients
            const wss = (ws as any).server;
            wss.clients.forEach((client: WebSocket) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'broadcast',
                        payload: message.payload,
                    }));
                }
            });
            break;
    }
}
```

## Connection Lifecycle Tests

Test WebSocket connection behavior:

```typescript
// connection.test.ts
import { WebSocket } from 'ws';
import { createTestServer } from './test-server';

describe('WebSocket Connection Lifecycle', () => {
    let server: Awaited<ReturnType<typeof createTestServer>>;

    beforeAll(async () => {
        server = await createTestServer();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('establishes connection successfully', async () => {
        const ws = new WebSocket(server.url);

        const connected = await new Promise<boolean>((resolve) => {
            ws.on('open', () => resolve(true));
            ws.on('error', () => resolve(false));
        });

        expect(connected).toBe(true);
        expect(ws.readyState).toBe(WebSocket.OPEN);

        ws.close();
    });

    test('handles connection close gracefully', async () => {
        const ws = new WebSocket(server.url);

        await waitForOpen(ws);

        const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
            ws.on('close', (code, reason) => {
                resolve({ code, reason: reason.toString() });
            });
        });

        ws.close(1000, 'Test complete');

        const closeEvent = await closePromise;
        expect(closeEvent.code).toBe(1000);
    });

    test('detects server-initiated close', async () => {
        const ws = new WebSocket(server.url);

        await waitForOpen(ws);

        // Server closes the connection
        server.wss.clients.forEach((client) => {
            client.close(1001, 'Server shutting down');
        });

        const closeEvent = await new Promise<{ code: number }>((resolve) => {
            ws.on('close', (code) => resolve({ code }));
        });

        expect(closeEvent.code).toBe(1001);
    });

    test('handles connection errors', async () => {
        // Connect to non-existent server
        const ws = new WebSocket('ws://localhost:99999');

        const error = await new Promise<Error>((resolve) => {
            ws.on('error', (err) => resolve(err));
        });

        expect(error).toBeDefined();
        expect(error.message).toContain('connect');
    });
});

async function waitForOpen(ws: WebSocket): Promise<void> {
    if (ws.readyState === WebSocket.OPEN) return;
    await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });
}
```

## Message Handling Tests

Test message sending and receiving:

```typescript
// messages.test.ts
import { WebSocket } from 'ws';
import { createTestServer } from './test-server';

describe('WebSocket Message Handling', () => {
    let server: Awaited<ReturnType<typeof createTestServer>>;
    let ws: WebSocket;

    beforeAll(async () => {
        server = await createTestServer();
    });

    beforeEach(async () => {
        ws = new WebSocket(server.url);
        await waitForOpen(ws);
    });

    afterEach(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
    });

    afterAll(async () => {
        await server.stop();
    });

    test('sends and receives JSON messages', async () => {
        const receivedMessage = waitForMessage(ws);

        ws.send(JSON.stringify({
            type: 'echo',
            payload: { text: 'Hello, WebSocket!' },
        }));

        const response = await receivedMessage;

        expect(response.type).toBe('echo');
        expect(response.payload.text).toBe('Hello, WebSocket!');
    });

    test('handles subscription messages', async () => {
        const receivedMessage = waitForMessage(ws);

        ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'notifications',
        }));

        const response = await receivedMessage;

        expect(response.type).toBe('subscribed');
        expect(response.channel).toBe('notifications');
    });

    test('receives broadcast messages', async () => {
        // Create second client
        const ws2 = new WebSocket(server.url);
        await waitForOpen(ws2);

        const ws1Message = waitForMessage(ws);
        const ws2Message = waitForMessage(ws2);

        // First client sends broadcast
        ws.send(JSON.stringify({
            type: 'broadcast',
            payload: { announcement: 'Server maintenance at midnight' },
        }));

        // Both clients should receive
        const [msg1, msg2] = await Promise.all([ws1Message, ws2Message]);

        expect(msg1.type).toBe('broadcast');
        expect(msg2.type).toBe('broadcast');
        expect(msg1.payload.announcement).toBe(msg2.payload.announcement);

        ws2.close();
    });

    test('handles message ordering', async () => {
        const messages: any[] = [];
        const received = new Promise<void>((resolve) => {
            let count = 0;
            ws.on('message', (data) => {
                messages.push(JSON.parse(data.toString()));
                count++;
                if (count === 3) resolve();
            });
        });

        // Send multiple messages
        ws.send(JSON.stringify({ type: 'echo', payload: { order: 1 } }));
        ws.send(JSON.stringify({ type: 'echo', payload: { order: 2 } }));
        ws.send(JSON.stringify({ type: 'echo', payload: { order: 3 } }));

        await received;

        // Messages should arrive in order
        expect(messages[0].payload.order).toBe(1);
        expect(messages[1].payload.order).toBe(2);
        expect(messages[2].payload.order).toBe(3);
    });

    test('handles large messages', async () => {
        const largePayload = { data: 'x'.repeat(100000) };
        const receivedMessage = waitForMessage(ws);

        ws.send(JSON.stringify({
            type: 'echo',
            payload: largePayload,
        }));

        const response = await receivedMessage;

        expect(response.payload.data.length).toBe(100000);
    });
});

function waitForMessage(ws: WebSocket, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Message timeout'));
        }, timeout);

        ws.once('message', (data) => {
            clearTimeout(timer);
            resolve(JSON.parse(data.toString()));
        });
    });
}
```

## Reconnection Testing

Test reconnection logic:

```typescript
// reconnection.test.ts
import { WebSocket } from 'ws';
import { createTestServer } from './test-server';

describe('WebSocket Reconnection', () => {
    test('reconnects after server restart', async () => {
        let server = await createTestServer();

        // Reconnection client with retry logic
        class ReconnectingClient {
            private ws: WebSocket | null = null;
            private url: string;
            public connectCount = 0;
            public connected = false;

            constructor(url: string) {
                this.url = url;
            }

            connect(): Promise<void> {
                return new Promise((resolve, reject) => {
                    this.ws = new WebSocket(this.url);

                    this.ws.on('open', () => {
                        this.connectCount++;
                        this.connected = true;
                        resolve();
                    });

                    this.ws.on('close', () => {
                        this.connected = false;
                        // Auto reconnect after 100ms
                        setTimeout(() => {
                            if (!this.connected) {
                                this.connect().catch(() => {});
                            }
                        }, 100);
                    });

                    this.ws.on('error', () => {
                        this.connected = false;
                    });
                });
            }

            close() {
                if (this.ws) {
                    this.ws.close();
                }
            }
        }

        const client = new ReconnectingClient(server.url);

        // Initial connection
        await client.connect();
        expect(client.connectCount).toBe(1);
        expect(client.connected).toBe(true);

        // Stop server
        const port = server.port;
        await server.stop();

        // Wait for disconnect detection
        await new Promise(r => setTimeout(r, 200));
        expect(client.connected).toBe(false);

        // Restart server on same port
        server = await createTestServer();

        // Wait for reconnection
        await new Promise(r => setTimeout(r, 500));

        // Should have reconnected
        expect(client.connectCount).toBeGreaterThanOrEqual(2);

        client.close();
        await server.stop();
    });

    test('implements exponential backoff', async () => {
        const attempts: number[] = [];
        let lastAttempt = Date.now();

        class BackoffClient {
            private baseDelay = 100;
            private maxDelay = 5000;
            private attempt = 0;

            async connect(url: string): Promise<boolean> {
                const now = Date.now();
                attempts.push(now - lastAttempt);
                lastAttempt = now;

                return new Promise((resolve) => {
                    const ws = new WebSocket(url);
                    ws.on('open', () => {
                        ws.close();
                        resolve(true);
                    });
                    ws.on('error', () => {
                        this.attempt++;
                        setTimeout(() => {
                            this.connect(url).then(resolve);
                        }, this.getDelay());
                    });
                });
            }

            private getDelay(): number {
                const delay = Math.min(
                    this.baseDelay * Math.pow(2, this.attempt),
                    this.maxDelay
                );
                // Add jitter
                return delay + Math.random() * 100;
            }
        }

        const client = new BackoffClient();

        // Connect to non-existent server to trigger retries
        // Then start server after a few attempts
        const server = await createTestServer();

        await client.connect(server.url);

        await server.stop();
    });
});
```

## Socket.IO Testing

Test Socket.IO specific features:

```typescript
// socket-io.test.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';

describe('Socket.IO Testing', () => {
    let httpServer: any;
    let ioServer: Server;
    let port: number;

    beforeAll((done) => {
        httpServer = createServer();
        ioServer = new Server(httpServer, {
            cors: { origin: '*' },
        });

        // Server event handlers
        ioServer.on('connection', (socket) => {
            socket.on('join-room', (room) => {
                socket.join(room);
                socket.emit('room-joined', room);
            });

            socket.on('message', (data) => {
                socket.emit('message-received', data);
            });

            socket.on('room-message', ({ room, message }) => {
                ioServer.to(room).emit('room-broadcast', { room, message });
            });
        });

        httpServer.listen(0, () => {
            port = httpServer.address().port;
            done();
        });
    });

    afterAll((done) => {
        ioServer.close();
        httpServer.close(done);
    });

    test('connects with Socket.IO protocol', (done) => {
        const socket = io(`http://localhost:${port}`);

        socket.on('connect', () => {
            expect(socket.connected).toBe(true);
            socket.disconnect();
            done();
        });
    });

    test('joins and receives room messages', (done) => {
        const socket1 = io(`http://localhost:${port}`);
        const socket2 = io(`http://localhost:${port}`);

        let connectedCount = 0;

        const onBothConnected = () => {
            connectedCount++;
            if (connectedCount === 2) {
                // Both clients join the same room
                socket1.emit('join-room', 'test-room');
                socket2.emit('join-room', 'test-room');
            }
        };

        let joinedCount = 0;

        const onBothJoined = () => {
            joinedCount++;
            if (joinedCount === 2) {
                // Send message to room
                socket1.emit('room-message', {
                    room: 'test-room',
                    message: 'Hello room!',
                });
            }
        };

        socket1.on('connect', onBothConnected);
        socket2.on('connect', onBothConnected);

        socket1.on('room-joined', onBothJoined);
        socket2.on('room-joined', onBothJoined);

        let receivedCount = 0;

        const onRoomBroadcast = (data: any) => {
            expect(data.message).toBe('Hello room!');
            receivedCount++;

            if (receivedCount === 2) {
                socket1.disconnect();
                socket2.disconnect();
                done();
            }
        };

        socket1.on('room-broadcast', onRoomBroadcast);
        socket2.on('room-broadcast', onRoomBroadcast);
    });

    test('handles acknowledgments', (done) => {
        const socket = io(`http://localhost:${port}`);

        ioServer.on('connection', (serverSocket) => {
            serverSocket.on('request-with-ack', (data, callback) => {
                callback({ status: 'ok', received: data });
            });
        });

        socket.on('connect', () => {
            socket.emit('request-with-ack', { test: 'data' }, (response: any) => {
                expect(response.status).toBe('ok');
                expect(response.received.test).toBe('data');
                socket.disconnect();
                done();
            });
        });
    });
});
```

## Load Testing WebSockets

Test WebSocket server under load:

```typescript
// load.test.ts
import { WebSocket } from 'ws';
import { createTestServer } from './test-server';

describe('WebSocket Load Testing', () => {
    test('handles many concurrent connections', async () => {
        const server = await createTestServer();
        const connectionCount = 100;
        const clients: WebSocket[] = [];

        // Create many connections
        const connectionPromises = Array.from({ length: connectionCount }, () => {
            return new Promise<WebSocket>((resolve, reject) => {
                const ws = new WebSocket(server.url);
                ws.on('open', () => resolve(ws));
                ws.on('error', reject);
                clients.push(ws);
            });
        });

        await Promise.all(connectionPromises);

        expect(server.wss.clients.size).toBe(connectionCount);

        // Send message from all clients
        const messagePromises = clients.map((ws, i) => {
            return new Promise<void>((resolve) => {
                ws.once('message', () => resolve());
                ws.send(JSON.stringify({ type: 'echo', payload: { id: i } }));
            });
        });

        await Promise.all(messagePromises);

        // Cleanup
        clients.forEach(ws => ws.close());
        await server.stop();
    }, 30000);

    test('measures message throughput', async () => {
        const server = await createTestServer();
        const ws = new WebSocket(server.url);

        await waitForOpen(ws);

        const messageCount = 1000;
        let received = 0;

        const start = Date.now();

        await new Promise<void>((resolve) => {
            ws.on('message', () => {
                received++;
                if (received === messageCount) {
                    resolve();
                }
            });

            for (let i = 0; i < messageCount; i++) {
                ws.send(JSON.stringify({ type: 'echo', payload: { n: i } }));
            }
        });

        const duration = Date.now() - start;
        const throughput = (messageCount / duration) * 1000;

        console.log(`Throughput: ${throughput.toFixed(0)} messages/second`);

        expect(throughput).toBeGreaterThan(100); // At least 100 msg/sec

        ws.close();
        await server.stop();
    });
});
```

## Summary

| Test Type | Purpose | Focus |
|-----------|---------|-------|
| **Connection tests** | Lifecycle management | Open, close, errors |
| **Message tests** | Data handling | JSON, ordering, size |
| **Reconnection tests** | Reliability | Backoff, recovery |
| **Load tests** | Scalability | Connections, throughput |

WebSocket testing requires handling asynchronous events and stateful connections. Focus on edge cases like disconnection during message transfer and reconnection under various failure modes.
