# How to Set Up an OpAMP Server for Remote Management of Your OpenTelemetry Collector Fleet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Collector Fleet, Remote Management

Description: Learn how to deploy an OpAMP server that lets you remotely manage and configure your entire OpenTelemetry Collector fleet from a single control plane.

Managing a handful of OpenTelemetry Collectors is straightforward. You SSH into machines, edit config files, and restart services. But when your fleet grows to dozens or hundreds of collectors spread across multiple environments, that approach falls apart fast. This is where OpAMP (Open Agent Management Protocol) comes in.

OpAMP is an open protocol designed specifically for remote management of large fleets of telemetry agents. It gives you a centralized server that can push configuration, monitor health, and coordinate updates across every collector in your infrastructure.

## What OpAMP Actually Does

At its core, OpAMP defines a client-server communication model. Your collectors (or more precisely, a supervisor process wrapping each collector) act as OpAMP clients. They connect to a central OpAMP server and maintain a persistent connection. Through this connection, the server can:

- Push new configuration to any collector
- Monitor the health and status of every agent
- Trigger version upgrades or downgrades
- Receive telemetry about the agents themselves (CPU usage, memory, throughput)

The protocol supports both HTTP and WebSocket transports, with WebSocket being preferred for real-time bidirectional communication.

## Setting Up the OpAMP Server

Let's walk through setting up a basic OpAMP server using the reference implementation from the `open-telemetry/opamp-go` repository.

First, clone the repository and navigate to the server example:

```bash
# Clone the opamp-go repository
git clone https://github.com/open-telemetry/opamp-go.git
cd opamp-go

# Navigate to the example server
cd internal/examples/server
```

The example server provides a working OpAMP implementation. Here's the key server setup code:

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/open-telemetry/opamp-go/protobufs"
    "github.com/open-telemetry/opamp-go/server"
    "github.com/open-telemetry/opamp-go/server/types"
)

func main() {
    // Create the OpAMP server with callback handlers
    srv := server.New(&logger{})

    // Configure the server settings
    settings := server.StartSettings{
        // Listen on port 4320 for OpAMP connections
        ListenEndpoint: "0.0.0.0:4320",
        // Define callbacks for agent events
        Settings: server.Settings{
            Callbacks: server.CallbacksStruct{
                OnConnectingFunc: func(request *http.Request) types.ConnectionResponse {
                    log.Printf("Agent connecting from %s", request.RemoteAddr)
                    return types.ConnectionResponse{
                        Accept: true,
                    }
                },
                OnMessageFunc: func(
                    conn types.Connection,
                    message *protobufs.AgentToServer,
                ) *protobufs.ServerToAgent {
                    // Handle incoming agent messages
                    log.Printf("Received message from agent: %s",
                        message.InstanceUid)

                    return &protobufs.ServerToAgent{}
                },
            },
        },
    }

    // Start the server
    if err := srv.Start(settings); err != nil {
        log.Fatalf("Failed to start OpAMP server: %v", err)
    }

    log.Println("OpAMP server running on :4320")

    // Block until interrupted
    select {}
}
```

## Running the Server

Build and run the server:

```bash
go build -o opamp-server .
./opamp-server
```

The server will start listening on port 4320 for incoming agent connections.

## Configuring the OpAMP Supervisor on Collectors

Each collector needs an OpAMP supervisor that wraps it and handles communication with the server. Install the supervisor alongside your collector:

```yaml
# supervisor.yaml
server:
  endpoint: ws://your-opamp-server:4320/v1/opamp

agent:
  executable: /usr/local/bin/otelcol-contrib

capabilities:
  reports_effective_config: true
  reports_health: true
  accepts_remote_config: true
  reports_own_metrics: true
```

Start the supervisor:

```bash
# The supervisor manages the collector process
./opamp-supervisor --config supervisor.yaml
```

Once connected, the supervisor will register with the server and begin reporting the collector's status.

## Verifying the Fleet Connection

After starting supervisors on multiple hosts, you can verify connectivity through the server logs. Each agent registers with a unique instance ID, and you will see connection events like:

```
Agent connecting from 10.0.1.15:43210
Received message from agent: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Agent connecting from 10.0.1.16:43211
Received message from agent: b2c3d4e5-f6a7-8901-bcde-f12345678901
```

## Production Considerations

For a production deployment, you should put the OpAMP server behind a load balancer with TLS termination. The server itself should be deployed with high availability in mind, since it becomes the control plane for your entire observability pipeline.

Store agent state in a persistent database rather than in-memory. The reference implementation uses in-memory storage by default, which means you lose all agent state on restart. For production, implement the `types.ServerCallbacks` interface with a database-backed store.

Enable TLS on the WebSocket endpoint. OpAMP supports client certificate authentication, which is strongly recommended when managing agents across untrusted networks.

```yaml
# Production supervisor config with TLS
server:
  endpoint: wss://opamp.yourcompany.com:4320/v1/opamp
  tls:
    ca_file: /etc/opamp/ca.pem
    cert_file: /etc/opamp/client.pem
    key_file: /etc/opamp/client-key.pem
```

OpAMP turns the problem of managing a distributed fleet into something that feels like managing a single system. Once you have the server running and agents connected, you can start pushing configuration changes, monitoring health, and rolling out updates from one place.
