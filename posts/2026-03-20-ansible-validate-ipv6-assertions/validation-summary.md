# Validation Summary: How to Validate IPv6 Configuration with Ansible Assertions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- `ansible.builtin.assert`
- `ansible.builtin.command`
- `ansible.builtin.include_tasks`
- Linux IPv6 networking
- `sysctl`
- `ss`
- `ping`
- `dig`

## Sources Consulted
- Ansible `include_tasks` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible `assert` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible `command` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible task include guidance: https://docs.ansible.com/projects/ansible/2.4-archive/playbooks_reuse_includes.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local `man ping(8)` and `ping6 -h`
- Local `man ss(8)` and `ss -h`
- Local `dig -h`
- Local `ip -h`
- Local `sysctl --help`

## Issues Found
- The included YAML examples were written as full plays, but `ansible.builtin.include_tasks` includes task lists, not playbooks. I converted the included files to flat task lists so the full audit example is structurally correct.
- The sysctl example checked `net.ipv6.conf.all.disable_ipv6`, but the Linux kernel documentation states that reading that value is not a meaningful way to determine whether IPv6 is enabled. I removed that assertion and kept the example focused on meaningful host sysctls.
- The sysctl values shown were presented as generic compliance settings even though `forwarding=0` and `accept_ra=1` are host-style expectations, not universal IPv6 settings. I clarified that those example values are for a non-router Linux host.
- The service checks matched `':80'` and `':22'` in `ss` output, which can produce false positives and did not actually verify the named services. I changed those examples to filtered IPv6 port checks using `ss`.
- The connectivity example used `ping6`, while current Linux iputils documents IPv6 probing through `ping -6` and treats `ping6` as legacy compatibility behavior. I updated the example to `ping -6`.
- The DNS example did not explicitly test DNS over IPv6 and could fail before reaching the assertion. I changed it to `dig -6` against an IPv6 resolver and added assertion checks for command success and AAAA output.
- The report command tried to set `ansible_check_mode` via `--extra-vars`, but Ansible enables check mode with `--check`, and `command` tasks without `creates` or `removes` are skipped in check mode. I removed that incorrect invocation and kept the report command as a normal read-only audit run.
- The description claimed the post covered network devices, but all examples use Linux userland commands such as `ip`, `sysctl`, `ss`, `ping`, and `dig`. I narrowed the wording to Linux hosts.

## Review Notes
- The examples assume Linux targets with `iproute2`, `ping`, `dig`, and `sysctl` available on the managed host.
- Router-oriented systems will often require different IPv6 sysctl expectations than the host-oriented values shown here.
- Because the playbook only reads state and uses `changed_when: false`, a normal `ansible-playbook` run already behaves as a non-mutating audit for these examples.
