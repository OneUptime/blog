# Validation Summary: How to Use Ansible to Create OpenStack Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- OpenStack
- openstack.cloud Ansible collection
- openstacksdk
- Nova compute instances
- Neutron networking and floating IPs
- Cinder block storage volumes
- cloud-init

## Sources Consulted
- Ansible Community Documentation: openstack.cloud collection index, https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/index.html
- Ansible Community Documentation: openstack.cloud.server module, https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/server_module.html
- Ansible Community Documentation: openstack.cloud.floating_ip module, https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/floating_ip_module.html
- Ansible Community Documentation: openstack.cloud.volume module, https://docs.ansible.com/projects/ansible/latest/collections/openstack/cloud/volume_module.html
- Ansible Core Documentation: ansible.builtin.wait_for_connection module, https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/wait_for_connection_module.html
- OpenStack SDK Documentation: Configuring OpenStack SDK Applications, https://docs.openstack.org/openstacksdk/latest/user/config/configuration.html
- cloud-init Documentation: Module reference for packages, write_files, and runcmd, https://cloudinit.readthedocs.io/en/stable/reference/modules.html

## Issues Found
- The server creation examples did not set `auto_ip: false`. The current `openstack.cloud.server` module defaults `auto_ip` to true, which can implicitly request public IP handling even though the article demonstrates floating IP assignment as a separate explicit step. Added `auto_ip: false` to server creation examples that use private application networks.
- The templated cloud-init example downloaded an application JAR into `/opt/myapp/myapp.jar` without first creating `/opt/myapp`. Added `mkdir -p /opt/myapp` before the download command.
- The dynamic inventory example used `gather_facts: true` before `wait_for_connection`. Ansible gathers facts before tasks, so newly provisioned hosts could fail before the wait task runs. Changed the play to `gather_facts: false` and added an explicit `ansible.builtin.setup` task after `wait_for_connection`.
- The teardown example comment said it removed instances and floating IPs, but the server deletion task did not delete associated floating IP allocations. Added `delete_ips: true` to the absent-state server task.
- The production tip about ephemeral disks said they vanish if the compute host fails. That is storage-backend dependent in OpenStack. Reworded it to say ephemeral root disks are deleted with the instance and may be unavailable after a compute host failure depending on the backend.

## Review Notes
- The examples assume that named images, flavors, networks, security groups, key pairs, and volume types already exist in the OpenStack project, which is appropriate for a tutorial but should be adapted per cloud.
- The floating IP example is correct for a single fixed network. Deployments with multiple fixed networks may need `nat_destination` or `fixed_address`.
- YAML snippets were syntax-checked after edits; the raw Jinja cloud-init template was excluded from generic YAML parsing because it intentionally contains unrendered template expressions.
