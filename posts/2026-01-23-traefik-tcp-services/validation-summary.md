# Validation Summary: How to Configure Traefik for TCP Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy TCP routing
- Traefik Kubernetes CRDs
- IngressRouteTCP
- MiddlewareTCP IPAllowList
- TLS passthrough and TLS termination
- Kubernetes Services and Deployments
- Kubernetes liveness and readiness probes
- PostgreSQL, Redis, RabbitMQ, and database TCP access patterns

## Sources Consulted
- Traefik IngressRouteTCP Kubernetes CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- Traefik TCP router documentation: https://doc.traefik.io/traefik/reference/routing-configuration/tcp/routing/router/
- Traefik TCP rules and priority documentation: https://doc.traefik.io/traefik/reference/routing-configuration/tcp/routing/rules-and-priority/
- Traefik TCP TLS documentation: https://doc.traefik.io/traefik/reference/routing-configuration/tcp/tls/
- Traefik TCP service documentation: https://doc.traefik.io/traefik/reference/routing-configuration/tcp/service/
- Traefik ServersTransportTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/tcp/serverstransport/
- Traefik MiddlewareTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/middlewaretcp/
- Traefik TCP IPAllowList middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/tcp/middlewares/ipallowlist/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes probe configuration documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The TCP vs HTTP routing section stated that non-TLS TCP routing is based on port only. Traefik TCP routers also support `ClientIP` matching, so the wording was changed to "entrypoint/port, with optional client IP matching."
- The TCP load balancing example used `terminationDelay` directly under an `IngressRouteTCP` service and described it as a connection timeout. Current Traefik Kubernetes CRD documentation does not list `terminationDelay` as an `IngressRouteTCP` service field; it belongs to TCP ServersTransport behavior. The invalid field and misleading comment were removed.
- The "Health Checks for TCP" example configured `proxyProtocol`, which is not a health check. It was replaced with Kubernetes `tcpSocket` readiness and liveness probes, matching the article's guidance that Kubernetes handles pod-level health for TCP services.
- The shared-port SNI example implied ordinary MySQL traffic could be multiplexed by SNI. SNI routing requires TLS SNI, and Traefik only documents special STARTTLS handling for PostgreSQL. The MySQL example was replaced with RabbitMQ over AMQPS and the surrounding wording now states that clients must send SNI during TLS negotiation.

## Review Notes
The remaining examples use current `traefik.io/v1alpha1` CRDs and fields documented by Traefik. The `certResolver: letsencrypt` examples assume a resolver with that name is already defined in Traefik static configuration and an ACME challenge is configured.
