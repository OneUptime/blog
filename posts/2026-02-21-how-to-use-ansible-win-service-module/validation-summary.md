# Validation Summary: How to Use Ansible win_service Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.windows collection
- ansible.windows.win_service module
- ansible.windows.win_service_info module
- Windows services
- Windows service recovery options

## Sources Consulted
- Ansible Community Documentation: ansible.windows.win_service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible Community Documentation: ansible.windows.win_service_info module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_info_module.html
- Ansible Community Documentation: ansible.windows.win_user_right module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_user_right_module.html
- Microsoft Learn: Configuring a Service Using SC: https://learn.microsoft.com/en-us/windows/win32/services/configuring-a-service-using-sc
- Microsoft Learn: Sc failure command syntax: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc742019(v=ws.11)

## Issues Found
- The dependency example claimed to add dependencies without removing existing ones, but omitted `dependency_action: add`. The default action is `set`, which replaces the service's dependencies. Updated the example to add only `MyHelperService` with `dependency_action: add`.
- The built-in `NetworkService` and `LocalService` account examples supplied an empty password. Current Ansible documentation shows these accounts without a password because they have no password, so the empty `password` fields were removed.
- The recovery-options section said `win_service` does not directly manage recovery options and used `win_shell` with `sc.exe`. Current `ansible.windows.win_service` supports `failure_actions`, `failure_reset_period_sec`, and `failure_actions_on_non_crash_failure`, so the section was updated to use the native module options.
- The service-status verification example used `win_service` as an information-gathering task and read return fields directly from each loop result. Current Ansible documentation says historical `win_service` service-info return values should be avoided in favor of `ansible.windows.win_service_info`, so the example now uses `win_service_info` and reads `item.services[0].state`.
- The querying section said `win_service` returns service information for later tasks. Updated it to use `win_service_info` and the correct `services[0]` return structure.

## Review Notes
The remaining module parameters and state/startup-mode examples match current Ansible documentation. The workspace does not have `ansible-playbook` installed, so local playbook syntax validation could not be run; snippets were reviewed against the official module documentation instead.
