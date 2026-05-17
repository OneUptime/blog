# Validation Summary: How to Configure Auto Scaling Groups with Talos Linux on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- AWS EC2 Launch Templates
- AWS Auto Scaling Groups (ASG)
- Kubernetes Cluster Autoscaler
- Kubernetes RBAC
- AWS IAM
- AWS CLI
- kubectl

## Sources Consulted
- Kubernetes Cluster Autoscaler official RBAC manifest: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
- Kubernetes Cluster Autoscaler AWS README (IAM policy): https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler image registry: registry.k8s.io/autoscaling/cluster-autoscaler
- AWS CLI `create-launch-template` and `create-auto-scaling-group` reference documentation
- AWS EC2 launch template `Version` parameter syntax ($Latest / $Default)
- Talos Linux AWS guide: https://www.talos.dev/latest/talos-guides/install/cloud-platforms/aws/

## Issues Found
1. **Incomplete RBAC for cluster-autoscaler** — The original ClusterRole was missing several permissions that would cause the autoscaler to fail in production:
   - Missing `update` verb on `nodes` (required for tainting nodes during scale-down — without this, scale-down silently fails).
   - Missing `namespaces` resource (required for pod scheduling simulation).
   - Missing `poddisruptionbudgets` in the `policy` API group (required for safe eviction).
   - Missing `jobs` in `batch`/`extensions` API groups (required for batch workload handling).
   - Missing the leader-election `endpoints` rule scoped to the `cluster-autoscaler` resource name.
   - The `leases` rule combined `create` with `get`/`update` on all leases instead of the standard split where `get`/`update` are scoped to the `cluster-autoscaler` lease only.
   
   Fixed by replacing the rules block with the official RBAC from the upstream `cluster-autoscaler-autodiscover.yaml` manifest.

2. **Incomplete IAM policy** — Added missing actions from the official AWS cluster-autoscaler IAM policy:
   - `ec2:DescribeImages` (used when evaluating instance launch parameters).
   - `ec2:GetInstanceTypesFromInstanceRequirements` (used for instance requirements-based ASGs).

## Review Notes
- The `base64 -i worker.yaml` command uses macOS syntax for specifying an input file. On Linux GNU coreutils, `-i` means `--ignore-garbage`; the file would still be read as a positional argument so the command works on both platforms, but the flag has different semantics. Not changed because it functions correctly on both, and on Linux users would more typically use `base64 -w 0 worker.yaml` to avoid line wrapping when embedding into UserData.
- The Cluster Autoscaler image `v1.29.0` is valid and published, though newer versions exist (v1.32.x is current upstream). Readers should align the Cluster Autoscaler minor version with their Kubernetes cluster version.
- The `$Latest` literal in `LaunchTemplateName=talos-workers,Version='$Latest'` is correct AWS CLI syntax for "latest version". The surrounding single quotes correctly prevent shell expansion.
- The `--node-group-auto-discovery=asg:tag=...` syntax is correct.
- The `MetadataOptions` block with IMDSv2 enforcement and `HttpPutResponseHopLimit: 2` is a documented best practice for containerized workloads that need to reach IMDS through the pod network.
- The RBAC's `ClusterRoleBinding` is namespace-scoped via the service account subject and matches the role correctly.
