# Validation Summary: How to Use Ansible to Create GCP SSL Certificates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `google.cloud` collection
- Google Cloud Load Balancing
- Compute Engine SSL certificates
- Google-managed SSL certificates
- Self-managed SSL certificates
- Google Cloud CLI
- YAML

## Sources Consulted
- Ansible `google.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_compute_ssl_certificate` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_compute_ssl_certificate_module.html
- Ansible `google.cloud.gcp_compute_target_https_proxy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_target_https_proxy_module.html
- Ansible `google.cloud.gcp_compute_global_address` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_global_address_module.html
- Ansible `google.cloud.gcp_compute_global_forwarding_rule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_global_forwarding_rule_module.html
- Ansible `google.cloud.gcp_compute_url_map` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_url_map_module.html
- Google Cloud Load Balancing documentation for Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud Load Balancing documentation for self-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/self-managed-certs
- Google Cloud SDK documentation for `gcloud auth activate-service-account`: https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account
- Google Cloud SDK documentation for `gcloud compute target-https-proxies update`: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/update
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The post used a non-existent Ansible module, `google.cloud.gcp_compute_managed_ssl_certificate`. The current official `google.cloud` collection index includes `gcp_compute_ssl_certificate` but does not include a managed SSL certificate module. I replaced the Google-managed certificate examples with Ansible `ansible.builtin.command` tasks that call the official `gcloud compute ssl-certificates create --global --domains=...` command.
- The prerequisites said Ansible 2.10+ with the `google.cloud` collection. The current `google.cloud` collection documentation lists support for ansible-core 2.16.0 or newer, so I updated the prerequisite and added the Google Cloud CLI prerequisite for the Google-managed certificate examples.
- The Google-managed certificate explanation only said DNS must point to the load balancer IP. Google Cloud documentation also requires the load balancer forwarding rule to use TCP port 443 for initial provisioning and renewal, so I added that caveat.
- The provisioning-time note said certificates can take up to 60 minutes after DNS points to the load balancer. Google Cloud documents this as up to 60 minutes after DNS and load balancer configuration changes have propagated, so I corrected the wording.
- Some examples used partial Compute resource links for backend service and URL map references. I changed those references to full Compute API selfLinks to match the Ansible module documentation's `selfLink` field expectations.

## Review Notes
The self-managed certificate examples align with the documented `google.cloud.gcp_compute_ssl_certificate` module parameters. The load balancer example still assumes the referenced backend service already exists, which is acceptable for the scope of this post but should be called out more explicitly in a future expansion.
