# Validation Summary: How to Integrate IPAM with Ansible for Automated IPv4 Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- NetBox Ansible collection
- phpIPAM REST API
- IPv4 address management
- Jinja templating in Ansible playbooks

## Sources Consulted
- Ansible `netbox.netbox.netbox_ip_address` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_ip_address_module.html
- Ansible `netbox.netbox.netbox_device` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_device_module.html
- Ansible `netbox.netbox.netbox_device_interface` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_device_interface_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.regex_replace` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_replace_filter.html
- Ansible magic variables documentation (`inventory_hostname`): https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- NetBox IP address model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM API reference: https://www.phpipam.net/api/api_reference/

## Issues Found
- The NetBox install section only installed the collection. I added `python -m pip install pynetbox` because the official module docs list `pynetbox` as a required dependency on the control node.
- The `ipaddr('address')` filter in the first playbook introduced an undocumented extra dependency on the `ansible.utils` collection and `netaddr`. I replaced it with `ansible.builtin.regex_replace('/.*$', '')`, which is included in `ansible-core`.
- The `netbox_device_create.yml` snippet referenced `netbox_url` and `netbox_token` without defining them. I added the missing `vars` block so the example is runnable as shown.
- The NetBox interface example used `device: { name: "web05" }` and `assigned_object.device: { name: "web05" }`. I changed those to plain strings and switched the final IP assignment to the documented `interface` structure used for attaching an IP to a device interface.
- The NetBox interface type was written as `1000base-t`. I updated it to `1000Base-t (1GE)` to match the documented form-factor value style used by the module examples.
- The phpIPAM authentication example posted JSON credentials to `/user/`. The official phpIPAM API authenticates via the HTTP `Authorization` header, so I changed the task to use Ansible `uri` basic-auth parameters with `force_basic_auth: true`.
- The phpIPAM example used the generic `token` header and an `inventory_hostname`-derived FQDN while the play runs on `localhost`. I changed the header to the documented `phpipam-token` name and changed the hostname source to the explicit `server_name` variable so the reserved record matches the intended provisioned host.
- The phpIPAM example referenced `phpipam_password`, `subnet_id`, and related values without defining them. I added a minimal `vars` block so the snippet is complete.
- The closing claim said the workflow would "ensure zero IP conflicts." I softened that to "help reduce IP conflicts" because IPAM-backed automation improves consistency but does not provide an absolute guarantee in every environment.

## Review Notes
- The examples remain valid as instructional snippets, but production usage should prefer HTTPS endpoints for both NetBox and phpIPAM, especially because phpIPAM dynamic authentication uses HTTP Basic authentication.
- The phpIPAM flow shown here is still a two-step "get first free IP, then create address" workflow. It is supported by the API reference, but a single server-side allocation endpoint can be preferable when avoiding race conditions matters.
