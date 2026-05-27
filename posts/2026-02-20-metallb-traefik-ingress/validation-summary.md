# Validation Summary: How to Use MetalLB with Traefik Ingress Controller

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- MetalLB
- Traefik Proxy
- Traefik Helm chart
- Traefik IngressRoute and Middleware CRDs
- Prometheus Operator ServiceMonitor
- Let's Encrypt ACME

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/index.html
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration/
- Traefik Helm chart documentation and values: https://helm.traefik.io/traefik and https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml
- Traefik Kubernetes CRD IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik dashboard documentation: https://doc.traefik.io/traefik/operations/dashboard/
- Traefik metrics documentation: https://doc.traefik.io/traefik/observe/metrics/
- Traefik metrics reference: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Traefik headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/

## Issues Found
- The introduction said Traefik "needs" MetalLB on bare metal. This was too absolute because MetalLB is one valid LoadBalancer implementation, not the only possible way to expose Traefik. Changed it to "can use MetalLB."
- The MetalLB install command used `v0.14.9`. Official MetalLB installation docs now show `v0.16.0` for manifest installation. Updated the manifest URL.
- The prerequisites omitted MetalLB's strict ARP requirement for kube-proxy IPVS mode. Added a concise prerequisite note.
- The Traefik Helm install command used `service.type=LoadBalancer`, which does not match the current chart structure. Updated it to `service.spec.type=LoadBalancer`.
- The install command used `metrics.prometheus.enabled=true`, but the current chart enables Prometheus metrics by default and uses `metrics.prometheus.service.enabled` for the dedicated metrics Service. Updated the command so the later `ServiceMonitor` example has a metrics Service to target.
- The install command used `dashboard.enabled=true`, which is not the current chart value. Updated it to `api.dashboard=true` and enabled the chart dashboard IngressRoute with `ingressRoute.dashboard.enabled=true`.
- The dashboard port-forward command targeted `svc/traefik 9000:9000`, but the current chart's internal Traefik entrypoint is port `8080` and the dashboard route is not exposed through a service port named `9000`. Updated it to port-forward `deployment/traefik 9000:8080`.
- The connectivity test could be misleading because Traefik returns 404 until a matching route exists. Added a note that 404 is expected before creating a matching route.

## Review Notes
The manifests and examples are otherwise aligned with current Traefik CRD API group `traefik.io/v1alpha1`, MetalLB `IPAddressPool` and `L2Advertisement` APIs, and documented Traefik middleware and ACME configuration. The dashboard example remains appropriate for local port-forward access; exposing it publicly should require authentication or other access controls.
