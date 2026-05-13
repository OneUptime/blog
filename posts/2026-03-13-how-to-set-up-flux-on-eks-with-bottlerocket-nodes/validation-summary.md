# Validation Summary: How to Set Up Flux on EKS with Bottlerocket Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- eksctl
- Bottlerocket
- Flux CD
- Kubernetes manifests
- HelmRepository and HelmRelease resources
- Bottlerocket Update Operator (Brupop)
- cert-manager
- AWS Systems Manager Session Manager
- NGINX container deployment

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS Bottlerocket node documentation: https://docs.aws.amazon.com/eks/latest/userguide/launch-node-bottlerocket.html
- AWS Bottlerocket managed node groups announcement and examples: https://aws.amazon.com/blogs/containers/amazon-eks-adds-native-support-for-bottlerocket-in-managed-node-groups/
- eksctl custom AMI and Bottlerocket support: https://docs.aws.amazon.com/eks/latest/eksctl/custom-ami-support.html
- Flux bootstrap GitHub CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Bottlerocket Kubernetes settings reference: https://bottlerocket.dev/en/os/1.53.x/api/settings/kubernetes/
- Bottlerocket restricted filesystem and SELinux behavior: https://bottlerocket.dev/en/os/1.41.x/concepts/restricted-filesystem/
- Bottlerocket host containers and SSM access: https://bottlerocket.dev/en/os/1.57.x/install/quickstart/aws/host-containers/
- Bottlerocket Update Operator documentation: https://github.com/bottlerocket-os/bottlerocket-update-operator
- Bottlerocket Update Operator Helm repository: https://bottlerocket-os.github.io/bottlerocket-update-operator/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/
- AWS CLI `ssm start-session` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html
- NGINX unprivileged image documentation: https://github.com/nginx/docker-nginx-unprivileged

## Issues Found
- The prerequisite eksctl version was outdated. Updated it from `0.170` to `0.215`, matching current Amazon EKS Bottlerocket node documentation.
- The EKS cluster version used `1.29`, which is no longer in current EKS standard or extended support as of May 13, 2026. Updated the example to `1.35`.
- Bottlerocket Kubernetes settings used camelCase keys (`maxPods`, `allowedUnsafeSysctls`) instead of Bottlerocket setting names. Updated them to `max-pods` and `allowed-unsafe-sysctls`.
- Brupop requires node labels for the updater interface. Added `bottlerocket.aws/updater-interface-version: "2.0.0"` to both Bottlerocket node groups.
- The Brupop Flux example omitted cert-manager, omitted the `bottlerocket-shadow` CRD chart, and used incorrect Helm values (`scheduler.cron`, `maxUnavailable`). Added cert-manager, split the Brupop CRD and operator HelmReleases, added dependencies, and changed values to `scheduler_cron_expression` and `max_concurrent_updates`.
- The sample NGINX deployment used the root-oriented `nginx` image with `runAsNonRoot`, port `80`, and a read-only root filesystem. Replaced it with `nginxinc/nginx-unprivileged:1.25-alpine`, changed the container port to `8080`, and kept writable temporary storage at `/tmp`.
- The SSM debugging command used an interactive command document where the Bottlerocket documentation recommends starting a normal SSM session into the control container first. Updated the command and text to start the SSM session, then run `enter-admin-container` from the control container.

## Review Notes
- YAML snippets were parsed successfully after the edits.
- The Flux bootstrap command and GitHub flags are current.
- The Pod Security Standards namespace labels are valid, but the sample application is deployed to `default`, so it is not directly tested against the `restricted` namespace policy shown later.
