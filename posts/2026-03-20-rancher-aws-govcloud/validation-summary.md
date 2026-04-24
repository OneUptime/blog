# Validation Summary: How to Set Up Rancher on AWS GovCloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Helm
- AWS GovCloud
- Amazon ECR
- Amazon EC2
- Amazon VPC
- AWS IAM

## Sources Consulted
- AWS GovCloud differences: https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/govcloud-differences.html
- AWS GovCloud ARNs: https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/using-govcloud-arns.html
- AWS GovCloud service endpoints: https://docs.aws.amazon.com/govcloud-us/latest/UserGuide/using-govcloud-endpoints.html
- Amazon VPC internet gateway and private subnet behavior: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon ECR endpoints: https://docs.aws.amazon.com/general/latest/gr/ecr.html
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Rancher air-gapped installation overview: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install
- Rancher image publishing for air-gapped installs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/publish-images
- Rancher air-gapped HA install: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/air-gapped-helm-cli-install/install-rancher-ha
- Rancher global default private registry guidance: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/global-default-private-registry
- Choosing a Rancher version: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- RKE2 air-gap install: https://docs.rke2.io/install/airgap
- RKE2 private registry configuration: https://docs.rke2.io/install/private_registry
- RKE2 advanced AWS/custom endpoint guidance: https://docs.rke2.io/advanced
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 FIPS support: https://docs.rke2.io/security/fips_support
- RKE2 hardened images and FIPS caveat: https://docs.rke2.io/security/about_hardened_images
- RKE2 secrets encryption: https://docs.rke2.io/security/secrets_encryption
- Helm `pull` command reference: https://helm.sh/docs/v3/helm/helm_pull/
- Rancher security advisory covering `>=2.9.0, <2.9.12`: https://github.com/rancher/rancher/security/advisories/GHSA-4h45-jpvh-6p5j

## Issues Found
- The original post treated GovCloud ECR as the runtime registry for Rancher's `systemDefaultRegistry`. Rancher documents that the global default registry is intended for registries without credentials, while ECR auth tokens are short-lived. I corrected the post to use an internal cluster-reachable registry for runtime pulls and kept GovCloud ECR as an optional staging registry.
- The original image mirroring loop manually stripped the first path segment from image names, which would mis-tag images such as `rancher/rancher:v2.9.0`. I replaced that logic with Rancher's documented `rancher-save-images.sh` and `rancher-load-images.sh` workflow.
- The original RKE2 install step used a placeholder `private-s3` installer URL and omitted the required offline artifacts. I replaced it with RKE2's documented air-gap artifact workflow using `INSTALL_RKE2_ARTIFACT_PATH`.
- The original RKE2 cluster example did not show the shared token or how additional server nodes join an HA cluster. I added the documented shared token and noted the `server:` setting required on additional servers.
- The original GovCloud endpoint override section implied that custom endpoint overrides are always required. RKE2 documents that `cloud-provider-name: aws` is sufficient in public AWS regions, and explicit overrides are only needed for classified regions, private endpoints, or other custom endpoint routing. I updated the text accordingly.
- The original cloud provider config used an `elb` section label and omitted the `cloud-provider-config` reference from `config.yaml`. I corrected the section name to `elasticloadbalancing`, added `SigningRegion`, and showed the config reference that makes the file effective.
- The original Helm example used `helm fetch`, which is not the current Helm 3/4 command. I updated the workflow to `helm repo add`, `helm repo update`, and `helm pull`.
- The original post pinned Rancher to `v2.9.0`, which is both behind the supported `2.9.x` patch line and covered by a Rancher advisory affecting versions `<2.9.12`. I updated the examples to `v2.9.12`.
- The original FIPS section used `fips: true`, which is not a documented RKE2 config option. I replaced it with documented guidance: use a FIPS-enabled OS and keep the `aescbc` secrets encryption provider.
- The original audit logging comment claimed that `90` days is required by NIST 800-53. I corrected that comment to describe it as an example retention value and noted the audit log directory prerequisite.

## Review Notes
- The post is now technically sound as a GovCloud-focused, air-gapped Rancher guide, but it remains version-pinned to the Rancher `2.9.x` line. Before future republishes, re-check the current Rancher stable release and support matrix.
- The runtime registry example now assumes a hostname like `registry.govcloud.internal:5000` that is reachable from the RKE2 nodes and does not depend on expiring credentials. If a deployment uses ECR directly for runtime pulls, it needs additional credential-management steps that are outside Rancher's documented default-registry pattern.
