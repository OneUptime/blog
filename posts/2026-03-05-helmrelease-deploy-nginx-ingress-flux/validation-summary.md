# Validation Summary: How to Use HelmRelease for Deploying NGINX Ingress with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRepository and HelmRelease APIs
- Kubernetes Ingress
- ingress-nginx Helm chart
- Kubernetes LoadBalancer Services
- AWS Network Load Balancer annotations
- GKE LoadBalancer Service annotations
- Prometheus ServiceMonitor

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `get helmreleases` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx Helm chart 4.11.3 values and templates: https://github.com/kubernetes/ingress-nginx/tree/helm-chart-4.11.3/charts/ingress-nginx
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- AWS Load Balancer Controller service annotation documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS Network Load Balancer annotation documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- GKE LoadBalancer Service documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer

## Issues Found
- The HelmRelease was placed in the `ingress-nginx` namespace while relying on `install.createNamespace: true`. Flux/Helm can create the target namespace for the Helm release, but the namespace containing the HelmRelease object must already exist. I changed the HelmRelease metadata namespace to `flux-system`, added `targetNamespace: ingress-nginx`, and set `releaseName: ingress-nginx` so the rendered ingress-nginx resource names remain aligned with the later commands.
- The prerequisites omitted the Prometheus Operator CRDs required when `controller.metrics.serviceMonitor.enabled` is true. I added that prerequisite because the chart renders a `monitoring.coreos.com/v1` ServiceMonitor when this value is enabled.
- The AWS NLB annotations used older/deprecated forms. I updated the examples to use current AWS Load Balancer Controller style annotations: `aws-load-balancer-type: external`, `aws-load-balancer-nlb-target-type`, `aws-load-balancer-scheme`, and `aws-load-balancer-attributes` for cross-zone load balancing.
- The GCP example used `cloud.google.com/neg: '{"ingress": true}'`, which applies to GKE Ingress/Application Load Balancer backend Services, not the ingress-nginx controller's `LoadBalancer` Service. I changed it to the current GKE external LoadBalancer Service annotation `cloud.google.com/l4-rbs: "enabled"`.
- The `use-forwarded-headers` comment claimed it uses the real client IP behind a load balancer. ingress-nginx documents this option as trusting incoming `X-Forwarded-*` headers from an upstream L7 proxy/load balancer, so I corrected the comment.
- The Flux status command used `flux get helmrelease`. The official Flux CLI documents `flux get helmreleases`, so I updated the command and namespace to match the revised HelmRelease location.

## Review Notes
- The YAML snippets parse successfully.
- `ingressClassResource.default: true` is valid, but operators should avoid enabling multiple default IngressClasses in the same cluster.
- The local environment does not have `helm`, `flux`, or `kubectl` installed, so CLI verification was done against official command documentation rather than local `--help` output.
