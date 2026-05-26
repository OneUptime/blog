# Validation Summary: How to Use Ansible to Manage DigitalOcean Droplets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and dynamic inventory
- `community.digitalocean` Ansible collection
- DigitalOcean Droplets
- DigitalOcean SSH keys
- DigitalOcean Cloud Firewalls
- DigitalOcean Block Storage volumes
- DigitalOcean snapshots
- DigitalOcean VPC networking
- DigitalOcean Monitoring

## Sources Consulted
- Ansible `community.digitalocean.digital_ocean_droplet` module documentation: https://docs.ansible.com/ansible/latest/collections/community/digitalocean/digital_ocean_droplet_module.html
- Ansible `community.digitalocean.digital_ocean_sshkey` module documentation: https://docs.ansible.com/ansible/latest/collections/community/digitalocean/digital_ocean_sshkey_module.html
- Ansible `community.digitalocean.digital_ocean_firewall` module documentation: https://docs.ansible.com/ansible/latest/collections/community/digitalocean/digital_ocean_firewall_module.html
- Ansible `community.digitalocean.digital_ocean_block_storage` module documentation: https://docs.ansible.com/ansible/latest/collections/community/digitalocean/digital_ocean_block_storage_module.html
- Ansible `community.digitalocean.digital_ocean_snapshot` module documentation: https://docs.ansible.com/ansible/latest/collections/community/digitalocean/digital_ocean_snapshot_module.html
- Ansible `community.digitalocean.digitalocean` inventory plugin documentation: https://docs.ansible.com/ansible/latest/collections/community/digitalocean/digitalocean_inventory.html
- Ansible `now()` templating function documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html
- DigitalOcean VPC documentation: https://docs.digitalocean.com/products/networking/vpc/
- DigitalOcean VPC pricing documentation: https://docs.digitalocean.com/products/networking/vpc/details/pricing/
- DigitalOcean Monitoring quickstart: https://docs.digitalocean.com/products/monitoring/getting-started/quickstart/
- DigitalOcean Droplet resize documentation: https://docs.digitalocean.com/products/droplets/how-to/resize/
- DigitalOcean snapshot details and pricing documentation: https://docs.digitalocean.com/products/snapshots/details/

## Issues Found
- The single-Droplet debug example read `networks.v4[0]`, which can return the wrong address if the first IPv4 entry is not public. Changed it to select the public IPv4 address explicitly.
- The SSH key example named a task "Store SSH key fingerprint" while storing the numeric key ID. Renamed the task to "Store SSH key ID".
- The snapshot example used `ansible_date_time.date` while `gather_facts: false` was set, so the fact would not be available. Replaced it with Ansible's `now()` templating function.
- The resize example said it powered off the Droplet but used `state: present`, which does not power it off. Changed the pre-resize task to `state: inactive`.
- The VPC tip overgeneralized private IP assignment and bandwidth behavior. Updated it to match current DigitalOcean VPC behavior for default VPC assignment and free traffic within a VPC or same-datacenter peering.
- The monitoring tip said no separate agent is installed. DigitalOcean Monitoring enhanced metrics use the `do-agent` metrics agent, and the Ansible module's `monitoring` option installs it during creation. Updated the wording.

## Review Notes
The `community.digitalocean` collection is documented as deprecated in the current Ansible community documentation and scheduled for removal from Ansible 13, but the modules used in the post remain available in the current documented collection version.
