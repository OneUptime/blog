# Validation Summary: How to Migrate from Istio Sidecar Mode to Ambient Mesh Without Downtime

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio ambient mesh
- Istio sidecar mode
- ztunnel
- waypoint proxies
- Kubernetes
- Kubernetes Gateway API
- Gateway API HTTPRoute
- Prometheus / PromQL

## Sources Consulted
- Istio ambient migration overview: https://istio.io/latest/docs/ambient/migrate/
- Istio install ambient components migration guide: https://istio.io/latest/docs/ambient/migrate/install-ambient-components/
- Istio enable ambient mode migration guide: https://istio.io/latest/docs/ambient/migrate/enable-ambient-mode/
- Istio migrate policies guide: https://istio.io/latest/docs/ambient/migrate/migrate-policies/
- Istio add workloads to ambient mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio waypoint proxy configuration: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio verify mTLS in ambient mode: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio data plane modes overview: https://istio.io/latest/docs/overview/dataplane-modes/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The post claimed a general zero-downtime migration. Current Istio documentation states that workloads with continuous L7 policy enforcement needs do not have a full zero-downtime migration path because there is an L7 enforcement gap during policy migration. Updated the title, metadata, introduction, and conclusion to describe minimal downtime risk and call out the L7 caveat.
- The prerequisite version claim said Istio 1.18 or later was required. Updated this to recommend a supported Istio release and note that ambient mode became production-ready for single-cluster use cases in Istio 1.22.
- The ambient installation example used an IstioOperator snippet that did not reflect current migration guidance. Replaced it with `istioctl upgrade --set profile=ambient`, Gateway API CRD installation for waypoint users, and the required sidecar restart step for HBONE interoperability.
- The cross-mode validation used sidecar proxy logs, which are not a reliable default validation path. Replaced it with `istioctl ztunnel-config workloads`.
- The rollback commands used `kubectl rollout undo` after removing sidecars. Updated rollback to re-add injection labels and restart deployments so sidecars are re-injected.
- The waypoint Gateway manifest used the wrong listener shape for Istio waypoints and enrolled the waypoint too early. Replaced it with `istioctl waypoint apply`, Istio-managed waypoint verification, and explicit enrollment after sidecars are removed.
- The mTLS validation command used outdated experimental syntax. Replaced it with `istioctl ztunnel-config workloads` and corrected the plaintext test pod command with `--restart=Never`.
- The traffic policy section claimed VirtualServices continue working normally in ambient mode. Updated it to explain that stable L7 routing should use Gateway API HTTPRoute, and replaced the VirtualService subset example with HTTPRoute plus version-specific Services.
- YAML examples used `$NAMESPACE` inside manifest files, which `kubectl apply -f` does not expand. Replaced those manifest namespace values with the concrete namespace used in the tutorial.
- The PromQL resource savings example divided ztunnel memory by `count(node_cpu_seconds_total)`, which counts CPU time series rather than nodes. Replaced it with a direct ztunnel memory sum and softened the unsupported 50-70% savings claim.
- The completion step suggested deleting the `istio-sidecar-injector` MutatingWebhookConfiguration directly. Replaced it with a safer note to uninstall or disable the old injection revision only after verifying no workloads depend on it.

## Review Notes
`kubectl` is not installed in the local environment, so CLI syntax was checked against the official Kubernetes generated command reference rather than local `--help` output.
