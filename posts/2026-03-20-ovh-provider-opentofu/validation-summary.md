# Validation Summary: How to Configure the OVH Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OVHcloud (Public Cloud, Managed Kubernetes Service, IAM, Domain DNS)
- HCL
- OpenTofu CLI

## Sources Consulted
- OVH Terraform provider repository: https://github.com/ovh/terraform-provider-ovh
- OVH provider main docs (`docs/index.md`): provider source, authentication methods, endpoints, configuration arguments including `api_rate_limit`
- OVH provider release page (latest version v2.13.1, April 2026)
- `ovh_cloud_project_user` resource docs: `docs/resources/cloud_project_user.md` (arguments `service_name`, `description`, `role_names`; valid role values; sensitive `password` attribute)
- `ovh_cloud_project_ssh_key` resource (listed in `docs/resources/`)
- `ovh_cloud_project_kube` resource docs: `docs/resources/cloud_project_kube.md` (arguments `service_name`, `name`, `region`; `kubeconfig` exported attribute)
- `ovh_cloud_project_kube_nodepool` resource docs (arguments `service_name`, `kube_id`, `name`, `flavor_name`, `desired_nodes`, `min_nodes`, `max_nodes`)
- `ovh_iam_policy` resource docs: `docs/resources/iam_policy.md` (arguments `name`, `description`, `identities`, `resources`, `allow`)
- `ovh_me_identity_group` resource (used to obtain `urn` for IAM policy identities)
- `ovh_domain_zone_record` resource docs: `docs/resources/domain_zone_record.md` (arguments `zone`, `subdomain`, `fieldtype`, `ttl`, `target`)
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI commands (`init`, `validate`, `plan`, `apply`): https://opentofu.org/docs/cli/commands/

## Issues Found
- The original post used a placeholder `hashicorp/example` provider with `example_project`, `example_team`, `example_alert`, and `example_backup_policy` resources that have no relationship to OVH. I replaced them with the real `ovh/ovh` provider (`~> 2.0`) and valid OVH resources (`ovh_cloud_project_user`, `ovh_cloud_project_ssh_key`, `ovh_cloud_project_kube`, `ovh_cloud_project_kube_nodepool`, `ovh_me_identity_group`, `ovh_iam_policy`, `ovh_domain_zone_record`).
- The original authentication section used fictitious `PROVIDER_API_KEY`, `PROVIDER_TOKEN`, and `PROVIDER_ORG` environment variables. I replaced them with the actual variables the OVH provider reads: `OVH_ENDPOINT`, `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, and `OVH_CONSUMER_KEY`.
- The original variables (`api_key`, `organization`) did not match anything in the OVH provider; I replaced them with the variables actually used in the post (`service_name` for the Public Cloud project ID, and `region`).
- The original advanced configuration showed alerts with `severity`/`threshold`/`notification` blocks and a `backup_policy` with `retention_days`/`schedule` — none of these exist in the OVH provider. I replaced that section with a real Managed Kubernetes cluster + node pool, an IAM policy targeting the project, and a DNS record, which align with the post's stated scope (cloud instances, databases, networking).
- The original outputs referred to a generic project. I replaced them with real OVH attributes: the Kubernetes cluster ID, the cluster `kubeconfig` (marked sensitive, matching the resource's docs), and the generated OpenStack username for the service user.
- The original troubleshooting advice suggested adding `depends_on` to avoid rate limiting. The OVH provider exposes a dedicated `api_rate_limit` argument for throttling and OVHcloud APIs return `429` on overrun, so I replaced the `depends_on` advice with the correct guidance (`api_rate_limit` plus `-parallelism=N` on `tofu apply`).
- The introduction and conclusion previously contained the literal phrase "How to Configure the OVH Provider in OpenTofu using OpenTofu" (the title pasted into the body). I rewrote those sentences so they describe the actual content.

## Review Notes
- The OVH provider's `2.x` line is the current stable line at review time (latest tag v2.13.1, April 2026). The post pins to `~> 2.0` so readers pick up patch and minor 2.x updates while staying within a tested major. Readers can tighten the constraint after `tofu init` selects a specific version.
- `ovh_cloud_project` exists as a resource but creating one places a paid order on the OVHcloud account, so the post intentionally treats the Public Cloud project as pre-existing and requires its `service_name` as input — this matches how the official examples use the provider.
- The IAM policy example uses `urn:v1:eu:resource:publicCloudProject:<service_name>` because the post sets `endpoint = "ovh-eu"`. Readers using `ovh-us` or `ovh-ca` should adjust the URN region segment accordingly; this is a property of OVHcloud URNs rather than the provider.
- The post does not cover the OAuth2 (`client_id` / `client_secret`) or short-lived access token authentication paths, only application-key auth. That is consistent with the post's scope and with the most common setup; readers needing IAM-scoped service accounts can consult the provider's index docs.
