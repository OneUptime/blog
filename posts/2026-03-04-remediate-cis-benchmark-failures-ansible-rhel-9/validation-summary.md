# Validation Summary: How to Remediate CIS Benchmark Failures on RHEL Using Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CIS Benchmarks
- SCAP Security Guide
- OpenSCAP
- Ansible and Ansible Core
- Ansible POSIX collection
- Linux system hardening

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- OpenSCAP User Manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- SCAP Security Guide rendered RHEL 9 CIS Level 1 Server profile: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-cis_server_l1.html

## Issues Found
- The prerequisites installed only `ansible-core`, but RHEL 9 OpenSCAP Ansible remediations can require modules from POSIX and community collections that are not included in Ansible Core. Updated the prerequisites to install `rhc-worker-playbook`, matching Red Hat's RHEL 9 remediation guidance.
- The pre-built playbook examples did not set the `ANSIBLE_COLLECTIONS_PATH` environment variable required by Red Hat's RHEL 9 examples for SSG Ansible remediation playbooks. Updated both `ansible-playbook` commands to set that environment variable.
- The generated remediation example used `--result-id ""`, which is not the documented way to select a result from an OpenSCAP results file. Added an `oscap info` step and replaced the empty result ID with the expected CIS Level 1 Server test result ID.
- The verification step counted `result="fail"` attributes, but XCCDF rule results are represented as result elements such as `<result>fail</result>`. Updated the grep pattern so the pass/fail comparison works on OpenSCAP XCCDF results.

## Review Notes
- The post is technically relevant and contains actionable implementation details.
- The custom Ansible snippets are representative examples. Production CIS remediation should still be tested against a non-production RHEL system because automated hardening can affect access methods, installed packages, and boot behavior.
