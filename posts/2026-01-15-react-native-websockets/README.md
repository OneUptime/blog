# How to Implement WebSockets in React Native for Real-Time Features

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, WebSockets, Real-Time, Socket.IO, Mobile Development, Live Updates

Description: Learn how to implement WebSocket connections in React Native for real-time features like chat, live updates, and notifications.

---

Real-time features are essential for modern mobile apps. Chat applications, live sports scores, stock tickers, collaborative editing, and push notifications all require instant data updates. WebSockets provide a persistent, bidirectional communication channel between your React Native app and the server, enabling these features without the overhead of constant HTTP polling.

## WebSockets vs HTTP Polling

Before implementing WebSockets, understand when to use them versus traditional HTTP approaches.

### HTTP Polling

HTTP polling repeatedly requests data from the server at fixed intervals. Simple to implement but inefficient for real-time updates.

```typescript
// Traditional HTTP polling - inefficient for real-time
import { useEffect, useState } from 'react';

function usePolledData(url: string, intervalMs: number = 5000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Polling error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every intervalMs milliseconds
    const interval = setInterval(fetchData, intervalMs);

    return () => clearInterval(interval);
  }, [url, intervalMs]);

  return { data, loading };
}

// Problems with polling:
// 1. Wastes bandwidth when no data changes
// 2. Delayed updates (up to intervalMs latency)
// 3. Server load from repeated requests
// 4. Battery drain on mobile devices
```

### WebSocket Advantages

WebSockets maintain a persistent connection, receiving updates instantly when data changes.

```typescript
// WebSocket comparison - instant updates
import { useEffect, useState, useRef } from 'react';

function useWebSocketData(url: string) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Single connection, kept open
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    // Instant updates when server sends data
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { data, connected };
}

// WebSocket advantages:
// 1. Instant updates (sub-millisecond latency)
// 2. Lower bandwidth (no repeated headers)
// 3. Reduced server load
// 4. Better battery life
// 5. Bidirectional communication
```

### When to Use Each

| Use Case | Recommendation |
|----------|----------------|
| Chat messages | WebSocket |
| Live notifications | WebSocket |
| Stock prices/sports scores | WebSocket |
| Collaborative editing | WebSocket |
| Dashboard refresh every 5 min | HTTP polling |
| One-time data fetch | Regular HTTP |
| Large file uploads | HTTP with progress |

## Native WebSocket API in React Native

React Native includes a WebSocket implementation that mirrors the browser API. This works for basic use cases without additional dependencies.

### Basic Connection

```typescript
// src/services/websocket.ts
type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  onMessage?: MessageHandler;
  onOpen?: ConnectionHandler;
  onClose?: ConnectionHandler;
  onError?: ErrorHandler;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private closeHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  constructor(config: WebSocketConfig) {
    this.url = config.url;
    this.protocols = config.protocols;

    if (config.onMessage) this.messageHandlers.add(config.onMessage);
    if (config.onOpen) this.connectionHandlers.add(config.onOpen);
    if (config.onClose) this.closeHandlers.add(config.onClose);
    if (config.onError) this.errorHandlers.add(config.onError);
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Create WebSocket connection
    this.ws = new WebSocket(this.url, this.protocols);

    this.ws.onopen = () => {
      console.log('WebSocket connected to:', this.url);
      this.connectionHandlers.forEach((handler) => handler());
    };

    this.ws.onmessage = (event: WebSocketMessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach((handler) => handler(data));
      } catch (error) {
        // Handle non-JSON messages
        this.messageHandlers.forEach((handler) => handler(event.data));
      }
    };

    this.ws.onclose = (event: WebSocketCloseEvent) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.closeHandlers.forEach((handler) => handler());
    };

    this.ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
      this.errorHandlers.forEach((handler) => handler(error));
    };
  }

  send(data: object | string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(message);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Add handlers dynamically
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onClose(handler: ConnectionHandler): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }
}

export default WebSocketService;
```

### React Hook for WebSocket

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  url: string;
  protocols?: string | string[];
  onMessage?: (data: any) => void;
  shouldConnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (data: object | string) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { url, protocols, onMessage, shouldConnect = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url, protocols);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        onMessage?.(data);
      } catch {
        setLastMessage(event.data);
        onMessage?.(event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [url, protocols, onMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close(1000, 'Client disconnect');
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((data: object | string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    wsRef.current.send(message);
  }, []);

  useEffect(() => {
    if (shouldConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [shouldConnect, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}
```

### Usage in Component

```typescript
// src/screens/ChatScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, TextInput, FlatList, Text, Button, StyleSheet } from 'react-native';
import { useWebSocket } from '../hooks/useWebSocket';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  const handleMessage = useCallback((data: any) => {
    if (data.type === 'chat_message') {
      setMessages((prev) => [...prev, data.message]);
    }
  }, []);

  const { isConnected, sendMessage } = useWebSocket({
    url: 'wss://api.example.com/chat',
    onMessage: handleMessage,
  });

  const handleSend = () => {
    if (!inputText.trim()) return;

    sendMessage({
      type: 'chat_message',
      message: {
        text: inputText,
        timestamp: new Date().toISOString(),
      },
    });

    setInputText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.status}>
        <Text>{isConnected ? 'Connected' : 'Disconnected'}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text style={styles.sender}>{item.sender}</Text>
            <Text>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={handleSend} disabled={!isConnected} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  status: { padding: 10, alignItems: 'center' },
  message: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sender: { fontWeight: 'bold', marginBottom: 4 },
  inputContainer: { flexDirection: 'row', padding: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, paddingHorizontal: 10 },
});
```

## Socket.IO Integration

Socket.IO provides additional features over raw WebSockets: automatic reconnection, event-based messaging, rooms, and fallback transports. Install the client library:

```bash
npm install socket.io-client
```

### Socket.IO Service

```typescript
// src/services/socketio.ts
import { io, Socket } from 'socket.io-client';

type EventHandler = (...args: any[]) => void;

interface SocketIOConfig {
  url: string;
  options?: {
    auth?: Record<string, string>;
    transports?: string[];
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
  };
}

class SocketIOService {
  private socket: Socket | null = null;
  private config: SocketIOConfig;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  constructor(config: SocketIOConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket.IO already connected');
      return;
    }

    this.socket = io(this.config.url, {
      transports: ['websocket'],  // Prefer WebSocket over polling
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      ...this.config.options,
    });

    // Re-attach event handlers after reconnection
    this.socket.on('connect', () => {
      console.log('Socket.IO connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    // Restore event handlers
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket?.on(event, handler);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any, callback?: (response: any) => void): void {
    if (!this.socket?.connected) {
      console.warn('Socket.IO not connected');
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  on(event: string, handler: EventHandler): () => void {
    // Store handler for reconnection
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Attach to socket if connected
    this.socket?.on(event, handler);

    // Return cleanup function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
      this.socket?.off(event, handler);
    };
  }

  off(event: string, handler?: EventHandler): void {
    if (handler) {
      this.eventHandlers.get(event)?.delete(handler);
      this.socket?.off(event, handler);
    } else {
      this.eventHandlers.delete(event);
      this.socket?.off(event);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export default SocketIOService;
```

### Socket.IO React Hook

```typescript
// src/hooks/useSocketIO.ts
import { useEffect, useRef, useState, useCallback, useContext, createContext } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

interface SocketProviderProps {
  url: string;
  options?: any;
  children: React.ReactNode;
}

// Provider component for app-wide socket connection
export function SocketProvider({ url, options, children }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(url, {
      transports: ['websocket'],
      ...options,
    });

    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.disconnect();
    };
  }, [url, options]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

// Hook to access socket from any component
export function useSocket() {
  return useContext(SocketContext);
}

// Hook to subscribe to specific events
export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}

// Hook to emit events
export function useSocketEmit() {
  const { socket, isConnected } = useSocket();

  const emit = useCallback(
    (event: string, data?: any) => {
      if (!socket || !isConnected) {
        console.warn('Socket not connected');
        return;
      }
      socket.emit(event, data);
    },
    [socket, isConnected]
  );

  return emit;
}
```

## Connection Management

Managing WebSocket connections requires handling app lifecycle events, network changes, and connection states.

### Connection State Machine

```typescript
// src/services/connectionManager.ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
type StateChangeHandler = (state: ConnectionState) => void;

interface ConnectionManagerConfig {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
}

class ConnectionManager {
  private state: ConnectionState = 'disconnected';
  private handlers: Set<StateChangeHandler> = new Set();
  private config: ConnectionManagerConfig;
  private appState: AppStateStatus = 'active';
  private hasNetwork: boolean = true;

  constructor(config: ConnectionManagerConfig) {
    this.config = config;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Monitor app state changes
    AppState.addEventListener('change', this.handleAppStateChange);

    // Monitor network connectivity
    NetInfo.addEventListener(this.handleNetworkChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const wasBackground = this.appState.match(/inactive|background/);
    const isActive = nextAppState === 'active';

    this.appState = nextAppState;

    if (wasBackground && isActive && this.hasNetwork) {
      // App came to foreground - reconnect if needed
      this.reconnectIfNeeded();
    } else if (nextAppState === 'background') {
      // App went to background - optionally disconnect
      // Some apps keep connection alive, others disconnect to save battery
      // this.disconnect();
    }
  };

  private handleNetworkChange = (state: NetInfoState): void => {
    const hadNetwork = this.hasNetwork;
    this.hasNetwork = state.isConnected ?? false;

    if (!hadNetwork && this.hasNetwork) {
      // Network restored - reconnect
      this.reconnectIfNeeded();
    } else if (hadNetwork && !this.hasNetwork) {
      // Network lost
      this.setState('disconnected');
    }
  };

  private reconnectIfNeeded(): void {
    if (this.state === 'disconnected' && this.hasNetwork && this.appState === 'active') {
      this.connect();
    }
  }

  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') return;

    this.setState('connecting');
    this.config.connect();
  }

  disconnect(): void {
    this.setState('disconnected');
    this.config.disconnect();
  }

  setConnected(): void {
    this.setState('connected');
  }

  setDisconnected(): void {
    this.setState('disconnected');
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.handlers.forEach((handler) => handler(newState));
  }

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  cleanup(): void {
    // Remove listeners when no longer needed
    AppState.addEventListener('change', this.handleAppStateChange);
  }
}

export default ConnectionManager;
```

## Handling Reconnection

Implement exponential backoff with jitter for reconnection to avoid thundering herd problems when the server recovers.

```typescript
// src/services/reconnectionManager.ts
interface ReconnectionConfig {
  initialDelay: number;      // Starting delay in ms
  maxDelay: number;          // Maximum delay cap
  maxAttempts: number;       // Max reconnection attempts (0 = infinite)
  backoffMultiplier: number; // Multiply delay by this each attempt
  jitterFactor: number;      // Random jitter (0-1)
}

class ReconnectionManager {
  private config: ReconnectionConfig;
  private attempts: number = 0;
  private timeoutId: NodeJS.Timeout | null = null;
  private onReconnect: () => void;

  constructor(onReconnect: () => void, config?: Partial<ReconnectionConfig>) {
    this.onReconnect = onReconnect;
    this.config = {
      initialDelay: 1000,
      maxDelay: 30000,
      maxAttempts: 0,  // Infinite by default
      backoffMultiplier: 2,
      jitterFactor: 0.3,
      ...config,
    };
  }

  scheduleReconnect(): void {
    if (this.config.maxAttempts > 0 && this.attempts >= this.config.maxAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    // Calculate delay with exponential backoff
    let delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, this.attempts);
    delay = Math.min(delay, this.config.maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = delay * this.config.jitterFactor * Math.random();
    delay = delay + jitter;

    this.attempts++;

    console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.attempts})`);

    this.timeoutId = setTimeout(() => {
      this.onReconnect();
    }, delay);
  }

  reset(): void {
    this.attempts = 0;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  getAttempts(): number {
    return this.attempts;
  }
}

export default ReconnectionManager;
```

### Integrated WebSocket with Reconnection

```typescript
// src/services/resilientWebSocket.ts
import ReconnectionManager from './reconnectionManager';

class ResilientWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectionManager: ReconnectionManager;
  private intentionallyClosed: boolean = false;
  private messageHandlers: Set<(data: any) => void> = new Set();

  constructor(url: string) {
    this.url = url;
    this.reconnectionManager = new ReconnectionManager(() => this.connect());
  }

  connect(): void {
    this.intentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectionManager.reset();  // Reset backoff on successful connection
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach((handler) => handler(data));
        } catch {
          this.messageHandlers.forEach((handler) => handler(event.data));
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);

        if (!this.intentionallyClosed) {
          // Unexpected close - attempt reconnection
          this.reconnectionManager.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // Error typically followed by close event
        // Reconnection handled in onclose
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.reconnectionManager.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.reconnectionManager.cancel();
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
  }

  send(data: object | string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(message);
  }

  onMessage(handler: (data: any) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
}

export default ResilientWebSocket;
```

## Message Queue for Offline Support

Queue messages when offline and send them when connection is restored.

```typescript
// src/services/messageQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  retries: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private readonly storageKey = '@message_queue';
  private readonly maxRetries = 3;
  private readonly maxAge = 24 * 60 * 60 * 1000;  // 24 hours
  private sendFunction: ((event: string, data: any) => boolean) | null = null;

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Remove expired messages
        this.queue = this.queue.filter(
          (msg) => Date.now() - msg.timestamp < this.maxAge
        );
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
      this.queue = [];
    }
  }

  setSendFunction(fn: (event: string, data: any) => boolean): void {
    this.sendFunction = fn;
  }

  async enqueue(event: string, data: any): Promise<string> {
    const message: QueuedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(message);
    await this.persist();

    return message.id;
  }

  async flush(): Promise<{ sent: number; failed: number }> {
    if (!this.sendFunction) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;
    const toRemove: string[] = [];

    for (const message of this.queue) {
      const success = this.sendFunction(message.event, {
        ...message.data,
        _queuedAt: message.timestamp,
        _messageId: message.id,
      });

      if (success) {
        toRemove.push(message.id);
        sent++;
      } else {
        message.retries++;
        if (message.retries >= this.maxRetries) {
          toRemove.push(message.id);
          failed++;
        }
      }
    }

    // Remove sent and failed messages
    this.queue = this.queue.filter((msg) => !toRemove.includes(msg.id));
    await this.persist();

    return { sent, failed };
  }

  async remove(messageId: string): Promise<void> {
    this.queue = this.queue.filter((msg) => msg.id !== messageId);
    await this.persist();
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueue(): QueuedMessage[] {
    return [...this.queue];
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist message queue:', error);
    }
  }
}

export default MessageQueue;
```

### Using Message Queue with WebSocket

```typescript
// src/hooks/useOfflineMessages.ts
import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocketIO';
import MessageQueue from '../services/messageQueue';

export function useOfflineMessages() {
  const { socket, isConnected } = useSocket();
  const queueRef = useRef<MessageQueue>(new MessageQueue());

  useEffect(() => {
    queueRef.current.initialize();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Set up send function
    queueRef.current.setSendFunction((event, data) => {
      if (socket.connected) {
        socket.emit(event, data);
        return true;
      }
      return false;
    });
  }, [socket]);

  // Flush queue when connection is restored
  useEffect(() => {
    if (isConnected) {
      queueRef.current.flush().then(({ sent, failed }) => {
        if (sent > 0 || failed > 0) {
          console.log(`Flushed queue: ${sent} sent, ${failed} failed`);
        }
      });
    }
  }, [isConnected]);

  // Send message with offline support
  const sendMessage = useCallback(
    async (event: string, data: any) => {
      if (isConnected && socket?.connected) {
        socket.emit(event, data);
      } else {
        // Queue for later delivery
        await queueRef.current.enqueue(event, data);
        console.log('Message queued for offline delivery');
      }
    },
    [socket, isConnected]
  );

  const getQueueLength = useCallback(() => {
    return queueRef.current.getQueueLength();
  }, []);

  return { sendMessage, getQueueLength };
}
```

## Authentication over WebSocket

Authenticate WebSocket connections using JWT tokens in the handshake.

```typescript
// src/services/authenticatedSocket.ts
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthConfig {
  url: string;
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
}

class AuthenticatedSocket {
  private socket: Socket | null = null;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const token = await this.config.getToken();

    if (!token) {
      throw new Error('No authentication token available');
    }

    this.socket = io(this.config.url, {
      transports: ['websocket'],
      auth: {
        token,  // Sent with handshake
      },
    });

    this.socket.on('connect', () => {
      console.log('Authenticated socket connected');
    });

    // Handle token expiration
    this.socket.on('connect_error', async (error) => {
      if (error.message === 'jwt expired' || error.message === 'Invalid token') {
        console.log('Token expired, refreshing...');

        const newToken = await this.config.refreshToken();

        if (newToken) {
          // Update auth token for reconnection
          this.socket!.auth = { token: newToken };
          this.socket!.connect();
        } else {
          console.error('Failed to refresh token');
          // Handle logout
        }
      }
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, handler: (...args: any[]) => void): () => void {
    this.socket?.on(event, handler);
    return () => {
      this.socket?.off(event, handler);
    };
  }
}

// Usage
const authSocket = new AuthenticatedSocket({
  url: 'wss://api.example.com',
  getToken: async () => AsyncStorage.getItem('accessToken'),
  refreshToken: async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const response = await fetch('https://api.example.com/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const { accessToken } = await response.json();
      await AsyncStorage.setItem('accessToken', accessToken);
      return accessToken;
    } catch {
      return null;
    }
  },
});

export default authSocket;
```

## Room and Channel Subscription

Implement room-based messaging for features like chat channels or document collaboration.

```typescript
// src/hooks/useRoom.ts
import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from './useSocketIO';

interface UseRoomOptions {
  roomId: string;
  onJoin?: () => void;
  onLeave?: () => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
}

export function useRoom(options: UseRoomOptions) {
  const { roomId, onJoin, onLeave, onUserJoined, onUserLeft } = options;
  const { socket, isConnected } = useSocket();
  const [members, setMembers] = useState<string[]>([]);
  const [isJoined, setIsJoined] = useState(false);

  // Join room on mount
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join-room', roomId, (response: { members: string[] }) => {
      setMembers(response.members);
      setIsJoined(true);
      onJoin?.();
    });

    return () => {
      socket.emit('leave-room', roomId);
      setIsJoined(false);
      onLeave?.();
    };
  }, [socket, isConnected, roomId]);

  // Handle user joined
  useSocketEvent('user-joined', (data: { userId: string; roomId: string }) => {
    if (data.roomId === roomId) {
      setMembers((prev) => [...prev, data.userId]);
      onUserJoined?.(data.userId);
    }
  });

  // Handle user left
  useSocketEvent('user-left', (data: { userId: string; roomId: string }) => {
    if (data.roomId === roomId) {
      setMembers((prev) => prev.filter((id) => id !== data.userId));
      onUserLeft?.(data.userId);
    }
  });

  // Send message to room
  const sendToRoom = useCallback(
    (event: string, data: any) => {
      if (!socket || !isJoined) return;
      socket.emit('room-message', { roomId, event, data });
    },
    [socket, roomId, isJoined]
  );

  return {
    isJoined,
    members,
    sendToRoom,
  };
}

// Usage example - Chat room component
function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState([]);

  const { isJoined, members, sendToRoom } = useRoom({
    roomId,
    onUserJoined: (userId) => console.log(`${userId} joined`),
    onUserLeft: (userId) => console.log(`${userId} left`),
  });

  useSocketEvent('room-message', (data) => {
    if (data.roomId === roomId && data.event === 'chat') {
      setMessages((prev) => [...prev, data.message]);
    }
  });

  const handleSend = (text: string) => {
    sendToRoom('chat', { text, timestamp: Date.now() });
  };

  return (
    <View>
      <Text>{isJoined ? `In room with ${members.length} members` : 'Joining...'}</Text>
      {/* Chat UI */}
    </View>
  );
}
```

## Binary Data Transfer

WebSockets support binary data for efficient transfer of images, audio, or files.

```typescript
// src/services/binaryTransfer.ts
import RNFS from 'react-native-fs';

interface BinaryMessage {
  type: 'image' | 'audio' | 'file';
  name: string;
  mimeType: string;
  data: ArrayBuffer;
}

class BinaryTransfer {
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    // Set binary type to ArrayBuffer for receiving
    this.ws.binaryType = 'arraybuffer';
  }

  // Send binary data with metadata
  async sendFile(filePath: string, type: BinaryMessage['type']): Promise<void> {
    try {
      // Read file as base64
      const base64Data = await RNFS.readFile(filePath, 'base64');

      // Convert to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create header with metadata
      const fileName = filePath.split('/').pop() || 'file';
      const header = JSON.stringify({
        type,
        name: fileName,
        size: bytes.length,
      });

      // Send header first
      this.ws.send(JSON.stringify({ messageType: 'binary-header', ...JSON.parse(header) }));

      // Then send binary data
      this.ws.send(bytes.buffer);

      console.log(`Sent ${type}: ${fileName} (${bytes.length} bytes)`);
    } catch (error) {
      console.error('Failed to send file:', error);
      throw error;
    }
  }

  // Send image from camera or gallery
  async sendImage(uri: string): Promise<void> {
    await this.sendFile(uri, 'image');
  }

  // Receive and handle binary messages
  onBinaryMessage(handler: (message: BinaryMessage) => void): void {
    let pendingHeader: { type: string; name: string; size: number } | null = null;

    const originalOnMessage = this.ws.onmessage;

    this.ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.messageType === 'binary-header') {
            pendingHeader = parsed;
            return;
          }
        } catch {
          // Not JSON, pass through
        }
        originalOnMessage?.(event);
      } else if (event.data instanceof ArrayBuffer && pendingHeader) {
        // Binary data received
        handler({
          type: pendingHeader.type as BinaryMessage['type'],
          name: pendingHeader.name,
          mimeType: this.getMimeType(pendingHeader.name),
          data: event.data,
        });
        pendingHeader = null;
      }
    };
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      pdf: 'application/pdf',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}

export default BinaryTransfer;
```

### Efficient Image Sending

```typescript
// src/utils/imageCompression.ts
import ImageResizer from 'react-native-image-resizer';

interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'JPEG' | 'PNG';
}

async function compressImage(
  uri: string,
  options: CompressionOptions = { maxWidth: 1024, maxHeight: 1024, quality: 80, format: 'JPEG' }
): Promise<string> {
  const response = await ImageResizer.createResizedImage(
    uri,
    options.maxWidth,
    options.maxHeight,
    options.format,
    options.quality,
    0,  // rotation
    undefined,  // outputPath (uses cache)
    false  // keepMeta
  );

  return response.uri;
}

// Usage with WebSocket
async function sendCompressedImage(ws: WebSocket, imageUri: string): Promise<void> {
  const compressedUri = await compressImage(imageUri, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 70,
    format: 'JPEG',
  });

  const binaryTransfer = new BinaryTransfer(ws);
  await binaryTransfer.sendImage(compressedUri);
}
```

## Background Handling

React Native apps need special handling for WebSocket connections when in background.

```typescript
// src/services/backgroundSocket.ts
import { AppState, AppStateStatus } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';

class BackgroundSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private heartbeatInterval: number | null = null;
  private isInBackground: boolean = false;
  private keepAliveInBackground: boolean;

  constructor(url: string, keepAliveInBackground: boolean = false) {
    this.url = url;
    this.keepAliveInBackground = keepAliveInBackground;
    this.setupAppStateListener();
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const wasInBackground = this.isInBackground;
    this.isInBackground = nextAppState !== 'active';

    if (this.isInBackground && !wasInBackground) {
      // App went to background
      this.handleBackground();
    } else if (!this.isInBackground && wasInBackground) {
      // App came to foreground
      this.handleForeground();
    }
  };

  private handleBackground(): void {
    if (this.keepAliveInBackground) {
      // Keep connection alive with background timer
      this.startBackgroundHeartbeat();
    } else {
      // Disconnect to save battery
      this.disconnect();
    }
  }

  private handleForeground(): void {
    this.stopBackgroundHeartbeat();

    if (!this.isConnected()) {
      this.connect();
    }
  }

  private startBackgroundHeartbeat(): void {
    // Use background timer to keep connection alive
    this.heartbeatInterval = BackgroundTimer.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping to keep connection alive
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);  // Every 25 seconds
  }

  private stopBackgroundHeartbeat(): void {
    if (this.heartbeatInterval) {
      BackgroundTimer.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Background socket connected');
    };

    this.ws.onclose = () => {
      console.log('Background socket disconnected');
    };
  }

  disconnect(): void {
    this.stopBackgroundHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  cleanup(): void {
    this.stopBackgroundHeartbeat();
    this.disconnect();
  }
}

export default BackgroundSocket;
```

## Performance Considerations

Optimize WebSocket performance for mobile devices.

```typescript
// src/services/optimizedSocket.ts
import { InteractionManager } from 'react-native';

interface PerformanceConfig {
  batchMessages: boolean;
  batchInterval: number;
  throttleUpdates: boolean;
  throttleInterval: number;
  deferProcessingDuringInteraction: boolean;
}

class OptimizedSocket {
  private ws: WebSocket | null = null;
  private config: PerformanceConfig;
  private messageBuffer: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;
  private messageHandlers: Set<(data: any) => void> = new Set();

  constructor(url: string, config?: Partial<PerformanceConfig>) {
    this.config = {
      batchMessages: true,
      batchInterval: 100,       // Batch outgoing messages every 100ms
      throttleUpdates: true,
      throttleInterval: 16,     // ~60fps throttle for UI updates
      deferProcessingDuringInteraction: true,
      ...config,
    };

    this.connect(url);
  }

  private connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (this.config.throttleUpdates) {
        this.throttledProcess(data);
      } else if (this.config.deferProcessingDuringInteraction) {
        this.deferredProcess(data);
      } else {
        this.processMessage(data);
      }
    };
  }

  // Throttle high-frequency updates (e.g., live typing indicators)
  private throttledProcess(data: any): void {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.config.throttleInterval) {
      return;  // Skip this update
    }

    this.lastUpdateTime = now;
    this.processMessage(data);
  }

  // Defer processing until interactions complete (smoother animations)
  private deferredProcess(data: any): void {
    InteractionManager.runAfterInteractions(() => {
      this.processMessage(data);
    });
  }

  private processMessage(data: any): void {
    this.messageHandlers.forEach((handler) => handler(data));
  }

  // Batch outgoing messages to reduce send frequency
  send(data: any): void {
    if (this.config.batchMessages) {
      this.messageBuffer.push(data);

      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.flushBatch();
        }, this.config.batchInterval);
      }
    } else {
      this.sendImmediate(data);
    }
  }

  private flushBatch(): void {
    if (this.messageBuffer.length === 0) return;

    // Send batched messages as array
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'batch',
        messages: this.messageBuffer,
      }));
    }

    this.messageBuffer = [];
    this.batchTimeout = null;
  }

  private sendImmediate(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Send immediately, bypassing batch
  sendPriority(data: any): void {
    this.sendImmediate(data);
  }

  onMessage(handler: (data: any) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  disconnect(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.flushBatch();  // Send remaining messages
    }
    this.ws?.close();
  }
}

export default OptimizedSocket;
```

### Memory Management

```typescript
// src/hooks/useWebSocketMemory.ts
import { useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  timestamp: number;
  data: any;
}

// Limit stored messages to prevent memory issues
export function useLimitedMessageHistory(maxMessages: number = 100) {
  const messagesRef = useRef<Message[]>([]);

  const addMessage = useCallback((data: any) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      data,
    };

    messagesRef.current.push(message);

    // Remove oldest messages if over limit
    if (messagesRef.current.length > maxMessages) {
      messagesRef.current = messagesRef.current.slice(-maxMessages);
    }

    return message;
  }, [maxMessages]);

  const getMessages = useCallback(() => {
    return [...messagesRef.current];
  }, []);

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      messagesRef.current = [];
    };
  }, []);

  return { addMessage, getMessages, clearMessages };
}
```

## Testing WebSocket Features

Test WebSocket functionality with mocks and integration tests.

```typescript
// __tests__/websocket.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocket } from '../src/hooks/useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);

    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }

  // Test helpers
  simulateMessage(data: any): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(): void {
    this.onerror?.();
  }

  simulateClose(): void {
    this.close();
  }

  static reset(): void {
    MockWebSocket.instances = [];
  }
}

// Replace global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.reset();
  });

  it('connects to WebSocket server', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useWebSocket({ url: 'ws://test.com' })
    );

    expect(result.current.isConnected).toBe(false);

    await waitForNextUpdate();

    expect(result.current.isConnected).toBe(true);
    expect(MockWebSocket.instances[0].url).toBe('ws://test.com');
  });

  it('receives messages', async () => {
    const onMessage = jest.fn();

    const { waitForNextUpdate } = renderHook(() =>
      useWebSocket({ url: 'ws://test.com', onMessage })
    );

    await waitForNextUpdate();

    act(() => {
      MockWebSocket.instances[0].simulateMessage({ type: 'test', data: 'hello' });
    });

    expect(onMessage).toHaveBeenCalledWith({ type: 'test', data: 'hello' });
  });

  it('sends messages', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useWebSocket({ url: 'ws://test.com' })
    );

    await waitForNextUpdate();

    act(() => {
      result.current.sendMessage({ type: 'chat', message: 'Hello!' });
    });

    expect(MockWebSocket.instances[0].sentMessages).toContain(
      JSON.stringify({ type: 'chat', message: 'Hello!' })
    );
  });

  it('handles disconnection', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useWebSocket({ url: 'ws://test.com' })
    );

    await waitForNextUpdate();
    expect(result.current.isConnected).toBe(true);

    act(() => {
      MockWebSocket.instances[0].simulateClose();
    });

    expect(result.current.isConnected).toBe(false);
  });
});
```

### Integration Test with Server

```typescript
// __tests__/integration/websocket.integration.test.ts
import { io, Socket } from 'socket.io-client';

describe('WebSocket Integration', () => {
  let socket: Socket;

  beforeAll((done) => {
    // Connect to test server
    socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    socket.on('connect', done);
  });

  afterAll(() => {
    socket.disconnect();
  });

  it('should join room and receive messages', (done) => {
    const roomId = 'test-room-' + Date.now();

    socket.emit('join-room', roomId);

    socket.on('room-message', (data) => {
      expect(data.roomId).toBe(roomId);
      expect(data.message).toBe('Hello from test');
      done();
    });

    // Simulate another user sending message (use second socket in real test)
    setTimeout(() => {
      socket.emit('room-message', {
        roomId,
        message: 'Hello from test',
      });
    }, 100);
  });

  it('should handle authentication', (done) => {
    const authSocket = io('http://localhost:3001', {
      auth: { token: 'valid-test-token' },
    });

    authSocket.on('connect', () => {
      expect(authSocket.connected).toBe(true);
      authSocket.disconnect();
      done();
    });

    authSocket.on('connect_error', (err) => {
      authSocket.disconnect();
      done(new Error('Should not fail: ' + err.message));
    });
  });
});
```

## Summary

| Feature | Implementation |
|---------|----------------|
| **Native WebSocket** | Built-in WebSocket API |
| **Socket.IO** | Event-based with auto-reconnect |
| **Connection management** | AppState and NetInfo listeners |
| **Reconnection** | Exponential backoff with jitter |
| **Offline queue** | AsyncStorage persistence |
| **Authentication** | JWT in handshake auth |
| **Rooms** | Socket.IO rooms for channels |
| **Binary data** | ArrayBuffer with metadata |
| **Background** | BackgroundTimer for keep-alive |
| **Performance** | Batching, throttling, defer |
| **Testing** | Mock WebSocket class |

WebSockets enable powerful real-time features in React Native apps. Choose between the native WebSocket API for simple use cases or Socket.IO for production applications requiring reconnection, rooms, and fallback transports. Implement proper connection management, offline support, and authentication to build reliable real-time mobile experiences.
