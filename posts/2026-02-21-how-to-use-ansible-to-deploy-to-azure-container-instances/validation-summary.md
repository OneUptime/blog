# Validation Summary: How to Use Ansible to Deploy to Azure Container Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- azure.azcollection
- Azure Container Instances
- Azure Virtual Network integration
- Azure Files volumes
- Ansible playbooks and built-in modules

## Sources Consulted
- Ansible `azure.azcollection.azure_rm_containerinstance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_containerinstance_module.html
- Ansible `azure.azcollection.azure_rm_containerinstance_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_containerinstance_info_module.html
- Azure Container Instances virtual network documentation: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-vnet
- Azure Container Instances virtual network concepts and limitations: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-virtual-network-concepts
- Azure Container Instances state documentation: https://learn.microsoft.com/en-us/azure/container-instances/container-state
- azure.azcollection requirements file: https://github.com/ansible-collections/azure/blob/dev/requirements.txt

## Issues Found
- The prerequisites installed only a few Azure SDK packages. The official collection documentation says all Python packages in the collection requirements file must be installed, so the command now installs `requirements.txt` from the installed collection.
- `restart_policy: Always` used Azure API casing, but the Ansible module choices are lowercase. Changed it to `always`.
- The examples used the deprecated top-level `ports` option. Removed it where container-level `ports` already expose the same ports.
- The basic example used an unsupported `secure_environment_variables` parameter. Changed the secret environment variable to the documented `environment_variables` item with `is_secure: true`.
- The VNet example omitted `ip_address: private`. The module requires `subnet_ids` when `ip_address` is private, and Azure VNet deployments are private rather than public.
- The health monitoring example used the wrong info-module return key, `containerinstances`. Changed it to `container_groups`.
- The health monitoring example asserted an undocumented nested `instance_view.current_state` structure from the Ansible info module. Changed the assertion to verify that the container group exists and has an IP address before probing the application health endpoint.
- The basic deployment example labeled an IP address as an FQDN. Changed the task name to display the container IP.

## Review Notes
- ACI container groups deployed into a virtual network require a delegated subnet, and current Azure documentation says a NAT gateway is required for supported outbound connectivity.
- Public IP or DNS-label exposure is not supported directly for container groups deployed into a virtual network.
