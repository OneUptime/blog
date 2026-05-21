# Validation Summary: How to Set Up Istio on k3d for Lightweight Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- k3d
- k3s
- Kubernetes
- Docker
- kubectl
- istioctl
- GitLab CI

## Sources Consulted
- Istio download documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio k3d platform setup documentation: https://istio.io/latest/docs/setup/platform-setup/k3d/
- Istio Bookinfo application documentation: https://istio.io/latest/docs/examples/bookinfo/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- k3d cluster create command reference: https://k3d.io/stable/usage/commands/k3d_cluster_create/
- k3d node filters documentation: https://k3d.io/stable/design/concepts/
- k3d K3s features and ServiceLB notes: https://k3d.io/stable/usage/k3s/
- k3d image import command reference: https://k3d.io/stable/usage/commands/k3d_image_import/
- K3s networking services and ServiceLB documentation: https://docs.k3s.io/networking/networking-services

## Issues Found
- The Istio install snippet used `cd istio-1.24.0` after running `curl -L https://istio.io/downloadIstio | sh -`. The official download script downloads the latest release by default, so this command can fail when the latest extracted directory is not `istio-1.24.0`. Changed it to `cd istio-*` so it follows the downloaded release directory.
- The GitLab CI example used `export PATH=$PWD/istio-*/bin:$PATH`. In Bash, pathname expansion is not applied to the right-hand side of an assignment, so the `*` would remain literal and `istioctl` would not be found. Changed the example to resolve the extracted Istio directory into `ISTIO_DIR` first, then prepend `$ISTIO_DIR/bin` to `PATH`.

## Review Notes
- The Istio APIs Bookinfo gateway manifest used in the post is still documented by Istio, although the current getting-started flow also emphasizes the Kubernetes Gateway API.
- Istio's current documentation includes k3d and k3s platform profiles. The post's `demo` profile approach remains valid for local evaluation because the `demo` profile installs the ingress gateway, but production or more platform-specific installs should follow Istio's current platform setup guidance.
