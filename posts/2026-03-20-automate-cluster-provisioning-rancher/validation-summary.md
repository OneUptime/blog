# Validation Summary: How to Automate Cluster Provisioning in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Kubernetes API (RK-API)
- Rancher CLI
- Terraform/OpenTofu
- Rancher `rancher2` provider
- RKE2
- AWS EC2 machine provisioning

## Sources Consulted
- Rancher Terraform provider metadata: https://registry.terraform.io/v1/providers/rancher/rancher2
- Rancher Terraform provider docs: https://registry.terraform.io/providers/rancher/rancher2/latest/docs
- `rancher2_cluster_v2` resource docs: https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/cluster_v2
- `rancher2_machine_config_v2` resource docs: https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/machine_config_v2
- `rancher2_cloud_credential` resource docs: https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/cloud_credential
- Rancher RK-API Quick Start Guide: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher Previous v3 API Guide: https://ranchermanager.docs.rancher.com/api/v3-rancher-api-guide
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher CLI docs: https://ranchermanager.docs.rancher.com/reference-guides/cli-with-rancher/rancher-cli
- Rancher CLI source for the `clusters kubeconfig` command: https://github.com/rancher/cli/blob/master/cmd/cluster.go

## Issues Found
- The post pinned `rancher2` to `~> 4.1`, which is an outdated provider line tied to older Rancher releases. I updated it to `~> 14.0` and verified the current registry version is `14.1.0` as of 2026-04-09.
- The Terraform machine pool blocks used `rancher2_cloud_credential.aws.name` for `cloud_credential_secret_name`. The provider docs use the credential resource `id`, so both references were corrected to `.id`.
- The AWS machine config used a stale hardcoded AMI and undeclared Terraform AWS resource references. I replaced them with placeholders so the snippet matches Rancher’s documented pattern for reusable examples.
- The API example used the legacy `/v3/clusters` style and an outdated payload shape for modern RKE2/K3s provisioning. I replaced it with a Rancher Kubernetes API `Cluster` resource posted to `provisioning.cattle.io/v1` in the default `fleet-default` namespace, using `machinePools` and `machineConfigRef`.
- The hardcoded `v1.28.8+rke2r1` version was outdated for a generic 2026 guide. I replaced it with `<RKE2_VERSION>` so readers choose a Rancher-supported release for their environment.
- The description claimed the post covered cluster templates, but the article did not contain cluster template material. I corrected the description to match the actual content.

## Review Notes
- Rancher provider major versions align with Rancher minor versions. `~> 14.0` is the current provider line as of 2026-05-07, but production use should match the Rancher server version in the target environment.
- The direct API example now uses the Rancher Kubernetes API resource model. The `fleet-default` namespace is the documented default for provisioning clusters, though deployments can customize fleet namespace behavior.
- The Rancher CLI `clusters kubeconfig` command is present in the current CLI and resolves a cluster by name or ID before generating kubeconfig.
