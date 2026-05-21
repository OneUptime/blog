# Validation Summary: How to Install the Istio CNI Node Agent

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio CNI node agent
- Istio sidecar injection
- Kubernetes CNI
- Kubernetes DaemonSets
- Helm
- istioctl
- kubectl

## Sources Consulted
- Istio official documentation: Install the Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio official documentation: Install with Helm - https://istio.io/latest/docs/setup/install/helm/
- Istio official documentation: IstioOperator Options - https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio official documentation: Platform-Specific Prerequisites - https://istio.io/latest/docs/ambient/install/platform-prerequisites/
- Istio official documentation: install-cni command reference - https://istio.io/latest/docs/reference/commands/install-cni/
- Istio official chart defaults: istio-cni values.yaml - https://github.com/istio/istio/blob/master/manifests/charts/istio-cni/values.yaml
- Istio official chart defaults: istiod values.yaml - https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio official platform profiles - https://github.com/istio/istio/tree/master/manifests/helm-profiles

## Issues Found
- The Helm install examples used `cni.cniBinDir` and `cni.cniConfDir`, but the standalone `istio/cni` chart accepts these as top-level values. Updated the commands to use `cniBinDir` and `cniConfDir`.
- The Helm `istiod` examples used `istio_cni.enabled` and `istio_cni.chained`, which are not the current chart values. Updated them to use `pilot.cni.enabled=true`.
- The platform path table had outdated or incomplete CNI binary paths for GKE, k3s, and MicroK8s. Updated them to match Istio platform guidance and platform profile defaults.
- The GKE Helm example manually set an old binary path. Updated it to use `global.platform=gke`, which is the documented Istio platform override.
- The traffic verification command targeted `deploy/httpbin`, but `kubectl run httpbin` creates a Pod, not a Deployment. Replaced it with an `istioctl proxy-config` command using the created pod name.
- The detailed Helm values file was nested under `cni:`, which is incorrect for the standalone CNI chart. Moved the values to the top level and corrected `logging.level`, `repair.repairPods`, and related repair settings.
- The repair-mode example used nested `cni.repair` Helm values and omitted the newer `repairPods` mode. Updated it to top-level `repair` values and explained the Istio 1.21+ default.
- The upgrade guidance implied the CNI must always be upgraded first. Updated it to match Istio guidance that CNI and control plane are compatible within one minor version and that CNI should be managed separately for canary upgrades because it is a singleton.

## Review Notes
The post is technically relevant and valid after the corrections. Some verification commands still assume the default CNI install paths and a Calico config filename; the post already frames these paths as examples, so no further correction was required.
