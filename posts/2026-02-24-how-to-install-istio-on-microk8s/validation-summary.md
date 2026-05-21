# Validation Summary: How to Install Istio on MicroK8s

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- MicroK8s
- Istio
- Kubernetes
- Ubuntu snap packages
- MetalLB
- kubectl
- Istio Bookinfo sample application
- Istio telemetry addons: Prometheus, Grafana, Kiali, Jaeger

## Sources Consulted
- MicroK8s getting started documentation: https://canonical.com/microk8s/docs/getting-started
- MicroK8s addons documentation: https://canonical.com/microk8s/docs/addons
- MicroK8s addon management documentation: https://canonical.com/microk8s/docs/howto-addons
- MicroK8s MetalLB addon documentation: https://canonical.com/microk8s/docs/addon-metallb
- MicroK8s community Istio addon source: https://github.com/canonical/microk8s-community-addons
- Istio getting started documentation: https://istio.io/latest/docs/setup/getting-started/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Bookinfo documentation: https://istio.io/latest/docs/examples/bookinfo/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio 1.30 release announcement and Kubernetes support statement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio telemetry integration docs for Prometheus, Grafana, Kiali, and Jaeger: https://istio.io/latest/docs/ops/integrations/

## Issues Found
- The post described the Istio addon as built-in and enabled it directly. Current MicroK8s documentation lists Istio in the community addon repository, so I changed the text and commands to enable `community` before `istio`.
- The post said the Istio addon asks which profile to use. The current community addon source installs Istio with `profile=demo`, so I corrected the description.
- The MicroK8s install command used Kubernetes channel `1.30`, while current Istio 1.30 supports Kubernetes 1.32 to 1.36. I updated the MicroK8s channel to `1.35`.
- The user setup commands used `sudo chown -R $USER ~/.kube`, which can fail when `~/.kube` does not exist and does not match current MicroK8s setup guidance. I changed this to create `~/.kube` and set `0700` permissions.
- The manual install prerequisites enabled the deprecated `storage` addon. Current MicroK8s documentation marks `storage` as deprecated and replaced by `hostpath-storage`, so I updated the command.
- The Istio download step pinned `cd istio-1.24.0`, which is stale for the current release stream. I updated it to `istio-1.30.0`.
- The edge resource estimate implied sidecar overhead was per service. Sidecars are injected per workload pod, so I clarified the example as 10 single-replica services.

## Review Notes
The tutorial still uses the Istio APIs Bookinfo gateway path, which remains documented and valid. The Istio docs are increasingly emphasizing the Kubernetes Gateway API in getting-started flows, so a future refresh could add that path, but it was not required for correctness.
