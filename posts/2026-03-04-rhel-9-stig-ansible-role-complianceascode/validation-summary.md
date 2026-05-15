# Validation Summary: How to Use the RHEL STIG Ansible Role from ComplianceAsCode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DISA STIG
- ComplianceAsCode / SCAP Security Guide
- OpenSCAP
- Ansible and Ansible Galaxy roles
- scap-security-guide RPM

## Sources Consulted
- ComplianceAsCode content README: https://github.com/ComplianceAsCode/content
- ComplianceAsCode build documentation: https://complianceascode.readthedocs.io/en/latest/manual/developer/02_building_complianceascode.html
- Red Hat RHEL 9 Security hardening documentation, configuration compliance and Ansible remediation sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- RedHatOfficial generated RHEL 9 STIG Ansible role: https://github.com/RedHatOfficial/ansible-role-rhel9-stig
- RedHatOfficial RHEL 9 STIG role defaults, metadata, and tasks: https://github.com/RedHatOfficial/ansible-role-rhel9-stig/tree/main
- OpenSCAP Security Guide for RHEL 9 STIG: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-stig.html

## Issues Found
- The post implied that the `scap-security-guide` RPM installs the reusable STIG role under `/usr/share/scap-security-guide/ansible/`. Official ComplianceAsCode and Red Hat documentation describe that location as containing generated Ansible playbooks. I changed the RPM section to refer to generated playbooks and added the documented `ansible-galaxy install RedHatOfficial.rhel9_stig` command for the reusable role.
- The role examples used `rhel9-role-stig`, which is not the documented generated role name. The RedHatOfficial role metadata and README use `RedHatOfficial.rhel9_stig`, so I updated the playbook examples.
- The source-build dependency command omitted required packages from the ComplianceAsCode build documentation and included packages that are not listed in the official required dependency set. I changed it to `cmake make openscap-utils openscap-scanner python3 python3-setuptools`.
- The source-build section said Ansible roles are generated during the normal product build. ComplianceAsCode documents the normal build targets as producing content such as SCAP XML, guides, scripts, and profile playbooks; the published role is generated and distributed separately. I changed that wording to generated playbooks.
- The `--skip-tags` example used `enable_fips_mode`, which was not present in the current generated RHEL 9 STIG role tasks. I changed it to the current FIPS-related tag `fips_custom_stig_sub_policy`.
- The update command said the RPM update gets the latest role. Since the RPM provides packaged SCAP content and generated playbooks, I changed the comment to say packaged playbooks and SCAP content.

## Review Notes
The OpenSCAP scan commands, `oscap xccdf eval` options, RHEL 9 STIG profile ID, generated playbook path pattern, and Ansible `--check`, `--diff`, `--tags`, `--skip-tags`, and `fetch` usage are consistent with the consulted documentation and generated role content. The generated role's exact controls and tags can change as ComplianceAsCode tracks newer DISA STIG releases, so examples should be rechecked when updating the article for a new `scap-security-guide` or `RedHatOfficial.rhel9_stig` release.
