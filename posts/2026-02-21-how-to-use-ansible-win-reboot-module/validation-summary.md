# Validation Summary: How to Use Ansible win_reboot Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- Windows Server reboot automation
- WinRM
- Windows services
- Windows features
- PowerShell registry checks
- Ansible playbook error handling

## Sources Consulted
- Ansible documentation: ansible.windows.win_reboot module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_reboot_module.html
- Ansible documentation: ansible.windows.win_feature module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_feature_module.html
- Ansible documentation: ansible.windows.win_package module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_package_module.html
- Ansible documentation: ansible.windows.win_service module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible documentation: ansible.windows.win_uri module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_uri_module.html
- Ansible documentation: ansible.windows.win_command module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_command_module.html
- Ansible documentation: ansible.builtin.wait_for module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible documentation: playbook blocks and rescue behavior - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible documentation: retrying tasks with until/retries - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Microsoft Learn: determine installed .NET Framework versions - https://learn.microsoft.com/en-us/dotnet/framework/install/how-to-determine-which-versions-are-installed

## Issues Found
- The `reboot_timeout` explanation was incomplete. The official `win_reboot` documentation states that the timeout covers the host reappearing and responding to the test command, and that it is evaluated separately for reboot verification and test command success. Updated the description accordingly.
- The `post_reboot_delay` explanation and timeline said the delay occurs after WinRM becomes available. Current `win_reboot` documentation defines it as a delay after the reboot command succeeds and before validation. Updated the timeout description and Mermaid sequence.
- The basic reboot explanation said the module verifies WinRM connectivity. Updated it to say the module verifies that the host responds to the test command, which is the documented readiness check.
- The conditional reboot example used a .NET Framework installer with a hard-coded `product_id`. .NET Framework 4.5 and later are normally detected through the `Release` registry value, while Ansible's documented feature-install example exposes `reboot_required` directly. Replaced the package example with a documented `ansible.windows.win_feature` IIS Web-Server example.
- The rolling reboot service verification used `retries` and `delay` without an `until` condition. Added `until: service_checks.state == 'running'` so the retry behavior is explicit and compatible with Ansible versions where `retries` alone is not sufficient.
- The failure-handling example used a `rescue` block around `win_ping` and described the rescue path as handling an unreachable server. Ansible rescue blocks do not catch unreachable-host errors. Replaced the remote ping with a controller-side `ansible.builtin.wait_for` check against the WinRM port so the rescue block handles a normal task failure.
- The best-practices section said serial rolling reboots provide a zero-downtime guarantee. Changed this to reduced downtime risk because availability still depends on the application, cluster, and load balancer behavior.

## Review Notes
The post is technically relevant and suitable for validation after the corrections above. The load balancer URLs and health endpoint are illustrative placeholders and were treated as example environment-specific values rather than external links to verify.
