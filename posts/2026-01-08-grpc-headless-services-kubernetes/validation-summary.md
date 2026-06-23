# Validation Summary: How to Configure Headless Services for gRPC in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC (Go, Python, Node.js clients)
- Kubernetes (Headless Services, ClusterIP Services, Deployments, StatefulSets)
- Kubernetes DNS / CoreDNS service discovery (A and SRV records)
- grpc-go DNS resolver, custom resolver, client-side load balancing (round_robin)
- gRPC keepalive, health checking, retry policies via service config
- Prometheus client metrics

## Sources Consulted
- Kubernetes Services documentation — Headless Services: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes DNS for Services and Pods (A/AAAA and SRV records): https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Configure Liveness/Readiness/Startup Probes — gRPC probe: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-a-grpc-liveness-probe
- gRPC Go package reference (grpc.Dial / grpc.NewClient): https://pkg.go.dev/google.golang.org/grpc
- gRPC Go resolver package (Target.Endpoint method): https://pkg.go.dev/google.golang.org/grpc/resolver
- gRPC Name Resolution / Load Balancing design docs: https://github.com/grpc/grpc/blob/master/doc/naming.md, https://github.com/grpc/grpc/blob/master/doc/load-balancing.md
- gRPC service config (gRPC_arg_keys / channel args for Python & Node.js): https://github.com/grpc/grpc/blob/master/doc/service_config.md
- CoreDNS Kubernetes plugin and cache/loadbalance plugins: https://coredns.io/plugins/kubernetes/

## Issues Found
1. **Unused imports causing a Go compile error (first Go client, `client/main.go`).** The import block included `google.golang.org/grpc/balancer/roundrobin` and `google.golang.org/grpc/resolver`, neither of which is referenced in the code. Go treats unused imports as a compile-time error ("imported and not used"). The round-robin policy is selected through the service-config JSON string (and is registered by default), so neither import is needed. **Fix:** removed both unused import lines so the example compiles.

2. **Custom resolver `Close()` would block forever (`resolver/dns_resolver.go`).** In `Build`, the resolver was created with `ctx: context.Background()` but the `cancel` field was never assigned. As a result `r.ctx.Done()` in `watch()` never fires, the watch goroutine never exits, and `Close()` blocks indefinitely on `r.wg.Wait()`. **Fix:** created the context with `context.WithCancel(context.Background())` and stored both `ctx` and `cancel` on the resolver, so `Close()` cancels the context and the goroutine returns cleanly.

## Review Notes
- **`grpc.Dial` is deprecated.** Since grpc-go v1.63, `grpc.Dial`/`grpc.DialContext` are deprecated in favor of `grpc.NewClient`. They remain fully functional and are explicitly "supported throughout 1.x," so the examples still compile and run; the code was left as-is to preserve the author's style. A future revision could migrate to `grpc.NewClient`. Note one behavioral difference: `NewClient` defaults to the `dns` resolver scheme while `Dial` defaults to `passthrough`. Since every example here uses an explicit `dns:///` target, switching to `NewClient` would not change behavior.
- **`conn.ResetConnectBackoff()` does not force DNS re-resolution.** In the "Client-Side DNS TTL Override" example, the comment implies the periodic call re-resolves DNS. `ResetConnectBackoff` only resets the connection-attempt backoff for subchannels in transient failure; it does not trigger the resolver to re-resolve. The grpc-go `dns` resolver re-resolves on its own minimum interval (default 30 minutes) and on connection errors. The code is valid Go and harmless; only the framing slightly overstates the effect.
- **SRV record example is correct.** Because the service port is named `grpc` with TCP protocol, the SRV query `_grpc._tcp.<service>.<ns>.svc.cluster.local` is the correct form, and the dashed-IP SRV target hostnames match Kubernetes DNS behavior for headless services.
- **gRPC readiness probe (`readinessProbe.grpc`) is valid.** It reached GA in Kubernetes 1.27 (beta in 1.24), consistent with the post's 2026 timeframe.
- **Python client minor note:** `from concurrent import futures` is imported but unused. Python does not error on unused imports (lint warning only), so it was left unchanged.
- CoreDNS `Corefile` directives (`ttl`, `cache`, `loadbalance`, `reload`, `loop`, `health`/`lameduck`) are all valid plugin configuration.
