# Validation Summary: How to Set Up Automatic OS Patch Management Across a Fleet of Compute Engine VMs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Google Cloud VM Manager
- OS Config API and OS Config agent
- OS Patch Management patch jobs and patch deployments
- Google Cloud CLI
- Terraform Google provider
- Linux shell scripts

## Sources Consulted
- Google Cloud VM Manager setup documentation: https://cloud.google.com/compute/vm-manager/docs/setup
- Google Cloud create patch jobs documentation: https://cloud.google.com/compute/vm-manager/docs/patch/create-patch-job
- Google Cloud schedule patch jobs documentation: https://cloud.google.com/compute/vm-manager/docs/patch/schedule-patch-jobs
- Google Cloud SDK reference for `gcloud compute os-config patch-jobs execute`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/os-config/patch-jobs/execute
- Google Cloud SDK reference for `gcloud compute os-config patch-deployments create`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/os-config/patch-deployments/create
- Google Cloud OS Config PatchDeployment REST reference: https://docs.cloud.google.com/compute/docs/osconfig/rest/v1/projects.patchDeployments
- Google Cloud OS inventory documentation: https://cloud.google.com/compute/vm-manager/docs/os-inventory/view-os-details
- Google Cloud vulnerability reports documentation: https://docs.cloud.google.com/compute/vm-manager/docs/os-inventory/vulnerability-reports
- Terraform Google provider `google_os_config_patch_deployment` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/os_config_patch_deployment

## Issues Found
- The OS Config agent install note said "2020+" images. Changed it to Google's documented build date, `v20200114` or later.
- A comment said an instance-name filter patched VMs with a specific label. Changed it to "specific names".
- The Debian/Ubuntu patch example claimed to apply only security updates and used the invalid `--apt-type=dist` flag. Changed the wording to describe `apt dist-upgrade`, replaced the flag with `--apt-dist`, and quoted the package exclude glob.
- The follow-up patch job example also used `--apt-type=dist`. Replaced it with `--apt-dist` and adjusted the display name to avoid claiming security-only behavior for Apt.
- The recurring patch deployment examples used inline `gcloud compute os-config patch-deployments create` flags that are not supported by the current stable command. Replaced them with YAML deployment definitions passed through the required `--file` flag.
- The monthly deployment comment said "first Saturday" while the original command scheduled day 1 of each month. Replaced the example with `weekDayOfMonth` using `weekOrdinal: 1` and `dayOfWeek: SATURDAY`.
- The monitoring section used a non-existent `gcloud compute os-config inventories list-vulnerability-reports` command. Replaced it with `gcloud compute os-config vulnerability-reports describe`.
- The inventory example did not show package update data by default. Added `--view=full` so the command displays package information, including available package updates.

## Review Notes
The Terraform example matches the documented `google_os_config_patch_deployment` schema. The `gcloud` CLI was not installed in the local workspace, so CLI validation was performed against official Google Cloud SDK reference pages instead of local `--help` output.
