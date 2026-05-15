# Validation Summary: How to Scan Remote RHEL Hosts for Compliance with oscap-ssh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP
- oscap-ssh
- SCAP Security Guide
- SSH
- Bash
- sudoers

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Scanning remote systems for vulnerabilities": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Security hardening documentation, "Assessing configuration compliance with a specific baseline": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- OpenSCAP oscap-ssh man page: https://manpages.ubuntu.com/manpages/noble/man8/oscap-ssh.8.html
- OpenSCAP upstream oscap-ssh script: https://raw.githubusercontent.com/OpenSCAP/openscap/main/utils/oscap-ssh
- OpenSCAP project repository: https://github.com/OpenSCAP/openscap

## Issues Found
- The SSH key example used `OSCAP_SSH_KEY`, which is not a documented `oscap-ssh` environment variable. Changed it to use `SSH_ADDITIONAL_OPTIONS="-i $HOME/.ssh/scanner_key"`, matching the documented way to pass SSH options to `oscap-ssh`.
- The sudo troubleshooting section configured sudo access but did not show the required `oscap-ssh --sudo` invocation. Added the `--sudo` scan example and noted that `--sudo` must be the first `oscap-ssh` argument.
- The large content transfer section implied that installing `scap-security-guide` on the target lets `oscap-ssh` use the target's local content path. Upstream `oscap-ssh` validates the input file locally and copies it to the remote temporary directory, so this was inaccurate. Changed the workaround to run `oscap` directly over SSH when target-local content should be used.

## Review Notes
The primary `oscap-ssh <user>@<host> <port> xccdf eval ... /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml` examples match Red Hat's documented command form for RHEL 9 compliance scanning. The fleet summary examples use simple `grep` counts for convenience; a future improvement could parse XCCDF XML with an XML-aware tool for more robust reporting.
