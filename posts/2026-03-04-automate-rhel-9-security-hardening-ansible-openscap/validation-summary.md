# Validation Summary: How to Automate RHEL 9 Security Hardening with Ansible and OpenSCAP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible and ansible-core
- OpenSCAP
- SCAP Security Guide
- RHEL 9 compliance remediation playbooks

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Python documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_introduction-to-python_installing-and-using-dynamic-programming-languages
- Ansible installation documentation: https://docs.ansible.com/projects/ansible/5/installation_guide/intro_installation.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/getting_started/get_started_inventory.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible privilege escalation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- ComplianceAsCode content documentation and examples: https://github.com/ComplianceAsCode/content

## Issues Found
- The post claimed to automate RHEL 9 security hardening with OpenSCAP, but the example playbook only installed general-purpose packages and managed `sshd`. Replaced the generic playbook with the documented SCAP Security Guide Ansible playbook workflow.
- The installation step only installed `ansible-core`. Updated it to include `scap-security-guide`, `openscap-scanner`, and `rhc-worker-playbook`, which Red Hat documents as prerequisites for RHEL 9 OpenSCAP/SSG Ansible remediation.
- The verification step checked for the unrelated `htop` package. Replaced it with an `oscap xccdf eval` command that evaluates the selected profile and writes an HTML report.
- The summary used lowercase product names and described generic Ansible automation rather than OpenSCAP-generated remediation playbooks. Updated it to accurately describe the corrected workflow.

## Review Notes
The SSG remediation playbooks can make significant system changes and should be tested with `--check` and reviewed against the organization's selected profile before production rollout.
