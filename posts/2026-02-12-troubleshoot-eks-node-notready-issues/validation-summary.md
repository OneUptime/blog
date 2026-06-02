# Validation Summary: How to Troubleshoot EKS Node NotReady Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon EKS
- Amazon EC2
- AWS CLI
- Kubernetes nodes, kubelet, events, and drain workflow
- containerd and crictl
- CoreDNS and Amazon VPC CNI
- Linux systemd, journalctl, disk, memory, and process diagnostics

## Sources Consulted
- Kubernetes Node Status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- AWS CLI describe-instance-status reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-status.html
- Amazon EKS optimized Amazon Linux AMI documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon EKS aws-auth ConfigMap documentation: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Kubernetes SIGs cri-tools crictl documentation and releases: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md and https://github.com/kubernetes-sigs/cri-tools/releases

## Issues Found
- The node conditions introduction implied that any unhealthy pressure or network condition directly transitions a node to NotReady. Updated the wording to clarify that `Ready` is the direct NotReady indicator, while pressure and network conditions identify common causes.
- The EC2 status commands used `describe-instance-status` without `--include-all-instances`, even though the text discusses stopped instances. Added `--include-all-instances` so stopped instances are included in the response.
- The kubelet OOM wording used `OOMKilled`, which is more commonly a container status reason. Changed it to refer to Linux OOM kills of kubelet or other critical node processes.
- The disk check included `/var/lib/docker` alongside containerd storage. Current EKS optimized Linux AMIs use containerd, so the command now checks `/` and `/var/lib/containerd`.
- The API endpoint connectivity command did not make clear that this is a connectivity/TLS check. Added verbose curl output with `-vk`.
- The DNS troubleshooting command attempted to resolve the Kubernetes service DNS name from the node host. That name is intended for in-cluster DNS. Updated the node-host check to resolve the EKS API hostname and added a pod-based check for `kubernetes.default.svc.cluster.local`.
- The container runtime statement was too broad for all possible EKS node images. Updated it to refer specifically to current EKS optimized Linux AMIs.
- The node flapping section said to increase `node-status-update-frequency`, which is ambiguous and could be counterproductive. Changed it to recommend checking the setting before considering heartbeat tuning.

## Review Notes
The linked OneUptime internal blog URLs are plausible, but they were not treated as authoritative sources for Kubernetes or AWS behavior. The `aws-auth` ConfigMap remains relevant for existing EKS clusters and node bootstrap paths, but AWS now documents it as deprecated for general IAM access management in favor of EKS access entries.
