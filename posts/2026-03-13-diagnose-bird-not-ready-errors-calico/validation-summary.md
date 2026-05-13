# Validation Summary: How to Diagnose BIRD Not Ready Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- BIRD
- BGP
- calicoctl
- kubectl
- Linux routing tables

## Sources Consulted
- Calico component architecture: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico node readiness configuration: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico BGP peering configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- CalicoNodeStatus resource reference: https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post described BIRD as embedded in each Calico node pod unconditionally. Updated this to clarify that BIRD is used when Calico BGP networking is enabled.
- The post attributed BIRD readiness messages to Felix logs. Updated this to calico-node readiness output, matching Calico's documented readiness behavior.
- The commands hardcoded `kube-system`, while current operator-managed Calico installs commonly use `calico-system`. Added a `CALICO_NS` variable with a note for manifest-based installs.
- `NODE_POD` was populated as `pod/<name>`, but later commands used `kubectl describe pod $NODE_POD` and `kubectl delete pod $NODE_POD`, which mixes separate type arguments with resource/name form. Updated those commands to use `kubectl describe "$NODE_POD"` and `kubectl delete "$NODE_POD"`.
- `calicoctl node status` was presented as a generic remote command. Updated the step to state that it should be run on the affected node, consistent with Calico's documentation that it checks the local Calico node instance.
- The root-cause list overstated BIRD crashes from peer misconfiguration and IP pool overlap behavior. Reworded those items to focus on failed BGP sessions, blocked TCP/179 connectivity, incorrect AS numbers, IPPool overlap validation, and pod CIDR alignment.
- The prevention advice mentioned validating IP pools against node subnets. Updated it to validate against the Kubernetes pod CIDR and existing IP pools.
- The monitoring recommendation implied generic Calico BGP monitoring. Updated it to reference CalicoNodeStatus or Prometheus-based Calico monitoring.

## Review Notes
The guide is accurate as a BGP-focused Calico troubleshooting guide. In VXLAN-only, eBPF, policy-only, or managed cloud-provider deployments, BIRD/BGP may not be part of the active data path, so the symptoms and commands apply specifically when Calico BGP networking is in use.
