# Validation Summary: How to Automate Cluster Provisioning with Rancher API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager API
- Rancher Kubernetes API (`provisioning.cattle.io/v1`)
- Terraform
- Rancher2 Terraform provider
- RKE2
- Amazon EC2 node-driver provisioning
- GitHub Actions
- Bash, `curl`, and `jq`

## Sources Consulted
- Rancher API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher RK-API Quick Start: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher EC2 Machine Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/machine-configuration/amazon-ec2
- Rancher2 provider registry page: https://registry.terraform.io/providers/rancher/rancher2/latest
- Rancher2 provider docs index: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/index.md
- Rancher2 `cluster_v2` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/cluster_v2.md
- Rancher2 `machine_config_v2` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/machine_config_v2.md
- Rancher2 `cloud_credential` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/cloud_credential.md
- Rancher2 `app_v2` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/app_v2.md
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Secrets Encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- OpenGitOps principles: https://opengitops.dev/

## Issues Found
- The API key creation path and scope guidance were outdated for current Rancher UI wording. I updated the UI path to `Account & API Keys → Create API Key` and removed the scoped-token suggestion because these examples provision clusters and manage global Rancher resources.
- The direct API examples were not valid as written. They mixed an incorrect auth/header pattern, used a Steve-style provisioning endpoint, and posted an invalid payload using `nodePools`/`nodeConfig` while also labeling the example as vSphere but using Azure VM sizes. I replaced them with a Rancher Kubernetes API example that uses the `provisioning.cattle.io/v1` `Cluster` resource, `machinePools`, `machineGlobalConfig`, and `machineConfigRef`.
- The wait script polled `/v3/clusters/{id}` for an `active` state even though the creation example was working with a provisioning cluster object. I changed the script to poll the Rancher Kubernetes API and wait on the cluster `Ready` condition instead.
- The Terraform provider block pinned `rancher/rancher2` to `~> 4.0`, which is far behind the current provider line and tied to an older Rancher release. I removed the stale pin and added a note to pin the provider major version to the Rancher minor release in use.
- The `rancher2_cluster_v2` example used outdated RKE2 settings: `secrets-encryption = true` is not the current RKE2 config key, and `profile = "cis-1.23"` is deprecated for newer RKE2 releases. I corrected these to `secrets-encryption-provider = "aescbc"` and `profile = "cis"`.
- The Terraform cluster example referenced resources that were never defined and hard-coded `machine_config.kind` values. I added the missing `rancher2_cloud_credential.aws` and `rancher2_machine_config_v2.control_plane` resources and changed the machine config references to use the provider-computed `kind` values.
- The `rancher2_machine_config_v2` example included an invalid `resource_version` argument and omitted the required `zone` argument for `amazonec2_config`. I removed `resource_version` and added `zone`.
- The Rancher Monitoring example pinned an old chart version. I removed the stale `chart_version` so the example no longer hard-codes a version that may not match the Rancher release in use.
- The conclusion described a push-based GitHub Actions workflow as “GitOps-style.” I changed that wording to describe it as a repeatable, version-controlled provisioning pipeline instead.

## Review Notes
- Rancher v3 API tokens are being phased out starting with Rancher 2.14. For new automation, prefer the Rancher Kubernetes API patterns shown in the updated examples.
- Rancher2 provider major versions track Rancher minor releases. Teams should pin the provider version deliberately against the Rancher support matrix for their environment.
- Chart versions in `rancher-charts` are Rancher-release specific. If reproducibility matters, pin a chart version that is validated for the exact Rancher release you run.
