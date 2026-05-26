# Validation Summary: How to Use Ansible to Create GCP Persistent Disks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Google Cloud Compute Engine
- Google Cloud Persistent Disk
- Google Cloud CLI
- Linux ext4 filesystems and mounts

## Sources Consulted
- Ansible `google.cloud.gcp_compute_disk` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_disk_module.html
- Ansible `google.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_compute_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_module.html
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- Google Cloud Persistent Disk documentation: https://docs.cloud.google.com/compute/docs/disks/persistent-disks
- Google Cloud Persistent Disk performance documentation: https://docs.cloud.google.com/compute/docs/disks/performance
- Google Cloud attach non-boot disk documentation: https://docs.cloud.google.com/compute/docs/disks/attach-disks
- Google Cloud resize Persistent Disk documentation: https://docs.cloud.google.com/compute/docs/disks/resize-persistent-disk
- Google Cloud CLI `gcloud compute instances attach-disk` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/attach-disk

## Issues Found
- The post used bare disk type names such as `pd-balanced` in `google.cloud.gcp_compute_disk`. The official Ansible module documents `type` as the URL of the disk type resource, so the examples now use full disk type URLs.
- The post used a non-existent current module, `google.cloud.gcp_compute_attached_disk`, for attaching a disk to an existing VM. The current `google.cloud` collection index does not list that module, so the example now uses the documented `gcloud compute instances attach-disk` command from an Ansible task.
- The attach and mount flow used `/dev/sdb`, which is not a stable device name on Compute Engine. The examples now set a custom device name during attachment and use `/dev/disk/by-id/google-app-data-disk` inside the VM.
- The prerequisites omitted `ansible.posix`, which is required for `ansible.posix.mount`, and omitted the Google Cloud CLI for the attach example. Both prerequisites were added.
- The prerequisites said Ansible 2.10+ was sufficient for the current `google.cloud` collection. The current official collection documentation lists ansible-core 2.16+ support, so the prerequisite was updated.
- The performance explanation said larger disks get more IOPS and throughput regardless of type. This was narrowed because performance is also limited by VM limits, and Extreme Persistent Disk uses provisioned IOPS.
- The introduction implied every Compute Engine VM needs a Persistent Disk boot disk. This was adjusted because every VM needs a boot disk, but Persistent Disk is one common boot disk option.

## Review Notes
The examples are still illustrative and use placeholder project IDs, service account paths, inventory names, and VM names. The attach example assumes `gcloud` is installed and authenticated on the Ansible control host.
