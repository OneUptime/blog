# Validation Summary: Runbook: Pods Cannot Ping Each Other with Calico

## Status
validated

## Post Type
Runbook / On-call operations guide

## Technologies Covered
- Calico (CNI, BGP, BIRD, Felix)
- Kubernetes (NetworkPolicy, pods, kubectl)
- calicoctl CLI
- IP-in-IP / VXLAN encapsulation
- ICMP / pod-to-pod networking
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico documentation: https://docs.tigera.io/calico/latest/
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico IP Pool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kubectl wait: supports multiple resources and `--for=condition=Ready`
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- BusyBox applets (ping is included): https://busybox.net/downloads/BusyBox.html
- Mermaid flowchart syntax (combined edges with `&`): https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

- `kubectl run --image=busybox -n default --restart=Never -- sleep 300`: valid syntax; creates a Pod (since `--restart=Never`).
- `kubectl wait pod/diag-a pod/diag-b --for=condition=Ready --timeout=60s`: valid; kubectl wait accepts multiple resources.
- `kubectl get pod -o jsonpath='{.status.podIP}'` and `'{.spec.nodeName}'`: valid JSONPath expressions.
- `kubectl exec diag-a -- ping -c 3 $B_IP`: valid; BusyBox includes `ping`.
- `kubectl get networkpolicy --all-namespaces --sort-by='.metadata.creationTimestamp' | tail -10`: valid.
- `calicoctl node status`: valid command; outputs BGP peer status from BIRD.
- The calico-node pod-restart loop uses the correct label selector `k8s-app=calico-node` and the standard `kube-system` namespace. Deleting the pod triggers DaemonSet recreation, which restarts BIRD inside the new pod.
- `calicoctl get ippool -o yaml`: valid.
- `calicoctl patch ippool default-ipv4-ippool --patch='{"spec": {"ipipMode": "Always"}}'`: valid calicoctl patch syntax; `default-ipv4-ippool` is the default IPv4 IPPool name created by Calico.
- The Mermaid flowchart uses correct `flowchart TD` syntax, including the `G & I & J --> K` combined-edges form supported by Mermaid.

## Review Notes
- The BIRD restart loop iterates over every `calico-node` pod cluster-wide, not just the "affected nodes" mentioned in the comment. In a real incident, restricting the deletion to affected nodes (e.g., using `--field-selector spec.nodeName=...`) would reduce blast radius, but the script as written is still correct and the `sleep 30` between deletions limits routing disruption.
- The runbook only adjusts `ipipMode`; in clusters using VXLAN, operators would patch `vxlanMode` instead. This is implied by the preceding grep but not spelled out — acceptable for a runbook scope.
- BusyBox `ping` requires the ICMP socket capability inside the container; on most Kubernetes distributions this works out-of-the-box, but on strict Pod Security Standards setups it can fail unrelated to Calico. Not an inaccuracy in the post, just a caveat.
- `calicoctl` is being superseded by the `kubectl-calico` plugin / direct CRD access in newer Calico releases, but `calicoctl` remains supported and is the standard tool referenced in current Calico docs.
