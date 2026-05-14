# Validation Summary: How to Manage Multi-Cluster Ingress with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- ingress-nginx
- Kubernetes Gateway API
- ExternalDNS
- AWS Route53
- AWS Network Load Balancer annotations
- cert-manager
- Prometheus Operator

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- ingress-nginx documentation and Helm chart values: https://kubernetes.github.io/ingress-nginx/ and https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- Kubernetes ingress-nginx retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Kubernetes ingress-nginx retirement statement: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS AWS Route53 tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- AWS EKS Network Load Balancer annotation documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AWS Load Balancer Controller NLB documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- Kubernetes Gateway API redirect and rewrite documentation: https://gateway-api.sigs.k8s.io/guides/http-redirect-rewrite/
- Gateway API GatewayClass documentation: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Envoy Gateway GatewayClass examples: https://gateway.envoyproxy.io/docs/tasks/traffic/backend/
- cert-manager Route53 DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Gateway API usage documentation: https://cert-manager.io/docs/usage/gateway/

## Issues Found
- The post presented `kubernetes/ingress-nginx` as a current default ingress controller. The Kubernetes project retired ingress-nginx in March 2026, so the post now states that this pattern is for existing ingress-nginx environments during migration and recommends a maintained Gateway API or ingress controller for new deployments.
- The ingress-nginx Helm chart version was pinned to `4.9.x`, which is outdated. It was updated to the final `4.15.1` chart release available before the project was archived.
- The AWS NLB cross-zone annotation used the older dedicated attribute annotation. It was changed to `service.beta.kubernetes.io/aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"` and explicit HTTP health-check annotations were added.
- The ExternalDNS Helm example omitted the `external-dns` Namespace and HelmRepository resources. These were added so the Flux HelmRelease source reference is complete.
- The ExternalDNS Helm values used deprecated `provider: aws` syntax and an unsupported `aws:` values block for the current chart. The example now uses `provider.name: aws` and `extraArgs` for `--aws-region` and `--aws-zone-type`.
- The ExternalDNS `interval` value was described as DNS TTL. The comment now correctly describes it as the ExternalDNS reconciliation interval.
- The Route53 example published `app.example.com` from a separate health endpoint Service, which would direct application traffic to that Service instead of the ingress entry point. The example now places the weighted routing and health-check annotations on the ingress controller LoadBalancer Service values.
- The post implied ExternalDNS creates Route53 health checks. It now clarifies that ExternalDNS can associate records with existing Route53 health checks but does not create those health checks.
- The Gateway API example used a placeholder `controllerName` and did not state that a Gateway controller must be installed. The post now states that a compatible controller is required and uses the Envoy Gateway controller name as a concrete example.
- The Gateway HTTP listener comment claimed that HTTP traffic would be redirected to HTTPS, but no `RequestRedirect` filter or equivalent route was configured. The comment was corrected to say it is a plaintext HTTP listener.

## Review Notes
The guide remains technically relevant after correction, especially as a Flux-managed pattern for multi-cluster DNS, TLS, and Gateway API resources. Future improvements should consider replacing the ingress-nginx example entirely with a maintained Gateway API implementation, because ingress-nginx is no longer receiving releases, bug fixes, or security updates after March 2026.
