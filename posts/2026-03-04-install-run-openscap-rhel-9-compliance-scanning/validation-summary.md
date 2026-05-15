# Validation Summary: How to Install and Run OpenSCAP on RHEL for Compliance Scanning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP
- oscap CLI
- SCAP Security Guide
- XCCDF compliance scans
- OVAL vulnerability scans
- Bash automation
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- OpenSCAP user manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- OpenSCAP getting started documentation: https://www.open-scap.org/getting-started/
- oscap man page reference: https://manpages.ubuntu.com/manpages/stonking/man8/oscap.8.html

## Issues Found
- The install section described `openscap-utils` as needed for generating remediation. Remediation generation is handled by `oscap xccdf generate fix`; `openscap-utils` is more accurately described as providing utilities such as `oscap-ssh` and `autotailor`.
- The remediation examples used `--result-id ""`. OpenSCAP documentation shows that remediation from scan results should use the actual result ID from the results file. Updated the examples to use the expected STIG result ID for the preceding scan.
- The OVAL vulnerability scan used `/usr/share/xml/scap/ssg/content/ssg-rhel9-oval.xml`. Red Hat documents vulnerability scanning with current RHSA OVAL definitions downloaded from `https://www.redhat.com/security/data/oval/v2/RHEL9/rhel-9.oval.xml.bz2`. Updated the example to install `bzip2`, download the Red Hat OVAL feed, decompress it, and scan that file.
- The troubleshooting section used `oscap info --fetch-remote-resources` for XML parsing errors and described `--fetch-remote-resources` as increasing timeout and memory limits. Updated this to use plain `oscap info` for inspection and describe `--fetch-remote-resources` as downloading trusted remote resources referenced by content.

## Review Notes
The main RHEL 9 compliance scan commands, profile IDs, report generation options, and `oscap xccdf eval` exit-code behavior are consistent with Red Hat and OpenSCAP documentation. Remediation scripts and generated Ansible content should still be reviewed before execution, especially on systems that were not installed from the same baseline.
