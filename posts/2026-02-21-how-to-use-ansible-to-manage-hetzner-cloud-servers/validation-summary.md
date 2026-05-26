# Validation Summary: How to Use Ansible to Manage Hetzner Cloud Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Hetzner Cloud
- hetzner.hcloud Ansible collection
- Hetzner Cloud servers, networks, firewalls, volumes, floating IPs, and load balancers
- YAML playbooks

## Sources Consulted
- Ansible Community Documentation: hetzner.hcloud collection index, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/index.html
- Ansible Community Documentation: hetzner.hcloud.server module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/server_module.html
- Ansible Community Documentation: hetzner.hcloud.ssh_key module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/ssh_key_module.html
- Ansible Community Documentation: hetzner.hcloud.network module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/network_module.html
- Ansible Community Documentation: hetzner.hcloud.subnetwork module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/subnetwork_module.html
- Ansible Community Documentation: hetzner.hcloud.server_network module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/server_network_module.html
- Ansible Community Documentation: hetzner.hcloud.firewall module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/firewall_module.html
- Ansible Community Documentation: hetzner.hcloud.firewall_resource module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/firewall_resource_module.html
- Ansible Community Documentation: hetzner.hcloud.volume module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/volume_module.html
- Ansible Community Documentation: hetzner.hcloud.floating_ip module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/floating_ip_module.html
- Ansible Community Documentation: hetzner.hcloud.load_balancer module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/load_balancer_module.html
- Ansible Community Documentation: hetzner.hcloud.load_balancer_target module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/load_balancer_target_module.html
- Ansible Community Documentation: hetzner.hcloud.load_balancer_service module, https://docs.ansible.com/projects/ansible/latest/collections/hetzner/hcloud/load_balancer_service_module.html
- Hetzner Cloud API changelog, https://docs.hetzner.cloud/changelog
- Hetzner Cloud deprecated server plans, https://docs.hetzner.com/cloud/servers/deprecated-plans/
- ansible-collections/hetzner.hcloud README, https://github.com/ansible-collections/hetzner.hcloud

## Issues Found
- The prerequisites listed Ansible 2.12+, but the current `hetzner.hcloud` collection documentation lists support for ansible-core 2.18.0 or newer. Updated the prerequisite to Ansible 2.18+.
- The examples used `cx21`, `cx31`, and `cx41`, which Hetzner documents as deprecated and unavailable for new orders. Updated those examples to the current comparable `cx23`, `cx33`, and `cx43` server types.

## Review Notes
The playbook syntax and module parameter names match the current `hetzner.hcloud` module documentation. Server type availability can vary by location and account capacity, so the examples remain technically valid but users may still need to choose an available type for their project and location.
