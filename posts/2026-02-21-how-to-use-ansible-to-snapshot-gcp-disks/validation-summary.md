# Validation Summary: How to Use Ansible to Snapshot GCP Disks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `google.cloud` collection
- Google Cloud Compute Engine persistent disks
- Google Cloud disk snapshots
- Cron
- YAML

## Sources Consulted
- Ansible `google.cloud.gcp_compute_snapshot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_snapshot_module.html
- Ansible `google.cloud.gcp_compute_disk` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_disk_module.html
- Ansible `google.cloud.gcp_compute_disk_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_disk_info_module.html
- Ansible `google.cloud.gcp_compute_snapshot_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_snapshot_info_module.html
- Google Cloud Compute Engine `disks.createSnapshot` REST documentation: https://docs.cloud.google.com/compute/docs/reference/rest/v1/disks/createSnapshot
- Google Cloud disk snapshots overview: https://docs.cloud.google.com/compute/docs/disks/snapshots
- Google Cloud snapshot best practices: https://docs.cloud.google.com/compute/docs/disks/snapshot-best-practices
- Google Cloud Linux application-consistent snapshot documentation: https://docs.cloud.google.com/compute/docs/disks/creating-linux-application-consistent-pd-snapshots
- Google Cloud labels overview: https://cloud.google.com/resource-manager/docs/labels-overview
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html

## Issues Found
- The disk lookup tasks used `google.cloud.gcp_compute_disk` with `state: present`, which is a create/update module and could create a disk if it did not already exist. Changed those tasks to `google.cloud.gcp_compute_disk_info` with name filters and updated snapshot creation to use the returned disk resource.
- Snapshot creation examples omitted the `zone` parameter, which the Ansible snapshot module documents as the source disk zone. Added `zone: "{{ zone }}"` to snapshot creation tasks.
- The pre-deployment example used `deploy_version: "v2.5.0"` in snapshot names and labels. GCP snapshot names do not allow periods, and label values only allow lowercase letters, numbers, underscores, and dashes. Changed the example version to `v2-5-0` and updated the restore example snapshot name.
- The restore example used `type: "pd-ssd"`, but the Ansible disk module documents `type` as a disk type resource URL. Replaced it with the Compute Engine disk type URL for the configured project and zone.
- The cleanup playbook referenced `ansible_date_time` while `gather_facts` was disabled. Changed the cleanup playbook to gather facts.
- The cleanup snapshot deletion task needed the source disk zone for the snapshot module. Added a `zone` value derived from the snapshot's `sourceDisk` URL.

## Review Notes
The high-level snapshot behavior described in the post is correct: Google Cloud standard snapshots are incremental, can be created from attached disks, and application-consistent snapshots require workload-specific flushing or pause steps. The multi-disk examples create per-disk snapshots, not an atomic multi-disk snapshot set; for strict cross-disk consistency, workloads still need to be paused or otherwise coordinated before the snapshots are taken.
