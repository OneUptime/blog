# Validation Summary: How to Install Istio on kind (Kubernetes in Docker)

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio
- kind (Kubernetes in Docker)
- Kubernetes
- Docker
- MetalLB
- GitHub Actions

## Sources Consulted
- Istio kind platform setup documentation: https://istio.io/latest/docs/setup/platform-setup/kind/
- Istio installation documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio 1.30 ingress gateway Helm chart defaults: https://github.com/istio/istio/blob/1.30.0/manifests/charts/gateways/istio-ingress/values.yaml
- kind quick start and image loading documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- kind configuration documentation for `extraPortMappings`: https://kind.sigs.k8s.io/docs/user/configuration/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- Kubernetes Service documentation for NodePort services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes container image documentation for `imagePullPolicy`: https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- The kind Linux install command pinned kind v0.24.0. Updated it to v0.31.0, the current release used for validation.
- The Istio download command fetches the latest release, but the next command changed into `istio-1.24.0`. Updated it to `istio-1.30.0`, the current Istio release used for validation.
- The JSON patch for `istio-ingressgateway` set NodePorts on `/spec/ports/0` and `/spec/ports/1`. Istio's ingress gateway service defines `status-port` first, followed by `http2` and `https`, so this would map host port 80 to the status port instead of HTTP traffic. Updated the patch to set NodePorts on `/spec/ports/1` and `/spec/ports/2`.
- The IstioOperator NodePort example omitted Istio's default `status-port` service port. Added it so the service override preserves the gateway health/status port while configuring HTTP and HTTPS NodePorts.
- The MetalLB install URL pinned v0.14.8. Updated it to v0.16.0, the current release used for validation.

## Review Notes
The guide is technically relevant and the remaining commands, Kubernetes manifests, kind configuration, local image loading example, and cleanup commands are consistent with the referenced documentation. The GitHub Actions example is a minimal illustrative workflow and may need project-specific test commands or waits for real CI use.
