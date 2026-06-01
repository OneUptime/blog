# Validation Summary: How to Upgrade EKS Cluster Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes
- AWS CLI
- eksctl
- EKS managed node groups
- EKS add-ons
- Cluster Autoscaler

## Sources Consulted
- Amazon EKS User Guide: Understand the Kubernetes version lifecycle on EKS - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS User Guide: Update existing cluster to new Kubernetes version - https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html
- Amazon EKS User Guide: Update a managed node group for your cluster - https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- Amazon EKS User Guide: Understand each phase of node updates - https://docs.aws.amazon.com/eks/latest/userguide/managed-node-update-behavior.html
- AWS CLI Command Reference: update-cluster-version - https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-version.html
- AWS CLI Command Reference: describe-cluster-versions - https://docs.aws.amazon.com/cli/latest/reference/eks/describe-cluster-versions.html
- AWS CLI Command Reference: describe-addon-versions - https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html
- AWS CLI Command Reference: update-addon - https://docs.aws.amazon.com/cli/latest/reference/eks/update-addon.html
- AWS CLI Command Reference: update-nodegroup-version - https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-version.html
- AWS CLI Command Reference: update-nodegroup-config - https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-config.html
- eksctl User Guide: Cluster upgrades - https://docs.aws.amazon.com/eks/latest/eksctl/cluster-upgrade.html
- eksctl User Guide: EKS managed nodegroups - https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- Kubernetes Documentation: Version skew policy - https://kubernetes.io/releases/version-skew-policy/
- Kubernetes Autoscaler releases - https://github.com/kubernetes/autoscaler/releases

## Issues Found
- The command presented as a way to list currently supported EKS Kubernetes versions used `describe-addon-versions` and only queried compatibility from the first add-on result. I changed it to `aws eks describe-cluster-versions`, which is the AWS CLI command for EKS Kubernetes version support metadata.
- The control plane upgrade section did not mention the documented prerequisite that managed node groups and Fargate nodes should be on the same minor version as the current control plane before upgrading. I added that caveat.
- The control plane upgrade text implied API server unavailability of a specific duration. AWS documents a highly available rolling API server replacement and recommends client reconnect handling, so I changed the wording to avoid an unsupported timing claim.
- The managed node group rollout example used `aws eks update-nodegroup-version --update-config`, but `--update-config` belongs to `aws eks update-nodegroup-config`. I corrected the command.
- The eksctl automation section said `eksctl upgrade cluster -f cluster-config.yaml --approve` upgrades everything. Official eksctl documentation treats that as a control plane upgrade; managed node groups are upgraded separately. I corrected the wording and added the separate node group upgrade command.
- The examples used Kubernetes `1.29`, which is no longer listed as a supported EKS version as of June 1, 2026. I updated the examples to Kubernetes `1.35`, which is currently in EKS standard support.
- The add-on update examples hard-coded old add-on versions for the original `1.29` example. I replaced them with shell variables and an instruction to use compatible versions returned by the compatibility check.

## Review Notes
- The post now uses Kubernetes `1.35` as an example target version. Future reviews should refresh this example when EKS support windows change.
- The add-on update commands intentionally use variables for version values. In production, readers should select currently compatible or recommended add-on versions from `aws eks describe-addon-versions` for their cluster version and region.
- AWS CLI and eksctl were not installed in the local environment, so command syntax was verified against official documentation rather than local `--help` output.
