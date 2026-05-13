# Validation Summary: How to Operationalize Calico VPP Troubleshooting

## Status
validated

## Post Type
Operational guide / runbook (includes shell scripts, kubectl commands, vppctl commands, and a Mermaid process flowchart)

## Technologies Covered
- Calico VPP dataplane (projectcalico/vpp-dataplane)
- VPP (FD.io Vector Packet Processing) — vppctl CLI
- Kubernetes (kubectl, DaemonSets, CRDs: Installation, FelixConfiguration)
- Bash scripting
- Mermaid (flowchart diagram)
- Tigera Support escalation processes

## Sources Consulted
- projectcalico/vpp-dataplane official manifests: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/master/yaml/base/calico-vpp-daemonset.yaml
- Tigera Calico VPP documentation: https://docs.tigera.io/calico/latest/reference/vpp/
- FD.io VPP CLI reference: https://s3-docs.fd.io/vpp/ (commands `show errors`, `show interface`, `show ip fib`, `show nat44 summary`, `show hardware-interfaces`, `show version`)
- Kubernetes documentation for label selectors and `kubectl get pods -l` syntax

## Issues Found
1. **Incorrect container name (`calico-vpp-manager` → `agent`)**: The post referenced a container named `calico-vpp-manager` in three places (P1 runbook log collection, the support bundle script, and the agent log filename). The actual DaemonSet manifest in projectcalico/vpp-dataplane defines two containers: `vpp` and `agent`. `calico-vpp-manager` is not a real container name (it conflates the `vpp-manager` binary that runs inside the `vpp` container with a separate container). Updated all three references to `agent` and renamed `manager-logs.txt` to `agent-logs.txt`.

2. **Incorrect pod label selector (`app=calico-vpp-node` → `k8s-app=calico-vpp-node`)**: The support bundle script used `-l app=calico-vpp-node`, which would match zero pods. The DaemonSet's `matchLabels` uses the key `k8s-app`, not `app`. Updated the selector to `k8s-app=calico-vpp-node`.

3. **Incorrect VPP CLI command (`show error` → `show errors`)**: The canonical VPP CLI command for displaying VLIB node error counters is `show errors` (plural). Fixed three occurrences: in the support-bundle script's command list, in the on-call lab-exercise description, and in the command-fluency bullet.

## Review Notes
- The kubectl invocations for `kubectl get installation default -o yaml` and `kubectl get felixconfiguration default -o yaml` are correct CRD names for operator-managed Calico installations (operator.tigera.io/v1 Installation; crd.projectcalico.org/v1 FelixConfiguration).
- The `calico-vpp-dataplane` namespace is correct for the manifest-based VPP dataplane install.
- The `2>/dev/null || true` pattern after each `kubectl exec ... vppctl` is appropriate defensive scripting — it prevents the bundle script from aborting if a single command (e.g., `show nat44 summary` on a cluster without NAT44) fails.
- `show nat44 summary` requires the NAT44 plugin to be loaded; on clusters not using VPP-side NAT it will fail silently, which is acceptable behavior here.
- The runbook's `kubectl delete pod` restart approach is safe because the DaemonSet controller will recreate the pod, as the post correctly notes; however, on nodes where VPP holds the only datapath, this restart causes a brief node-wide outage — operators should be aware. Not changed since the post is explicit about the operation being a remediation step.
