# Validation Summary: How to Deploy HAProxy Ingress with Custom Configuration via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Flux Kustomization
- Kubernetes Ingress
- Kubernetes IngressClass
- HAProxy Ingress
- HAProxy Ingress Helm chart
- Prometheus ServiceMonitor

## Sources Consulted
- HAProxy Ingress chart README and values: https://github.com/haproxy-ingress/charts/tree/release-0.16/haproxy-ingress
- HAProxy Ingress configuration keys: https://haproxy-ingress.github.io/docs/configuration/keys/
- HAProxy Ingress command-line options: https://haproxy-ingress.github.io/docs/configuration/command-line/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The post showed a standalone ConfigMap and then tried to reference it with `controller.config.configMapNamespace` and `controller.config.configMapName`. The HAProxy Ingress Helm chart uses `controller.config` as inline ConfigMap data and always passes the chart-managed ConfigMap to the controller. I changed the example to define the HAProxy Ingress keys under `values.controller.config`.
- The HelmRelease was placed in `ingress-haproxy`, but no namespace resource was created. I moved the HelmRelease to `flux-system`, added `spec.targetNamespace: ingress-haproxy`, and set `spec.install.createNamespace: true` so Flux can create the release namespace.
- The chart version range `>=0.14.0 <1.0.0` was too broad for the chart schema used in the post. I changed it to `~0.16.0`, matching the current 0.16 chart values that were validated.
- The ServiceMonitor setting was nested under `controller.metrics.serviceMonitor`, but the chart expects `controller.serviceMonitor.enabled`. I corrected the values structure.
- The post used `controller.extraArgs` as a list and included `--watch-namespace=""`. The chart expects `controller.extraArgs` as a map, and an empty `watch-namespace` is unnecessary because the controller watches all namespaces by default. I removed that invalid values entry.
- The post said it set the default IngressClass but only configured `controller.ingressClass`. The chart does not create an IngressClass unless `controller.ingressClassResource.enabled` is true, and it is not default unless `controller.ingressClassResource.default` is true. I added both settings.
- The sample Ingress used the legacy `kubernetes.io/ingress.class` annotation. I changed it to `spec.ingressClassName: haproxy`, which is the current Kubernetes Ingress API field.
- The sample Ingress used `haproxy-ingress.github.io/load-balance`, which is not the HAProxy Ingress annotation key for the jcmoraisjr/haproxy-ingress controller. I changed it to `haproxy-ingress.github.io/balance-algorithm`.
- The `limit-whitelist` value used a space-separated CIDR list, but HAProxy Ingress documents it as comma-separated. I changed it to comma-separated CIDRs.
- The Flux Kustomization health check referenced `haproxy-ingress-controller`, but the HAProxy Ingress chart creates the Deployment as `haproxy-ingress` when the release name is `haproxy-ingress`. I corrected the health check name.

## Review Notes
- The HAProxy Ingress project still supports the legacy ingress class annotation, but new examples should prefer `spec.ingressClassName`.
- `controller.serviceMonitor.enabled` only creates a ServiceMonitor when the Prometheus Operator CRDs are installed in the cluster.
