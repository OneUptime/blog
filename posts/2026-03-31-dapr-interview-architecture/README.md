# How to Explain Dapr Architecture in an Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Interview, Architecture, Sidecar, Microservice

Description: Explain Dapr's architecture clearly in a technical interview, covering the sidecar model, building blocks, component system, and how they work together in Kubernetes.

---

## Core Architecture Answer

A strong interview answer covers three layers: the sidecar process, building blocks, and the component system.

**Sample answer:**

"Dapr uses a sidecar architecture where a `daprd` process runs alongside each application instance. The application communicates with its local sidecar over HTTP or gRPC on localhost - it never talks directly to infrastructure. The sidecar exposes building blocks like state management, pub/sub, and service invocation through a consistent API, and translates those calls to the actual infrastructure components configured via YAML."

## Architecture Diagram to Draw

```json
[App]---localhost:3500---[Dapr Sidecar (daprd)]---[Redis/Kafka/etc]
                                |
                         [Control Plane]
                         - Placement Service
                         - Sentry (mTLS)
                         - Operator (Kubernetes)
                         - Injector (Sidecar Injection)
                         - Scheduler (Jobs/Reminders)
```

## Building Blocks - Be Ready to List All

```text
1. Service Invocation     - synchronous HTTP/gRPC between services
2. State Management       - CRUD on key/value store
3. Pub/Sub Messaging      - async event-driven messaging
4. Bindings               - input/output for external systems
5. Actors                 - virtual actor model
6. Secrets Management     - secret store abstraction
7. Configuration          - dynamic app configuration
8. Distributed Lock       - distributed mutex (alpha)
9. Workflow               - durable, long-running processes
10. Cryptography          - key management and encryption (alpha)
11. Jobs                  - scheduled and periodic tasks (alpha)
12. Conversations         - LLM interaction abstraction (alpha)
```

## Control Plane Components

```text
Placement Service    - tracks actor distribution across pods
Sentry               - certificate authority for mTLS
Operator             - manages component and configuration CRDs
Injector             - injects daprd sidecar into pods
Scheduler            - manages jobs, actor reminders, and workflow reminders
```

## How the Sidecar Gets Injected

```yaml
# You annotate your pod, Dapr Sidecar Injector injects the sidecar
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "orderservice"
    dapr.io/app-port: "8080"
```

```bash
# The injector webhook intercepts pod creation and adds:
# 1. daprd container
# 2. Init container (dapr-init)
# 3. Volume mounts for config and certs
```

## Data Flow for a State Management Call

```text
App calls: GET http://localhost:3500/v1.0/state/statestore/key123

1. App -> Dapr sidecar HTTP API (localhost:3500)
2. Sidecar reads component config: statestore = state.redis
3. Sidecar -> Redis: GET orderservice||key123
4. Redis returns value
5. Sidecar returns JSON to app
```

## Dapr vs Direct SDK Usage

| Aspect | Dapr | Direct SDK |
|--------|------|------------|
| Portability | Change backend via YAML | Rewrite code |
| Retries | Configured in Resiliency CRD | Custom code |
| Observability | Built-in traces/metrics | Manual instrumentation |
| Local dev | `dapr run` (no infra) | Run real infra |

## Common Follow-Up Questions

**Q: How does Dapr handle mTLS between services?**
"The Sentry service acts as a certificate authority. Each sidecar gets a SPIFFE-based certificate. Service-to-service calls are automatically mTLS without any application code changes."

**Q: What happens if the sidecar goes down?**
"The application loses access to Dapr building blocks. The application should implement health checks for the sidecar and return 503 during downtime. Kubernetes restarts the sidecar container quickly."

**Q: Can Dapr run outside Kubernetes?**
"Yes - `dapr init` sets up a self-hosted mode using Docker containers for local development. The same application code runs unchanged in both environments."

## Summary

Explaining Dapr architecture in an interview requires covering the sidecar model (app talks to localhost sidecar, not directly to infrastructure), the 12 building blocks (state, pub/sub, service invocation, actors, workflow, jobs, etc.), the component system (infrastructure configured via YAML CRDs), and the Kubernetes control plane components. Drawing the architecture diagram while explaining it demonstrates system-level thinking.
