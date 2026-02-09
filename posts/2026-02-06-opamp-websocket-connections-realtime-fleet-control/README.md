# How to Set Up OpAMP Agent-to-Server WebSocket Connections for Real-Time Fleet Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, WebSocket, Real-Time Communication

Description: Set up persistent WebSocket connections between OpAMP agents and your server for real-time bidirectional control of your collector fleet.

OpAMP supports two transport mechanisms: HTTP polling and WebSocket. While HTTP polling works for simple setups, WebSocket connections give you real-time bidirectional communication. This means the server can push configuration changes, restart commands, and package updates to agents instantly, without waiting for the next poll interval.

## Why WebSocket Over HTTP Polling

With HTTP polling, each agent periodically sends a request to the server asking "do you have anything new for me?" The downsides are clear:

- Latency between when you push a change and when agents receive it (depends on poll interval)
- Wasted bandwidth from empty poll responses
- Higher server load from handling frequent poll requests across a large fleet

WebSocket flips this model. The agent opens a persistent connection, and the server pushes messages the moment they are available. For a fleet of 500 collectors, the difference between a 30-second poll interval and instant WebSocket delivery is significant during an incident.

## Server-Side WebSocket Setup

Configure your OpAMP server to accept WebSocket connections:

```go
package main

import (
    "log"
    "net/http"

    "github.com/open-telemetry/opamp-go/server"
    "github.com/open-telemetry/opamp-go/server/types"
)

func main() {
    opampServer := server.New(&serverLogger{})

    settings := server.StartSettings{
        ListenEndpoint: "0.0.0.0:4320",
        Settings: server.Settings{
            Callbacks: server.CallbacksStruct{
                OnConnectingFunc: func(r *http.Request) types.ConnectionResponse {
                    // Validate the connecting agent
                    agentID := r.Header.Get("X-Agent-ID")
                    log.Printf("WebSocket connection from agent: %s", agentID)

                    return types.ConnectionResponse{
                        Accept:         true,
                        ConnectionCallbacks: server.ConnectionCallbacksStruct{
                            OnMessageFunc: handleAgentMessage,
                            OnConnectionCloseFunc: func(conn types.Connection) {
                                log.Printf("Agent disconnected")
                            },
                        },
                    }
                },
            },
        },
    }

    if err := opampServer.Start(settings); err != nil {
        log.Fatalf("Server start failed: %v", err)
    }

    log.Println("OpAMP WebSocket server running on :4320")
    select {}
}
```

## Adding TLS for Secure WebSocket (WSS)

In production, always use WSS (WebSocket Secure). Configure TLS on your server:

```go
settings := server.StartSettings{
    ListenEndpoint: "0.0.0.0:4320",
    TLSConfig: &tls.Config{
        Certificates: []tls.Certificate{serverCert},
        ClientAuth:   tls.RequireAndVerifyClientCert,
        ClientCAs:    clientCACertPool,
        MinVersion:   tls.VersionTLS12,
    },
    Settings: server.Settings{
        Callbacks: callbacks,
    },
}
```

## Agent-Side WebSocket Configuration

Configure the OpAMP supervisor to connect via WebSocket:

```yaml
# supervisor.yaml
server:
  # Use ws:// for development, wss:// for production
  endpoint: wss://opamp-server.internal:4320/v1/opamp

  tls:
    ca_file: /etc/opamp/ca.pem
    cert_file: /etc/opamp/agent-cert.pem
    key_file: /etc/opamp/agent-key.pem

  # WebSocket-specific settings
  # Headers sent with the initial WebSocket upgrade request
  headers:
    X-Agent-ID: "collector-prod-east-001"
    Authorization: "Bearer ${OPAMP_AUTH_TOKEN}"

agent:
  executable: /usr/local/bin/otelcol-contrib
  storage_dir: /var/lib/opamp-supervisor

capabilities:
  reports_effective_config: true
  reports_health: true
  accepts_remote_config: true
```

## Connection Resilience and Reconnection

Network blips happen. The supervisor handles reconnection automatically, but you should understand the behavior:

```yaml
# supervisor.yaml - connection resilience settings
server:
  endpoint: wss://opamp-server.internal:4320/v1/opamp

  # Reconnection settings
  retry:
    # Initial delay before first reconnection attempt
    initial_interval: 5s
    # Maximum delay between reconnection attempts
    max_interval: 60s
    # Multiplier applied to the interval after each failed attempt
    multiplier: 1.5
```

The backoff pattern works like this: first retry after 5 seconds, then 7.5 seconds, then 11.25 seconds, and so on up to the 60-second maximum. This prevents a thundering herd problem where all agents reconnect simultaneously after a server restart.

## Handling Connection State on the Server

Track connection state to know which agents are currently reachable:

```go
type ConnectionTracker struct {
    mu    sync.RWMutex
    conns map[string]*AgentConnection
}

type AgentConnection struct {
    Conn        types.Connection
    ConnectedAt time.Time
    LastMessage time.Time
    RemoteAddr  string
}

func (ct *ConnectionTracker) OnConnect(agentID string, conn types.Connection, remoteAddr string) {
    ct.mu.Lock()
    defer ct.mu.Unlock()

    ct.conns[agentID] = &AgentConnection{
        Conn:        conn,
        ConnectedAt: time.Now(),
        LastMessage: time.Now(),
        RemoteAddr:  remoteAddr,
    }

    log.Printf("Agent %s connected from %s, total connections: %d",
        agentID, remoteAddr, len(ct.conns))
}

func (ct *ConnectionTracker) OnDisconnect(agentID string) {
    ct.mu.Lock()
    defer ct.mu.Unlock()

    delete(ct.conns, agentID)
    log.Printf("Agent %s disconnected, total connections: %d",
        agentID, len(ct.conns))
}

// GetConnectedAgents returns all currently connected agent IDs
func (ct *ConnectionTracker) GetConnectedAgents() []string {
    ct.mu.RLock()
    defer ct.mu.RUnlock()

    ids := make([]string, 0, len(ct.conns))
    for id := range ct.conns {
        ids = append(ids, id)
    }
    return ids
}
```

## Load Balancing WebSocket Connections

When running multiple OpAMP server instances behind a load balancer, use sticky sessions. WebSocket connections are stateful, so an agent must always connect to the same server instance:

```nginx
# nginx.conf
upstream opamp_servers {
    # Use ip_hash for sticky sessions
    ip_hash;
    server opamp-server-1:4320;
    server opamp-server-2:4320;
    server opamp-server-3:4320;
}

server {
    listen 443 ssl;
    server_name opamp.yourcompany.com;

    ssl_certificate /etc/nginx/ssl/server.pem;
    ssl_certificate_key /etc/nginx/ssl/server-key.pem;

    location /v1/opamp {
        proxy_pass http://opamp_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        # Increase timeouts for long-lived WebSocket connections
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

## Monitoring WebSocket Health

Track WebSocket connection metrics to ensure your fleet communication is healthy:

```go
var (
    activeConnections = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "opamp_websocket_active_connections",
        Help: "Number of active WebSocket connections",
    })
    connectionDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
        Name:    "opamp_websocket_connection_duration_seconds",
        Help:    "Duration of WebSocket connections",
        Buckets: []float64{60, 300, 900, 1800, 3600, 7200},
    })
)
```

WebSocket connections give you the responsiveness needed for production fleet management. When an incident happens and you need to push a configuration change immediately, the difference between "instant" and "up to 30 seconds" matters.
