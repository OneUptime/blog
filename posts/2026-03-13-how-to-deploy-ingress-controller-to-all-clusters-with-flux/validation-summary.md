# Validation Summary: How to Deploy Ingress Controller to All Clusters with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization and HelmRelease APIs
- Kubernetes ConfigMaps, Namespaces, Deployments, Services, and IngressClass
- ingress-nginx Helm chart
- AWS Network Load Balancer service annotations
- cert-manager dependency ordering
- kubectl and Flux CLI verification commands

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- ingress-nginx documentation and ConfigMap reference: https://kubernetes.github.io/ingress-nginx/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- ingress-nginx multiple controller guidance: https://kubernetes.github.io/ingress-nginx/user-guide/multiple-ingress/
- Kubernetes ingress-nginx retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Kubernetes ingress-nginx steering/security statement: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.10/guide/service/annotations/
- Amazon EKS NLB service annotations: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AWS WAF supported resources: https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html
- Elastic Load Balancing target group attributes and proxy protocol: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html

## Issues Found
- The post did not mention that the community-maintained Kubernetes ingress-nginx project was retired in March 2026. Added a note that existing artifacts remain available but new deployments should plan migration to Gateway API or another maintained controller.
- The architecture diagram described an "External NLB with WAF". AWS WAF does not directly protect Network Load Balancers, so this was changed to "External NLB".
- The base AWS service annotations used the older cross-zone load balancing annotation. Updated it to the consolidated `aws-load-balancer-attributes` form for cross-zone load balancing.
- Production enabled `use-proxy-protocol` in ingress-nginx without enabling proxy protocol v2 on the AWS target group. Added `aws-load-balancer-target-group-attributes: proxy_protocol_v2.enabled=${use_proxy_protocol}`.
- The cert-manager dependency explanation implied cert-manager was required for TLS generally. Narrowed the claim to cert-manager-issued Kubernetes TLS certificates.
- The Flux Kustomization example used `wait: true` together with explicit `healthChecks`; Flux ignores `healthChecks` when `wait` is true. Changed `wait` to `false` so the explicit Deployment health check is effective.
- The "Rate Limiting and Security Headers" section did not configure rate limiting and showed an unrelated ConfigMap that ingress-nginx would not consume. Renamed the section and changed the example to put `add-headers` under `controller.config`.
- The upgrade example pinned ingress-nginx chart `4.9.0`, which is outdated as of this review. Updated the example to `4.15.1` as a current tested pin.
- The Flux dependency explanation overstated that downstream Ingress resources would automatically wait. Clarified that this only applies when downstream resources are managed by Kustomizations that declare `dependsOn`.

## Review Notes
The examples are now technically consistent for existing ingress-nginx estates, but the post should not be treated as guidance for brand-new ingress-nginx adoption after the March 2026 project retirement. A future rewrite should consider Gateway API or another maintained ingress controller as the primary recommendation.
