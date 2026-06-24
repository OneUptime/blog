# How to Configure Envoy as Sidecar Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Sidecar Proxy, Service Mesh, Kubernetes, Microservice, Traffic Management, Observability

Description: Learn how to configure Envoy as a sidecar proxy for your microservices, enabling transparent traffic management, observability, and security without changing application code.

---

Running Envoy as a sidecar proxy lets you move traffic management, observability, and security concerns out of your application and into a dedicated network layer. Each service instance gets its own Envoy proxy deployed alongside it, intercepting all inbound and outbound traffic so you can add retries, timeouts, mutual TLS, and rich telemetry without touching application code. This pattern is the foundation of most service meshes and gives you a consistent way to operate microservices at scale.
