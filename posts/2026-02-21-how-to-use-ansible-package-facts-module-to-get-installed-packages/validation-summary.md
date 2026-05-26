# Validation Summary: How to Use Ansible package_facts Module to Get Installed Packages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.package_facts
- YAML playbooks
- Jinja2 templates and filters
- Linux package managers
- Python pip

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.package_facts module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- pip documentation: pip list command, https://pip.pypa.io/en/latest/cli/pip_list/

## Issues Found
- The post incorrectly stated that `package_facts` supports `pip`. Current Ansible documentation lists OS package managers and aliases, but not pip. I updated the support statement and changed the pip section to run `python3 -m pip list --format=json` separately.
- The Debian/Ubuntu package facts example showed RPM-style `release` and `epoch` fields. Ansible documents `name`, `source`, and `version` as the fields always returned, with package-manager-specific additions. I updated the Debian example to include the Debian package revision in `version` and removed `release` and `epoch`.
- The security scanning example defined a curl `max_safe_version` value that the task never used. I changed it to `min_safe_version` and added a matching version comparison task so every variable in the example is exercised.

## Review Notes
The examples use simple version comparisons for illustration. Distribution package versions can include epochs, revisions, and vendor suffixes, so production compliance checks should use the comparison semantics appropriate for the target package manager and distribution.
