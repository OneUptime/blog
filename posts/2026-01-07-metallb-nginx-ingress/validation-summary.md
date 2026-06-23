# Validation Summary: How to Integrate MetalLB with NGINX Ingress Controller

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Services, Ingress, Deployments, probes, PodDisruptionBudget, and HorizontalPodAutoscaler
- MetalLB IPAddressPool and L2Advertisement
- ingress-nginx Helm chart, annotations, ConfigMap, metrics, and ServiceMonitor integration
- cert-manager ClusterIssuer and ACME HTTP-01
- TLS certificates and OpenSSL
- Prometheus alerting rules

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotation risk/reference documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations-risk/
- ingress-nginx TLS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress controllers documentation: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes ingress-nginx retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager ACME HTTP-01 documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager API reference for HTTP-01 ingress solver fields: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The MetalLB install command pinned the older `v0.14.9` manifest. Updated it to `v0.16.1`, matching the current official MetalLB manifest examples.
- The introduction and conclusion described the stack as production-ready without mentioning that Kubernetes community ingress-nginx was retired in March 2026. Added a concise lifecycle caveat and recommended evaluating Gateway API or another maintained controller for new production deployments.
- The Layer 2 explanation implied all speakers receive traffic equally. Clarified that in Layer 2 mode one speaker node attracts traffic for a service IP at a time.
- The `externalTrafficPolicy: Local` comment was too generic for MetalLB Layer 2. Updated it to explain that traffic goes only to pods on the elected speaker node while preserving client IP.
- The self-signed certificate command omitted a Subject Alternative Name, which modern TLS clients require. Added a SAN extension and aligned the created TLS secret name with the sample Ingress.
- The cert-manager install command pinned the older `v1.14.4` manifest. Updated it to `v1.20.2`, matching current cert-manager static install documentation.
- The ACME HTTP-01 solver used the older `class` field. Updated it to `ingressClassName`, the recommended field for ingress-nginx.
- The sample Ingress included the deprecated `kubernetes.io/ingress.class` annotation even though `spec.ingressClassName` was already set. Removed the deprecated annotation.
- The post described ingress-nginx annotations as active health checks and used `server-snippet` for retry directives. Reworded the section as passive retry behavior and replaced the snippet with supported `proxy-next-upstream`, `proxy-next-upstream-tries`, and `proxy-next-upstream-timeout` annotations.
- The performance ConfigMap used invalid or incorrect ingress-nginx keys: `worker-processes`, `worker-connections`, `multi-accept`, and `access-log-buffering`. Replaced them with supported keys where applicable: `max-worker-connections`, `enable-multi-accept`, and `access-log-params`.
- Several comments were technically misleading, including `use-http2` being described as epoll configuration, `server-tokens` as caching, and `upstream-hash-by` as health-check configuration. Updated the comments to describe the actual behavior.

## Review Notes
The remaining examples are structurally plausible for a tutorial, but cluster-specific details still need local adjustment in real deployments: IP ranges must not conflict with the physical network, DNS must point to the MetalLB-assigned address, Prometheus label selectors may vary by installation, and ingress-nginx should be treated as a legacy/existing-deployment option after its March 2026 retirement.
