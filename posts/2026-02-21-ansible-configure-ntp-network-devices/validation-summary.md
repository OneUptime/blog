# Validation Summary: How to Use Ansible to Configure NTP on Network Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco IOS and IOS XE network automation
- Cisco NX-OS network automation
- Arista EOS network automation
- Network Time Protocol (NTP)
- YAML playbooks and variables

## Sources Consulted
- Ansible cisco.ios.ios_ntp_global module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/ios/ios_ntp_global_module.html
- Ansible cisco.nxos.nxos_ntp_global module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/nxos/nxos_ntp_global_module.html
- Ansible arista.eos.eos_ntp_global module documentation: https://docs.ansible.com/ansible/latest/collections/arista/eos/eos_ntp_global_module.html
- Ansible ansible.builtin.regex_search filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Cisco IOS Basic System Management Command Reference, NTP commands: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/bsm/command/bsm-cr-book/bsm-cr-n1.html

## Issues Found
- The NTP verification assert checked for `'synchronized'` in `show ntp status`, which would also match `unsynchronized`. Changed it to check for Cisco IOS output containing `clock is synchronized`.
- The migration wait condition had the same substring issue and could stop while the device was still unsynchronized. Changed it to check for `clock is synchronized`.
- The drift parsing expression piped a possible `None` result from `regex_search` into `first`, which can fail before the default value is applied. Changed it to default to `['unknown']` before selecting the first match.
- The drift report copy task wrote to `reports/ntp_drift_report.json` without ensuring that the local `reports` directory exists. Added a delegated `file` task to create the directory.

## Review Notes
- The Ansible resource module parameter names used in the examples match the current official collection documentation.
- The Cisco IOS NTP access-group, authentication-key, trusted-key, server, source, and status commands are consistent with Cisco command reference examples.
