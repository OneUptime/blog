# Validation Summary: How to Automate CIS Benchmark Compliance for RHEL with scap-security-guide

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- scap-security-guide / SCAP Security Guide
- OpenSCAP / oscap
- CIS Benchmark profiles
- Ansible remediation playbooks
- Bash remediation scripts
- Kickstart and the OpenSCAP Anaconda add-on
- systemd timers

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Enterprise Linux 9 Automatically installing RHEL, Kickstart `%addon com_redhat_oscap` reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- OpenSCAP User Manual, generating reports, remediation scripts, Ansible playbooks, and Kickstarts: https://static.open-scap.org/openscap-1.4.1/oscap_user_manual.html
- ComplianceAsCode generated RHEL 9 CIS Level 1 Server guide and profile ID reference: https://complianceascode.github.io/content-pages/guides/ssg-rhel9-guide-cis_server_l1.html

## Issues Found
- The install command only installed `scap-security-guide`, but the examples also use `oscap` and Ansible. Updated it to include `openscap-scanner`, `ansible-core`, and `rhc-worker-playbook`, matching Red Hat prerequisites for scanning and SSG Ansible remediation on RHEL 9.
- The Ansible examples omitted the RHEL 9 `ANSIBLE_COLLECTIONS_PATH` setting required by Red Hat's SSG Ansible remediation documentation. Added the environment variable to the local, inventory, and CI/CD playbook examples.
- The Kickstart add-on snippet used `%addon org_fedora_oscap`, but RHEL 9 documents `%addon com_redhat_oscap`. Updated the explanatory text and snippet.
- The targeted remediation examples used an empty `--result-id ""`. Red Hat documents finding the result ID with `oscap info` and passing the actual test result ID. Added the `oscap info` step and the expected CIS Level 1 Server result ID.
- The CI/CD example counted XML results with `result="pass"` and `result="fail"`, but XCCDF results are result elements, not attributes. Updated the grep patterns to count `<result>pass</result>` and `<result>fail</result>` elements with optional namespace prefixes.

## Review Notes
The post is technically relevant and the remaining commands align with the RHEL 9 and OpenSCAP documentation. The CIS content in `scap-security-guide` can change between RHEL minor releases, so readers should verify profile availability with `oscap info` on the exact package version installed.
