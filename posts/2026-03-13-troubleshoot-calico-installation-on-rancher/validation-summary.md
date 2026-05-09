# Validation Summary: How to Troubleshoot Installation Issues with Calico on Rancher

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Rancher
- RKE/RKE1
- Kubernetes
- kubectl
- calicoctl
- Cloud provider networking

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP pool migration guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Azure public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes node debugging with kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- kubectl debug command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- RKE1 provisioning error troubleshooting: https://rke.docs.rancher.com/troubleshooting/provisioning-errors
- Rancher troubleshooting worker nodes and component logs: https://ranchermanager.docs.rancher.com/v2.11/troubleshooting/kubernetes-components/troubleshooting-worker-nodes-and-generic-components

## Issues Found
- The post recommended `rke logs --config cluster.yml`, but the RKE1 CLI does not document a `logs` subcommand for cluster component logs. Replaced it with the documented RKE network plugin deploy job log command and Docker component log checks.
- The post suggested patching an existing IPPool `cidr` as a live fix. Calico documents CIDR changes as an IP pool migration: create a new non-overlapping pool, disable the old pool, and restart affected pods after verification. Replaced the unsafe patch command with that migration flow.
- The cloud provider section implied Azure NSG rules could allow IPIP. Calico documents that Azure blocks IPIP in the network fabric and supports VXLAN mode instead. Updated the wording and kept AWS/GCP firewall checks for protocol 4.
- The Ubuntu debug container command installed `iputils-ping` without first running `apt-get update`, which can fail in a fresh Ubuntu image. Updated the command to run `apt-get update && apt-get install -y iputils-ping`.
- The RKE1 section did not mention current lifecycle status. Added the documented RKE1 end-of-life date and Rancher 2.12+ support caveat.

## Review Notes
- `kubectl delete pod -A --all` is disruptive, but Calico's migration documentation uses pod deletion to force workloads onto the new pool after verification. Operators should run it during a maintenance window.
- The VXLAN patch uses the common Calico IPPool fields `ipipMode: Never` and `vxlanMode: Always`; VXLAN requires UDP 4789 between nodes.
