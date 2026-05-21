# Validation Summary: How to Deploy Istio on ARM-Based Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Istio
- Kubernetes
- ARM64
- AWS Graviton / EKS
- Helm
- istioctl
- Docker multi-architecture image manifests
- Istio CNI

## Sources Consulted
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.15 release announcement for arm64 support: https://istio.io/latest/news/releases/1.15.x/announcing-1.15/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio 2026 container registry migration notice: https://istio.io/latest/blog/2026/retirement-of-gcr.io/
- Kubernetes node labels populated by kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Docker manifest inspection for `registry.istio.io/release/pilot:1.30.0` and `kong/httpbin:latest`

## Issues Found
- The post recommended Istio 1.20.0, which is no longer supported. Updated examples to Istio 1.30.0 and adjusted the Kubernetes prerequisite to the supported Kubernetes range for Istio 1.30.
- The node architecture verification command used `kubectl get nodes -o wide` and referred to an `ARCH` column. Replaced it with `kubectl get nodes -L kubernetes.io/arch`, which exposes the standard Kubernetes architecture label.
- The image registry text mentioned Docker Hub and `gcr.io` without noting Istio's current registry migration. Updated the guidance to use `registry.istio.io/release` for current releases and changed the manifest inspection command accordingly.
- The Helm base chart command omitted the current documented `--set defaultRevision=default` value. Added it to match Istio's Helm installation guide.
- The CNI troubleshooting text said Istio CNI avoids iptables entirely. Corrected it to say Istio CNI avoids privileged per-workload `istio-init` containers while still configuring pod traffic redirection.
- The summary recommended Istio CNI for iptables compatibility issues. Corrected it to recommend CNI when avoiding privileged init containers in workload pods.

## Review Notes
The remaining examples are syntactically valid for standard Kubernetes resources and IstioOperator configuration. The `kong/httpbin:latest` sample image has both linux/amd64 and linux/arm64 manifest entries at review time.
