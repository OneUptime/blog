# Validation Summary: How to Handle Istio State During Kubernetes Cluster Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes
- kubectl
- istioctl
- Istio CRDs and Gateway API resources
- Istio certificate management and mTLS

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio plug in CA certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio multicluster prerequisites and shared root CA guidance: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio configuration analysis with istioctl: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio command reference for proxy-status and proxy-config secret: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio TrafficExtension announcement: https://istio.io/latest/blog/2026/traffic-extension-api/
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes Service and LoadBalancer documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The inventory command omitted the `extensions.istio.io` API group, so Istio extension resources such as WasmPlugin and newer TrafficExtension resources could be missed. Added the extensions API group and updated the inventory checklist.
- The export commands used short resource names such as `gateways`, which can be ambiguous when both Istio Gateway and Kubernetes Gateway API resources are installed. Changed the export list to fully qualified Istio resource names like `gateways.networking.istio.io`.
- The export script did not include several relevant Istio state resources during import, including `workloadgroups`, `proxyconfigs`, WasmPlugins, and TrafficExtensions. Added them to the export/import flow.
- The post treated a raw `kubectl get istiooperators --all-namespaces -o yaml` export as the file to pass to `istioctl install -f`. Current Istio documentation supports `istioctl install -f` with an IstioOperator configuration file, while recent istioctl/Helm installs do not create an installed-state IstioOperator CRD. Updated the text to prefer the original IstioOperator file or Helm values and to keep the raw export only as an older in-cluster operator fallback.
- The migration checklist did not mention Kubernetes Gateway API resources even though Istio can use Gateway API for traffic management. Added a checklist item and optional export/import command for Gateway API resources.
- The load balancer cutover command only printed `.status.loadBalancer.ingress[0].ip`, but Kubernetes load balancers may publish either an IP or a hostname. Updated the command and surrounding text to handle either field.

## Review Notes
The guide is technically valid after the changes. The post still correctly tells readers to clean exported resources before applying them; this remains important because raw Kubernetes exports contain cluster-specific metadata that should not be reapplied directly. The post does not pin an Istio version, so readers should still test the export/import list against the exact Istio and Gateway API versions installed in their clusters.
