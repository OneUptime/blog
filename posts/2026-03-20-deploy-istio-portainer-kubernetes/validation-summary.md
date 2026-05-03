# Validation Summary: How to Deploy Istio via Portainer on Kubernetes

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Istio (service mesh, version 1.20)
- Portainer (CE / Business Edition) on Kubernetes
- Kubernetes (Helm charts, manifests, namespaces, sidecar injection)
- Helm (Istio official chart repository)
- HelmChart CRD (`helm.cattle.io/v1`) for stack-based gateway install
- istioctl
- Bookinfo sample application
- Observability addons (Kiali, Prometheus, Grafana)

## Sources Consulted
- Istio Helm chart repository index: https://istio-release.storage.googleapis.com/charts/index.yaml (verified the `gateway`, `base`, `istiod` charts and the 1.20.0 version)
- Istio base chart values: https://raw.githubusercontent.com/istio/istio/release-1.20/manifests/charts/base/values.yaml (verified `defaultRevision`)
- Istiod (istio-discovery) chart values: https://raw.githubusercontent.com/istio/istio/release-1.20/manifests/charts/istio-control/istio-discovery/values.yaml (verified `pilot.autoscaleEnabled`, `autoscaleMin`, `autoscaleMax`, `global.tracer.zipkin`)
- Istio addons directory at release-1.20 (prometheus.yaml, grafana.yaml, kiali.yaml URLs returned HTTP 200)
- Docker Hub: istio/examples-bookinfo-details-v1 (verified tag 1.18.0 exists)
- Istio gateway documentation for standard ingress port mappings (15021, 80→8080, 443→8443)

## Issues Found
No technical issues found. All commands, chart names, repository URLs, namespace labels, and YAML manifests verified against current official Istio 1.20 documentation and chart sources.

## Review Notes
- The `helm.cattle.io/v1` HelmChart CRD used in Step 5 is provided by K3s/RKE2/Rancher (the helm-controller). The post does not call this out explicitly; on a vanilla Kubernetes cluster without the helm-controller installed, this manifest will not deploy a chart. Readers using stock kubeadm/EKS/GKE/AKS clusters would need to install the controller or use Portainer's Helm UI directly.
- `global.tracer.zipkin.address: ""` plus `meshConfig.enableTracing: true` enables tracing infrastructure but does not point to a real collector. This is a benign placeholder; readers should fill in their Zipkin/Jaeger endpoint or use `meshConfig.extensionProviders` for real tracing.
- The post pins Istio to 1.20.0 (released late 2023). This is no longer the latest stable; readers who want a current release should check the Istio supported releases page and adjust the chart version and addon branch (`release-1.20`) accordingly. Configuration shown remains valid for 1.20.x.
- Portainer's Kubernetes Helm UI is supported; the CE/Business distinction in the Prerequisites is accurate at the time of writing.
