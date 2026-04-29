# Validation Summary: How to Use K3s Auto-Deploying Helm Charts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes
- Helm
- Traefik
- MetalLB
- cert-manager
- ingress-nginx
- kube-prometheus-stack

## Sources Consulted
- K3s Helm docs: https://docs.k3s.io/add-ons/helm
- K3s packaged components / auto-deploy manifests docs: https://docs.k3s.io/installation/packaged-components
- K3s cluster access docs: https://docs.k3s.io/cluster-access
- K3s Helm controller API reference: https://github.com/k3s-io/helm-controller/blob/master/doc/helmchart.md
- K3s Helm controller source (`types.go`, `chart.go`): https://github.com/k3s-io/helm-controller
- K3s packaged Traefik manifest: https://github.com/k3s-io/k3s/blob/main/manifests/traefik.yaml
- Traefik Helm chart values reference: https://doc.traefik.io/traefik-hub/api-gateway/reference/install/ref-helm
- Traefik Helm chart source values: https://github.com/traefik/traefik-helm-chart
- MetalLB annotation docs: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB release notes on annotation prefix change: https://metallb.universe.tf/release-notes/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager v1.14 Helm docs: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager v1.15 Helm docs: https://cert-manager.io/v1.15-docs/installation/helm/
- cert-manager 1.15 release notes: https://cert-manager.io/docs/releases/release-notes/release-notes-1.15/
- Prometheus community kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- ingress-nginx chart docs: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- ingress-nginx ConfigMap options: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Docker Hub OCI tags for `bitnamicharts/nginx`: https://hub.docker.com/r/bitnamicharts/nginx

## Issues Found
- The Traefik `HelmChartConfig` example used outdated or incorrect chart values. `dashboard.enabled` is not a valid current chart key, `metrics.prometheus.enabled` is not a supported toggle, and `ports.websecure.tls.enabled` no longer matches the chart schema. I changed the example to use `ingressRoute.dashboard.enabled`, removed the invalid metrics toggle, and updated TLS to `ports.websecure.http.tls.enabled`.
- The MetalLB annotation in the Traefik example used the deprecated `metallb.universe.tf/address-pool` prefix. I updated it to `metallb.io/address-pool`, which is the current documented annotation.
- The private Helm repository auth example created a generic secret without the documented `kubernetes.io/basic-auth` type. I added `--type=kubernetes.io/basic-auth` to match K3s Helm controller documentation.
- The monitoring section referenced `helmreleases`, which is not a K3s Helm controller resource. I replaced that with supported inspection commands and updated the wording to refer to Helm Jobs and pods.
- The direct Helm status command omitted the K3s kubeconfig path. I changed it to `helm --kubeconfig /etc/rancher/k3s/k3s.yaml ls -n cert-manager`, which matches K3s cluster access guidance.
- The upgrade example hard-coded an upgrade from cert-manager `v1.14.4` to `v1.15.0` without noting that cert-manager changed CRD-related chart values in the 1.15 series. I generalized the upgrade instruction so it remains technically correct across chart releases.
- The introduction described K3s auto-deploy manifests as K3s’s “native approach to Helm-based GitOps”. Because K3s AddOn manifests are apply-based and do not fully reconcile deletions, I softened this to “GitOps-friendly” wording.

## Review Notes
- The cert-manager example is valid as written for the pinned `v1.14.4` chart, but newer cert-manager chart versions prefer OCI distribution and use `crds.enabled` / `crds.keep` instead of the older `installCRDs` option.
- The ingress-nginx chart values are technically valid, but ingress-nginx documentation now states the project is retired after March 2026. Existing artifacts remain available, but new deployments should evaluate maintained ingress alternatives.
- No local runtime verification was performed because `helm` and `kubectl` are not installed in this workspace. Validation was done against official documentation, chart sources, controller API docs, and upstream manifests.
