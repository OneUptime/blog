# Validation Summary: How to Customize Istio Installation Configuration Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- IstioOperator API
- istioctl
- Envoy sidecar proxy configuration
- Istio CNI
- Helm values passthrough

## Sources Consulted
- Istio Install with Istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Customizing the installation configuration: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Global Mesh Options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Sidecar injection customization: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio in-cluster operator deprecation notice: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio release-1.30 chart values and sidecar injection template: https://github.com/istio/istio/tree/release-1.30/manifests

## Issues Found
- The post said all Istio configuration is expressed through the IstioOperator custom resource and described the structure as having three sections while listing four. Changed this to say Istio installation configuration can be expressed through IstioOperator and that the structure has four main sections.
- The post described `meshConfig.defaultConfig` as applying only to sidecar proxies. Updated the wording to include gateway proxies, matching the MeshConfig `defaultConfig` reference.
- The post showed `sidecar.istio.io/proxyCPU`, `sidecar.istio.io/proxyMemory`, `sidecar.istio.io/proxyCPULimit`, and `sidecar.istio.io/proxyMemoryLimit` as namespace annotations. Istio documents these as pod annotations, so the example was changed to a workload pod template and the section was renamed to workload-level customization.
- The pod annotation example omitted required Kubernetes object shape. Added minimal pod and deployment structure so the examples are syntactically valid Kubernetes YAML.
- The post used `istioctl verify-install -f -` to diff generated manifests against the live cluster. Current `istioctl` documentation does not list `verify-install`; the supported install verification path is `istioctl install --verify`, and live manifest comparison can be done with Kubernetes. Replaced the example with `kubectl diff -f generated.yaml`.

## Review Notes
The post remains version-general and does not pin an Istio release. The reviewed examples align with the current Istio documentation available on 2026-05-21, but users should still check the matching documentation for their installed Istio minor version before applying production configuration.
