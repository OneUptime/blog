# Validation Summary: How to Create GCP Dynamic Inventory in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible dynamic inventory
- google.cloud Ansible collection
- Google Cloud Compute Engine
- Google Cloud authentication
- gcloud CLI
- YAML inventory configuration

## Sources Consulted
- Ansible Community Documentation: google.cloud.gcp_compute inventory plugin, https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_inventory.html
- ansible-collections/google.cloud source: plugins/inventory/gcp_compute.py, https://github.com/ansible-collections/google.cloud/blob/master/plugins/inventory/gcp_compute.py
- Google Cloud SDK documentation: gcloud compute instances update, https://cloud.google.com/sdk/gcloud/reference/compute/instances/update
- Google Cloud SDK documentation: gcloud projects add-iam-policy-binding, https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud Compute Engine REST documentation: instances.aggregatedList, https://docs.cloud.google.com/compute/docs/reference/rest/v1/instances/aggregatedList
- Google Cloud Compute Engine documentation: Preemptible VM instances and Spot VM guidance, https://docs.cloud.google.com/compute/docs/instances/preemptible

## Issues Found
- The prerequisite Python libraries listed `google-api-python-client`, but the current inventory plugin requirements are `requests` and `google-auth`. Changed the install command to `pip install google-auth requests`.
- The authentication environment example omitted `GCP_AUTH_KIND` and implied `GCP_PROJECT` was enough to set the inventory project. Added `GCP_AUTH_KIND` examples and clarified that projects are configured with the inventory `projects` option.
- The inventory filename guidance only mentioned `gcp.yml` and `gcp.yaml`. Added the supported `gcp_compute.yml` and `gcp_compute.yaml` suffixes.
- The basic configuration and filtering sections implied `zones` could contain regions. Corrected the wording to describe zones only.
- The hostname section said the default hostname was the instance name and showed an unsupported metadata expression. Updated it to the actual default order of public IP, private IP, then name, and replaced the metadata example with supported `hostname` and `labels.vm_name` values.
- The production `public_facing` expression only checked whether `accessConfigs` was defined, which can be less accurate than checking for configured access configs. Updated it to check the list length with a default.
- The production `has_ssd` expression checked for `SSD` in `disks[].type`, but Compute Engine attached disk `type` is `SCRATCH` or `PERSISTENT`. Changed it to a `has_local_ssd` group that checks for `SCRATCH`.
- The public IP compose examples could fail when `accessConfigs` is absent. Added `default([])` guards.
- The production network and subnet compose examples treated `networkInterfaces[0].network` and `subnetwork` as strings, but the inventory plugin formats them as dictionaries with a `name` key. Updated the examples to use `.name`.

## Review Notes
Preemptible VMs are still documented and supported, but Google Cloud recommends Spot VMs for new usage. A future update could expand the conditional grouping examples to include Spot VMs with `scheduling.provisioningModel == 'SPOT'`.
