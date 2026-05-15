# Validation Summary: How to Automate SELinux Policy Management with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SELinux
- Ansible
- ansible.posix collection
- community.general collection
- auditd and ausearch

## Sources Consulted
- Ansible documentation: ansible.posix.selinux module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/selinux_module.html
- Ansible documentation: ansible.posix.seboolean module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible documentation: community.general.sefcontext module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/sefcontext_module.html
- Ansible documentation: community.general.seport module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/seport_module.html
- Red Hat Enterprise Linux 9 documentation: Using SELinux - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Linux audit project manual page: ausearch(8) - https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The Samba boolean variables were defined but never applied. Added a `Set Samba SELinux booleans` task using `ansible.posix.seboolean`, matching the existing role-based pattern.
- The Apache port-label example used TCP port 8443, which RHEL already labels as `http_port_t` by default. Changed the example to port 8888 so it demonstrates a genuinely non-standard Apache port label.
- The custom policy build example used `checkmodule` but did not install the `checkpolicy` package that provides the SELinux policy compiler tooling on RHEL. Added `checkpolicy` to the package list.
- The audit example said it searched the last 24 hours, but `ausearch -ts recent` means recent audit records, commonly the last 10 minutes. Updated the comment to avoid the incorrect 24-hour claim.
- The audit pipeline's fallback `echo "No recent denials"` could be skipped because the pipeline can still exit successfully with empty output. Removed the fallback text and changed the debug condition to report only when `denials.stdout` is non-empty.
- The audit example searched only `avc` messages. Updated it to include `AVC,USER_AVC,SELINUX_ERR,USER_SELINUX_ERR`, matching Red Hat's documented troubleshooting command pattern.

## Review Notes
The Ansible module names and parameters are current as of the consulted documentation. The YAML snippets were parsed successfully after the edits. The examples assume the required Ansible collections are installed on the control node and SELinux management packages are available from the target hosts' RHEL repositories.
