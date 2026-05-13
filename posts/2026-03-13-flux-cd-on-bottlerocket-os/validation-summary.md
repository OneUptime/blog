# Validation Summary: How to Set Up Flux CD on Bottlerocket OS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- AWS EKS
- eksctl
- Bottlerocket OS
- AWS Systems Manager Session Manager
- Bottlerocket Update Operator (BRUPOP)
- Helm / Flux HelmRepository and HelmRelease resources

## Sources Consulted
- AWS eksctl custom AMI support documentation: https://docs.aws.amazon.com/eks/latest/eksctl/custom-ami-support.html
- AWS eksctl managed node groups documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- Flux bootstrap GitHub command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Bottlerocket Kubernetes settings reference: https://bottlerocket.dev/en/os/1.54.x/api/settings/kubernetes/
- Bottlerocket host containers documentation: https://bottlerocket.dev/en/os/1.57.x/install/quickstart/aws/host-containers/
- Bottlerocket kernel settings reference: https://bottlerocket.dev/en/os/1.34.x/api/settings/kernel/
- Bottlerocket Update Operator Helm repository: https://bottlerocket-os.github.io/bottlerocket-update-operator/
- Bottlerocket Update Operator README: https://github.com/bottlerocket-os/bottlerocket-update-operator/blob/develop/README.md

## Issues Found
- The BRUPOP HelmRepository URL incorrectly used `/charts`. Changed it to the official Helm repository root, `https://bottlerocket-os.github.io/bottlerocket-update-operator`.
- The BRUPOP installation omitted the `bottlerocket-shadow` chart, which the official installation instructions install before the operator chart. Added a Flux HelmRelease for `bottlerocket-shadow`, namespace creation, and an operator dependency on that release.
- The BRUPOP Helm values used `scheduler.maxUnavailablePercentage`, which is not a current chart value. Replaced it with current values, `scheduler_cron_expression` and `max_concurrent_updates`.
- BRUPOP only updates Bottlerocket nodes labeled with `bottlerocket.aws/updater-interface-version=2.0.0`. Added that label to the Bottlerocket node labels in the eksctl config.
- The `apiclient` sysctl example omitted the `settings.` prefix and did not account for dotted sysctl keys. Replaced it with `apiclient apply` using the documented TOML form for `settings.kernel.sysctl`.
- The Kubernetes Deployment example had a selector but no matching pod template labels, making it invalid for `apps/v1`. Added `template.metadata.labels.app: myapp`.
- The post referred to managing "pod security policies", which is misleading because Kubernetes PodSecurityPolicy was removed in Kubernetes 1.25 and the example uses pod/container security contexts. Changed the wording to "pod security settings."

## Review Notes
- The eksctl Bottlerocket `amiFamily` and `bottlerocket` settings pattern, Flux bootstrap command, AWS SSM Session Manager access flow, and `apiclient` usage are consistent with official documentation.
- The example uses a generic `myapp:latest` image; in production, immutable tags or digests would be preferable, but this is not a correctness issue for the tutorial.
