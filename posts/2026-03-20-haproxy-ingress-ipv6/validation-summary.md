# Validation Summary: How to Configure HAProxy Ingress Controller for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy Ingress Controller
- Kubernetes Ingress
- Kubernetes Service and ConfigMap
- Helm
- IPv6 and dual-stack Kubernetes Services
- PROXY Protocol
- AWS Network Load Balancer service annotations

## Sources Consulted
- HAProxy Ingress getting started: https://haproxy-ingress.github.io/docs/getting-started/
- HAProxy Ingress configuration keys: https://haproxy-ingress.github.io/docs/configuration/keys/
- HAProxy Ingress command-line options: https://haproxy-ingress.github.io/docs/configuration/command-line/
- HAProxy Ingress chart index: https://haproxy-ingress.github.io/charts/index.yaml
- HAProxy Ingress chart release `0.16.0`: https://github.com/haproxy-ingress/charts/releases/download/0.16.0/haproxy-ingress-0.16.0.tgz
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- `kubectl` command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Amazon EKS Network Load Balancers: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- HAProxy bind directive reference: https://docs.haproxy.org/2.8/configuration.html#4-bind
- HAProxy PROXY protocol specification: https://www.haproxy.org/download/2.0/doc/proxy-protocol.txt

## Issues Found
- The post used several unsupported or wrong HAProxy Ingress keys, including `bind-ipv4-address`, `bind-ipv6-address`, `proxy-real-ip-header`, `use-forward-for`, `real-ip-header`, and `limit-period`. I replaced them with documented HAProxy Ingress keys such as `bind-http`, `bind-https`, `bind-ip-addr-stats`, and `real-ip-hdr`, and removed the invalid rate-limit key.
- The post described `whitelist-source-range` as a trusted-proxy setting for `X-Forwarded-For`, but HAProxy Ingress documents that key as an allowlist for client source ranges, not proxy trust. I removed that misuse and replaced the surrounding guidance with documented `forwardfor`, `real-ip-hdr`, and optional `use-proxy-protocol` settings.
- The Ingress example applied `forwardfor` and a non-existent `proxy-real-ip-header` as Ingress annotations. HAProxy Ingress documents `forwardfor` and `real-ip-hdr` as `Global` keys, so I moved that behavior into controller config / ConfigMap examples and removed the invalid Ingress annotations.
- The backend section mixed in a `haproxy-ingress.github.io/v1` `Backend` CRD that does not belong to the `jcmoraisjr/haproxy-ingress` controller documented elsewhere in the post. I replaced it with a standard Kubernetes `Service` using supported backend-scoped HAProxy Ingress annotations.
- The AWS dual-stack load balancer example was incomplete for the current AWS Load Balancer Controller guidance. I kept it explicitly AWS-specific and added the current NLB annotations for `external` and `ip` target mode alongside `aws-load-balancer-ip-address-type: "dualstack"`.
- The verification commands had shell pipelines that would not execute correctly through `kubectl exec`, used invalid placeholder IPv6 literals, and tried to port-forward the stats port from the main service without enabling the stats service. I wrapped `kubectl exec` commands with `sh -c`, corrected the IPv6 examples, enabled controller stats in the Helm values, and updated the port-forward target to `svc/haproxy-ingress-stats`.
- The install example used `ingressClassName: haproxy` later in the post but did not enable chart-managed `IngressClass` creation. I added `controller.ingressClassResource.enabled: true` so the install example matches the Ingress manifest.

## Review Notes
- Validated against the current HAProxy Ingress documentation and chart release available on April 30, 2026, which reflects the `v0.16` documentation stream as the latest stable release at that time.
- The AWS service annotations shown are intentionally AWS-specific. Other cloud providers expose dual-stack `LoadBalancer` services differently.
- The example still includes the legacy `kubernetes.io/ingress.class` annotation for compatibility, even though `ingressClassName` with an `IngressClass` resource is the newer Kubernetes approach.
