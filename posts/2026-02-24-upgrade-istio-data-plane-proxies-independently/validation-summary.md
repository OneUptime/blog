# Validation Summary: How to Upgrade Istio Data Plane Proxies Independently

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar proxies
- istioctl
- kubectl
- awk shell pipelines

## Sources Consulted
- Istio Supported Releases, including control plane/data plane skew policy: https://istio.io/latest/docs/releases/supported-releases/
- Istio In-place Upgrades, including manual data plane restart after control plane upgrade: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio Resource Annotations, including `sidecar.istio.io/proxyImage`: https://istio.io/latest/docs/reference/config/annotations/
- Istio istioctl command reference, including `istioctl proxy-status --output`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `proxy-status` source for current machine-readable output behavior: https://github.com/istio/istio/blob/release-1.30/istioctl/pkg/writer/pilot/status.go
- Kubernetes kubectl rollout command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes StatefulSet tutorial, including partitioned rolling updates: https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/

## Issues Found
- The version examples used Istio 1.21/1.20, which are out of support as of the validation date. Updated examples to 1.30/1.29 and added that the data plane must not run ahead of the control plane.
- The `istioctl proxy-status -o json | jq '.proxy.istioVersion'` examples did not match current Istio `proxy-status` JSON output. Replaced them with table-output `awk` commands that match the current `NAME CLUSTER ISTIOD VERSION` table format.
- The proxy image annotation section implied that a newer data plane proxy could be tested before the control plane was upgraded. Adjusted the wording to say the annotation should only pin a compatible proxy image and should not run the data plane ahead of the control plane.
- The annotation removal command used `kubectl annotate deployment`, which removes annotations from Deployment metadata rather than from the pod template where the example placed the annotation. Replaced it with a JSON patch against `/spec/template/metadata/annotations/sidecar.istio.io~1proxyImage`.
- The cross-version curl checks executed from the `istio-proxy` container, which may not include curl, especially with distroless proxy images. Updated the examples to execute from the application container and use fully qualified service DNS names.

## Review Notes
The remaining rollout commands and StatefulSet/DaemonSet guidance align with current Kubernetes and Istio documentation. The `sidecar.istio.io/proxyImage` annotation is documented by Istio as Alpha, so future posts should mention that caveat if relying on it as a long-term operational mechanism.
