# Validation Summary: How to Verify Pod Networking with Calico on MicroK8s

## Status
validated

## Post Type
Tutorial / verification guide

## Technologies Covered
- MicroK8s
- Kubernetes
- Calico CNI
- Calico `calicoctl`
- Kubernetes Services and DNS

## Sources Consulted
- MicroK8s command reference: https://canonical.com/microk8s/docs/command-reference
- MicroK8s CNI configuration: https://canonical.com/microk8s/docs/change-cidr
- Calico quickstart for MicroK8s: https://docs.tigera.io/calico/latest/getting-started/kubernetes/microk8s
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post said to look for `calico: enabled` in `microk8s status`. MicroK8s uses Calico as the default CNI in recent releases, and the official CNI documentation describes Calico as deployed through `calico-node` and `calico-kube-controllers` rather than as a normal addon status entry. I changed the instruction to look for `microk8s is running` and verify Calico through its pods in the next step.
- The prerequisite only mentioned Calico, but the service DNS test depends on cluster DNS being enabled. I changed the prerequisite to require MicroK8s with Calico CNI and DNS enabled.
- The post said `calicoctl node status` should show Felix as running. The official `calicoctl node status` output reports the Calico node process and BGP peering states. I changed the wording to say the command should report that the Calico process is running, with no BGP peers expected on a default single-node VXLAN-backed MicroK8s cluster.

## Review Notes
The remaining Kubernetes and Calico commands are syntactically valid according to the official command references. The local review environment did not have `microk8s`, `kubectl`, or `calicoctl` installed, so command execution was validated against official documentation rather than run against a live cluster.
