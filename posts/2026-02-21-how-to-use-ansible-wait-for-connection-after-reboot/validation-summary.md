# Validation Summary: How to Use Ansible wait_for_connection After Reboot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.wait_for_connection
- ansible.builtin.reboot
- ansible.builtin.wait_for
- Ansible async and polling
- SSH service restarts
- Linux reboot verification
- Amazon EC2 instance management with amazon.aws.ec2_instance

## Sources Consulted
- Ansible wait_for_connection module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible reboot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_async.html
- Ansible set_fact module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/set_fact_module.html
- amazon.aws.ec2_instance module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html

## Issues Found
- The IP address change example used `ansible.builtin.reboot` before overriding `ansible_host`. Because the reboot module waits for the managed host to come back and respond to commands, it can keep waiting on the old address when the reboot changes the host's address. Changed this example to fire `/sbin/reboot` asynchronously and then run `wait_for_connection` with the new `ansible_host`.
- The rolling reboot example compared pre- and post-reboot `/proc/uptime` values. This can fail incorrectly when the host had only been up briefly before the reboot and the post-reboot delay makes the new uptime larger than the old uptime. Changed the verification to compare `/proc/sys/kernel/random/boot_id`, matching the reboot module's default boot-time signal on Linux.
- The EC2 stop/start example updated `ansible_host` with `set_fact` after delegated EC2 operations but did not delegate the fact-setting task. Added `delegate_to: localhost` so the task does not require a connection to the stopped or address-changing managed host while still setting the variable for the current inventory host.

## Review Notes
The core module parameters and descriptions for `wait_for_connection`, `reboot`, and `wait_for` matched the current official Ansible documentation. The examples are Linux-oriented because they use `/sbin/reboot`, `sshd`, netplan, and `/proc`; Windows targets would require Windows-specific modules such as `ansible.windows.win_reboot` where applicable.
