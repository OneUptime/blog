# How to Use WebSockets in React for Real-Time Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, WebSocket, Real-Time, API, Live Updates, Frontend

Description: Learn how to implement WebSocket connections in React applications with custom hooks, reconnection logic, state management, and production-ready patterns for building real-time features.

---

Real-time features have become essential in modern web applications. Whether you are building a chat application, live notifications, collaborative editing, stock tickers, or live dashboards, WebSockets provide the bidirectional communication channel needed for instant updates. This guide covers implementing WebSockets in React from basic connections to production-ready patterns with custom hooks, reconnection strategies, and state management.

## Understanding WebSockets

WebSockets provide a persistent, bidirectional connection between the client and server. Unlike HTTP requests that follow a request-response pattern, WebSockets allow both the server and client to send messages at any time without the overhead of establishing new connections.

### When to Use WebSockets

WebSockets are ideal when you need:

- **Low latency**: Messages arrive instantly without polling delays
- **Bidirectional communication**: Both client and server can initiate messages
- **Frequent updates**: Data changes multiple times per second
- **Persistent connections**: Long-running sessions with continuous data flow

Common use cases include:

- Chat applications and messaging
- Live notifications and alerts
- Real-time dashboards and monitoring
- Collaborative editing (documents, whiteboards)
- Live sports scores or stock prices
- Multiplayer games
- IoT device monitoring

## Basic WebSocket Connection in React

Let us start with a simple WebSocket connection in a React component.

```typescript
import React, { useState, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  userId: string;
}

function ChatComponent(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    // Create WebSocket connection
    const ws = new WebSocket('wss://api.example.com/ws');

    // Connection opened
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    // Listen for messages
    ws.onmessage = (event: MessageEvent) => {
      const message: Message = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    // Connection closed
    ws.onclose = (event: CloseEvent) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
    };

    // Connection error
    ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN && inputValue.trim()) {
      socket.send(JSON.stringify({
        type: 'message',
        text: inputValue,
        timestamp: new Date().toISOString(),
      }));
      setInputValue('');
    }
  }, [socket, inputValue]);

  return (
    <div className="chat-container">
      <div className="connection-status">
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <span className="timestamp">{msg.timestamp}</span>
            <span className="text">{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={!isConnected}
        />
        <button onClick={sendMessage} disabled={!isConnected}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatComponent;
```

This basic implementation works but has limitations. It does not handle reconnection, lacks type safety for messages, and mixing WebSocket logic with UI components makes testing difficult.

## Custom WebSocket Hook

A reusable custom hook encapsulates WebSocket logic and provides a clean interface for components.

```typescript
// hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  protocols?: string | string[];
}

interface UseWebSocketReturn {
  sendMessage: (data: string | object) => void;
  lastMessage: unknown;
  readyState: number;
  isConnected: boolean;
  disconnect: () => void;
  reconnect: () => void;
}

// WebSocket ready states for reference
const ReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    protocols,
  } = options;

  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [readyState, setReadyState] = useState<number>(ReadyState.CLOSED);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef<boolean>(true);

  // Clear any pending reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      const ws = protocols
        ? new WebSocket(url, protocols)
        : new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setReadyState(ReadyState.OPEN);
        reconnectCountRef.current = 0; // Reset reconnect counter on successful connection
        onOpen?.();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch {
          // If not JSON, use raw data
          setLastMessage(event.data);
          onMessage?.(event.data);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setReadyState(ReadyState.CLOSED);
        onClose?.(event);

        // Attempt reconnection if enabled and not manually closed
        if (
          reconnect &&
          shouldReconnectRef.current &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current += 1;
          console.log(
            `Reconnecting... Attempt ${reconnectCountRef.current}/${reconnectAttempts}`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      socketRef.current = ws;
      setReadyState(ReadyState.CONNECTING);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [url, protocols, reconnect, reconnectAttempts, reconnectInterval, onMessage, onOpen, onClose, onError]);

  // Send message through WebSocket
  const sendMessage = useCallback((data: string | object) => {
    if (socketRef.current?.readyState === ReadyState.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socketRef.current.send(message);
    } else {
      console.warn('WebSocket is not connected. Message not sent.');
    }
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    socketRef.current?.close();
  }, [clearReconnectTimeout]);

  // Manual reconnect
  const manualReconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    reconnectCountRef.current = 0;
    clearReconnectTimeout();
    connect();
  }, [connect, clearReconnectTimeout]);

  // Initial connection
  useEffect(() => {
    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      socketRef.current?.close();
    };
  }, [connect, clearReconnectTimeout]);

  return {
    sendMessage,
    lastMessage,
    readyState,
    isConnected: readyState === ReadyState.OPEN,
    disconnect,
    reconnect: manualReconnect,
  };
}

export { ReadyState };
```

### Using the Custom Hook

```typescript
import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';

interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

function ChatApp(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');

  const { sendMessage, lastMessage, isConnected, reconnect } = useWebSocket({
    url: 'wss://api.example.com/chat',
    onMessage: (data) => {
      const message = data as ChatMessage;
      setMessages((prev) => [...prev, message]);
    },
    onOpen: () => {
      console.log('Chat connected');
    },
    onClose: () => {
      console.log('Chat disconnected');
    },
    reconnect: true,
    reconnectAttempts: 10,
    reconnectInterval: 2000,
  });

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage({
        type: 'chat_message',
        text: inputText,
      });
      setInputText('');
    }
  };

  return (
    <div className="chat-app">
      <header>
        <span className={`status ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'Online' : 'Offline'}
        </span>
        {!isConnected && (
          <button onClick={reconnect}>Reconnect</button>
        )}
      </header>

      <div className="message-list">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.userId}</strong>: {msg.text}
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button onClick={handleSend} disabled={!isConnected}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatApp;
```

## Advanced Reconnection with Exponential Backoff

Production applications need sophisticated reconnection strategies. Exponential backoff prevents overwhelming the server during outages while ensuring quick recovery during brief disconnections.

```typescript
// hooks/useWebSocketWithBackoff.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface BackoffOptions {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
}

interface UseWebSocketWithBackoffOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  maxReconnectAttempts?: number;
  backoff?: Partial<BackoffOptions>;
}

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempt: number;
  nextReconnectDelay: number;
}

const defaultBackoff: BackoffOptions = {
  initialDelay: 1000,    // Start with 1 second
  maxDelay: 30000,       // Max 30 seconds between attempts
  multiplier: 2,         // Double the delay each attempt
  jitter: true,          // Add randomness to prevent thundering herd
};

function calculateBackoffDelay(
  attempt: number,
  options: BackoffOptions
): number {
  // Calculate exponential delay
  let delay = options.initialDelay * Math.pow(options.multiplier, attempt);

  // Cap at maximum delay
  delay = Math.min(delay, options.maxDelay);

  // Add jitter (random variation) to prevent all clients reconnecting simultaneously
  if (options.jitter) {
    // Add +/- 25% randomness
    const jitterRange = delay * 0.25;
    delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
  }

  return Math.floor(delay);
}

export function useWebSocketWithBackoff(
  options: UseWebSocketWithBackoffOptions
) {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    maxReconnectAttempts = 10,
    backoff: backoffOptions,
  } = options;

  const backoff: BackoffOptions = { ...defaultBackoff, ...backoffOptions };

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempt: 0,
    nextReconnectDelay: 0,
  });
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef<boolean>(true);
  const urlRef = useRef<string>(url);

  // Update URL ref when URL changes
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback((attemptNumber: number = 0) => {
    clearReconnectTimeout();

    if (socketRef.current) {
      socketRef.current.close();
    }

    setConnectionState({
      status: attemptNumber === 0 ? 'connecting' : 'reconnecting',
      reconnectAttempt: attemptNumber,
      nextReconnectDelay: 0,
    });

    try {
      const ws = new WebSocket(urlRef.current);

      ws.onopen = () => {
        setConnectionState({
          status: 'connected',
          reconnectAttempt: 0,
          nextReconnectDelay: 0,
        });
        onOpen?.();
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch {
          setLastMessage(event.data);
          onMessage?.(event.data);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        onClose?.(event);

        // Only reconnect if not manually closed and within attempt limit
        if (
          shouldReconnectRef.current &&
          attemptNumber < maxReconnectAttempts
        ) {
          const delay = calculateBackoffDelay(attemptNumber, backoff);

          setConnectionState({
            status: 'reconnecting',
            reconnectAttempt: attemptNumber + 1,
            nextReconnectDelay: delay,
          });

          console.log(
            `Reconnecting in ${delay}ms (attempt ${attemptNumber + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect(attemptNumber + 1);
          }, delay);
        } else {
          setConnectionState({
            status: 'disconnected',
            reconnectAttempt: attemptNumber,
            nextReconnectDelay: 0,
          });
        }
      };

      ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      socketRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [backoff, maxReconnectAttempts, onMessage, onOpen, onClose, onError, clearReconnectTimeout]);

  const sendMessage = useCallback((data: string | object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socketRef.current.send(message);
      return true;
    }
    console.warn('WebSocket not connected');
    return false;
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    socketRef.current?.close();
  }, [clearReconnectTimeout]);

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    connect(0);
  }, [connect]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect(0);

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      socketRef.current?.close();
    };
  }, [connect, clearReconnectTimeout]);

  return {
    sendMessage,
    lastMessage,
    connectionState,
    isConnected: connectionState.status === 'connected',
    isReconnecting: connectionState.status === 'reconnecting',
    disconnect,
    reconnect,
  };
}
```

### Using the Backoff Hook

```typescript
import React from 'react';
import { useWebSocketWithBackoff } from './hooks/useWebSocketWithBackoff';

function LiveDashboard(): React.ReactElement {
  const {
    sendMessage,
    lastMessage,
    connectionState,
    isConnected,
    isReconnecting,
    reconnect,
  } = useWebSocketWithBackoff({
    url: 'wss://api.example.com/dashboard',
    onMessage: (data) => {
      console.log('Dashboard update:', data);
    },
    maxReconnectAttempts: 15,
    backoff: {
      initialDelay: 500,
      maxDelay: 60000,
      multiplier: 1.5,
      jitter: true,
    },
  });

  return (
    <div className="dashboard">
      <div className="connection-banner">
        {connectionState.status === 'connected' && (
          <span className="status-connected">Live</span>
        )}
        {connectionState.status === 'reconnecting' && (
          <span className="status-reconnecting">
            Reconnecting (attempt {connectionState.reconnectAttempt})...
            Next attempt in {Math.round(connectionState.nextReconnectDelay / 1000)}s
          </span>
        )}
        {connectionState.status === 'disconnected' && (
          <div className="status-disconnected">
            <span>Disconnected</span>
            <button onClick={reconnect}>Reconnect</button>
          </div>
        )}
      </div>

      {/* Dashboard content */}
    </div>
  );
}

export default LiveDashboard;
```

## Message Queue for Offline Support

When the connection drops, messages sent by the user should be queued and delivered once the connection is restored.

```typescript
// hooks/useWebSocketWithQueue.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface QueuedMessage {
  id: string;
  data: object;
  timestamp: number;
  retries: number;
}

interface UseWebSocketWithQueueOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  maxQueueSize?: number;
  maxRetries?: number;
  messageTimeout?: number;
}

export function useWebSocketWithQueue(options: UseWebSocketWithQueueOptions) {
  const {
    url,
    onMessage,
    maxQueueSize = 100,
    maxRetries = 3,
    messageTimeout = 30000,
  } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [queueSize, setQueueSize] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const pendingAcksRef = useRef<Map<string, QueuedMessage>>(new Map());

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Process message queue when connected
  const processQueue = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const queue = messageQueueRef.current;
    const now = Date.now();

    while (queue.length > 0) {
      const message = queue[0];

      // Check if message has expired
      if (now - message.timestamp > messageTimeout) {
        queue.shift();
        console.warn('Message expired and removed from queue:', message.id);
        continue;
      }

      // Check retry limit
      if (message.retries >= maxRetries) {
        queue.shift();
        console.error('Message exceeded retry limit:', message.id);
        continue;
      }

      // Send message
      try {
        socketRef.current.send(JSON.stringify({
          ...message.data,
          _messageId: message.id,
        }));

        // Move to pending acknowledgments
        pendingAcksRef.current.set(message.id, {
          ...message,
          retries: message.retries + 1,
        });

        queue.shift();
      } catch (error) {
        console.error('Failed to send message:', error);
        break;
      }
    }

    setQueueSize(queue.length);
  }, [messageTimeout, maxRetries]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      processQueue(); // Send queued messages
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Handle acknowledgments
        if (data._ack && data._messageId) {
          pendingAcksRef.current.delete(data._messageId);
          return;
        }

        onMessage?.(data);
      } catch {
        onMessage?.(event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);

      // Move pending messages back to queue
      pendingAcksRef.current.forEach((message) => {
        if (message.retries < maxRetries) {
          messageQueueRef.current.unshift(message);
        }
      });
      pendingAcksRef.current.clear();
      setQueueSize(messageQueueRef.current.length);

      // Reconnect after delay
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socketRef.current = ws;
  }, [url, onMessage, processQueue, maxRetries]);

  // Send message (queues if disconnected)
  const sendMessage = useCallback((data: object) => {
    const message: QueuedMessage = {
      id: generateMessageId(),
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    if (
      socketRef.current?.readyState === WebSocket.OPEN &&
      messageQueueRef.current.length === 0
    ) {
      // Send immediately if connected and queue is empty
      try {
        socketRef.current.send(JSON.stringify({
          ...data,
          _messageId: message.id,
        }));
        pendingAcksRef.current.set(message.id, message);
        return true;
      } catch {
        // Fall through to queue
      }
    }

    // Add to queue
    if (messageQueueRef.current.length < maxQueueSize) {
      messageQueueRef.current.push(message);
      setQueueSize(messageQueueRef.current.length);
      return true;
    }

    console.error('Message queue full');
    return false;
  }, [generateMessageId, maxQueueSize]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.close();
    };
  }, [connect]);

  return {
    sendMessage,
    isConnected,
    queueSize,
    hasPendingMessages: queueSize > 0 || pendingAcksRef.current.size > 0,
  };
}
```

## WebSocket Context for Global State

For applications where multiple components need WebSocket access, a React Context provides a clean solution.

```typescript
// context/WebSocketContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: string;
}

interface WebSocketContextValue {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (type: string, payload: unknown) => void;
  subscribe: (type: string, handler: (payload: unknown) => void) => () => void;
  lastError: Error | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  url: string;
  children: ReactNode;
  authToken?: string;
}

export function WebSocketProvider({
  url,
  children,
  authToken,
}: WebSocketProviderProps): React.ReactElement {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Map<string, Set<(payload: unknown) => void>>>(
    new Map()
  );
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to specific message types
  const subscribe = useCallback(
    (type: string, handler: (payload: unknown) => void) => {
      if (!subscribersRef.current.has(type)) {
        subscribersRef.current.set(type, new Set());
      }
      subscribersRef.current.get(type)!.add(handler);

      // Return unsubscribe function
      return () => {
        subscribersRef.current.get(type)?.delete(handler);
      };
    },
    []
  );

  // Dispatch message to subscribers
  const dispatch = useCallback((message: WebSocketMessage) => {
    const handlers = subscribersRef.current.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }

    // Also dispatch to wildcard subscribers
    const wildcardHandlers = subscribersRef.current.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in wildcard handler:', error);
        }
      });
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    (type: string, payload: unknown) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = {
          type,
          payload,
          timestamp: new Date().toISOString(),
        };
        socketRef.current.send(JSON.stringify(message));
      } else {
        console.warn('WebSocket not connected, message not sent');
      }
    },
    []
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionState('connecting');

    // Append auth token to URL if provided
    const wsUrl = authToken ? `${url}?token=${authToken}` : url;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionState('connected');
      setLastError(null);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        dispatch(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event: CloseEvent) => {
      console.log('WebSocket closed:', event.code);
      setIsConnected(false);
      setConnectionState('disconnected');

      // Reconnect unless intentionally closed
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };

    ws.onerror = () => {
      setConnectionState('error');
      setLastError(new Error('WebSocket connection failed'));
    };

    socketRef.current = ws;
  }, [url, authToken, dispatch]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect]);

  const value: WebSocketContextValue = {
    isConnected,
    connectionState,
    sendMessage,
    subscribe,
    lastError,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook to use WebSocket context
export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider'
    );
  }
  return context;
}

// Hook to subscribe to specific message types
export function useWebSocketSubscription(
  type: string,
  handler: (payload: unknown) => void
): void {
  const { subscribe } = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = subscribe(type, handler);
    return unsubscribe;
  }, [type, handler, subscribe]);
}
```

### Using the Context

```typescript
// App.tsx
import React from 'react';
import { WebSocketProvider } from './context/WebSocketContext';
import Dashboard from './components/Dashboard';
import Notifications from './components/Notifications';

function App(): React.ReactElement {
  return (
    <WebSocketProvider
      url="wss://api.example.com/ws"
      authToken={localStorage.getItem('token') || undefined}
    >
      <Dashboard />
      <Notifications />
    </WebSocketProvider>
  );
}

export default App;

// components/Notifications.tsx
import React, { useState, useCallback } from 'react';
import {
  useWebSocketContext,
  useWebSocketSubscription,
} from '../context/WebSocketContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

function Notifications(): React.ReactElement {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isConnected } = useWebSocketContext();

  // Subscribe to notification messages
  const handleNotification = useCallback((payload: unknown) => {
    const notification = payload as Notification;
    setNotifications((prev) => [...prev, notification]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notification.id)
      );
    }, 5000);
  }, []);

  useWebSocketSubscription('notification', handleNotification);

  return (
    <div className="notifications">
      {!isConnected && (
        <div className="connection-warning">
          Connection lost. Notifications may be delayed.
        </div>
      )}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <strong>{notification.title}</strong>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}

export default Notifications;
```

## Heartbeat and Connection Health

Detect stale connections that appear open but have stopped receiving data.

```typescript
// hooks/useWebSocketWithHeartbeat.ts
import { useState, useEffect, useRef, useCallback } from 'react';

interface HeartbeatOptions {
  pingInterval: number;      // How often to send ping
  pongTimeout: number;       // How long to wait for pong response
  reconnectOnTimeout: boolean;
}

const defaultHeartbeat: HeartbeatOptions = {
  pingInterval: 30000,       // Send ping every 30 seconds
  pongTimeout: 10000,        // Expect pong within 10 seconds
  reconnectOnTimeout: true,
};

export function useWebSocketWithHeartbeat(
  url: string,
  options?: Partial<HeartbeatOptions>
) {
  const heartbeatOptions = { ...defaultHeartbeat, ...options };

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [latency, setLatency] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  }, []);

  const sendPing = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      lastPingTimeRef.current = Date.now();

      socketRef.current.send(JSON.stringify({ type: '__ping__' }));

      // Set timeout for pong response
      pongTimeoutRef.current = setTimeout(() => {
        console.warn('Pong timeout - connection may be stale');
        setIsHealthy(false);

        if (heartbeatOptions.reconnectOnTimeout) {
          socketRef.current?.close();
        }
      }, heartbeatOptions.pongTimeout);
    }
  }, [heartbeatOptions.pongTimeout, heartbeatOptions.reconnectOnTimeout]);

  const handlePong = useCallback(() => {
    // Clear pong timeout
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }

    // Calculate latency
    const roundTripTime = Date.now() - lastPingTimeRef.current;
    setLatency(roundTripTime);
    setIsHealthy(true);
  }, []);

  const connect = useCallback(() => {
    clearTimers();

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setIsHealthy(true);

      // Start heartbeat
      pingIntervalRef.current = setInterval(
        sendPing,
        heartbeatOptions.pingInterval
      );
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Handle pong response
        if (data.type === '__pong__') {
          handlePong();
          return;
        }

        // Handle other messages...
      } catch {
        // Non-JSON message
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsHealthy(false);
      clearTimers();

      // Reconnect
      setTimeout(connect, 5000);
    };

    socketRef.current = ws;
  }, [url, heartbeatOptions.pingInterval, sendPing, handlePong, clearTimers]);

  useEffect(() => {
    connect();
    return () => {
      clearTimers();
      socketRef.current?.close();
    };
  }, [connect, clearTimers]);

  return {
    isConnected,
    isHealthy,
    latency,
  };
}
```

### Server-Side Heartbeat Handler

```typescript
// Server-side (Node.js)
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);

      // Respond to ping with pong
      if (data.type === '__ping__') {
        ws.send(JSON.stringify({ type: '__pong__' }));
        return;
      }

      // Handle other message types...
    } catch (error) {
      console.error('Invalid message:', error);
    }
  });
});
```

## Binary Data and File Transfers

WebSockets support binary data for efficient file transfers and real-time media streaming.

```typescript
// hooks/useWebSocketBinary.ts
import { useRef, useState, useCallback, useEffect } from 'react';

interface FileTransfer {
  id: string;
  fileName: string;
  totalSize: number;
  transferredSize: number;
  status: 'pending' | 'transferring' | 'completed' | 'error';
}

export function useWebSocketBinary(url: string) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [transfers, setTransfers] = useState<Map<string, FileTransfer>>(
    new Map()
  );

  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer'; // Enable binary message handling

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        // Handle binary data
        handleBinaryMessage(event.data);
      } else {
        // Handle JSON control messages
        try {
          const message = JSON.parse(event.data);
          handleControlMessage(message);
        } catch (error) {
          console.error('Invalid message:', error);
        }
      }
    };

    socketRef.current = ws;
  }, [url]);

  const handleBinaryMessage = useCallback((data: ArrayBuffer) => {
    // First 36 bytes contain transfer ID (UUID)
    const headerView = new DataView(data, 0, 36);
    const decoder = new TextDecoder();
    const transferId = decoder.decode(new Uint8Array(data, 0, 36));

    // Rest is file chunk
    const chunk = data.slice(36);

    // Update transfer progress
    setTransfers((prev) => {
      const updated = new Map(prev);
      const transfer = updated.get(transferId);
      if (transfer) {
        transfer.transferredSize += chunk.byteLength;
        if (transfer.transferredSize >= transfer.totalSize) {
          transfer.status = 'completed';
        }
      }
      return updated;
    });
  }, []);

  const handleControlMessage = useCallback((message: unknown) => {
    // Handle transfer metadata, completion, errors, etc.
  }, []);

  // Send file in chunks
  const sendFile = useCallback(
    async (file: File): Promise<string> => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }

      const transferId = crypto.randomUUID();
      const chunkSize = 64 * 1024; // 64KB chunks

      // Create transfer record
      setTransfers((prev) => {
        const updated = new Map(prev);
        updated.set(transferId, {
          id: transferId,
          fileName: file.name,
          totalSize: file.size,
          transferredSize: 0,
          status: 'pending',
        });
        return updated;
      });

      // Send metadata first
      socketRef.current.send(
        JSON.stringify({
          type: 'file_start',
          transferId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        })
      );

      // Read and send file in chunks
      const reader = file.stream().getReader();
      const encoder = new TextEncoder();

      setTransfers((prev) => {
        const updated = new Map(prev);
        const transfer = updated.get(transferId);
        if (transfer) {
          transfer.status = 'transferring';
        }
        return updated;
      });

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          // Prepend transfer ID to chunk
          const idBytes = encoder.encode(transferId.padEnd(36, ' '));
          const combined = new Uint8Array(idBytes.length + value.length);
          combined.set(idBytes);
          combined.set(value, idBytes.length);

          socketRef.current!.send(combined.buffer);

          // Update progress
          setTransfers((prev) => {
            const updated = new Map(prev);
            const transfer = updated.get(transferId);
            if (transfer) {
              transfer.transferredSize += value.length;
            }
            return updated;
          });
        }
      }

      // Send completion message
      socketRef.current.send(
        JSON.stringify({
          type: 'file_complete',
          transferId,
        })
      );

      return transferId;
    },
    []
  );

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.close();
    };
  }, [connect]);

  return {
    isConnected,
    transfers,
    sendFile,
  };
}
```

## Testing WebSocket Components

Testing real-time components requires mocking WebSocket connections.

```typescript
// __mocks__/MockWebSocket.ts
type MessageHandler = (event: MessageEvent) => void;
type OpenHandler = () => void;
type CloseHandler = (event: CloseEvent) => void;
type ErrorHandler = (event: Event) => void;

export class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = WebSocket.CONNECTING;

  onopen: OpenHandler | null = null;
  onclose: CloseHandler | null = null;
  onmessage: MessageHandler | null = null;
  onerror: ErrorHandler | null = null;

  private messageQueue: string[] = [];

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
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({
      code: code || 1000,
      reason: reason || '',
      wasClean: true,
    } as CloseEvent);
  }

  // Test helpers
  simulateMessage(data: object | string): void {
    const messageData = typeof data === 'string' ? data : JSON.stringify(data);
    this.onmessage?.({ data: messageData } as MessageEvent);
  }

  simulateError(): void {
    this.onerror?.({} as Event);
  }

  simulateClose(code: number = 1000): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ code, reason: '', wasClean: true } as CloseEvent);
  }

  getSentMessages(): string[] {
    return [...this.messageQueue];
  }

  getLastSentMessage(): object | null {
    const last = this.messageQueue[this.messageQueue.length - 1];
    return last ? JSON.parse(last) : null;
  }

  static clearInstances(): void {
    MockWebSocket.instances = [];
  }

  static getLastInstance(): MockWebSocket | null {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1] || null;
  }
}

// Replace global WebSocket
(global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket;
```

### Writing Tests

```typescript
// __tests__/ChatComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockWebSocket } from '../__mocks__/MockWebSocket';
import ChatComponent from '../components/ChatComponent';

describe('ChatComponent', () => {
  beforeEach(() => {
    MockWebSocket.clearInstances();
  });

  it('connects to WebSocket on mount', async () => {
    render(<ChatComponent />);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.getLastInstance();
    expect(ws?.url).toContain('wss://');
  });

  it('displays received messages', async () => {
    render(<ChatComponent />);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.getLastInstance()!;

    // Simulate receiving a message
    ws.simulateMessage({
      id: '1',
      userId: 'user123',
      text: 'Hello, World!',
      timestamp: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    });
  });

  it('sends messages when connected', async () => {
    render(<ChatComponent />);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    const ws = MockWebSocket.getLastInstance()!;
    const sentMessage = ws.getLastSentMessage();

    expect(sentMessage).toEqual(
      expect.objectContaining({
        text: 'Test message',
      })
    );
  });

  it('handles disconnection gracefully', async () => {
    render(<ChatComponent />);

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    const ws = MockWebSocket.getLastInstance()!;
    ws.simulateClose(1006);

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  it('disables input when disconnected', async () => {
    render(<ChatComponent />);

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1);
    });

    const ws = MockWebSocket.getLastInstance()!;
    ws.simulateClose();

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toBeDisabled();
    });
  });
});
```

## Error Handling and Edge Cases

Robust error handling ensures your application degrades gracefully.

```typescript
// utils/websocketErrors.ts
export enum WebSocketErrorCode {
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002,
  UNSUPPORTED_DATA = 1003,
  NO_STATUS_RECEIVED = 1005,
  ABNORMAL_CLOSURE = 1006,
  INVALID_FRAME_PAYLOAD = 1007,
  POLICY_VIOLATION = 1008,
  MESSAGE_TOO_BIG = 1009,
  MANDATORY_EXTENSION = 1010,
  INTERNAL_ERROR = 1011,
  SERVICE_RESTART = 1012,
  TRY_AGAIN_LATER = 1013,
  BAD_GATEWAY = 1014,
  TLS_HANDSHAKE = 1015,
}

export function getErrorMessage(code: number): string {
  switch (code) {
    case WebSocketErrorCode.NORMAL_CLOSURE:
      return 'Connection closed normally';
    case WebSocketErrorCode.GOING_AWAY:
      return 'Server is shutting down';
    case WebSocketErrorCode.PROTOCOL_ERROR:
      return 'Protocol error';
    case WebSocketErrorCode.ABNORMAL_CLOSURE:
      return 'Connection lost unexpectedly';
    case WebSocketErrorCode.MESSAGE_TOO_BIG:
      return 'Message too large';
    case WebSocketErrorCode.SERVICE_RESTART:
      return 'Server restarting';
    case WebSocketErrorCode.TRY_AGAIN_LATER:
      return 'Server overloaded, try again later';
    default:
      return `Connection closed with code ${code}`;
  }
}

export function shouldReconnect(code: number): boolean {
  // Do not reconnect for intentional closures or protocol errors
  const noReconnectCodes = [
    WebSocketErrorCode.NORMAL_CLOSURE,
    WebSocketErrorCode.PROTOCOL_ERROR,
    WebSocketErrorCode.UNSUPPORTED_DATA,
    WebSocketErrorCode.POLICY_VIOLATION,
  ];
  return !noReconnectCodes.includes(code);
}

export function getReconnectDelay(code: number, attempt: number): number {
  // Immediate reconnect for server restarts
  if (code === WebSocketErrorCode.SERVICE_RESTART) {
    return 1000;
  }

  // Back off more aggressively if server is overloaded
  if (code === WebSocketErrorCode.TRY_AGAIN_LATER) {
    return Math.min(30000, 5000 * Math.pow(2, attempt));
  }

  // Standard exponential backoff
  return Math.min(30000, 1000 * Math.pow(2, attempt));
}
```

### Using Error Handling

```typescript
// hooks/useResilientWebSocket.ts
import { useCallback, useRef, useState, useEffect } from 'react';
import {
  getErrorMessage,
  shouldReconnect,
  getReconnectDelay,
} from '../utils/websocketErrors';

interface ConnectionError {
  code: number;
  message: string;
  timestamp: Date;
  willReconnect: boolean;
}

export function useResilientWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<ConnectionError | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectAttempt(0);
      };

      ws.onclose = (event) => {
        setIsConnected(false);

        const willReconnect =
          shouldReconnectRef.current && shouldReconnect(event.code);

        setError({
          code: event.code,
          message: getErrorMessage(event.code),
          timestamp: new Date(),
          willReconnect,
        });

        if (willReconnect) {
          const delay = getReconnectDelay(event.code, reconnectAttempt);
          setReconnectAttempt((prev) => prev + 1);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        // Error details are not available in browser WebSocket API
        // The close event will provide more information
      };

      socketRef.current = ws;
    } catch (err) {
      setError({
        code: -1,
        message: err instanceof Error ? err.message : 'Failed to connect',
        timestamp: new Date(),
        willReconnect: false,
      });
    }
  }, [url, reconnectAttempt]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    socketRef.current?.close(1000);
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    reconnectAttempt,
    disconnect,
    reconnect: connect,
  };
}
```

## Performance Optimization

Optimize WebSocket handling for high-frequency updates.

```typescript
// hooks/useThrottledWebSocket.ts
import { useCallback, useRef, useState, useEffect } from 'react';

interface ThrottleOptions {
  interval: number;           // Minimum time between updates
  maxBatchSize: number;       // Max messages to batch
  immediate: boolean;         // Send first message immediately
}

const defaultOptions: ThrottleOptions = {
  interval: 100,              // 100ms between batches
  maxBatchSize: 50,
  immediate: true,
};

export function useThrottledWebSocket<T>(
  url: string,
  onBatch: (messages: T[]) => void,
  options?: Partial<ThrottleOptions>
) {
  const opts = { ...defaultOptions, ...options };
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const batchRef = useRef<T[]>([]);
  const lastFlushRef = useRef<number>(0);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flush batched messages to handler
  const flush = useCallback(() => {
    if (batchRef.current.length > 0) {
      onBatch([...batchRef.current]);
      batchRef.current = [];
      lastFlushRef.current = Date.now();
    }
  }, [onBatch]);

  // Schedule a flush
  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      return; // Already scheduled
    }

    const timeSinceLastFlush = Date.now() - lastFlushRef.current;
    const delay = Math.max(0, opts.interval - timeSinceLastFlush);

    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      flush();
    }, delay);
  }, [flush, opts.interval]);

  // Add message to batch
  const addToBatch = useCallback(
    (message: T) => {
      const isFirstMessage = batchRef.current.length === 0;
      batchRef.current.push(message);

      // Immediate flush for first message or full batch
      if (
        (opts.immediate && isFirstMessage) ||
        batchRef.current.length >= opts.maxBatchSize
      ) {
        if (flushTimeoutRef.current) {
          clearTimeout(flushTimeoutRef.current);
          flushTimeoutRef.current = null;
        }
        flush();
      } else {
        scheduleFlush();
      }
    },
    [flush, scheduleFlush, opts.immediate, opts.maxBatchSize]
  );

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        addToBatch(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    socketRef.current = ws;

    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flush(); // Flush remaining messages
      ws.close();
    };
  }, [url, addToBatch, flush]);

  return { isConnected };
}

// Usage example for live stock ticker
function StockTicker(): React.ReactElement {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());

  const handleBatch = useCallback((updates: Array<{ symbol: string; price: number }>) => {
    setPrices((prev) => {
      const updated = new Map(prev);
      updates.forEach(({ symbol, price }) => {
        updated.set(symbol, price);
      });
      return updated;
    });
  }, []);

  const { isConnected } = useThrottledWebSocket(
    'wss://api.example.com/stocks',
    handleBatch,
    { interval: 200, maxBatchSize: 100 }
  );

  return (
    <div className="stock-ticker">
      {Array.from(prices.entries()).map(([symbol, price]) => (
        <div key={symbol}>
          {symbol}: ${price.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
```

## Summary

| Feature | Implementation | Use Case |
|---------|----------------|----------|
| **Basic Connection** | Native WebSocket API in useEffect | Simple real-time features |
| **Custom Hook** | Encapsulated connection logic with callbacks | Reusable across components |
| **Exponential Backoff** | Progressive delay with jitter | Production reconnection |
| **Message Queue** | Store messages during disconnection | Offline support |
| **Context Provider** | Global WebSocket state with pub/sub | Multi-component access |
| **Heartbeat** | Ping/pong messages to detect stale connections | Connection health monitoring |
| **Binary Data** | ArrayBuffer handling for file chunks | File transfers and media |
| **Throttling** | Batch high-frequency messages | Live data feeds |
| **Error Handling** | Close code interpretation and smart reconnect | Graceful degradation |
| **Testing** | Mock WebSocket class for unit tests | Test coverage |

WebSockets enable powerful real-time features in React applications. Starting with basic connections and building up to production-ready patterns with reconnection, queuing, and health monitoring ensures your application handles network instability gracefully. The custom hooks and context patterns shown here provide clean abstractions that separate WebSocket logic from UI components, making your code more testable and maintainable.

For monitoring your WebSocket-based applications in production, consider using observability tools that can track connection metrics, message throughput, and error rates to ensure optimal performance and quick debugging when issues arise.
