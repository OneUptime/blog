# Validation Summary: How to Use Ansible to Manage GCP Managed Instance Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Google Cloud Platform
- Compute Engine Managed Instance Groups
- Instance templates
- Health checks and autohealing
- Autoscaling
- Rolling updates
- Google Cloud CLI

## Sources Consulted
- Ansible `google.cloud.gcp_compute_instance_template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_template_module.html
- Ansible `google.cloud.gcp_compute_instance_group_manager` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_group_manager_module.html
- Ansible `google.cloud.gcp_compute_health_check` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_health_check_module.html
- Ansible `google.cloud.gcp_compute_autoscaler` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_autoscaler_module.html
- Ansible `google.cloud.gcp_compute_firewall` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_firewall_module.html
- Google Cloud MIG autohealing documentation: https://docs.cloud.google.com/compute/docs/instance-groups/autohealing-instances-in-migs
- Google Cloud MIG update documentation: https://docs.cloud.google.com/compute/docs/instance-groups/updating-migs
- Google Cloud rolling update documentation: https://docs.cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups
- Google Cloud autoscaler documentation: https://docs.cloud.google.com/compute/docs/autoscaler
- Google Cloud IAM roles and Compute Engine service account documentation: https://docs.cloud.google.com/iam/docs/roles-permissions/compute
- Google Cloud SDK `gcloud compute instance-groups managed update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/update
- Google Cloud SDK `gcloud compute instance-groups managed rolling-action start-update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/rolling-action/start-update

## Issues Found
- The instance template example created a standalone zonal boot disk that was never used by the instance template or cleaned up. Removed that task because instance templates should define boot disk creation with `initialize_params`.
- The instance template examples used `tags.items`, which is deprecated in the current Ansible module documentation. Replaced it with `tags.tag_values`.
- The health check example created a health check but did not allow Google health check probe source ranges through the firewall. Added a firewall rule that lets probes from `130.211.0.0/22` and `35.191.0.0/16` reach TCP port 80 on tagged instances.
- The post implied that creating a health check alone made the MIG self-heal. Added a documented `gcloud compute instance-groups managed update` task to attach the health check as an autohealing policy after the MIG exists.
- The rolling update example changed the instance template through the Ansible instance group manager module, but current Google Cloud documentation distinguishes changing the intended template from proactively rolling existing VMs. Replaced that task with a documented `gcloud compute instance-groups managed rolling-action start-update` command.
- The cleanup playbook did not delete the health check or newly added firewall rule. Added cleanup tasks for both.
- The prerequisites only mentioned Compute Admin. Added Service Account User as a caveat for cases where instances run as a service account.

## Review Notes
The latest `google.cloud` collection documentation reviewed is version 1.13.0. The zonal `gcp_compute_instance_group_manager` module does not document autohealing policy or update policy fields, so the corrected examples use Google Cloud CLI commands from Ansible tasks for those MIG operations.
