# How to Drain gRPC Connections During Kubernetes Rolling Updates Without `UNAVAILABLE` Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Kubernetes, Go, Graceful Shutdown, Deployment

Description: Coordinate endpoint withdrawal, gRPC connection draining, and bounded shutdown so Kubernetes rolling updates preserve in-flight requests.

---

A Deployment can keep the desired number of healthy Pods and still produce a burst of gRPC `UNAVAILABLE` errors during each rollout. Existing HTTP/2 connections can continue carrying RPCs to a terminating Pod, and Kubernetes can kill the process before those calls finish.

Reducing these errors requires coordinated endpoint withdrawal and application shutdown. Replica counts alone do not describe whether clients still use the old connections.

## Separate Endpoint Readiness from Connection Lifetime

During Pod termination, Kubernetes marks the associated EndpointSlice endpoint as terminating and its `ready` condition becomes false. This informs routing components that the endpoint should leave normal service. It does not itself migrate an existing gRPC stream to a replacement Pod. [Kubernetes Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination).

Different components observe endpoint changes at different times. A service proxy, an ingress, a cloud load balancer, and a client resolving Pod addresses can each have their own state. Existing connections are especially important because many RPCs share one HTTP/2 connection.

Inspect the actual path from caller to Pod before choosing a delay. A direct headless-Service client and a mesh proxy do not necessarily discover endpoint withdrawal through the same mechanism.

## Allocate a Shutdown Budget

Use a budget with three parts:

| Phase | Example allowance |
| --- | --- |
| Endpoint withdrawal propagation | 5 seconds |
| Finish in-flight RPCs | 45 seconds |
| Process cleanup and safety margin | 10 seconds |

These example values add up to a 60-second termination grace period. Choose production values using measured endpoint propagation and request-duration distributions.

A `preStop` hook runs before the termination signal, and its runtime consumes the same grace period. If the application already waits for endpoint propagation after handling `SIGTERM`, adding another sleep hook changes the budget rather than creating extra shutdown time. At grace-period expiry, Kubernetes can forcibly stop remaining processes. [Container lifecycle during Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow).

## Implement a Bounded gRPC Drain

This Go helper assumes the standard gRPC health service is registered and is used by readiness checks:

```go
package shutdown

import (
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
)

func drain(
    server *grpc.Server,
    healthServer *health.Server,
    propagationDelay time.Duration,
    rpcGrace time.Duration,
) {
    healthServer.Shutdown()
    time.Sleep(propagationDelay)

    finished := make(chan struct{})
    go func() {
        server.GracefulStop()
        close(finished)
    }()
    timer := time.NewTimer(rpcGrace)
    defer timer.Stop()
    select {
    case <-finished:
    case <-timer.C:
        go server.Stop()
    }
}
```

Call it once after receiving `SIGTERM`, with the process still alive and the server still serving during the propagation delay. The standard health server's `Shutdown` marks its services not serving. The delay is a measured allowance for routing convergence, not an acknowledgment from every client. [gRPC-Go health server](https://pkg.go.dev/google.golang.org/grpc/health#Server.Shutdown).

`GracefulStop` stops acceptance of new connections and RPCs and waits for pending calls. At the deadline, the helper initiates `Stop` asynchronously and returns. This avoids waiting for stop completion when a handler is stuck. Keep handler dependencies available during the graceful phase, then let the process shutdown coordinator enforce its remaining budget. [gRPC-Go shutdown API](https://pkg.go.dev/google.golang.org/grpc#Server.GracefulStop).

The main goroutine must wait for the drain helper. In particular, returning from `Serve` must not cause `main` to exit while a shutdown goroutine is still draining calls. Deliver signals to the actual Go process; an entrypoint wrapper must forward them or replace itself with that process.

Handlers must cooperate with cancellation and release resources after forced termination. The deadline bounds the helper, not completion of every shutdown goroutine. Concurrent shutdown coordination or `grpc.WaitForHandlers(true)` can leave a stop call waiting for handlers. Do not join uncooperative handlers indefinitely after the forced path. Main-process termination provides the final bound on that work and closes remaining transports.

## Keep Replacement Capacity Ready

A Deployment fragment can express the rollout capacity and grace period:

```yaml
spec:
  replicas: 3
  minReadySeconds: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: api
          image: registry.example.com/api:v2
          ports:
            - name: grpc
              containerPort: 50051
          readinessProbe:
            grpc:
              port: 50051
            periodSeconds: 2
            timeoutSeconds: 1
```

This fragment belongs in an existing Deployment with matching selectors and labels. Native gRPC probes need a numeric port and a reachable health endpoint; this example assumes the endpoint supports the kubelet's probe connection. [Kubernetes gRPC probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-a-grpc-liveness-probe).

`maxUnavailable: 0` and spare surge capacity help preserve serving replicas during a rollout. They cannot guarantee that every client has stopped using a terminating connection. Readiness should represent the service's ability to accept useful work, including required startup initialization. [Kubernetes Deployment strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment).

## Give Long Streams an Exit Protocol

A stream lasting hours exceeds the example shutdown budget. gRPC cannot move that live stream to another server. Implement bounded stream lifetimes or an application message that asks clients to reconnect using a durable checkpoint.

Make reconnection staggered, retain record IDs, and define duplicate handling. Keep resumable state outside the terminating process. Unary writes also need idempotency because a connection can fail after a commit but before the reply arrives.

If a sidecar handles the connection, coordinate its drain interval with the application. A proxy that exits first can break traffic while the server is still completing work. Test the configured sidecar lifecycle rather than assuming ordinary containers terminate in a helpful order.

## Rehearse the Real Rollout

Run continuous unary calls and at least one active stream through the production routing path in a test environment. Trigger a normal Deployment rollout and correlate endpoint conditions, Pod signals, health changes, active RPC counts, drain completion, and client statuses.

Include a slow request near the grace limit and a stream exceeding it. The expected result is successful completion for bounded in-flight work and a documented recovery path for work that cannot finish. Also verify that replacement Pods are ready before old capacity drains.

Track forced stops separately from graceful completions. An increasing forced-stop count indicates that the time budget, stream contract, or dependency cleanup needs attention. This evidence makes the next rollout change measurable instead of relying on a longer sleep.
