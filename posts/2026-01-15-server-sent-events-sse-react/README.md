# How to Implement Server-Sent Events (SSE) in React

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, SSE, Server-Sent Events, Real-Time, Streaming, Frontend

Description: A comprehensive guide to implementing Server-Sent Events in React applications for real-time data streaming, including EventSource usage, reconnection handling, error recovery, and production best practices.

---

Real-time features are essential in modern web applications. Whether you are building live dashboards, notification systems, or streaming logs, you need a reliable way to push data from server to client. Server-Sent Events (SSE) provide a simple, efficient, and browser-native solution for unidirectional real-time communication.

This guide covers everything you need to implement SSE in React: from basic EventSource usage to advanced patterns like reconnection handling, custom hooks, and production-ready implementations.

---

## Table of Contents

1. What are Server-Sent Events?
2. SSE vs WebSockets vs Polling
3. Basic EventSource Usage
4. Implementing SSE in React
5. Creating a Custom useSSE Hook
6. Handling Reconnection
7. Managing Connection State
8. Error Handling and Recovery
9. Working with Custom Events
10. Authentication with SSE
11. Server Implementation (Node.js)
12. Cancellation and Cleanup
13. Testing SSE Components
14. Production Best Practices
15. Common Pitfalls and Solutions
16. Summary

---

## 1. What are Server-Sent Events?

Server-Sent Events (SSE) is a standard that enables servers to push data to web clients over HTTP. Unlike WebSockets, SSE is unidirectional: data flows only from server to client. The browser handles connection management, automatic reconnection, and message parsing through the native `EventSource` API.

Key characteristics:

| Feature | Description |
|---------|-------------|
| Protocol | HTTP/1.1 or HTTP/2 |
| Direction | Server to client (unidirectional) |
| Format | Text-based (UTF-8) |
| Reconnection | Automatic with configurable retry |
| Browser Support | All modern browsers |
| Connection | Persistent, single TCP connection |

SSE uses a simple text format:

```
event: message
data: {"temperature": 72, "unit": "fahrenheit"}
id: 12345

event: alert
data: Temperature threshold exceeded
id: 12346
```

Each message can include:
- `data`: The actual payload (required)
- `event`: Custom event type (optional, defaults to "message")
- `id`: Message ID for reconnection tracking (optional)
- `retry`: Reconnection delay in milliseconds (optional)

---

## 2. SSE vs WebSockets vs Polling

| Aspect | SSE | WebSockets | Polling |
|--------|-----|------------|---------|
| **Direction** | Server to client | Bidirectional | Client to server |
| **Protocol** | HTTP | WS/WSS | HTTP |
| **Browser API** | EventSource | WebSocket | fetch/XMLHttpRequest |
| **Auto-reconnect** | Built-in | Manual | N/A |
| **Binary data** | No (text only) | Yes | Yes |
| **Proxy/firewall friendly** | Yes (standard HTTP) | Sometimes problematic | Yes |
| **Complexity** | Low | Medium | Low |
| **Best for** | Notifications, feeds, logs | Chat, games, collaboration | Simple updates |

Choose SSE when:
- You need server-to-client streaming only
- Simplicity matters more than bidirectional communication
- You want automatic reconnection without extra code
- Working with text-based data (JSON, logs, events)

Choose WebSockets when:
- You need bidirectional communication
- Low latency is critical (gaming, trading)
- You need to send binary data
- Client needs to send frequent messages to server

---

## 3. Basic EventSource Usage

The `EventSource` API is built into all modern browsers. Here is the fundamental usage:

```javascript
// Create a connection to the SSE endpoint
const eventSource = new EventSource('https://api.example.com/events');

// Listen for the default "message" event
eventSource.onmessage = (event) => {
  console.log('Received:', event.data);
  const data = JSON.parse(event.data);
  // Process the data
};

// Handle connection opened
eventSource.onopen = (event) => {
  console.log('Connection established');
};

// Handle errors (including disconnections)
eventSource.onerror = (event) => {
  console.error('EventSource error:', event);
  // Browser will automatically attempt to reconnect
};

// Close the connection when done
eventSource.close();
```

### Listening to Custom Events

SSE supports custom event types. Use `addEventListener` to handle them:

```javascript
const eventSource = new EventSource('/events');

// Listen for custom "notification" events
eventSource.addEventListener('notification', (event) => {
  const notification = JSON.parse(event.data);
  console.log('Notification:', notification);
});

// Listen for custom "alert" events
eventSource.addEventListener('alert', (event) => {
  const alert = JSON.parse(event.data);
  console.log('Alert:', alert);
});

// Default message event (for events without a type)
eventSource.addEventListener('message', (event) => {
  console.log('Message:', event.data);
});
```

---

## 4. Implementing SSE in React

### Basic Component Implementation

Here is a straightforward React component that connects to an SSE endpoint:

```tsx
import React, { useState, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  timestamp: string;
}

function LiveMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create EventSource connection
    const eventSource = new EventSource('/api/messages/stream');

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    eventSource.onerror = (event) => {
      setIsConnected(false);
      // EventSource will automatically reconnect
      // Only set error if connection is completely closed
      if (eventSource.readyState === EventSource.CLOSED) {
        setError('Connection closed. Please refresh the page.');
      }
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []); // Empty dependency array - connect once on mount

  return (
    <div className="live-messages">
      <div className="connection-status">
        {isConnected ? (
          <span className="connected">Connected</span>
        ) : (
          <span className="disconnected">Reconnecting...</span>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <ul className="message-list">
        {messages.map((msg) => (
          <li key={msg.id}>
            <span className="timestamp">{msg.timestamp}</span>
            <span className="content">{msg.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LiveMessages;
```

### Handling URL Parameters

Often you need to pass parameters to filter or customize the stream:

```tsx
import React, { useState, useEffect } from 'react';

interface Props {
  channelId: string;
  userId: string;
}

function ChannelStream({ channelId, userId }: Props) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Build URL with query parameters
    const params = new URLSearchParams({
      channel: channelId,
      user: userId,
    });

    const eventSource = new EventSource(`/api/stream?${params}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents((prev) => [...prev, data]);
    };

    return () => {
      eventSource.close();
    };
  }, [channelId, userId]); // Reconnect when params change

  return (
    <div>
      {events.map((event, index) => (
        <div key={index}>{JSON.stringify(event)}</div>
      ))}
    </div>
  );
}
```

---

## 5. Creating a Custom useSSE Hook

A reusable hook encapsulates connection logic and makes SSE easy to use across components:

```tsx
// hooks/useSSE.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSSEOptions {
  url: string;
  withCredentials?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  eventTypes?: string[];
  parseJson?: boolean;
}

interface UseSSEReturn<T> {
  data: T | null;
  error: Event | null;
  isConnected: boolean;
  reconnect: () => void;
  close: () => void;
}

function useSSE<T = any>(options: UseSSEOptions): UseSSEReturn<T> {
  const {
    url,
    withCredentials = false,
    onMessage,
    onError,
    onOpen,
    eventTypes = [],
    parseJson = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url, { withCredentials });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      onOpen?.();
    };

    eventSource.onerror = (event) => {
      setIsConnected(false);
      setError(event);
      onError?.(event);
    };

    // Handler for processing incoming data
    const handleData = (event: MessageEvent) => {
      try {
        const parsedData = parseJson ? JSON.parse(event.data) : event.data;
        setData(parsedData);
        onMessage?.(parsedData);
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    // Listen to default message event
    eventSource.onmessage = handleData;

    // Listen to custom event types
    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, handleData as EventListener);
    });

    return eventSource;
  }, [url, withCredentials, onMessage, onError, onOpen, eventTypes, parseJson]);

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    close();
    connect();
  }, [close, connect]);

  useEffect(() => {
    const eventSource = connect();

    return () => {
      eventSource.close();
    };
  }, [connect]);

  return {
    data,
    error,
    isConnected,
    reconnect,
    close,
  };
}

export default useSSE;
```

### Using the Custom Hook

```tsx
import React from 'react';
import useSSE from './hooks/useSSE';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
}

function NotificationCenter() {
  const { data, isConnected, error, reconnect } = useSSE<Notification>({
    url: '/api/notifications/stream',
    eventTypes: ['notification', 'alert'],
    onMessage: (notification) => {
      // Show toast notification
      console.log('New notification:', notification);
    },
  });

  return (
    <div>
      <div className="status">
        Status: {isConnected ? 'Connected' : 'Disconnected'}
        {!isConnected && (
          <button onClick={reconnect}>Reconnect</button>
        )}
      </div>

      {data && (
        <div className={`notification ${data.type}`}>
          {data.message}
        </div>
      )}
    </div>
  );
}
```

---

## 6. Handling Reconnection

EventSource automatically reconnects when the connection drops. However, you may want more control over this behavior:

### Custom Reconnection Logic

```tsx
// hooks/useSSEWithReconnect.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface ReconnectOptions {
  url: string;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  backoffMultiplier?: number;
}

function useSSEWithReconnect<T>(options: ReconnectOptions) {
  const {
    url,
    maxRetries = 5,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000,
    backoffMultiplier = 2,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'failed'
  >('connecting');

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  const calculateRetryDelay = useCallback((attempt: number): number => {
    // Exponential backoff with jitter
    const delay = Math.min(
      initialRetryDelay * Math.pow(backoffMultiplier, attempt),
      maxRetryDelay
    );
    // Add jitter (up to 30% variance)
    const jitter = delay * 0.3 * Math.random();
    return delay + jitter;
  }, [initialRetryDelay, backoffMultiplier, maxRetryDelay]);

  const connect = useCallback(() => {
    // Build URL with Last-Event-ID for resumption
    let connectionUrl = url;
    if (lastEventIdRef.current) {
      const separator = url.includes('?') ? '&' : '?';
      connectionUrl = `${url}${separator}lastEventId=${lastEventIdRef.current}`;
    }

    const eventSource = new EventSource(connectionUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setRetryCount(0);
      setConnectionState('connected');
    };

    eventSource.onmessage = (event) => {
      // Track the last event ID for reconnection
      if (event.lastEventId) {
        lastEventIdRef.current = event.lastEventId;
      }

      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
      } catch (err) {
        console.error('Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      if (retryCount < maxRetries) {
        setConnectionState('reconnecting');
        const delay = calculateRetryDelay(retryCount);

        console.log(`Reconnecting in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          connect();
        }, delay);
      } else {
        setConnectionState('failed');
        console.error('Max reconnection attempts reached');
      }
    };

    return eventSource;
  }, [url, retryCount, maxRetries, calculateRetryDelay]);

  const manualReconnect = useCallback(() => {
    setRetryCount(0);
    setConnectionState('connecting');
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    data,
    isConnected,
    connectionState,
    retryCount,
    reconnect: manualReconnect,
  };
}

export default useSSEWithReconnect;
```

### Using Last-Event-ID for Message Recovery

The `Last-Event-ID` header allows the server to resume from where the client left off:

```tsx
function LiveFeed() {
  const { data, connectionState, retryCount, reconnect } = useSSEWithReconnect<Message>({
    url: '/api/feed/stream',
    maxRetries: 10,
    initialRetryDelay: 1000,
    maxRetryDelay: 60000,
  });

  return (
    <div>
      <div className="connection-info">
        <span>State: {connectionState}</span>
        {connectionState === 'reconnecting' && (
          <span>Retry attempt: {retryCount}</span>
        )}
        {connectionState === 'failed' && (
          <button onClick={reconnect}>Manual Reconnect</button>
        )}
      </div>

      {data && <MessageDisplay message={data} />}
    </div>
  );
}
```

---

## 7. Managing Connection State

For complex applications, you may need to manage SSE connections at a higher level:

### SSE Context Provider

```tsx
// context/SSEContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface SSEContextValue {
  isConnected: boolean;
  subscribe: (eventType: string, handler: (data: any) => void) => () => void;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const SSEContext = createContext<SSEContextValue | null>(null);

interface SSEProviderProps {
  url: string;
  children: React.ReactNode;
}

export function SSEProvider({ url, children }: SSEProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<SSEContextValue['connectionState']>('connecting');

  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  useEffect(() => {
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      if (eventSource.readyState === EventSource.CLOSED) {
        setConnectionState('error');
      } else {
        setConnectionState('disconnected');
      }
    };

    // Generic message handler that routes to subscribers
    eventSource.onmessage = (event) => {
      const handlers = handlersRef.current.get('message');
      if (handlers) {
        const data = JSON.parse(event.data);
        handlers.forEach((handler) => handler(data));
      }
    };

    return () => {
      eventSource.close();
    };
  }, [url]);

  const subscribe = useCallback((eventType: string, handler: (data: any) => void) => {
    // Get or create handler set for this event type
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());

      // Add event listener for custom event types
      if (eventType !== 'message' && eventSourceRef.current) {
        const eventHandler = (event: MessageEvent) => {
          const handlers = handlersRef.current.get(eventType);
          if (handlers) {
            const data = JSON.parse(event.data);
            handlers.forEach((h) => h(data));
          }
        };
        eventSourceRef.current.addEventListener(eventType, eventHandler as EventListener);
      }
    }

    // Add this handler
    handlersRef.current.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }, []);

  const value: SSEContextValue = {
    isConnected,
    subscribe,
    connectionState,
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSEContext() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within an SSEProvider');
  }
  return context;
}

// Hook for subscribing to specific events
export function useSSEEvent<T>(eventType: string, handler: (data: T) => void) {
  const { subscribe } = useSSEContext();

  useEffect(() => {
    return subscribe(eventType, handler);
  }, [eventType, handler, subscribe]);
}
```

### Using the SSE Context

```tsx
// App.tsx
import { SSEProvider } from './context/SSEContext';
import Dashboard from './Dashboard';

function App() {
  return (
    <SSEProvider url="/api/events">
      <Dashboard />
    </SSEProvider>
  );
}

// Dashboard.tsx
import { useSSEContext, useSSEEvent } from './context/SSEContext';

function Dashboard() {
  const { isConnected, connectionState } = useSSEContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useSSEEvent<Notification>('notification', (notification) => {
    setNotifications((prev) => [...prev, notification]);
  });

  useSSEEvent<Metrics>('metrics', (newMetrics) => {
    setMetrics(newMetrics);
  });

  return (
    <div>
      <header>
        Connection: {connectionState}
      </header>
      <NotificationList notifications={notifications} />
      <MetricsDisplay metrics={metrics} />
    </div>
  );
}
```

---

## 8. Error Handling and Recovery

Robust error handling is crucial for production applications:

```tsx
// hooks/useRobustSSE.ts
import { useState, useEffect, useCallback, useRef } from 'react';

type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'closed';

interface SSEError {
  type: 'network' | 'parse' | 'server' | 'unknown';
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

interface UseRobustSSEOptions {
  url: string;
  onData?: (data: any) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (error: SSEError) => void;
}

function useRobustSSE<T>(options: UseRobustSSEOptions) {
  const { url, onData, onStatusChange, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errors, setErrors] = useState<SSEError[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const addError = useCallback((error: SSEError) => {
    setErrors((prev) => [...prev.slice(-9), error]); // Keep last 10 errors
    onError?.(error);
  }, [onError]);

  const connect = useCallback(() => {
    updateStatus('connecting');

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        reconnectAttempts.current = 0;
        updateStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data) as T;
          setData(parsedData);
          onData?.(parsedData);
        } catch (err) {
          addError({
            type: 'parse',
            message: `Failed to parse message: ${err}`,
            timestamp: new Date(),
            recoverable: true,
          });
        }
      };

      eventSource.onerror = (event) => {
        const isClosing = eventSource.readyState === EventSource.CLOSED;

        if (isClosing) {
          // Connection was closed
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            updateStatus('reconnecting');

            // Let EventSource handle automatic reconnection
            addError({
              type: 'network',
              message: `Connection lost, attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`,
              timestamp: new Date(),
              recoverable: true,
            });
          } else {
            updateStatus('error');
            addError({
              type: 'network',
              message: 'Max reconnection attempts reached',
              timestamp: new Date(),
              recoverable: false,
            });
          }
        } else {
          // Temporary error, EventSource will reconnect
          addError({
            type: 'network',
            message: 'Temporary connection error, reconnecting...',
            timestamp: new Date(),
            recoverable: true,
          });
        }
      };
    } catch (err) {
      updateStatus('error');
      addError({
        type: 'unknown',
        message: `Failed to create EventSource: ${err}`,
        timestamp: new Date(),
        recoverable: false,
      });
    }
  }, [url, updateStatus, addError, onData]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    updateStatus('closed');
  }, [updateStatus]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setErrors([]);
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return {
    data,
    status,
    errors,
    reconnect,
    disconnect,
    isConnected: status === 'connected',
  };
}

export default useRobustSSE;
```

---

## 9. Working with Custom Events

SSE supports multiple event types. Here is how to handle them effectively:

### Server Sending Multiple Event Types

```javascript
// Server (Node.js/Express)
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send different event types
  const sendNotification = (data) => {
    res.write(`event: notification\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sendMetrics = (data) => {
    res.write(`event: metrics\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sendAlert = (data) => {
    res.write(`event: alert\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Simulate different events
  const interval = setInterval(() => {
    sendMetrics({ cpu: Math.random() * 100, memory: Math.random() * 100 });
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});
```

### React Component Handling Multiple Events

```tsx
import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

interface Metrics {
  cpu: number;
  memory: number;
  timestamp: number;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

function MultiEventDashboard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    // Handle notification events
    eventSource.addEventListener('notification', ((event: MessageEvent) => {
      const notification: Notification = JSON.parse(event.data);
      setNotifications((prev) => [...prev.slice(-49), notification]); // Keep last 50
    }) as EventListener);

    // Handle metrics events
    eventSource.addEventListener('metrics', ((event: MessageEvent) => {
      const newMetrics: Metrics = JSON.parse(event.data);
      setMetrics(newMetrics);
    }) as EventListener);

    // Handle alert events
    eventSource.addEventListener('alert', ((event: MessageEvent) => {
      const alert: Alert = JSON.parse(event.data);
      setAlerts((prev) => [...prev, alert]);
    }) as EventListener);

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="dashboard">
      <header>
        <span className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? 'Live' : 'Reconnecting...'}
        </span>
      </header>

      <section className="metrics-panel">
        <h2>System Metrics</h2>
        {metrics && (
          <div>
            <div>CPU: {metrics.cpu.toFixed(1)}%</div>
            <div>Memory: {metrics.memory.toFixed(1)}%</div>
          </div>
        )}
      </section>

      <section className="alerts-panel">
        <h2>Alerts ({alerts.length})</h2>
        <ul>
          {alerts.map((alert) => (
            <li key={alert.id} className={`alert-${alert.severity}`}>
              {alert.message}
            </li>
          ))}
        </ul>
      </section>

      <section className="notifications-panel">
        <h2>Notifications</h2>
        <ul>
          {notifications.map((n) => (
            <li key={n.id} className={`notification-${n.type}`}>
              {n.message}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

---

## 10. Authentication with SSE

EventSource does not support custom headers, which makes authentication tricky. Here are several approaches:

### Approach 1: Query Parameter Token

```tsx
function AuthenticatedSSE() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from your auth system
    const authToken = localStorage.getItem('authToken');
    setToken(authToken);
  }, []);

  useEffect(() => {
    if (!token) return;

    // Pass token as query parameter
    const eventSource = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

    eventSource.onmessage = (event) => {
      console.log('Received:', event.data);
    };

    eventSource.onerror = (event) => {
      // Check if error is due to auth failure (401)
      // Note: EventSource does not expose HTTP status codes directly
      console.error('Connection error');
    };

    return () => {
      eventSource.close();
    };
  }, [token]);

  return <div>Authenticated SSE Stream</div>;
}
```

### Approach 2: Cookie-Based Authentication

```tsx
// Use withCredentials for cookie-based auth
function CookieAuthSSE() {
  useEffect(() => {
    const eventSource = new EventSource('/api/events', {
      withCredentials: true, // Send cookies with the request
    });

    eventSource.onmessage = (event) => {
      console.log('Received:', event.data);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return <div>Cookie Auth SSE Stream</div>;
}
```

### Approach 3: Fetch-Based SSE with Headers

For full header control, use the Fetch API with a readable stream:

```tsx
// hooks/useFetchSSE.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchSSEOptions {
  url: string;
  headers?: Record<string, string>;
  onMessage?: (data: any) => void;
}

function useFetchSSE<T>(options: UseFetchSSEOptions) {
  const { url, headers = {}, onMessage } = options;

  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const connect = useCallback(async () => {
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/event-stream',
          ...headers,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      setIsConnected(true);
      setError(null);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete events (separated by double newlines)
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer

        for (const event of events) {
          if (!event.trim()) continue;

          // Parse SSE format
          const lines = event.split('\n');
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              eventData += line.slice(6);
            }
          }

          if (eventData) {
            try {
              const parsed = JSON.parse(eventData) as T;
              setData(parsed);
              onMessage?.(parsed);
            } catch (err) {
              console.error('Parse error:', err);
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err as Error);
        setIsConnected(false);
      }
    }
  }, [url, headers, onMessage]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    data,
    isConnected,
    error,
    reconnect: connect,
    disconnect,
  };
}

// Usage with authorization header
function SecureSSEComponent() {
  const token = useAuthToken(); // Your auth hook

  const { data, isConnected } = useFetchSSE({
    url: '/api/secure-events',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return (
    <div>
      <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
      <div>Data: {JSON.stringify(data)}</div>
    </div>
  );
}
```

---

## 11. Server Implementation (Node.js)

Here is a complete Node.js/Express SSE server implementation:

```javascript
// server.js
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Store active connections
const clients = new Map();

// SSE endpoint
app.get('/api/events', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Generate client ID
  const clientId = Date.now().toString();

  // Store the response object
  clients.set(clientId, res);
  console.log(`Client ${clientId} connected. Total: ${clients.size}`);

  // Send initial connection event
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ clientId })}\n\n`);

  // Send periodic heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`); // Comment line (ignored by EventSource)
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected. Total: ${clients.size}`);
  });
});

// Broadcast to all connected clients
function broadcast(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((res, clientId) => {
    try {
      res.write(message);
    } catch (err) {
      console.error(`Failed to send to ${clientId}:`, err);
      clients.delete(clientId);
    }
  });
}

// Send to specific client
function sendToClient(clientId, eventType, data) {
  const client = clients.get(clientId);
  if (client) {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    client.write(message);
  }
}

// Example: Send metrics every second
setInterval(() => {
  broadcast('metrics', {
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    timestamp: Date.now(),
  });
}, 1000);

// Example: API endpoint to trigger notifications
app.post('/api/notify', express.json(), (req, res) => {
  const { message, type } = req.body;

  broadcast('notification', {
    id: Date.now().toString(),
    message,
    type: type || 'info',
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, clientCount: clients.size });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SSE server running on port ${PORT}`);
});
```

### With Message ID Support

```javascript
// server-with-ids.js
let messageId = 0;

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Check for Last-Event-ID header (sent on reconnection)
  const lastEventId = req.headers['last-event-id'];

  if (lastEventId) {
    // Client is reconnecting - send missed messages
    const missedMessages = getMessagesSince(parseInt(lastEventId, 10));
    missedMessages.forEach((msg) => {
      res.write(`id: ${msg.id}\n`);
      res.write(`event: ${msg.event}\n`);
      res.write(`data: ${JSON.stringify(msg.data)}\n\n`);
    });
  }

  const clientId = Date.now().toString();
  clients.set(clientId, res);

  req.on('close', () => {
    clients.delete(clientId);
  });
});

function broadcastWithId(eventType, data) {
  messageId++;
  const message = `id: ${messageId}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

  // Store message for reconnecting clients
  storeMessage({ id: messageId, event: eventType, data });

  clients.forEach((res) => {
    res.write(message);
  });
}
```

---

## 12. Cancellation and Cleanup

Proper cleanup prevents memory leaks and zombie connections:

```tsx
import { useEffect, useRef, useCallback } from 'react';

function useSSEWithCleanup(url: string) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      // Check if component is still mounted before updating state
      if (mountedRef.current) {
        // Process event
      }
    };

    eventSource.onerror = () => {
      if (mountedRef.current) {
        // Handle error
      }
    };

    // Cleanup on unmount or URL change
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [url, cleanup]);

  // Expose cleanup for manual disconnection
  return { cleanup };
}
```

### Handling Page Visibility

Disconnect when the page is not visible to save resources:

```tsx
function useSSEWithVisibility(url: string) {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Connect when visible
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        // Handle message
      };

      return () => {
        eventSource.close();
      };
    } else {
      // Disconnect when hidden
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  }, [url, isVisible]);

  return { isVisible };
}
```

---

## 13. Testing SSE Components

### Mocking EventSource in Tests

```tsx
// __mocks__/EventSource.ts
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private eventListeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);

    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.(new Event('open'));
    }, 0);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.eventListeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = 2; // CLOSED
    const index = MockEventSource.instances.indexOf(this);
    if (index > -1) {
      MockEventSource.instances.splice(index, 1);
    }
  }

  // Test helper: simulate receiving a message
  simulateMessage(data: any, event = 'message') {
    const messageEvent = new MessageEvent(event, {
      data: typeof data === 'string' ? data : JSON.stringify(data),
    });

    if (event === 'message') {
      this.onmessage?.(messageEvent);
    }

    this.eventListeners.get(event)?.forEach((listener) => {
      listener(messageEvent);
    });
  }

  // Test helper: simulate error
  simulateError() {
    this.readyState = 2;
    this.onerror?.(new Event('error'));
  }

  // Test helper: get the most recent instance
  static getLastInstance(): MockEventSource | undefined {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }

  // Test helper: clear all instances
  static clear() {
    MockEventSource.instances = [];
  }
}

export default MockEventSource;
```

### Component Test Example

```tsx
// LiveMessages.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import MockEventSource from '../__mocks__/EventSource';
import LiveMessages from './LiveMessages';

// Replace global EventSource with mock
beforeAll(() => {
  (global as any).EventSource = MockEventSource;
});

afterEach(() => {
  MockEventSource.clear();
});

describe('LiveMessages', () => {
  it('should display connected status when connection opens', async () => {
    render(<LiveMessages />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('should display messages received from SSE', async () => {
    render(<LiveMessages />);

    // Wait for connection
    await waitFor(() => {
      expect(MockEventSource.getLastInstance()).toBeDefined();
    });

    const eventSource = MockEventSource.getLastInstance()!;

    // Simulate receiving a message
    eventSource.simulateMessage({
      id: '1',
      content: 'Test message',
      timestamp: '2024-01-01T00:00:00Z',
    });

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should handle disconnection', async () => {
    render(<LiveMessages />);

    await waitFor(() => {
      expect(MockEventSource.getLastInstance()).toBeDefined();
    });

    const eventSource = MockEventSource.getLastInstance()!;

    // Simulate error/disconnection
    eventSource.simulateError();

    await waitFor(() => {
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });
  });
});
```

---

## 14. Production Best Practices

### 1. Connection Limits

Browsers limit the number of concurrent connections per domain. Keep SSE connections minimal:

```tsx
// Use a single connection with event routing instead of multiple connections
const eventSource = new EventSource('/api/events'); // Single endpoint

// Route different event types
eventSource.addEventListener('notifications', handleNotifications);
eventSource.addEventListener('metrics', handleMetrics);
eventSource.addEventListener('alerts', handleAlerts);
```

### 2. Buffering and Backpressure

Handle high-frequency updates without overwhelming the UI:

```tsx
function useThrottledSSE<T>(url: string, throttleMs = 100) {
  const [data, setData] = useState<T | null>(null);
  const latestDataRef = useRef<T | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      latestDataRef.current = parsed;

      // Throttle state updates
      if (!throttleTimeoutRef.current) {
        throttleTimeoutRef.current = setTimeout(() => {
          setData(latestDataRef.current);
          throttleTimeoutRef.current = null;
        }, throttleMs);
      }
    };

    return () => {
      eventSource.close();
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [url, throttleMs]);

  return data;
}
```

### 3. Memory Management for Long-Running Connections

```tsx
function useBoundedSSE<T>(url: string, maxItems = 100) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const newItem = JSON.parse(event.data);

      // Keep only the last N items to prevent memory growth
      setItems((prev) => {
        const updated = [...prev, newItem];
        return updated.slice(-maxItems);
      });
    };

    return () => {
      eventSource.close();
    };
  }, [url, maxItems]);

  return items;
}
```

### 4. Monitoring and Observability

```tsx
function useSSEWithMetrics(url: string) {
  const metricsRef = useRef({
    messagesReceived: 0,
    reconnections: 0,
    errors: 0,
    lastMessageAt: null as Date | null,
  });

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      metricsRef.current.reconnections++;
    };

    eventSource.onmessage = () => {
      metricsRef.current.messagesReceived++;
      metricsRef.current.lastMessageAt = new Date();
    };

    eventSource.onerror = () => {
      metricsRef.current.errors++;
    };

    // Report metrics periodically
    const metricsInterval = setInterval(() => {
      console.log('SSE Metrics:', { ...metricsRef.current });
      // Send to your monitoring system
    }, 60000);

    return () => {
      eventSource.close();
      clearInterval(metricsInterval);
    };
  }, [url]);
}
```

---

## 15. Common Pitfalls and Solutions

### Pitfall 1: Not Closing Connections on Unmount

```tsx
// Wrong: Connection leaks
useEffect(() => {
  const eventSource = new EventSource('/api/events');
  eventSource.onmessage = handleMessage;
  // Missing cleanup!
}, []);

// Correct: Always close on cleanup
useEffect(() => {
  const eventSource = new EventSource('/api/events');
  eventSource.onmessage = handleMessage;

  return () => {
    eventSource.close();
  };
}, []);
```

### Pitfall 2: Creating Multiple Connections

```tsx
// Wrong: New connection on every render
function Component() {
  const eventSource = new EventSource('/api/events'); // Runs every render!
  // ...
}

// Correct: Use useEffect
function Component() {
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    return () => eventSource.close();
  }, []); // Empty deps = runs once
}
```

### Pitfall 3: State Updates After Unmount

```tsx
// Wrong: May update state after unmount
useEffect(() => {
  const eventSource = new EventSource('/api/events');
  eventSource.onmessage = (event) => {
    setData(JSON.parse(event.data)); // May cause warning
  };
  return () => eventSource.close();
}, []);

// Correct: Check if mounted
useEffect(() => {
  let mounted = true;
  const eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    if (mounted) {
      setData(JSON.parse(event.data));
    }
  };

  return () => {
    mounted = false;
    eventSource.close();
  };
}, []);
```

### Pitfall 4: Infinite Reconnection Loop

```tsx
// Wrong: Reconnects infinitely even for permanent errors
eventSource.onerror = () => {
  setTimeout(() => connect(), 1000); // Never stops
};

// Correct: Implement max retries with backoff
const MAX_RETRIES = 5;
let retryCount = 0;

eventSource.onerror = () => {
  if (retryCount < MAX_RETRIES) {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
    setTimeout(() => {
      retryCount++;
      connect();
    }, delay);
  }
};
```

### Pitfall 5: Missing CORS Configuration

```javascript
// Server: Must set correct headers
res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

---

## 16. Summary

| Topic | Key Takeaway |
|-------|-------------|
| **EventSource API** | Native browser API for receiving server-sent events with automatic reconnection |
| **Custom Hook** | Encapsulate SSE logic in a reusable hook with proper cleanup |
| **Reconnection** | Implement exponential backoff with max retries for robust recovery |
| **State Management** | Use Context for app-wide SSE state, local state for component-specific |
| **Error Handling** | Categorize errors (network, parse, server) and handle each appropriately |
| **Custom Events** | Use `addEventListener` for multiple event types from single connection |
| **Authentication** | Use cookies with `withCredentials` or query params; Fetch API for headers |
| **Server Setup** | Set correct headers, implement heartbeat, track clients for broadcasting |
| **Cleanup** | Always close connections on unmount, check mounted state before setState |
| **Testing** | Mock EventSource class with methods to simulate messages and errors |
| **Production** | Throttle updates, bound memory, monitor metrics, handle visibility |

Server-Sent Events provide a simple yet powerful way to implement real-time features in React applications. The native `EventSource` API handles the complexity of connection management and reconnection, while React hooks make it easy to integrate SSE into your component lifecycle.

For unidirectional streaming use cases like live dashboards, notification feeds, log streaming, and status updates, SSE offers an excellent balance of simplicity and reliability. Combined with proper error handling and reconnection logic, you can build production-ready real-time features without the complexity of WebSocket management.

---

*Building real-time monitoring dashboards? [OneUptime](https://oneuptime.com) provides comprehensive observability with logs, metrics, and traces. Stream your application data in real-time and gain instant visibility into system health.*

---

### Related Reading

- [How to Implement WebSocket Connections in Node.js with Socket.io](/blog/post/2026-01-06-nodejs-websocket-socketio-scaling/)
- [Node.js Health Checks for Kubernetes](/blog/post/2026-01-06-nodejs-health-checks-kubernetes/)
- [Express OpenTelemetry Instrumentation](/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/)
