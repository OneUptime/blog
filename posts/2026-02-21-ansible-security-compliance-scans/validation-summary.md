# Validation Summary: How to Use Ansible to Run Security Compliance Scans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- OpenSCAP / `oscap`
- SCAP Security Guide content
- XCCDF scan results and remediation
- Linux cron scheduling
- YAML and shell scripting

## Sources Consulted
- OpenSCAP `oscap` manual page: https://manpages.ubuntu.com/manpages/noble/man8/oscap.8.html
- OpenSCAP User Manual, Generating reports, guides, and scripts: https://static.open-scap.org/openscap-1.3/oscap_user_manual.html
- Red Hat RHEL 9 Security Hardening documentation, OpenSCAP remediation workflow: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/
- Ansible `ansible.builtin.command` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.fetch` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible `ansible.builtin.apt` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.cron` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ubuntu package metadata for `libopenscap8`, `ssg-debian`, and `ssg-debderived`, checked locally with `apt-cache`.

## Issues Found
- The CIS scan playbook used `failed_when: scan_result.rc > 2`. OpenSCAP documents return code `1` as an evaluation error and return code `2` as a successful evaluation with failed or unknown rules. Changed the condition to `scan_result.rc not in [0, 2]` so real scan errors fail the Ansible task.
- The XML parsing example searched for `result="pass"` style attributes, but XCCDF rule results are represented as result elements such as `<result>pass</result>`, with possible XML namespaces. Replaced the `grep` parsing with a small `xml.etree.ElementTree` parser that counts result elements robustly.
- The remediation example claimed to generate a playbook from scan findings, but the command used profile-oriented remediation against the SCAP content file. OpenSCAP documents that result-oriented remediation requires `--result-id` and the scan results file. Updated the example to use `--result-id` and the generated scan XML.
- The cron script unconditionally exited `0`, which would hide real OpenSCAP errors as well as non-compliance. Updated it to convert only OpenSCAP return code `2` to success and preserve other return codes.

## Review Notes
- The examples remain RHEL 8 oriented where they use `/usr/share/xml/scap/ssg/content/ssg-rhel8-ds.xml`; the post already tells readers to adjust the profile based on their OS.
- The generated remediation playbook should be reviewed before use. OpenSCAP and Red Hat documentation both warn that automated remediation can change system configuration in disruptive ways.
