# Validation Summary: How to Set Up Cluster Autoscaler on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Cluster Autoscaler (v1.29.0)
- Talos Linux
- AWS Auto Scaling Groups (ASG)
- AWS IAM (including IRSA)
- kubectl, talosctl
- Kubernetes RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding)
- AWS EC2 launch templates / user data

## Sources Consulted
- Kubernetes Autoscaler FAQ — https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler on AWS docs — https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler example RBAC manifest (kubernetes/autoscaler repo)
- Talos Linux docs — https://www.talos.dev/ (talosctl gen config command syntax)
- AWS IAM Action Reference for autoscaling and ec2

## Issues Found
1. **Incorrect flag description for `--max-graceful-termination-sec=600`.** The post described it as "Maximum number of nodes that can be removed simultaneously," which is wrong. According to the Cluster Autoscaler FAQ, this flag sets the maximum number of *seconds* the Cluster Autoscaler waits for pod termination when draining a node during scale-down (default 600s). The "max nodes removed simultaneously" behavior is governed by different flags (`--max-empty-bulk-delete` or `--max-scale-down-parallelism`). Fixed the inline comment to: "Maximum seconds to wait for pod termination when draining a node."

## Review Notes
- The Cluster Autoscaler image `registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0` is valid; users should match the autoscaler minor version to their cluster's Kubernetes minor version per upstream guidance.
- The IAM policy includes a few actions beyond the minimum (`autoscaling:DescribeScalingActivities`, `ec2:DescribeImages`, `ec2:GetInstanceTypesFromInstanceRequirements`, `eks:DescribeNodegroup`); these are valid AWS actions and harmless to grant, though `eks:DescribeNodegroup` is only relevant on EKS — on a self-managed Talos cluster it is unused but not harmful.
- The ASG auto-discovery tag pattern (`k8s.io/cluster-autoscaler/enabled` + `k8s.io/cluster-autoscaler/<cluster-name>=owned`) matches the documented convention.
- Defaults cited in the post are accurate: `--scale-down-unneeded-time` default is 10m, `--scale-down-utilization-threshold` is 0.5, `--max-node-provision-time` is 15m.
- The `--scale-down-delay-after-delete` upstream default is actually `0s` (falls back to `scan-interval`), not `1m` — but the post sets `1m` as a user-chosen value, which is fine; the inline comment is descriptive of the flag's purpose, not the default.
- `extensions/v1beta1` is referenced in the ClusterRole rules for replicasets/daemonsets. This API group has been removed from Kubernetes since v1.16; however, the upstream Cluster Autoscaler reference RBAC still includes it for backwards-compatibility and it does not cause errors when applied to modern clusters (the rule simply matches nothing). Left as-is to mirror the official example manifest.
- `talosctl gen config <cluster-name> <endpoint>` syntax is correct and produces `controlplane.yaml`, `worker.yaml`, and `talosconfig` in the current directory.
