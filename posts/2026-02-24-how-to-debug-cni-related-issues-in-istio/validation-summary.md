# Validation Summary: How to Debug CNI-Related Issues in Istio

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio CNI node agent
- Istio sidecar traffic redirection
- Kubernetes Pods, DaemonSets, events, and node debugging
- CNI configuration files and chained CNI plugins
- iptables-based traffic interception
- istioctl and kubectl CLI workflows

## Sources Consulted
- Istio CNI node agent installation and operation guide: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio CNI troubleshooting guide: https://istio.io/latest/docs/ops/diagnostic-tools/cni/
- Istio install-cni command reference: https://istio.io/latest/docs/reference/commands/install-cni/
- Istio sidecar upgrade with Helm guide: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio ambient upgrade with Helm guide, for current CNI upgrade compatibility caveats: https://istio.io/latest/docs/ambient/upgrade/helm/
- Istio platform requirements for iptables and nftables backends: https://istio.io/latest/docs/ops/deployment/platform-requirements/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The CNI configuration inspection command assumed a Calico-specific file name, `/host/etc/cni/net.d/10-calico.conflist`. I changed it to list the CNI config directory and inspect matching CNI config files so the guidance applies to other primary CNIs and to customized `values.cni.cniConfFileName` deployments.
- The iptables inspection command used `iptables -t nat -L -n -v` from the `istio-proxy` container without caveats. Modern proxy containers may not include the tool or have permission to read rules. I changed the command to `iptables-save -t nat` and added a note to use a privileged node debug session when container permissions or tooling prevent direct inspection.
- The iptables inspection section did not mention that current Istio can use either iptables or nftables for traffic management. I scoped that check to Istio's default iptables backend.
- The upgrade order said to upgrade the Istio CNI DaemonSet before istiod and gateways as a universal rule. Official Istio guidance says in-place upgrades can upgrade CNI with the control plane, Helm installs upgrade the CNI chart separately, and canary upgrades should operate CNI separately because it is a singleton. I replaced the ordering with that version-neutral guidance and added `istioctl x precheck`.
- The CNI version command used `/opt/cni/bin/istio-cni version`, but the official command reference documents `install-cni version` for the install-cni container. I changed the command accordingly.
- The debug-bundle loop used `kubectl debug node/$node -it` and a Calico-specific file path. I removed the interactive TTY, added explicit `--attach=true`, and changed the command to inspect the configured CNI directory generically.

## Review Notes
The post is sidecar-focused, while current Istio CNI also applies to ambient mode where the CNI node agent is required. The existing guide remains technically valid for sidecar-mode troubleshooting after the fixes above, but a future update could explicitly distinguish sidecar and ambient workflows.
