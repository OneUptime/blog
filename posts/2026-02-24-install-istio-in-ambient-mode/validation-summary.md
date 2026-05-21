# Validation Summary: How to Install Istio in Ambient Mode

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio ambient mode
- Kubernetes
- istioctl
- Helm
- Istio CNI
- ztunnel
- Istio Operator
- Kubernetes Gateway / ingress gateway

## Sources Consulted
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio ambient install with Helm: https://istio.io/latest/docs/ambient/install/helm/
- Istio ambient platform-specific prerequisites: https://istio.io/latest/docs/ambient/install/platform-prerequisites/
- Istio supported releases and supported Kubernetes versions: https://istio.io/latest/docs/releases/supported-releases/
- Istio in-cluster Operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio CNI installation documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Local Istio 1.30.0 `istioctl` command help and manifest generation output.

## Issues Found
- The post pinned Istio 1.24.0 and described Kubernetes 1.27+ / istioctl 1.22+ as prerequisites. Istio 1.24 is no longer supported, and current Istio releases have version-specific Kubernetes support windows. Updated the example to Istio 1.30.0 and changed the prerequisite text to require a supported Kubernetes version and matching `istioctl`.
- The introduction said ambient installs ztunnel and istio-cni instead of the sidecar injector, and the verification section said no sidecar injector webhook should be present. Current ambient profile manifests can still include the sidecar injector webhook; ambient workloads simply do not require sidecar injection. Updated those claims.
- The `istioctl` customization example used `values.global.proxy.resources`, which configures proxy resources rather than ztunnel. Changed it to `values.ztunnel.resources`.
- The Helm ambient install commands for `istiod` and `istio-cni` omitted `--set profile=ambient`. Added the required profile setting to both commands.
- The Istio Operator section presented the in-cluster Operator as a current installation method. Updated it to clearly identify the Operator path as legacy because the in-cluster Operator was deprecated in Istio 1.23 and removed in Istio 1.24.
- The Helm ingress gateway command installed the gateway chart into `istio-system`. Current Istio ambient Helm docs install the gateway chart into a separate `istio-ingress` namespace with `--create-namespace --wait`; updated the command.
- The GKE CNI troubleshooting example used an outdated `cni.cniBinDir` override for a Helm install. Updated it to use the GKE platform profile and added the required `system-node-critical` / `ResourceQuota` caveat for GKE.

## Review Notes
The telemetry addon examples are still sample-only installation commands and are appropriate for a tutorial, but production observability installations should usually be managed with dedicated charts or platform tooling rather than `samples/addons/`.
