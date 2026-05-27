# Validation Summary: How to Use Ansible with GCP Deployment Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Google Cloud Platform
- Google Cloud google.cloud Ansible collection
- Compute Engine networking and instances
- Secret Manager
- Deployment Manager
- UFW

## Sources Consulted
- Google Cloud Deployment Manager deprecation: https://cloud.google.com/deployment-manager/docs/deprecations
- Ansible google.cloud collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible google.cloud.gcp_compute_network module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_network_module.html
- Ansible google.cloud.gcp_compute_subnetwork module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_subnetwork_module.html
- Ansible google.cloud.gcp_compute_instance module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_module.html
- Ansible google.cloud.gcp_secret_manager module: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_secret_manager_module.html
- Ansible community.general.timezone module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- Deployment Manager is no longer a supported Google Cloud service as of March 31, 2026. Updated the title, description, introduction, and key takeaways so the post no longer tells readers to use or trigger Deployment Manager templates.
- The subnet task was referenced later as `{{ subnet }}` but did not register that variable. Added `register: subnet` to make the compute instance example work.
- The Secret Manager example used `google.cloud.gcp_secretmanager_secret_version_info`, which is not present in the current `google.cloud` collection. Replaced it with the documented `google.cloud.gcp_secret_manager` module and changed `secret` to the documented `name` parameter.
- The timezone task used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the module name.
- The UFW tasks require the `ufw` package on the target host. Added `ufw` to the package installation list.
- The SSH restart handler used `sshd`, which is not the service name on Debian/Ubuntu systems. Updated the handler to use `ssh` on Debian-family hosts and `sshd` elsewhere.

## Review Notes
The GCP compute examples use current `google.cloud` collection module names and parameters. The instance is added to inventory with its private IP address, which is valid when Ansible can route to that address, but deployments that run from outside the VPC may need an external IP, VPN, bastion host, or IAP-based connection setup.
