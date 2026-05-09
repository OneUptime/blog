# Validation Summary: How to Troubleshoot Calico Node-Level Networking Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- BGP
- Felix
- iptables

## Sources Consulted
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: Troubleshooting and diagnostics - https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico documentation: Configuring calico/node - https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl node diags - https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico documentation: System requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes documentation: kubectl debug reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes documentation: Debug running pods / debug profiles - https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/

## Issues Found
- The `kubectl debug node/... --image=alpine -- nc ...` command did not attach to the debug container, so users would not reliably see the connectivity test result. Added `-it` based on the official `kubectl debug` examples and attach behavior.
- The iptables debug command used the default debug profile and `nsenter`, which may fail for node-level network administration tasks because node debug pods are not privileged by default. Changed it to use `--profile=netadmin` and run `iptables` directly in the host network namespace exposed by node debug pods.
- The post referred to "Felix logs" when grepping for BGP/BIRD errors. Changed this to "calico-node logs" because BGP status is handled by Calico's BIRD/confd components inside the calico-node pod, not Felix alone.
- The introduction said most single-node failures trace to three components, and the conclusion claimed restarting calico-node resolves 60% of single-node Felix failures. These were unsupported quantitative/absolute claims, so they were softened to accurate, non-numeric wording.
- The conclusion said Felix re-establishes BGP peers. Changed this to Calico re-establishing BGP peers, since BGP peering is handled by BIRD/confd in the calico-node pod.

## Review Notes
- The commands assume an operator-based Calico install using the `calico-system` namespace. Calico's official troubleshooting docs note that manifest-based installs commonly use `kube-system`; readers may need to adjust the namespace for their installation.
