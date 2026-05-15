# Validation Summary: How to Use the Ansible Lockdown RHEL9-CIS Role for Automated Hardening

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible
- Ansible Galaxy roles
- Ansible Lockdown RHEL9-CIS role
- CIS Benchmark hardening
- OpenSCAP and SCAP Security Guide

## Sources Consulted
- Ansible Galaxy CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible Galaxy user guide for installing roles: https://docs.ansible.com/ansible/latest/galaxy/user_guide.html
- Ansible Lockdown RHEL9-CIS GitHub repository: https://github.com/ansible-lockdown/RHEL9-CIS
- Ansible Lockdown RHEL9-CIS defaults: https://guardianproject.dev/ansible-lockdown/RHEL9-CIS/src/branch/main/defaults/main.yml
- Ansible Lockdown RHEL9-CIS tasks for SSH rule tags and variables: https://guardianproject.dev/ansible-lockdown/RHEL9-CIS/src/commit/23b60bc629bfc816acdde8cd102d5a2e5f265205/tasks/section_5/cis_5.1.x.yml
- Red Hat RHEL 9 Security Hardening documentation for OpenSCAP scanning and supported SCAP profile IDs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- OpenSCAP manual examples for RHEL 9 SCAP evaluation: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc

## Issues Found
- The OpenSCAP verification command used `xccdf_org.ssgproject.content_profile_cis`, which Red Hat documents as the CIS RHEL 9 Level 2 Server profile. The post applies Ansible Lockdown with the `level1-server` tag, so I changed the OpenSCAP profile to `xccdf_org.ssgproject.content_profile_cis_server_l1`, the documented CIS Level 1 Server profile ID.

## Review Notes
The Ansible Galaxy install syntax, role name, clone URL, role variables, `level1-server` tag usage, check mode flags, and OpenSCAP package/data-stream path are consistent with the consulted documentation. The Ansible Lockdown role is version-sensitive, so future updates should re-check rule numbering and variable names against the role defaults and task files.
