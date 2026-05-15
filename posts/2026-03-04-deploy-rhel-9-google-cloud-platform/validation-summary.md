# Validation Summary: How to Deploy RHEL on Google Cloud Platform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Google Cloud Platform
- Compute Engine
- Persistent Disk
- Google Cloud CLI
- VPC firewall rules
- firewalld
- Google Cloud Ops Agent
- Google Cloud IAM service accounts
- OS Login

## Sources Consulted
- Google Cloud SDK `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK `gcloud compute disks create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/disks/create
- Google Cloud SDK `gcloud compute instances attach-disk` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk
- Google Cloud SDK `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud SDK `gcloud compute instances set-service-account` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/set-service-account
- Compute Engine operating system details for RHEL image families: https://cloud.google.com/compute/docs/images/os-details
- Compute Engine format and mount a non-boot disk on Linux: https://cloud.google.com/compute/docs/disks/format-mount-disk-linux
- Compute Engine change the attached service account: https://cloud.google.com/compute/docs/instances/change-service-account
- Compute Engine create a VM that uses a user-managed service account: https://cloud.google.com/compute/docs/access/create-enable-service-accounts-for-instances
- Compute Engine set up OS Login: https://cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Google Cloud Ops Agent installation guide: https://cloud.google.com/monitoring/agent/ops-agent/installation
- Google Cloud Ops Agent configuration guide: https://cloud.google.com/monitoring/agent/ops-agent/configuration
- Google Cloud Ops Agent authorization guide: https://cloud.google.com/monitoring/agent/ops-agent/authorization

## Issues Found
- The data disk mount example used `/dev/sdb` directly. Google Cloud documentation recommends stable identifiers because Linux device names can change between boots. Updated the commands to format `/dev/disk/by-id/google-rhel9-data`, resolve its UUID with `blkid`, and write a UUID-based `/etc/fstab` entry with `nofail`.
- The custom service account only granted `roles/monitoring.metricWriter`. The Ops Agent sends metrics to Cloud Monitoring and logs to Cloud Logging, so a custom service account also needs `roles/logging.logWriter`. Added the missing IAM binding.
- The guide changed the VM service account while the VM was running. Compute Engine documentation requires stopping the VM before changing the attached service account and starting it afterward. Added `gcloud compute instances stop` and `gcloud compute instances start` around the `set-service-account` command.

## Review Notes
The main GCP CLI syntax, RHEL 9 image family (`rhel-cloud` / `rhel-9`), firewall rule, firewalld, and Ops Agent configuration examples match current official documentation. Users still need the appropriate OS Login IAM role, such as `roles/compute.osLogin` or `roles/compute.osAdminLogin`, to SSH into an OS Login-enabled VM.
