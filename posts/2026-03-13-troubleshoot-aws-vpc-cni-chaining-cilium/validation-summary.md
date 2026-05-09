# Validation Summary: Troubleshoot AWS VPC CNI Chaining with Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS VPC CNI
- eBPF
- CNI chaining

## Sources Consulted
- Cilium AWS VPC CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni/
- Cilium CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining.html
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for cilium-dbg endpoint get: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for cilium-dbg monitor: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Amazon EKS best practices for Amazon VPC CNI: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS user guide for Amazon VPC CNI: https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- AWS VPC CNI troubleshooting documentation: https://github.com/aws/amazon-vpc-cni-k8s/blob/master/docs/troubleshooting.md
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- CNI specification: https://www.cni.dev/docs/spec/

## Issues Found
- The `kubectl debug node/...` examples read `/etc/cni/net.d/...` inside the debug container. Kubernetes mounts the node filesystem at `/host`, so the commands were changed to read `/host/etc/cni/net.d/...`.
- The Cilium agent-local commands used `cilium endpoint ...` and `cilium monitor ...`. Current Cilium troubleshooting and command reference documentation uses `cilium-dbg` inside Cilium pods, so these commands were updated to `cilium-dbg endpoint ...` and `cilium-dbg monitor ...`.
- The AWS VPC CNI IP allocation diagnostic used `kubectl describe node ... | grep Allocatable`, which shows Kubernetes allocatable resources and does not directly report the AWS VPC CNI IP pool. It was replaced with AWS VPC CNI ipamd introspection and metrics commands against the `aws-node` pod on the target node.
- The CNI ordering explanation implied multiple CNI config files are processed by lowest number. The wording was corrected to state that kubelet selects the first valid CNI config by lexicographic order, and that chaining order is determined by the active conflist `plugins` list.
- The Cilium ConfigMap grep pattern was tightened to look for current Cilium CNI configuration keys such as `cni-chaining` and `cni-exclusive`.

## Review Notes
The guide is technically relevant and broadly aligned with the official Cilium AWS VPC CNI chaining model: AWS VPC CNI handles pod networking and IPAM, while Cilium attaches eBPF programs for policy enforcement, observability, and related datapath features. Future improvements could mention Cilium's documented AWS VPC CNI minimum version requirement and the need to restart existing pods after enabling chaining so Cilium policy enforcement applies to them.
