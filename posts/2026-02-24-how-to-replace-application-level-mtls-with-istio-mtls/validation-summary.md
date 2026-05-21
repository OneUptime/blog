# Validation Summary: How to Replace Application-Level mTLS with Istio mTLS

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio sidecar mode
- Istio mutual TLS
- PeerAuthentication
- istioctl
- Kubernetes workloads and secrets
- Java / Spring Boot TLS configuration
- Go TLS configuration
- Node.js HTTPS server configuration

## Sources Consulted
- Istio Security Concepts: https://istio.io/latest/docs/concepts/security/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Sidecar Injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio FAQ, certificate lifetime: https://istio.io/latest/about/faq/

## Issues Found
- The post said application code communicates with the local sidecar over plaintext on localhost. In normal sidecar mode, outbound traffic is redirected to the local sidecar while the application still calls the Kubernetes service address; inbound traffic is forwarded from the server-side proxy to the workload over a local connection. Updated the wording to avoid implying that application URLs should use localhost.
- The PeerAuthentication examples used `security.istio.io/v1beta1`. Current Istio documentation uses `security.istio.io/v1` for PeerAuthentication. Updated both YAML examples to `security.istio.io/v1`.
- The sample `istioctl x describe pod` output claimed it would print `Pod is PERMISSIVE`. Official examples describe mTLS state with messages such as whether the pod accepts HTTP and mutual TLS requests or enforces mTLS. Updated the sample output to align with the documented behavior.
- The migration note said old application-level mTLS still works alongside Istio mTLS without qualification. TLS passthrough depends on keeping the application ports configured as TLS while that service is still using application-level TLS. Added that qualification.

## Review Notes
The post is technically relevant and the overall migration flow matches Istio's documented PERMISSIVE-to-STRICT mTLS migration model. The local environment did not have `istioctl` or `kubectl` installed, so CLI behavior was validated against official Istio and Kubernetes-style command documentation rather than local command output.
