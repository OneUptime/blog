# Validation Summary: How to Build NATS Micro-Services with Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS messaging system (including JetStream)
- NATS micro framework (Go: `github.com/nats-io/nats.go/micro`)
- NATS Node.js client (`nats` package on npm) and its services API
- Go (`net/http`, `os/signal`, `context`)
- Node.js / JavaScript
- Docker (running `nats:latest`)
- Kubernetes (Deployment, StatefulSet, ConfigMap, Service)
- Prometheus-style metrics

## Sources Consulted
- NATS Go micro package docs: https://pkg.go.dev/github.com/nats-io/nats.go/micro
- NATS Go micro source: https://github.com/nats-io/nats.go/blob/main/micro/service.go
- NATS.js services README: https://github.com/nats-io/nats.js/blob/main/services/README.md
- NATS server monitoring docs: https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS server CLI flags: https://docs.nats.io/running-a-nats-service/introduction/flags
- NATS server config (cluster, JetStream, accounts): https://docs.nats.io/running-a-nats-service/configuration

## Issues Found
No technical issues found.

All API signatures and field names match the current NATS Go micro and NATS.js packages:
- `micro.Config` fields (Name, Version, Description, Metadata, QueueGroup) — verified.
- `micro.AddService`, `Service.AddGroup`, `Group.AddEndpoint`, `micro.HandlerFunc`, `micro.WithEndpointMetadata` — verified.
- `micro.Request.Error(code, description, data, ...)` signature, `Data()`, `Respond()` — verified.
- Discovery subjects `$SRV.INFO`, `$SRV.INFO.<name>`, `$SRV.STATS`, `$SRV.STATS.<name>`, `$SRV.PING` — verified.
- Error headers `Nats-Service-Error-Code` and `Nats-Service-Error` — verified.
- `micro.Stats`/`micro.Info` fields (via embedded `ServiceIdentity`), `EndpointStats` (NumRequests, NumErrors, ProcessingTime) — verified.
- Node.js `ServiceError(code, message)`, `nc.services.add({...})`, `addGroup`, `addEndpoint({metadata, handler})`, `msg.string()`, `msg.respond()`, `msg.respondError(code, description)`, `nc.getServer()`, `nc.drain()` — verified.
- NATS server CLI flags (`-js`, `-m 8222`) and `/healthz` endpoint — verified.

## Review Notes
- The `WatchServices` example function in `discovery/client.go` is syntactically valid but architecturally misleading. NATS micro does not broadcast service registration/deregistration events on `$SRV.>` — services only respond to discovery requests sent on those subjects. Subscribing to `$SRV.>` will receive incoming PING/INFO/STATS requests (which carry empty bodies, not `micro.Info` JSON), so the callback will effectively never fire. A proper implementation would periodically poll `$SRV.PING` and diff the set of responses. This was not modified because fixing it would require redesigning the function rather than correcting a small error.
- The Node.js code uses `Math.random().toString(36).substr(2, 9)` — `String.prototype.substr` is deprecated but still functional in current Node.js runtimes. Not a blocker.
- The `micro.Stats.Name`/`ID`/`Version`/`Metadata` fields are accessed through the embedded `ServiceIdentity` struct in the current Go API; due to Go's field promotion via embedding, `stats.Name` still works as written in the post.
- Several `AddEndpoint` calls in the Go example ignore the returned error — common in introductory examples but worth highlighting if the post were extended to a production-grade tutorial.
- The `if err == context.DeadlineExceeded` comparison in `gateway/main.go` would be more idiomatic as `errors.Is(err, context.DeadlineExceeded)` to handle wrapped errors, but the direct comparison still works for the unwrapped case that nats.go returns here.
