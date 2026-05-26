# Validation Summary: How to Use Ansible to Manage GCP Instance Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- google.cloud Ansible collection
- Google Cloud Compute Engine
- GCP instance templates
- Managed instance groups
- VM startup and shutdown scripts

## Sources Consulted
- Ansible `google.cloud.gcp_compute_instance_template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_template_module.html
- Ansible `google.cloud.gcp_compute_instance_group_manager` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_group_manager_module.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Google Cloud Compute Engine instance templates documentation: https://docs.cloud.google.com/compute/docs/instance-templates
- Google Cloud create instance templates documentation: https://docs.cloud.google.com/compute/docs/instance-templates/create-instance-templates
- Google Cloud apply new VM configurations in a MIG documentation: https://docs.cloud.google.com/compute/docs/instance-groups/updating-migs
- Google Cloud deterministic instance templates documentation: https://docs.cloud.google.com/compute/docs/instance-templates/deterministic-instance-templates
- Google Cloud `gcloud compute instance-groups managed set-instance-template` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-instance-template

## Issues Found
- The examples used `tags.items`, which is deprecated in the current `google.cloud.gcp_compute_instance_template` module. Changed these to `tags.tag_values`.
- The startup-script example mounted the additional disk as `/dev/sdb`, which is not a stable disk identifier. Added `device_name: "data-disk"` and changed the script to use `/dev/disk/by-id/google-data-disk`.
- The Docker example used the `latest` tag in an instance template, which makes VM creation less deterministic. Changed the example to use a pinned image tag.
- The startup-script example installed `docker-compose` even though the script did not use it. Removed it from the package list.
- The MIG update text implied that changing the instance template alone performs a rolling update of existing VMs. Updated the text to clarify that the new template applies to new instances and existing VMs require a proactive update policy or manual rolling update.
- The cleanup section claimed to list templates, but the example only deleted named templates. Updated the heading and introductory sentence to match the actual playbook.

## Review Notes
The post is technically relevant and the remaining examples align with the documented Ansible modules. Future improvements could show `google.cloud.gcp_compute_instance_template_info` for discovery/listing and include an explicit rolling-update command or API call for existing MIG instances.
