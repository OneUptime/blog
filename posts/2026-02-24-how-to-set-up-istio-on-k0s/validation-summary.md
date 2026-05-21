# Validation Summary: How to Set Up Istio on k0s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- k0s
- Kubernetes
- Kubernetes Services, Deployments, and NodePort
- IstioOperator
- Istio Gateway and VirtualService
- Istio sidecar injection
- Istio observability add-ons

## Sources Consulted
- k0s Quick Start Guide: https://docs.k0sproject.io/head/install/
- k0s Networking documentation: https://docs.k0sproject.io/stable/networking/
- k0s Runtime (CRI) documentation: https://docs.k0sproject.io/v1.33.4+k0s.0/runtime/
- k0s `config create` CLI documentation: https://docs.k0sproject.io/v1.32.12+k0s.1/cli/k0s_config_create/
- Istio install with `istioctl`: https://istio.io/latest/docs/setup/install/istioctl/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio canary upgrade documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio download documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio Prometheus, Kiali, Grafana, and Jaeger integration documentation: https://istio.io/latest/docs/ops/integrations/

## Issues Found
- The Istio prerequisite and add-on URLs referenced Istio 1.20, which is end-of-life. Updated the prerequisite to a current supported Istio release and changed sample add-on URLs to the `release-1.30` branch.
- The k0s prerequisite allowed Kubernetes/k0s versions that are no longer supported by current Istio releases. Updated it to k0s 1.32+ for current supported Istio releases.
- The k0s install command used an older download-script invocation. Updated it to the current documented TLS-constrained `curl` command.
- The `--single` explanation omitted the current k0s caveat that such clusters cannot be extended later. Added the documented `--enable-worker --no-taints` alternative for users who may add nodes later.
- The runtime statement implied first-class Docker runtime support. Updated it to explain that k0s bundles containerd by default and can use Docker through cri-dockerd or other CRI-compatible runtimes.
- The network-policy check implied that `k0s config create` shows the active cluster config. Corrected the wording to say it generates defaults for comparison and that users should inspect the active config they installed with.
- The canary upgrade example used an obsolete revision name. Updated the revision label example from `1-21` to `1-30`.

## Review Notes
- The Istio sample add-on manifests are suitable for quick-start or demonstration use; Istio documents them as not tuned for production performance or security.
- The YAML examples were syntax-checked successfully.
