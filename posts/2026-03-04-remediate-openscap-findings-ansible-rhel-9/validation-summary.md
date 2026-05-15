# Validation Summary: How to Remediate OpenSCAP Findings with Ansible Playbooks on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSCAP
- SCAP Security Guide
- XCCDF scan results
- Ansible playbooks
- Bash scripting

## Sources Consulted
- OpenSCAP User Manual: https://github.com/OpenSCAP/openscap/blob/main/docs/manual/manual.adoc
- OpenSCAP 1.3 User Manual: https://static.open-scap.org/openscap-1.3/oscap_user_manual.html
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible ansible.builtin.reboot module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/reboot_module.html
- NIST XCCDF 1.2 specification: https://www.nist.gov/publications/specification-extensible-configuration-checklist-description-format-xccdf-version-12

## Issues Found
- The examples counted failures with `grep -c 'result="fail"'`, but XCCDF rule results are represented as `<result>fail</result>` elements. Updated the failure-count commands accordingly.
- The remediation generation examples used `--result-id ""`. Red Hat and OpenSCAP documentation instruct users to obtain the result ID with `oscap info` and pass that ID to `oscap xccdf generate fix`. Added `RESULT_ID=$(oscap info ... | awk ...)` and used `--result-id "$RESULT_ID"`.
- The RHEL 9 Ansible remediation examples omitted the documented `ANSIBLE_COLLECTIONS_PATH` setting required for the SCAP Security Guide remediation playbooks when using Ansible Core with the RHEL-provided collections. Added the environment variable to generated and pre-built playbook runs.
- The initial scan example wrote to `/var/log/compliance` without ensuring the directory exists. Added `mkdir -p /var/log/compliance`.
- The pipeline script used `grep -c` under `set -e`; when no failures are present, `grep` can return a nonzero status and exit the script before the zero-failure branch. Added `|| true` to the failure-count assignments.
- The reboot handler snippet said to append `handlers:` to the end of the playbook, which can create invalid YAML because handlers belong inside a play. Updated the snippet to show `handlers` and `tasks` under a play.
- The persistent-failure command used `grep -B1 "^Result.*fail" | grep "^Title"`, but OpenSCAP output places `Title` earlier than one line before `Result`. Replaced it with an `awk` command that tracks the current title and prints it when the result is `fail`.

## Review Notes
The main workflow is technically sound: OpenSCAP can generate Ansible remediations from scan results, and SCAP Security Guide ships pre-built RHEL 9 playbooks. Operators should still review generated remediation carefully because Red Hat warns that hardening remediation can make altered systems non-functional and has no automated rollback.
