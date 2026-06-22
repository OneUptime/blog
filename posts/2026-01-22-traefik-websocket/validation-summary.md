# Validation Summary: How to Configure Traefik for WebSocket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy
- Kubernetes CRDs and Deployments
- WebSocket / WSS
- Socket.IO
- Prometheus / PromQL
- Redis pub/sub
- curl and websocat

## Sources Consulted
- Traefik Proxy documentation: Exposing WebSocket Services - https://doc.traefik.io/traefik/expose/overview/#exposing-websocket-services
- Traefik Proxy documentation: EntryPoints respondingTimeouts - https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik Proxy documentation: Kubernetes IngressRoute - https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Proxy documentation: Kubernetes TraefikService and sticky sessions - https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik Proxy documentation: Kubernetes ServersTransport - https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/serverstransport/
- Traefik Proxy documentation: RateLimit middleware - https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ratelimit/
- Traefik Proxy documentation: Metrics - https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Traefik Proxy migration documentation: v2 to v3 open connections metric - https://doc.traefik.io/traefik/migrate/v2-to-v3-details/#open-connections-metric
- RFC 6455: The WebSocket Protocol - https://datatracker.ietf.org/doc/html/rfc6455
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Socket.IO documentation: Using multiple nodes - https://socket.io/docs/v4/using-multiple-nodes/

## Issues Found
- The entryPoint timeout snippet described `readTimeout` as the time to wait for response headers. Traefik documents it as the maximum duration for reading the entire request, including the body. Updated the comment to match Traefik's current semantics.
- The entryPoint timeout snippet described `writeTimeout` too loosely. Traefik documents it as the maximum duration before timing out response writes, from the end of request header reading to the end of response writing. Updated the comment for accuracy.
- The monitoring section used the removed Traefik v2 metric `traefik_entrypoint_open_connections`. Traefik v3 replaces the entryPoint/router/service open connection metrics with `traefik_open_connections`. Updated the PromQL example.
- The monitoring section used an exact service label ending in `@kubernetes`, but Kubernetes CRD resources use the `kubernetescrd` provider name and service labels can include generated namespace/port details. Updated the PromQL service selectors to use a Kubernetes CRD provider regex.
- The troubleshooting section specifically called out drops after 60 seconds. Current Traefik defaults vary by timeout type, so this was made more general and tied to the configured read, write, or idle timeout.

## Review Notes
The core guidance is technically sound: Traefik supports WebSocket and WSS through normal HTTP routing, sticky cookies are valid on Kubernetes CRD services, forwardAuth and rateLimit middleware can apply to the initial handshake, and Socket.IO deployments with long-polling fallback require session affinity when scaled across multiple nodes. The examples assume the referenced Kubernetes Services and Traefik CRDs already exist in the cluster.
