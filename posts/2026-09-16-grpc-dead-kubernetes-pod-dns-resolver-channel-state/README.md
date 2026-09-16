# gRPC Client Stays on a Dead Kubernetes Pod: Fix DNS Re-Resolution, Resolver Schemes, and Channel State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, Kubernetes, Networking, Troubleshooting

Description: Diagnose stale gRPC Kubernetes endpoints by separating DNS discovery, resolver targets, load-balancing policy, and transport recovery.

---

A gRPC client that keeps trying a removed Pod usually has a discovery problem, a recovery delay, or an application that recreates channels incorrectly. Start by finding which address the client actually owns. A Kubernetes Service name, a headless Service name, and a literal Pod IP behave differently even when they initially reach the same server.

The examples here use gRPC-Go. Resolver options and refresh behavior vary between language implementations, so a setting copied from Python's C-core channel arguments may have no meaning in Go.

## Identify the discovery boundary

For a normal ClusterIP Service, DNS returns the Service's virtual IP. The client opens a connection to that address; Kubernetes selects a backend at the connection level. A persistent HTTP/2 connection can carry many RPCs to that backend.

A headless Service instead publishes endpoint addresses. A client-side load-balancing policy can choose among those addresses. Kubernetes documents these differences in [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/).

Use read-only checks in the affected namespace:

```bash
kubectl -n payments get service ledger -o yaml
kubectl -n payments get endpointslices \
  -l kubernetes.io/service-name=ledger -o wide
kubectl -n payments get pods -l app=ledger -o wide
```

Run a DNS lookup from the client Pod, using its available resolver tool. A successful lookup from your laptop does not establish what the Pod sees. Compare the answer with EndpointSlices and the target string logged by the application.

If the application resolves DNS once at startup and then passes a Pod IP to gRPC, the resolver cannot discover replacement Pods. Restore the service name as the channel target before tuning timeouts.

## Use an explicit resolver scheme

A target such as `dns:///ledger-headless.payments.svc.cluster.local:50051` selects DNS resolution. The empty authority between `//` and `/` means use the configured resolver; it is not an HTTP URL. Do not add `https://` to select transport encryption.

For Go, `grpc.NewClient` uses DNS by default, while the older `grpc.Dial` defaults to passthrough for compatibility. The [gRPC-Go client creation guide](https://github.com/grpc/grpc-go/blob/master/Documentation/anti-patterns.md) explains this difference. Explicit targets make migrations and custom dialers easier to reason about.

This complete client constructor uses system certificate roots and a headless Service. The server certificate must cover the service hostname:

```go
package ledgerclient

import (
    "crypto/tls"

    "google.golang.org/grpc"
    _ "google.golang.org/grpc/balancer/roundrobin"
    "google.golang.org/grpc/credentials"
)

func New() (*grpc.ClientConn, error) {
    return grpc.NewClient(
        "dns:///ledger-headless.payments.svc.cluster.local:50051",
        grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{
            MinVersion: tls.VersionTLS12,
        })),
        grpc.WithDefaultServiceConfig(`{
            "loadBalancingConfig": [{"round_robin": {}}]
        }`),
    )
}
```

Create this channel once per application-owned client lifetime, then build generated stubs from it. Close it when the application shuts down. Add your internal CA to `RootCAs` if the server uses a private trust chain.

A default service configuration is a fallback when discovery does not provide one. If your resolver supplies service configuration, inspect that configuration too. A correct JSON string in application code does not prove that it is the policy currently in effect.

## Distinguish address refresh from connection recovery

DNS refresh, connection attempts, and RPC retries are separate mechanisms. Lowering the DNS TTL does not force every established connection to close or cause every language runtime to query at the TTL interval.

The [Go DNS resolver implementation](https://github.com/grpc/grpc-go/blob/master/internal/resolver/dns/dns_resolver.go) uses resolution requests and a minimum interval; its default minimum is 30 seconds in the inspected source. That is a throttle on re-resolution, not a promise to poll every 30 seconds. Resolver failure backoff and caching can add delay.

A literal IP produces a fixed address rather than a useful DNS watch. Also inspect custom dialers: one that ignores the resolved address and always dials a cached Pod IP can defeat otherwise correct resolver configuration.

Do not repeatedly close and recreate a channel whenever it enters `TRANSIENT_FAILURE`. The channel already manages reconnection. Recreating it can reset useful state and produce synchronized connection storms across clients.

## Interpret channel state carefully

`IDLE` means the channel is not currently trying to connect. `CONNECTING` means connection establishment is underway. `TRANSIENT_FAILURE` means recent attempts failed. `SHUTDOWN` means the channel was closed and cannot recover through ordinary reconnection.

`READY` is also limited evidence: a usable transport existed at the observation point. It is not a guarantee that the next RPC succeeds or that every backend is healthy. Observe actual RPC outcomes and record the selected peer when your client instrumentation supports it.

A silently dropped network path can take longer to detect than a clean socket close. Coordinated keepalive settings can help detect broken transports, but they do not refresh endpoint membership or migrate an active stream. Keepalive frequency must respect the server and proxy policies.

## Verify recovery with a controlled replacement

In a staging environment, keep one client process and channel alive while replacing a backend through your normal deployment mechanism. Record the old peer, removal time, resolver updates, new peer, RPC failures, and recovery latency.

For headless discovery, verify replacement addresses appear and new RPCs reach them. For a ClusterIP Service, expect the target VIP to remain stable while a new transport selects a healthy backend. An existing streaming RPC may fail and require application-level resumption in either topology.

Only adjust resolver intervals or backoff after locating the delay. A stale DNS answer, a fixed IP target, a blackholed transport, and a closed channel require different corrections.
