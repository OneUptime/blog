# Validation Summary: How to Scan RHEL for STIG Compliance Using OpenSCAP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP
- SCAP Security Guide
- DISA STIG
- XCCDF results
- Asset Reporting Format (ARF)
- DISA STIG Viewer
- Bash and cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Scanning the system for configuration compliance and vulnerabilities": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- OpenSCAP upstream user manual, `oscap xccdf eval`, tailoring, and `generate fix` examples: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- OpenSCAP 1.4.1 User Manual, generating reports and remediation scripts/playbooks: https://static.open-scap.org/openscap-1.4.1/oscap_user_manual.html
- `oscap(8)` manual page for `xccdf eval`, `--results`, `--results-arf`, `--stig-viewer`, `--tailoring-file`, exit codes, and `generate fix`: https://manpages.debian.org/testing/openscap-scanner/oscap.8.en.html
- DISA STIG Viewer 3.x User Guide, importing XCCDF results into a checklist: https://dl.dod.cyber.mil/wp-content/uploads/stigs/pdf/U_STIG_Viewer_3-x_User_Guide_V1R5.pdf
- DoD Cyber Exchange SRG / STIG Tools page for STIG Viewer XCCDF support: https://public.cyber.mil/stigs/srg-stig-tools/
- NIST XCCDF 1.2 publication page for XCCDF result format context: https://www.nist.gov/publications/specification-extensible-configuration-checklist-description-format-xccdf-version-12

## Issues Found
- The initial scan wrote to `/var/log/compliance` without first creating that directory. Added `mkdir -p /var/log/compliance` before the first scan command.
- The exit-code explanation said OpenSCAP returns `2` only when rules fail. The `oscap(8)` manual states `2` is returned when at least one rule has `fail` or `unknown`; updated the text.
- The summary commands searched for `result="pass"` style attributes, but XCCDF rule results are represented as result elements such as `<result>pass</result>`. Updated the `grep` patterns in both the one-off summary and automation script.
- The CAT I helper command claimed to extract failed rules and severity, but it only extracts failed rule titles from terminal output. Updated the comment and surrounding text to direct readers to use the HTML report severity column for CAT I / high-severity prioritization.
- The remediation examples used `--result-id ""`. OpenSCAP documents result-oriented fixes with a concrete TestResult ID. Added a command to extract the TestResult ID with `oscap info` and pass it to both bash and Ansible fix generation.
- The STIG Viewer section described ARF as the import format for STIG Viewer. OpenSCAP documents `--stig-viewer` for DISA STIG Viewer-compatible XCCDF results, while `--results-arf` produces ARF. Updated the section and command to generate both outputs and import the `--stig-viewer` file.

## Review Notes
The post is technically relevant and the corrected commands align with current OpenSCAP and Red Hat RHEL 9 documentation. Future improvements could use XML-aware tooling such as `xmllint` or `oscap info` for summaries instead of `grep`, but the corrected `grep` examples are acceptable for a lightweight shell tutorial.
