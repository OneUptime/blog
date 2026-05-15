# Validation Summary: How to Apply DISA STIG Controls to RHEL with Ansible Playbooks

## Status
validated

## Post Type
Tutorial / compliance hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DISA STIG
- Ansible and Ansible Playbooks
- OpenSCAP / oscap
- SCAP Security Guide
- OpenSSH server configuration
- Linux Audit
- FIPS mode and RHEL crypto policies

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 FIPS mode documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat blog, RHEL 9 STIG automation released: https://www.redhat.com/en/blog/red-hat-enterprise-linux-9-stig-automation-released
- OpenSCAP user manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- DISA Cyber Exchange STIGs landing page: https://public.cyber.mil/stigs/
- RHEL 9 STIG reference data for SSH controls, including V-257985 and V-257991: https://www.stigviewer.com/stigs/red_hat_enterprise_linux_9 and https://stigui.com/stigs/RHEL_9_STIG/groups/V-257991
- fips-mode-setup manual reference for --check and --is-enabled behavior: https://manpages.ubuntu.com/manpages/jammy/man8/fips-mode-setup.8.html

## Issues Found
- The CAT II and CAT III descriptions stated fixed 30-day and 90-day remediation deadlines. STIG severity categories classify risk, but remediation timing depends on the organization's risk-management and POA&M process. Updated those descriptions and the Mermaid diagram labels.
- The FIPS Ansible task checked for the string `is not enabled`, but `fips-mode-setup --check` reports disabled systems as `FIPS mode is disabled.` Updated the task to use `fips-mode-setup --is-enabled` and branch on the return code.
- The SSH hardening snippet had several incorrect RHEL 9 STIG vulnerability ID comments and included `aes192-ctr`, which is not in the current approved RHEL 9 STIG cipher set for the SSH server. Corrected the IDs and aligned the cipher and MAC lists with current RHEL 9 STIG reference data.
- The complete playbook wrote OpenSCAP output under `/var/log/compliance` without creating that directory first. Added an Ansible `file` task to create it before running the scan.
- The verification snippet counted `result="pass"` and `result="fail"` attributes, but XCCDF result files contain result elements such as `<result>pass</result>`. Updated the grep patterns.

## Review Notes
- The generated SCAP Security Guide Ansible playbook and profile ID are valid for RHEL 9 when the `scap-security-guide` content is installed.
- Red Hat notes that enabling FIPS mode during installation is the strongest path for FIPS compliance; switching an existing system with `fips-mode-setup --enable` may require additional review of existing keys and applications.
