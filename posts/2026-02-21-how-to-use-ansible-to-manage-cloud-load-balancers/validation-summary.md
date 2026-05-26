# Validation Summary: How to Use Ansible to Manage Cloud Load Balancers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- AWS Application Load Balancer
- AWS Network Load Balancer
- AWS Elastic Load Balancing target groups
- Azure Load Balancer
- Google Cloud external HTTP Load Balancing

## Sources Consulted
- Ansible amazon.aws.elb_application_lb module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/elb_application_lb_module.html
- Ansible amazon.aws.elb_application_lb_info module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/elb_application_lb_info_module.html
- Ansible community.aws.elb_target_group module documentation: https://docs.ansible.com/ansible/latest/collections/community/aws/elb_target_group_module.html
- Ansible community.aws.elb_target_group_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/elb_target_group_info_module.html
- Ansible community.aws.elb_network_lb module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/elb_network_lb_module.html
- Ansible azure.azcollection.azure_rm_loadbalancer module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_loadbalancer_module.html
- Ansible azure.azcollection.azure_rm_publicipaddress module documentation: https://docs.ansible.com/projects/ansible/devel/collections/azure/azcollection/azure_rm_publicipaddress_module.html
- Ansible google.cloud.gcp_compute_backend_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_backend_service_module.html
- Ansible google.cloud.gcp_compute_url_map module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_url_map_module.html
- Ansible google.cloud.gcp_compute_target_http_proxy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_target_http_proxy_module.html
- Ansible google.cloud.gcp_compute_global_forwarding_rule module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_global_forwarding_rule_module.html
- Ansible retry/until behavior documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html

## Issues Found
- The AWS NLB example used `amazon.aws.elb_network_lb`, but the current documented fully qualified module name is `community.aws.elb_network_lb`. Updated the module name.
- The AWS NLB example referenced `vpc_id` and `public_subnets` without defining them in the play variables. Added representative variable definitions to make the snippet self-contained.
- The AWS target group health verification referenced `item.target_id`, but `community.aws.elb_target_group_info` returns target health entries with the target identifier under `item.target.id`. Updated debug output, labels, and failure messages.
- The blue-green example used the redirected `community.aws.elb_application_lb_info` name. Updated it to the current documented `amazon.aws.elb_application_lb_info` module name.
- The blue-green URI verification used `retries` and `delay` without an explicit `register`/`until`. Added `register: deploy_health` and `until: deploy_health.status == 200` so the retry intent is clear and works across Ansible versions.

## Review Notes
- The examples are illustrative and still require real cloud identifiers, credentials, certificates, backend instances, and provider-specific prerequisites before they can run in a live environment.
- The GCP load balancer example correctly reflects the required chain of health check, instance group, backend service, URL map, HTTP proxy, and global forwarding rule, but it creates an empty unmanaged instance group unless instances are added separately.
