# Validation Summary: How to Deploy Istio Ambient Mesh with Ztunnel for Sidecarless mTLS in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Ambient Mesh
- ztunnel
- Kubernetes
- Istio CNI
- Mutual TLS
- Istio AuthorizationPolicy
- Prometheus metrics
- Waypoint proxies

## Sources Consulted
- Istio ambient install with istioctl: https://istio.io/latest/docs/ambient/install/istioctl/
- Istio ambient getting started: https://istio.io/latest/docs/ambient/getting-started/
- Istio supported releases and Kubernetes version support: https://istio.io/latest/docs/releases/supported-releases/
- Istio add workloads to ambient mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio verify mutual TLS in ambient mode: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio ztunnel troubleshooting: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio Layer 4 security policy in ambient mode: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio waypoint proxy configuration: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient traffic redirection architecture: https://istio.io/latest/docs/ambient/architecture/traffic-redirection/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The prerequisites referenced Istio 1.18+ and Kubernetes 1.24+, and the install example pinned Istio 1.20.0. Istio 1.20 is no longer supported, and current Istio 1.30 supports Kubernetes 1.32 through 1.36. Updated the text and install commands to Istio 1.30.0 and the current Kubernetes support range.
- The `kubectl version --short` command used a removed/obsolete flag. Replaced it with `kubectl version`.
- The CNI prerequisite implied ambient works through a generic compatible CNI alone. Clarified that ambient requires the Istio CNI node agent as a chained CNI plugin alongside the cluster primary CNI.
- The ztunnel verification command used the older experimental `istioctl x ztunnel-config workload` form. Updated it to `istioctl ztunnel-config workloads`.
- The certificate inspection command attempted to run `pilot-agent` inside the ztunnel DaemonSet. Replaced it with the documented `istioctl ztunnel-config certificates <ztunnel>.istio-system` command.
- The telemetry section assumed a `prometheus` service exists in `istio-system` after installing the ambient profile. Updated it to say Prometheus must be installed separately and used the documented `istioctl dashboard prometheus` command.
- The AuthorizationPolicy example used `security.istio.io/v1beta1`. Updated it to the current stable `security.istio.io/v1` API.
- The sidecar comparison applied `sleep-app.yaml` with `-n sidecar-test` even though the manifest hard-coded `namespace: default`, so it would not deploy to `sidecar-test`. Updated the command to replace the namespace before applying.
- The troubleshooting command used the older ztunnel-config form. Updated it to `istioctl ztunnel-config workloads`.
- The traffic interception section described ambient interception as node-level eBPF or iptables and checked an `istio-cni-config` ConfigMap in `kube-system`. Updated the description to match Istio's documented in-pod network namespace redirection through the node-local ztunnel and changed the check to the Istio CNI DaemonSet.

## Review Notes
The remaining examples are structurally valid Kubernetes and Istio configuration for a tutorial, but they were not executed locally because `kubectl` and `istioctl` are not installed in this workspace and no Kubernetes cluster context is available.
