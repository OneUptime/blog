# Validation Summary: How to Use Ansible to Create GCP Load Balancers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Google Cloud `google.cloud` collection
- Google Cloud Load Balancing
- Compute Engine health checks
- Backend services, URL maps, target proxies, and forwarding rules
- Google-managed SSL certificates
- Google Cloud CLI

## Sources Consulted
- Ansible `google.cloud` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_compute_health_check` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_health_check_module.html
- Ansible `google.cloud.gcp_compute_instance_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_group_module.html
- Ansible `google.cloud.gcp_compute_backend_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_backend_service_module.html
- Ansible `google.cloud.gcp_compute_url_map` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_url_map_module.html
- Ansible `google.cloud.gcp_compute_target_http_proxy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_target_http_proxy_module.html
- Ansible `google.cloud.gcp_compute_target_https_proxy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_target_https_proxy_module.html
- Ansible `google.cloud.gcp_compute_global_forwarding_rule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_global_forwarding_rule_module.html
- Ansible `google.cloud.gcp_compute_ssl_certificate` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_ssl_certificate_module.html
- Google Cloud Load Balancing resource model: https://cloud.google.com/load-balancing/docs/load-balancer-resource-model
- Google Cloud external Application Load Balancer overview: https://cloud.google.com/load-balancing/docs/https
- Google Cloud Google-managed SSL certificates documentation: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud SSL certificates overview: https://cloud.google.com/load-balancing/docs/ssl-certificates
- Google Cloud CLI `gcloud compute ssl-certificates create` documentation: https://cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create

## Issues Found
- The prerequisites stated "Ansible 2.9+" for the current `google.cloud` collection. The latest collection documentation lists ansible-core 2.16.0 or newer, so the prerequisite was updated to ansible-core 2.16+.
- The prerequisite install command included `google-api-python-client`, but the current module requirements document `requests` and `google-auth`; the extra package was removed.
- The managed SSL certificate example used `google.cloud.gcp_compute_ssl_certificate` with a `managed` field, but the documented Ansible module requires uploaded PEM `certificate` and `private_key` values and does not expose a `managed` parameter. The example now creates the Google-managed certificate with `gcloud compute ssl-certificates create` from an Ansible command task, then passes a valid certificate reference to the target HTTPS proxy.
- The HTTPS example referenced `lb_ip` without defining it in that playbook and defaulted the forwarding rule IP to an empty string. The playbook now retrieves the same global static IP resource before creating the HTTPS forwarding rule.
- The forwarding rule examples used single-port `port_range` values. They were changed to explicit `80-80` and `443-443` ranges, matching the Ansible module examples and documented forwarding rule constraints for target HTTP and HTTPS proxies.

## Review Notes
The corrected examples are syntactically valid YAML. The latest `google.cloud` collection documentation reviewed is version 1.13.0. The managed certificate example now depends on an authenticated Google Cloud CLI because the current Ansible collection does not include a dedicated managed SSL certificate module.
