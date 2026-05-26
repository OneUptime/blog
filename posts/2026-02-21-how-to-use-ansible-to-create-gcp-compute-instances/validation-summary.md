# Validation Summary: How to Use Ansible to Create GCP Compute Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `google.cloud` collection
- Google Cloud Compute Engine
- Google Cloud CLI
- GCP VPC firewall rules and network tags
- YAML playbooks

## Sources Consulted
- Ansible `google.cloud.gcp_compute_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_module.html
- Ansible `google.cloud.gcp_compute_disk` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_compute_disk_module.html
- Google Cloud custom machine type documentation: https://cloud.google.com/compute/docs/instances/creating-instance-with-custom-machine-type
- Google Cloud VPC firewall rules documentation: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud network tags documentation: https://cloud.google.com/vpc/docs/add-remove-network-tags
- Google Cloud SDK `gcloud services enable` documentation: https://cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The post used `tags.items` for network tags. Current Ansible documentation marks `items` as deprecated and recommends `tag_values`, so both examples were changed to `tags.tag_values`.
- The custom machine type example used `custom-4-16384`, which is an outdated or ambiguous N1-style notation. It was changed to `e2-custom-4-16384`, matching current Google Cloud custom machine type formatting with a machine series prefix.
- The fleet debug task looped over `fleet_results.results | map(attribute='invocation')`, which would expose invocation metadata instead of the per-instance module results used by the message. It now loops over `fleet_results.results`.
- The post implied `http-server` and `https-server` tags map to default GCP firewall rules for HTTP and HTTPS. The default VPC rules do not include HTTP or HTTPS; the wording now says these tags are used with firewall rules that allow those ports, including console-created rules.

## Review Notes
- The tutorial remains technically relevant and the core `google.cloud.gcp_compute_instance`, disk, metadata, startup script, status, and delete examples align with the current module documentation after the fixes.
- The prerequisite command installs `google-api-python-client`, which is not listed as a current requirement for these modules, but it is harmless extra dependency installation rather than a breaking technical error.
