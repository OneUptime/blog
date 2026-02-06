# How to Build a Custom OpAMP Server in Go Using the opamp-go Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Go, Custom Server

Description: Build a custom OpAMP server from scratch in Go using the official opamp-go library to manage your OpenTelemetry Collector fleet your way.

The reference OpAMP server examples are great for learning, but production environments often need custom logic: integration with your CMDB, custom authentication, specific rollout workflows, or a custom API for your internal tools. Building your own OpAMP server in Go using the `opamp-go` library gives you full control.

## Project Setup

Create a new Go project and add the opamp-go dependency:

```bash
mkdir opamp-server && cd opamp-server
go mod init github.com/yourorg/opamp-server
go get github.com/open-telemetry/opamp-go@latest
```

## The Core Server Structure

Here is a complete, working OpAMP server with agent tracking and a REST API:

```go
package main

import (
    "context"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/open-telemetry/opamp-go/protobufs"
    "github.com/open-telemetry/opamp-go/server"
    "github.com/open-telemetry/opamp-go/server/types"
)

// Agent represents a connected collector agent
type Agent struct {
    ID              string
    Connection      types.Connection
    Status          *protobufs.AgentDescription
    Health          *protobufs.AgentHealth
    EffectiveConfig string
    LastSeen        time.Time
}

// AgentStore manages the connected agent registry
type AgentStore struct {
    mu     sync.RWMutex
    agents map[string]*Agent
}

func NewAgentStore() *AgentStore {
    return &AgentStore{
        agents: make(map[string]*Agent),
    }
}

func (s *AgentStore) AddOrUpdate(agent *Agent) {
    s.mu.Lock()
    defer s.mu.Unlock()
    agent.LastSeen = time.Now()
    s.agents[agent.ID] = agent
}

func (s *AgentStore) Remove(id string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    delete(s.agents, id)
}

func (s *AgentStore) GetAll() []*Agent {
    s.mu.RLock()
    defer s.mu.RUnlock()
    result := make([]*Agent, 0, len(s.agents))
    for _, a := range s.agents {
        result = append(result, a)
    }
    return result
}

func (s *AgentStore) Get(id string) *Agent {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.agents[id]
}
```

## Implementing the Server Callbacks

The callbacks are where you define how your server responds to agent events:

```go
type OpAMPServer struct {
    server     server.OpAMPServer
    agentStore *AgentStore
}

func NewOpAMPServer() *OpAMPServer {
    return &OpAMPServer{
        server:     server.New(&stdLogger{}),
        agentStore: NewAgentStore(),
    }
}

func (s *OpAMPServer) Start() error {
    settings := server.StartSettings{
        ListenEndpoint: "0.0.0.0:4320",
        Settings: server.Settings{
            Callbacks: server.CallbacksStruct{
                OnConnectingFunc: s.onConnecting,
            },
        },
    }

    return s.server.Start(settings)
}

func (s *OpAMPServer) onConnecting(r *http.Request) types.ConnectionResponse {
    log.Printf("New agent connecting from %s", r.RemoteAddr)

    return types.ConnectionResponse{
        Accept: true,
        ConnectionCallbacks: server.ConnectionCallbacksStruct{
            OnMessageFunc:         s.onMessage,
            OnConnectionCloseFunc: s.onDisconnect,
        },
    }
}

func (s *OpAMPServer) onMessage(
    conn types.Connection,
    msg *protobufs.AgentToServer,
) *protobufs.ServerToAgent {

    agentID := hex.EncodeToString(msg.InstanceUid)

    agent := &Agent{
        ID:         agentID,
        Connection: conn,
    }

    // Process agent description (hostname, OS, version, etc.)
    if msg.AgentDescription != nil {
        agent.Status = msg.AgentDescription
        log.Printf("Agent %s identified: %v", agentID,
            extractHostname(msg.AgentDescription))
    }

    // Process health report
    if msg.Health != nil {
        agent.Health = msg.Health
        if !msg.Health.Healthy {
            log.Printf("WARNING: Agent %s reports unhealthy: %s",
                agentID, msg.Health.LastError)
        }
    }

    // Process effective config report
    if msg.EffectiveConfig != nil {
        configMap := msg.EffectiveConfig.ConfigMap
        if configMap != nil {
            if mainConfig, ok := configMap.ConfigMap[""]; ok {
                agent.EffectiveConfig = string(mainConfig.Body)
            }
        }
    }

    s.agentStore.AddOrUpdate(agent)

    return &protobufs.ServerToAgent{}
}

func (s *OpAMPServer) onDisconnect(conn types.Connection) {
    log.Printf("Agent disconnected")
}

func extractHostname(desc *protobufs.AgentDescription) string {
    for _, attr := range desc.IdentifyingAttributes {
        if attr.Key == "host.name" {
            return attr.Value.GetStringValue()
        }
    }
    return "unknown"
}
```

## Adding a REST API

Add HTTP endpoints for managing the fleet:

```go
func (s *OpAMPServer) setupHTTPAPI() {
    // List all agents
    http.HandleFunc("/api/agents", func(w http.ResponseWriter, r *http.Request) {
        agents := s.agentStore.GetAll()

        type AgentResponse struct {
            ID       string `json:"id"`
            Hostname string `json:"hostname"`
            Healthy  bool   `json:"healthy"`
            LastSeen string `json:"last_seen"`
        }

        var response []AgentResponse
        for _, a := range agents {
            resp := AgentResponse{
                ID:       a.ID,
                LastSeen: a.LastSeen.Format(time.RFC3339),
            }
            if a.Status != nil {
                resp.Hostname = extractHostname(a.Status)
            }
            if a.Health != nil {
                resp.Healthy = a.Health.Healthy
            }
            response = append(response, resp)
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    })

    // Push config to a specific agent
    http.HandleFunc("/api/agents/config", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var req struct {
            AgentID string `json:"agent_id"`
            Config  string `json:"config"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Bad request", http.StatusBadRequest)
            return
        }

        agent := s.agentStore.Get(req.AgentID)
        if agent == nil {
            http.Error(w, "Agent not found", http.StatusNotFound)
            return
        }

        msg := &protobufs.ServerToAgent{
            RemoteConfig: &protobufs.AgentRemoteConfig{
                Config: &protobufs.AgentConfigMap{
                    ConfigMap: map[string]*protobufs.AgentConfigFile{
                        "": {
                            Body:        []byte(req.Config),
                            ContentType: "text/yaml",
                        },
                    },
                },
            },
        }

        if err := agent.Connection.Send(context.Background(), msg); err != nil {
            http.Error(w, fmt.Sprintf("Send failed: %v", err), http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "config pushed"})
    })
}
```

## Putting It All Together

```go
// stdLogger implements the opamp-go Logger interface
type stdLogger struct{}

func (l *stdLogger) Debugf(_ context.Context, f string, a ...interface{}) {
    log.Printf("[DEBUG] "+f, a...)
}
func (l *stdLogger) Errorf(_ context.Context, f string, a ...interface{}) {
    log.Printf("[ERROR] "+f, a...)
}

func main() {
    srv := NewOpAMPServer()
    srv.setupHTTPAPI()

    // Start the REST API on a separate port
    go func() {
        log.Println("REST API running on :8080")
        log.Fatal(http.ListenAndServe(":8080", nil))
    }()

    // Start the OpAMP server
    if err := srv.Start(); err != nil {
        log.Fatalf("Failed to start OpAMP server: %v", err)
    }

    log.Println("OpAMP server running on :4320")
    select {}
}
```

Build and run:

```bash
go build -o opamp-server .
./opamp-server
```

Test the API:

```bash
# List connected agents
curl http://localhost:8080/api/agents

# Push a config to a specific agent
curl -X POST http://localhost:8080/api/agents/config \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "abc123", "config": "receivers:\n  otlp:..."}'
```

This gives you a foundation to build on. Add your own authentication middleware, integrate with your configuration database, implement custom rollout strategies, or connect it to your internal deployment tooling. The opamp-go library handles the protocol details while you focus on the business logic.
