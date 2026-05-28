# Validation Summary: How to Migrate VM Workloads from AWS EC2 to Google Compute Engine

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Migrate to Virtual Machines
- Google Compute Engine
- AWS EC2
- Google Cloud VM Migration API
- Google Cloud CLI authentication
- REST API calls with curl

## Sources Consulted
- Google Cloud: Enable Migrate to Virtual Machines services - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/get-started/enable-services
- Google Cloud: Create an AWS source - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/migrate/create-an-aws-source
- Google Cloud: Add a target project - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/get-started/target-project
- Google Cloud VM Migration API: sources resource and create/fetchInventory methods - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/reference/rest/v1/projects.locations.sources
- Google Cloud VM Migration API: migratingVms resource, create/list/get/startMigration methods, target defaults, and state enum - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/reference/rest/v1/projects.locations.sources.migratingVms
- Google Cloud VM Migration API: cloneJobs create method - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/reference/rest/v1/projects.locations.sources.migratingVms.cloneJobs/create
- Google Cloud VM Migration API: cutoverJobs create method - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/reference/rest/v1/projects.locations.sources.migratingVms.cutoverJobs/create
- Google Cloud VM Migration API: targetProjects resource and create method - https://docs.cloud.google.com/migrate/virtual-machines/docs/5.0/reference/rest/v1/projects.locations.targetProjects
- Google Cloud SDK reference: gcloud migration and compute migration command groups - https://docs.cloud.google.com/sdk/gcloud/reference/migration and https://docs.cloud.google.com/sdk/gcloud/reference/compute/migration

## Issues Found
- The original post used unsupported `gcloud migration vms sources`, `migrating-vms`, `clone-jobs`, and `cutover-jobs` command examples for the AWS source migration workflow. Replaced those examples with documented VM Migration REST API calls.
- The API enablement command omitted required services for Migrate to Virtual Machines host projects. Added `servicecontrol.googleapis.com`, `iam.googleapis.com`, and `cloudresourcemanager.googleapis.com`.
- The discovery step incorrectly listed `migrating-vms`, which lists migration resources rather than discovered source inventory. Updated it to call the documented `sources:fetchInventory` method.
- The migration example used CLI-style disk types (`pd-ssd`, `pd-standard`) inside VM Migration API target defaults. Updated them to documented `ComputeEngineDiskType` enum values.
- The migration example implied creation alone starts replication. Updated the flow to create the `MigratingVm` resource and then call `startMigration`.
- The replication state names were not the documented `MigratingVm` states. Updated them to the API enum values such as `PENDING`, `READY`, `FIRST_SYNC`, `ACTIVE`, `CUTTING_OVER`, and `CUTOVER`.
- The target project example was corrected to create and reference a VM Migration `TargetProject` resource rather than an unsupported CLI command.

## Review Notes
The post is now technically valid as an API-based guide. In a future revision, it could be expanded with IAM role bindings and AWS IAM policy JSON, but those are outside the scope of correcting the existing commands.
