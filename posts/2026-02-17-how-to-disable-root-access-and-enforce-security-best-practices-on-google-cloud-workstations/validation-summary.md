# Validation Summary: How to Disable Root Access and Enforce Security Best Practices

## Status
validated

## Post Type
Tutorial / security guide

## Technologies Covered
- Google Cloud Workstations
- Google Cloud CLI
- Docker
- Artifact Registry
- IAM
- Secret Manager
- VPC firewall rules
- Cloud Audit Logs / Cloud Logging
- Organization Policy Service
- VPC Service Controls

## Sources Consulted
- Google Cloud Workstations: Customize container images: https://cloud.google.com/workstations/docs/customize-container-images
- Google Cloud Workstations: Preconfigured base images: https://cloud.google.com/workstations/docs/preconfigured-base-images
- Google Cloud CLI reference: `gcloud workstations configs create`: https://cloud.google.com/sdk/gcloud/reference/workstations/configs/create
- Google Cloud CLI reference: `gcloud workstations configs update`: https://cloud.google.com/sdk/gcloud/reference/workstations/configs/update
- Google Cloud Workstations IAM access control: https://cloud.google.com/workstations/docs/access-control
- Google Cloud Workstations roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/workstations
- Google Cloud Workstations service accounts: https://cloud.google.com/workstations/docs/service-accounts
- Google Cloud Workstations firewall rules: https://cloud.google.com/workstations/docs/configure-firewall-rules
- Google Cloud Workstations audit logging: https://cloud.google.com/workstations/docs/audit-logging
- Google Cloud Logging: Enable Data Access audit logs: https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Workstations custom organization constraints: https://cloud.google.com/workstations/docs/custom-constraints
- Google Cloud Workstations security best practices: https://cloud.google.com/workstations/docs/set-up-security-best-practices
- Google Cloud Workstations VPC Service Controls and private clusters: https://cloud.google.com/workstations/docs/configure-vpc-service-controls-private-clusters

## Issues Found
- The post recommended removing `sudo`, locking `root`, and setting `USER user` in the Dockerfile. Google documents disabling sudo for Cloud Workstations with the `CLOUD_WORKSTATIONS_CONFIG_DISABLE_SUDO=true` container environment variable, and notes the default user is created at workstation startup. I changed the Dockerfile to only install tools and moved sudo disabling into the workstation config.
- The workstation configuration did not set the environment variable required to disable sudo. I added `--container-env=CLOUD_WORKSTATIONS_CONFIG_DISABLE_SUDO=true`.
- The firewall rules targeted a `workstation` network tag, but the workstation config did not apply that tag. I added `--network-tags=workstation` to the config command.
- The post used `roles/workstations.creator`, which is not the current predefined role name. I changed it to `roles/workstations.workstationCreator`.
- The audit logging command used `gcloud projects add-iam-audit-config`, which is not a current `gcloud projects` command. I replaced it with the documented `get-iam-policy`, edit `auditConfigs`, and `set-iam-policy` workflow.
- The log sink filter used an invalid resource type form. I changed it to filter by `protoPayload.serviceName="workstations.googleapis.com"`, which is documented for Cloud Workstations audit logs.
- The organization policy example used a non-existent built-in constraint, `constraints/workstations.allowedContainerImages`. I replaced it with a Cloud Workstations custom constraint on `resource.container.image` and a matching organization policy.
- The secrets section used `--container-env-vars`, which is not the current Cloud Workstations config flag. I changed it to `--container-env`.

## Review Notes
The corrected examples are valid against current Google Cloud documentation as of 2026-05-28. The egress firewall IP ranges remain illustrative; production environments should maintain destination ranges and DNS configuration deliberately, especially for external services such as GitHub.
