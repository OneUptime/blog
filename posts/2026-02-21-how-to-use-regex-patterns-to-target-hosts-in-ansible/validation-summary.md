# Validation Summary: How to Use Regex Patterns to Target Hosts in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible inventory patterns
- Ansible ad hoc commands
- Ansible playbooks
- Ansible `--limit`
- Python regular expressions
- YAML string escaping

## Sources Consulted
- Ansible Community Documentation: Patterns: targeting hosts and groups, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible Community Documentation: ansible CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible Community Documentation: ansible-playbook CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Python documentation: `re` regular expression operations, https://docs.python.org/3/library/re.html
- ansible-core 2.21.0 local CLI and source check: `ansible --list-hosts` test runs and `ansible/inventory/manager.py`

## Issues Found
- Several regex examples described substring or suffix matching but omitted a leading `.*`. Ansible compiles `~` patterns as Python regexes and applies them with match-style behavior from the start of the host or group name. Updated those examples and the surrounding explanation to use `~.*...` where the intended match is not at the beginning.
- The numbered-host examples for 06-10 and even hosts used a second `~` inside a regex alternation, such as `~-0[6-9]\.|~-10\.`. That second `~` is treated as a literal character in the regex, not as a new Ansible regex pattern. Replaced those examples with single regex alternations like `~.*(-0[6-9]|-10)\.`.
- The quick reference table repeated the same match-position issue for suffix, contains, digit, and numbered-host examples. Updated those patterns to reflect Ansible's actual regex matching behavior.

## Review Notes
The post now aligns with Ansible's documented pattern syntax for `~` regexes, union/intersection/exclusion operators, `hosts:` play patterns, and `--limit`. I could not use a system-installed Ansible because it was not present, so I installed ansible-core 2.21.0 into `/tmp/ansible-core-target` and validated representative corrected patterns with `--list-hosts`.
