# Validation Summary: How to Set Up Istio on Canonical MicroK8s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- MicroK8s
- Kubernetes
- IstioOperator
- Istio CNI
- MetalLB
- Calico
- Prometheus
- Grafana
- Kiali
- Jaeger

## Sources Consulted
- MicroK8s getting started documentation: https://microk8s.io/docs/getting-started
- MicroK8s add-ons documentation: https://microk8s.io/docs/addons
- MicroK8s add-on management documentation: https://microk8s.io/docs/howto-addons
- MicroK8s CNI configuration documentation: https://microk8s.io/docs/change-cidr
- MicroK8s hostpath storage add-on documentation: https://microk8s.io/docs/addon-hostpath-storage
- MicroK8s command reference: https://microk8s.io/docs/command-reference
- Snapcraft MicroK8s channel metadata from `snap info microk8s`
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio CNI documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Bookinfo documentation: https://istio.io/latest/docs/examples/bookinfo/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio in-place upgrade documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Canonical MicroK8s community Istio add-on source: https://github.com/canonical/microk8s-addons/tree/master/addons/istio
- Istio 1.30 Bookinfo and observability sample manifests: https://github.com/istio/istio/tree/release-1.30/samples

## Issues Found
- The post described Istio as a built-in MicroK8s add-on. MicroK8s lists Istio in the community add-ons repository, so the wording was changed to "community add-on."
- The install example pinned MicroK8s `1.28/stable` and the manual prerequisite mentioned Istio `1.20+`. Istio 1.20 is end-of-life, and current Istio support covers newer Kubernetes versions, so the examples were updated to MicroK8s `1.35/stable` and a supported Istio release such as `1.30.x`.
- The add-on section claimed the community add-on installs the default Istio profile. The add-on source installs the profile packaged by the add-on, so the wording was corrected.
- The kubeconfig export example wrote to `~/.kube/config` without ensuring `~/.kube` exists. Added `mkdir -p ~/.kube`.
- The verification example used the older standalone `istioctl verify-install` command. Current `istioctl install` supports `--verify`, and `istioctl analyze` is the documented configuration analysis command, so the install and verification commands were updated.
- The CNI section said MicroK8s uses Calico only when enabled and showed `microk8s enable calico`. Current MicroK8s uses Calico by default, and `calico` is not documented as an add-on command. The section was corrected.
- The Bookinfo and observability sample URLs were pinned to Istio `release-1.20`. They were updated to `release-1.30`.
- The Bookinfo VirtualService omitted `/login` and `/logout`, which are present in the official Bookinfo routing sample. Those route matches were added.
- The upgrade section implied a MicroK8s upgrade may update add-on workloads. MicroK8s documentation says workloads and add-ons are not automatically upgraded as part of a MicroK8s upgrade, so the wording was corrected.

## Review Notes
The commands were checked against official documentation and upstream sample manifests, but they were not executed against a live MicroK8s cluster because `microk8s` and `istioctl` are not installed in this review environment.
