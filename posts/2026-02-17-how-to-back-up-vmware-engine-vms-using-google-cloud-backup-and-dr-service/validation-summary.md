# Validation Summary: How to Back Up VMware Engine VMs Using Google Cloud Backup and DR Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Backup and DR Service
- Google Cloud VMware Engine
- Backup/recovery appliances
- VMware vCenter and ESXi
- VMware vSphere Storage APIs - Data Protection
- Cloud Storage / OnVault
- Google Cloud CLI
- Cloud Logging and monitoring
- Linux shell scripting
- PostgreSQL

## Sources Consulted
- Google Cloud Backup and DR Service for VMware VMs: https://docs.cloud.google.com/backup-disaster-recovery/docs/concepts/backupdr-for-vmware-vms
- Backup and DR Service overview: https://docs.cloud.google.com/backup-disaster-recovery/docs/concepts/backup-dr
- Deploy Backup and DR Service: https://docs.cloud.google.com/backup-disaster-recovery/docs/deployment/deployment-guide
- Prepare to deploy Backup and DR Service: https://docs.cloud.google.com/backup-disaster-recovery/docs/deployment/deployment-prep
- Protect and recover VMware VMs: https://docs.cloud.google.com/backup-disaster-recovery/docs/quickstarts/vmware-backup-recovery
- Discover and protect VMware VMs: https://docs.cloud.google.com/backup-disaster-recovery/docs/configuration/discover-vms
- Configure application settings for VMware VMs: https://docs.cloud.google.com/backup-disaster-recovery/docs/backup/app-details-settings-vmware-vm
- Configure advanced policy settings: https://docs.cloud.google.com/backup-disaster-recovery/docs/create-plan/policy-settings
- Restore a VMware VM: https://docs.cloud.google.com/backup-disaster-recovery/docs/restore-data/restore-vm
- Mount a VMware image: https://docs.cloud.google.com/backup-disaster-recovery/docs/access-data/mount-vmware-image
- Monitor jobs in the management console: https://docs.cloud.google.com/backup-disaster-recovery/docs/monitor-reports/monitor-jobs
- gcloud backup-dr management-servers create: https://docs.cloud.google.com/sdk/gcloud/reference/backup-dr/management-servers/create
- gcloud vmware private-clouds vcenter credentials describe: https://cloud.google.com/sdk/gcloud/reference/vmware/private-clouds/vcenter/credentials/describe

## Issues Found
- The post said the backup appliance runs inside the GCVE private cloud. Updated this to explain that backup/recovery appliances are specialized Google Cloud VMs deployed in customer Google Cloud projects and connected to GCVE.
- The storage description implied all backups are stored directly in Cloud Storage. Updated it to describe snapshot pools, OnVault pools backed by Cloud Storage, and the option to use both.
- The management server creation command used an unsupported `--type=BACKUP_RESTORE` flag and described appliance creation via gcloud. Removed the unsupported flag and clarified that gcloud can create the management console, while appliance deployment is done through the Google Cloud console.
- The prerequisites created and granted broad roles to a custom appliance service account. Replaced this with supported API enablement, private cloud verification, and the documented gcloud command for retrieving vCenter credentials.
- The Python examples for creating backup plans, associating GCVE VMs, restoring from backup vault paths, and checking backup plan associations did not match the documented VMware Engine management-console workflow. Replaced them with the supported template/profile, onboarding, restore, and monitoring workflow.
- The vCenter registration steps used the wrong management-console path. Updated them to the documented App Manager > Applications onboarding flow for VMware Engine.
- The application consistency section overclaimed automatic SQL Server-style application flushing and used outdated PostgreSQL backup functions. Updated the section to describe application settings, quiesced snapshots, VMware Tools, VSS, and optional freeze/thaw scripts. Replaced the PostgreSQL example with a safer `CHECKPOINT` example.
- The restore section treated restore-to-new-location as a generic API operation. Updated it to distinguish source VM restore from Clone for creating an independent VM in a selected vCenter, ESXi host, and datastore.
- The file-level restore section omitted the Backup and DR limitation that OnVault pools pointing to backup vaults do not support instant mount. Added that caveat.
- The monitoring section used an invalid Cloud Monitoring policy example for GCVE management-console jobs. Updated it to use the management console Monitor tab and log-based alerts for failed or retry jobs.

## Review Notes
The corrected post is accurate as a management-console based GCVE VMware VM backup guide. Future improvements could add a short note about required IAM and networking preparation for non-shared VPC versus Shared VPC deployments, but that would be an expansion rather than a correctness fix.
