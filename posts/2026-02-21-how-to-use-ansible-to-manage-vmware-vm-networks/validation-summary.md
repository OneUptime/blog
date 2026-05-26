# Validation Summary: How to Use Ansible to Manage VMware VM Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.vmware collection
- community.general collection
- VMware vSphere and vCenter
- VMware virtual machine network adapters
- NetworkManager nmcli
- Ubuntu netplan

## Sources Consulted
- Ansible community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible community.vmware.vmware_guest_network module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_network_module.html
- Ansible community.vmware.vmware_guest_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_info_module.html
- Ansible community.vmware.vmware_vm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_info_module.html
- Ansible community.general.nmcli module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- Ansible module_defaults documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_module_defaults.html

## Issues Found
- The post implied that `vmware_guest` network `ip`, `netmask`, `gateway`, and `dns_servers` entries directly configure existing guest OS networking. Updated the explanation and removed those fields from adapter-addition and bulk-migration examples because the `vmware_guest` docs describe those values as VMware guest customization settings, not direct in-guest reconfiguration for existing VMs.
- The `vmware_guest_network` debug example referenced `nic_change.network_info['Network adapter 1'].mac_address`, but the module returns `network_info` as a list and `network_data` as a dictionary only when gathering network info. Changed the example to report the task change result.
- The NIC removal example used `label` with `state: absent`, but the module requires `mac_address` when removing an adapter. Replaced the label with a MAC address.
- The `vmware_guest_info` example treated `hw_interfaces` as a dictionary of interface detail objects. The documented return shape is a list of interface names with detail fields such as `hw_eth0`. Updated the loop and field references.
- The audit example reported `mac_address` as though it were the network name and filtered on VM names rather than adapter network names. Reworked the audit snippet to gather each VM's adapter details with `vmware_guest_network` and filter by `network_info[].network_name`.
- Clarified the `vmxnet3` adapter description to say it requires a supported guest driver rather than specifically requiring VMware Tools in every modern guest OS case.

## Review Notes
The examples are still environment-specific and require valid vCenter credentials, correct datacenter names, matching VM identifiers, appropriate privileges, and installed Ansible collections. `validate_certs: false` is acceptable for a concise lab-style example, but production automation should normally trust the vCenter CA instead.
