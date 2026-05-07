# Validation Summary: How to Roll Out IPv6 Across a Fleet of Servers with Ansible

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Ansible playbooks
- Ansible rolling deployments (`serial`, `max_fail_percentage`, handlers)
- Netplan
- IPv6 host configuration and validation
- Linux networking utilities (`ip`, `ping`)
- `systemd-resolved`

## Sources Consulted
- Ansible `wait_for` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible handlers guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible error handling (`max_fail_percentage`): https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible execution strategies (`serial` percentages): https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible playbook keywords reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible `ansible-playbook` CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan reference and file-permission guidance: https://netplan.readthedocs.io/en/stable/reference/
- Netplan CLI reference (`netplan apply`): https://netplan.readthedocs.io/en/stable/cli/
- `systemd-resolved` documentation for `/etc/resolv.conf`: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- Google Public DNS configuration guide: https://developers.google.com/speed/public-dns/docs/using
- `ping(8)` from iputils: https://man7.org/linux/man-pages/man8/ping.8%40%40iputils.html

## Issues Found
- The canary verification used `ansible.builtin.wait_for` with only `timeout`, which Ansible documents as a sleep rather than a condition check. I replaced it with `ip -6 addr show scope global` plus `retries`, `delay`, and `until` so the play actually waits for a global IPv6 address.
- The role edited `/etc/resolv.conf` directly and described that as updating DNS search settings. Netplan documents DNS configuration under `nameservers.addresses` and `nameservers.search`, and `systemd-resolved` commonly manages `/etc/resolv.conf`, so I removed the direct file edit and kept DNS configuration within the Netplan-managed configuration.
- The canary connectivity test used `ping6`. Current iputils documentation states the separate `ping6` binary was merged into `ping`, so I changed the example to `ping -6`.
- The staging comment implied `serial: "20%"` was a fixed-size batch. Ansible documents percentage-based `serial` as a percentage of the hosts in the current play, so I clarified the comment to say it applies to 20% of the staging group.
- The production comment on `max_fail_percentage` was ambiguous about scope. Ansible documents that the threshold is evaluated per current batch when used with `serial`, so I clarified that `serial: 10` plus `max_fail_percentage: 5` aborts on any failure in that 10-host batch.
- The role/playbook examples notified `Apply Netplan` without showing a corresponding handler, and the rollback playbook had no handler definition at all. I added explicit `Apply Netplan` handlers so the examples are executable as written.

## Review Notes
- All embedded YAML snippets in the post parsed successfully after the corrections.
- `ansible-playbook` is not installed in this workspace, so live playbook execution was not possible here; command and behavior verification relied on official documentation instead.
- Local CLI help was used to confirm the final `ip` and `ping` command forms shown in the post.
- `validation.json` was validated locally with `jq`.
