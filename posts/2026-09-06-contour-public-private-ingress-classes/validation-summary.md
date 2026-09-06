# Validation Summary: Run Public and Private Contour Ingress Classes in One Cluster

## Status
validated

## Post Type
Technical implementation guide.

## Technologies Covered
- Project Contour 1.33 and Envoy
- Kubernetes Ingress, IngressClass, and HTTPProxy
- Kubernetes Services, Deployments, DaemonSets, RBAC, namespaces, and leader-election Leases
- TLS, xDS certificates, DNS, and public/internal load balancers
- kubectl, curl, and YAML

## Sources Consulted
- [Contour 1.33 deployment options](https://projectcontour.io/docs/1.33/deploy-options/)
- [Contour 1.33 Ingress support and class filtering](https://projectcontour.io/docs/1.33/config/ingress/)
- [Contour 1.33 annotations reference](https://projectcontour.io/docs/1.33/config/annotations/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 configuration and CLI flags](https://projectcontour.io/docs/1.33/configuration/)
- [Contour 1.33 inclusion and delegation](https://projectcontour.io/docs/1.33/config/inclusion-delegation/)
- [Contour 1.33 TLS termination](https://projectcontour.io/docs/1.33/config/tls-termination/)
- [Contour v1.33.0 class matching implementation](https://github.com/projectcontour/contour/blob/v1.33.0/internal/ingressclass/ingressclass.go)
- [Contour v1.33.0 resource cache](https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/cache.go)
- [Contour v1.33.0 serve command implementation](https://github.com/projectcontour/contour/blob/v1.33.0/cmd/contour/serve.go)
- [Contour v1.33.0 Envoy example manifest](https://github.com/projectcontour/contour/blob/v1.33.0/examples/contour/03-envoy.yaml)
- [Kubernetes IngressClass documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class)
- [Kubernetes LoadBalancer Services](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [curl manual, including --resolve](https://curl.se/docs/manpage.html)

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post contains relevant configuration and commands and qualifies for technical validation.
- Confirmed separate namespace installations, shared CRDs, unique cluster-scoped RBAC names, distinct same-namespace resource references, certificate separation, and leader-election settings against the deployment guidance.
- Verified explicit and default class filtering, comma-separated class support, annotation precedence, and the absence of a mandatory IngressClass object for Contour filtering. The v1.33.0 cache applies class matching to every HTTPProxy, supporting the requirement to classify included proxies as well as roots.
- Verified the Contour flags and HTTPProxy fields, including routing, TLS Secret references, and status columns. The examples use supported APIs for the documented Contour version; historical class annotations are discussed only for migration.
- Parsed all five YAML code blocks successfully with PyYAML and checked both Bash blocks with bash -n. These are syntax checks, not Kubernetes API-server validation or a live deployment test.
- Confirmed Service port mappings against the Envoy manifest and checked kubectl output syntax and curl --resolve semantics against their official references. The post's six official documentation links resolved to the intended resources.
- The installation arguments are explicitly excerpts. Actual deployments must retain their complete configuration and certificate settings. Namespaces, backend Services exposing port 8080, and matching TLS Secrets must exist. Replace the example hostnames and IP placeholders; curl requires a trusted certificate chain, with a private CA supplied through the client trust store or --cacert when needed. If a load balancer reports a hostname, resolve it to an IP for --resolve.
- Internal load-balancer configuration remains provider-specific and is deliberately a placeholder. Actual reachability, firewall restrictions, DNS exposure, and positive/negative routing tests require the target environment and were not exercised during this review.
- Remove all colliding hostPort entries as the post advises. The pinned v1.33.0 Envoy manifest also exposes metrics on hostPort 8002, in addition to HTTP and HTTPS; removing only ports 80 and 443 would leave a collision despite the deployment documentation referring to two host ports.
- Namespace watch restrictions and RBAC must be designed for the intended team boundaries. The sample puts both application routes in storefront; namespace-level separation would require adapting that layout. Class selection alone is not authorization or network isolation.
- Validation targets the explicitly linked Contour 1.33 documentation and v1.33.0 implementation; it does not assert that 1.33 is the latest release. Shared cluster infrastructure and CRD upgrades remain common failure dependencies even with independent ingress rollouts.
