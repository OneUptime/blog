# Validation Summary: How to Validate RHEL Compliance Using the ComplianceAsCode Project

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ComplianceAsCode / SCAP Security Guide
- OpenSCAP and the `oscap` CLI
- SCAP source data streams, XCCDF, and OVAL
- Ansible and Bash remediation content
- SCAP Workbench tailoring
- CIS, DISA STIG, PCI-DSS, and OSPP profiles

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- ComplianceAsCode build documentation: https://complianceascode.readthedocs.io/en/latest/manual/developer/02_building_complianceascode.html
- OpenSCAP manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- ComplianceAsCode RHEL 9 OSPP guide: https://complianceascode.github.io/content-pages/guides/ssg-rhel9-guide-ospp.html

## Issues Found
- The post described OSPP as mapping to NIST 800-53 and advertised NIST 800-53 as one of the directly scanned frameworks. Red Hat documents the RHEL 9 `ospp` profile as the Protection Profile for General Purpose Operating Systems, while RHEL 9 provides a separate NIST 800-171 `cui` profile. I changed the description, section heading, and closing sentence to refer to OSPP instead of NIST 800-53.
- The tailoring example used the original STIG profile ID with `--tailoring-file`. OpenSCAP documentation notes that scans should use the customized profile ID from the tailoring file. I changed the example profile to `xccdf_org.ssgproject.content_profile_stig_customized`.

## Review Notes
- The `oscap xccdf eval`, `oscap info`, `oscap xccdf generate fix`, RHEL 9 data stream path, generated Ansible/Bash remediation paths, and ComplianceAsCode build target examples match the official documentation.
- Red Hat recommends using SCAP content from the same RHEL minor release because SCAP content can change with component capabilities. The post's source-build guidance is technically valid, but production users should be careful about mixing upstream content with older RHEL minor releases.
