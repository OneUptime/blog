# Validation Summary: How to Deploy SCAP-Compliant RHEL Systems with Kickstart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart
- Anaconda
- OpenSCAP Anaconda add-on
- SCAP Security Guide
- OpenSCAP CLI
- AIDE
- pykickstart / ksvalidator

## Sources Consulted
- Red Hat Enterprise Linux 9 Automatically installing RHEL, Kickstart add-on reference for `%addon com_redhat_oscap`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 Security hardening, deploying baseline-compliant systems using Kickstart and post-install OpenSCAP verification: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, supported SCAP Security Guide profiles in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, AIDE initialization workflow: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/checking-integrity-with-aide_security-hardening
- Pykickstart documentation: https://pykickstart.readthedocs.io/en/latest/kickstart-docs.html

## Issues Found
- The Kickstart snippets used the legacy `%addon org_fedora_oscap` name. Updated them to `%addon com_redhat_oscap`, which is the current RHEL 9 add-on name documented by Red Hat.
- The custom SCAP content example used `content-type = datastream` with a local absolute `tailoring-path`. Red Hat documents `tailoring-path` as a path inside supplied content, and local storage is not supported through `content-url`. Updated the example to use an archive URL with relative `content-path` and `tailoring-path` entries.
- The `ksvalidator` command did not specify the RHEL version. Updated it to `ksvalidator -v RHEL9` to match Red Hat's RHEL 9 validation guidance.
- The HTTP serving example copied `/var/www/html/ks/rhel9-stig.cfg` onto the same directory and did not create the target directory. Updated it to create `/var/www/html/ks` and copy a local `rhel9-stig.cfg` into it.

## Review Notes
The remaining commands and profile IDs are consistent with the cited RHEL 9 documentation. The exact SCAP policy versions vary by RHEL 9 minor release, so production users should verify the installed `scap-security-guide` content with `oscap info` before standardizing a profile.
