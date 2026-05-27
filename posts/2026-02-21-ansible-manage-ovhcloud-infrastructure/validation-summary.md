# Validation Summary: How to Use Ansible to Manage OVHcloud Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- OVHcloud API
- OVH Python SDK
- OpenStack / openstacksdk
- OVHcloud Public Cloud
- OVHcloud Dedicated Servers
- OVHcloud DNS
- vRack / private networking

## Sources Consulted
- Ansible openstack.cloud collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/
- Ansible openstack.cloud.server module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/server_module.html
- Ansible openstack.cloud.security_group_rule module documentation: https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/security_group_rule_module.html
- OVH Python SDK documentation: https://github.com/ovh/python-ovh
- OVHcloud API first steps and request signing documentation: https://docs.ovhcloud.com/en/guides/manage-and-operate/api/first-steps
- OVHcloud OpenStack service account documentation: https://help.ovhcloud.com/csm/en-public-cloud-authenticate-api-openstack-service-account
- OVHcloud OpenStack environment variable documentation: https://help.ovhcloud.com/csm/en-public-cloud-compute-set-openstack-environment-variables
- OVHcloud DNS zone editing documentation: https://docs.ovhcloud.com/en/guides/web-cloud/domains/dns-zone-edit
- OVHcloud vRack with OpenStack documentation: https://docs.ovhcloud.com/en/guides/public-cloud/network-services/getting-started-creating-vrack-with-openstack

## Issues Found
- The OVH SDK credentials file placed API keys under `[default]`. The SDK expects `[default]` for the endpoint and an endpoint-specific section such as `[ovh-eu]` for the application key, application secret, and consumer key. Updated the sample config accordingly.
- The post referred to an `ovh_api` Ansible module as generally available. Current Ansible documentation does not provide a broad OVH API module. Reworded the section to recommend the OVH Python SDK or manually signed `uri` calls.
- The OpenStack `clouds.yml` example used `project_name` with a placeholder described as a project ID, and capitalized domain names. Updated it to `project_id` and `default` domains to align with OVHcloud/OpenStack credential examples.
- The public cloud playbook used `admin_cidr` without defining it. Added an example CIDR variable so the playbook is internally complete.
- The dedicated server `uri` examples passed an `ovh_signature` variable without showing how it must be calculated. Added per-request signature construction using the documented OVHcloud `$1$` + SHA1 formula and a shared timestamp.
- The private networking section implied that OpenStack network creation alone sets up vRack. Adjusted the wording to clarify that the Public Cloud project must already be attached to a vRack before creating the private network.

## Review Notes
The examples are still illustrative and require real OVHcloud credentials, valid OpenStack region/image/flavor names, an existing SSH key, and appropriate API rights. For production code, a custom Ansible module or the OVH Python SDK is preferable to manually signing raw `uri` calls because signature calculation must match the exact request URL and body.
