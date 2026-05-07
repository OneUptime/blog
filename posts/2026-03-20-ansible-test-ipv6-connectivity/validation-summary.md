# Validation Summary: How to Test IPv6 Connectivity with Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules (`command`, `uri`, `assert`, `set_fact`, `copy`, `debug`)
- IPv6 networking
- ICMP ping
- DNS and `dig`
- HTTP/HTTPS connectivity checks
- Traceroute

## Sources Consulted
- Ansible `command` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `uri` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible playbook keywords reference (`timeout`, `delegate_to`, `run_once`): https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible facts documentation (`ansible_all_ipv6_addresses`): https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible filters documentation (`map('extract', hostvars, ...)`): https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible CLI docs (`ansible-playbook` supports multiple playbook arguments): https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- `ping` local help output on the review machine (`ping -6` is the current IPv6 selector)
- `dig -h` local help output on the review machine (argument order and `+short` behavior)
- Traceroute man page / synopsis (`traceroute6` is an alias of `traceroute`): https://www.mankier.com/8/traceroute

## Issues Found
- Tests 2, 3, and 4 were not valid standalone Ansible playbooks. They started at `tasks:` even though the post tells readers to save and run them as separate playbook files. I added proper play definitions with `hosts: all` and `gather_facts: false`.
- The DNS example used `dig AAAA {{ item }} +short`, which is not the correct query ordering shown by `dig -h`. I changed it to `dig +short {{ item }} AAAA`.
- The ping and traceroute examples used `ping6` and `traceroute6`. Current tooling documents IPv6 mode via `ping -6` and `traceroute -6`, with the `*6` names treated as aliases. I updated both commands to the current form.
- The HTTP results task reported `item.url`, which is less reliable than using the original loop item from the registered results. I changed it to `item.item` and added `changed_when: false` so the check behaves like the other diagnostic tasks.
- The report play referenced `ping_google` and `aaaa_lookup` without defining them first, so it would fail at runtime. I added the missing IPv6 ping and AAAA lookup tasks.
- The report output path in the playbook did not match the documented `cat /tmp/ipv6-connectivity-report.json` command, and the original task wrote per-host files instead of a single report. I changed the task to aggregate all hosts into one controller-side JSON file at `/tmp/ipv6-connectivity-report.json` using `run_once`.
- The original report used `json_query`, which depends on JMESPath being available on the controller. I replaced it with Ansible’s built-in `map('extract', hostvars, 'connectivity_report')` pattern to avoid that extra dependency.

## Review Notes
- The post is technically correct after the fixes above.
- The examples assume POSIX managed hosts and the presence of standard network tools such as `ping`, `dig`, and `traceroute`.
- The `http://[::1]/` example will only succeed if a web server is listening on the IPv6 loopback address on the managed host; the playbook already treats failures there as non-fatal.
