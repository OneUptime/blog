# How to Configure gRPC Keepalive for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Keepalive, IPv4, Python, Go, Networking

Description: Learn how to configure gRPC keepalive parameters to detect dead IPv4 connections, prevent firewall idle timeouts, and ensure long-lived RPC streams remain healthy.

## Why Keepalive Matters

Firewalls and NAT devices silently drop idle TCP connections after a timeout (typically 60–300 seconds). gRPC uses HTTP/2 PING frames as a keepalive mechanism to probe the connection without sending application data.

```text
Client                        Server
  │                               │
  │──── HTTP/2 PING ─────────────►│
  │◄─── PING ACK ─────────────────│
  │        (connection alive)     │
  │                               │
  │  (no data for ping_interval)  │
  │──── HTTP/2 PING ─────────────►│
  │  (no reply within timeout) X  │
  │  → close & reconnect          │
```

## Python: Client Keepalive

```python
import grpc

channel = grpc.insecure_channel(
    "192.168.1.10:50051",
    options=[
        # Send a keepalive ping every 60 seconds of inactivity
        ("grpc.keepalive_time_ms", 60_000),
        # Wait 10 seconds for ping ack before declaring connection dead
        ("grpc.keepalive_timeout_ms", 10_000),
        # Send keepalive even when there are no active RPCs
        ("grpc.keepalive_permit_without_calls", True),
        # Do not limit keepalive pings when the transport is otherwise quiet
        ("grpc.http2.max_pings_without_data", 0),
    ],
)
```

## Python: Server Keepalive

```python
import grpc
from concurrent import futures

server = grpc.server(
    futures.ThreadPoolExecutor(max_workers=10),
    options=[
        # Send a keepalive ping every 60 seconds of inactivity
        ("grpc.keepalive_time_ms", 60_000),
        # Wait 10 seconds for ping ack before declaring connection dead
        ("grpc.keepalive_timeout_ms", 10_000),
        # Allow keepalive pings even when there are no active RPCs
        ("grpc.keepalive_permit_without_calls", True),
        # Do not limit keepalive pings when the transport is otherwise quiet
        ("grpc.http2.max_pings_without_data", 0),
        # Allow clients to send keepalive pings no more than once per minute when idle
        ("grpc.http2.min_recv_ping_interval_without_data_ms", 60_000),
        # Close connections after 5 minutes with no outstanding RPCs
        ("grpc.max_connection_idle_ms", 300_000),  # 5 min
        # Maximum connection age
        ("grpc.max_connection_age_ms", 3_600_000),  # 1 hour
        # Grace period to finish RPCs before closing
        ("grpc.max_connection_age_grace_ms", 30_000),
    ],
)
```

## Go: Client Keepalive

```go
package main

import (
    "time"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/keepalive"
)

func newClientConn() (*grpc.ClientConn, error) {
    return grpc.NewClient(
        "192.168.1.10:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithKeepaliveParams(keepalive.ClientParameters{
            Time:                60 * time.Second, // ping interval
            Timeout:             10 * time.Second, // ping ack wait
            PermitWithoutStream: true,             // ping even without active RPC
        }),
    )
}
```

## Go: Server Keepalive

```go
package main

import (
    "time"
    "google.golang.org/grpc"
    "google.golang.org/grpc/keepalive"
)

func newServer() *grpc.Server {
    return grpc.NewServer(
        grpc.KeepaliveParams(keepalive.ServerParameters{
            MaxConnectionIdle:     5 * time.Minute,
            MaxConnectionAge:      1 * time.Hour,
            MaxConnectionAgeGrace: 30 * time.Second,
            Time:                  60 * time.Second,
            Timeout:               10 * time.Second,
        }),
        grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
            MinTime:             60 * time.Second, // min ping interval from clients
            PermitWithoutStream: true,
        }),
    )
}
```

## Keepalive Parameter Reference

| Parameter | Recommended Value | Notes |
|-----------|------------------|-------|
| `keepalive_time_ms` | 60 000 ms | Less than the known idle timeout; avoid going much below 1 minute unless coordinated |
| `keepalive_timeout_ms` | 10 000 ms | How long to wait for PING ACK |
| `PermitWithoutStream` | `true` | Keep connection alive with no active RPCs when both client and server allow it |
| `MaxConnectionIdle` | 5 min | Close idle connections gracefully |
| `MaxConnectionAge` | 1 hour | Force reconnect to rebalance |

## Conclusion

Set `keepalive_time_ms` (client) and the server `Time` parameter to a value shorter than your network's firewall idle timeout. Around 60 seconds is a conservative starting point when the network idle timeout allows it, and clients should avoid going much below 1 minute unless the service owner explicitly permits it. Enable `grpc.keepalive_permit_without_calls` / `PermitWithoutStream` on both sides if the connection must stay alive even when there are no active RPCs. Configure `MaxConnectionAge` on the server to periodically force clients to reconnect, which rebalances connections after pod restarts. Mismatched keepalive policies can trigger `GOAWAY` with `too_many_pings` debug data or `ENHANCE_YOUR_CALM` errors, so coordinate client and server settings.
