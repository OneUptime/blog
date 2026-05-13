# Validation Summary: How to Diagnose MySQL Replication Problems in Calico Networks

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes
- Calico
- calicoctl
- MySQL
- NetworkPolicy
- BGP routing
- iptables

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- MySQL connection documentation: https://dev.mysql.com/doc/refman/8.4/en/connecting.html

## Issues Found
- The post said IPAM exhaustion could cause pods to receive incorrect IP addresses. Calico/Kubernetes IPAM exhaustion more commonly causes IP allocation failure, so this was corrected.
- The WorkloadEndpoint detail command used unsupported `calicoctl get` flags (`--node`, `--orchestrator`, and `--workload`). It was replaced with a namespace-scoped `calicoctl get workloadendpoints -o yaml` lookup filtered by pod name.
- The WorkloadEndpoint explanation overstated the direct consequence as Felix being unable to apply policy. It was changed to describe the more accurate underlying signal: a likely CNI or Calico datastore issue.
- The BGP check did not mention that `calicoctl node status` is a node-local command. A note was added to run it on the node being troubleshot.
- The named ports best practice incorrectly described `3306` as a named port. It now distinguishes a named port such as `mysql` from the numeric port `3306`.
- The pod IP stability recommendation implied MySQL pods should use stable pod IPs. It was corrected to recommend stable DNS names from a headless Service because Kubernetes pod IPs can change after restarts.

## Review Notes
The remaining commands are reasonable troubleshooting examples, but some operational details can vary by Calico installation mode. For example, the Calico namespace, pod labels, and availability of iptables tooling inside the Calico node container may differ between operator-based and manifest-based installations.
