# Validation Summary: How to Automate RHEL Security Hardening with Ansible and OpenSCAP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP
- SCAP Security Guide
- Ansible / ansible-core
- CIS security benchmarks
- SSH and SCP

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- OpenSCAP User Manual, generating Ansible playbooks: https://static.open-scap.org/openscap-1.3/oscap_user_manual.html
- SCAP Security Guide RHEL 9 CIS profile guide: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The package installation command omitted `ansible-core`, but the tutorial later runs `ansible-playbook`. Added `ansible-core` to the RHEL `dnf install` command so the playbook execution command has the required CLI available.
- The package installation text said to install the SCAP tools only on the Ansible control node, but the verification example runs `oscap` directly on a remote host over SSH. Clarified that SCAP tools must also be installed on target hosts where direct `oscap` scans are run.

## Review Notes
- The `oscap xccdf generate fix --fix-type ansible --profile ... --output ...` workflow is supported. When generated directly from a profile and data stream, it creates remediations for selected rules without first limiting output to failed rules from a prior scan.
- The CIS RHEL 9 profile ID `xccdf_org.ssgproject.content_profile_cis` is valid for the CIS Level 2 Server profile in SCAP Security Guide content.
- Some generated RHEL 9 remediation playbooks may require additional Ansible collections or the Red Hat Connector collection path depending on how they are generated and run. The post's recommendation to review and dry-run the playbook before applying it remains important.
