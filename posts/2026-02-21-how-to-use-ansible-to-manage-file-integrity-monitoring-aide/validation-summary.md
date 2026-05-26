# Validation Summary: How to Use Ansible to Manage File Integrity Monitoring (AIDE)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- AIDE (Advanced Intrusion Detection Environment)
- File integrity monitoring
- Linux package management with apt and yum
- Cron-based automation
- Jinja2 templates
- Shell scripting

## Sources Consulted
- AIDE project homepage: https://aide.github.io/
- AIDE manual: https://aide.github.io/doc/
- AIDE aide(1) man page: https://manpages.debian.org/testing/aide/aide.1.en.html
- AIDE aide.conf(5) man page: https://manpages.debian.org/testing/aide/aide.conf.5.en.html
- Red Hat Enterprise Linux AIDE documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/security_guide/sec-using-aide
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- Ansible built-in module documentation index: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/index.html
- ansible.builtin.copy module documentation: https://ansible.readthedocs.io/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.fetch module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fetch_module.html

## Issues Found
- `aide --update` was shown in Ansible tasks without allowing AIDE's normal change-reporting exit codes. The AIDE man page defines exit codes 1, 2, and 4 as bitmask values for new, removed, and changed files, so an update after legitimate changes can return 1-7 and still successfully write the new database. Added `register` and `failed_when: aide_update.rc >= 14` to the update tasks so Ansible only fails on AIDE error codes.
- The centralized report treated every nonzero AIDE return code as `CHANGES DETECTED`. Updated the status expression to report `AIDE ERROR` for return codes 14 and above.
- The cron script treated every nonzero AIDE return code as a changes alert. Updated it to send a distinct error subject for AIDE error codes 14 and above.

## Review Notes
- The AIDE database paths in the examples use uncompressed database files, which is valid when the configured `database_in` and `database_out` paths match the files being moved. Some distributions default to `.gz` database files, so operators should keep the configured paths and deployed package defaults aligned.
- The examples intentionally use a custom AIDE configuration rather than the packaged defaults. That is valid, but production deployments should tune selection and exclusion rules carefully to avoid noisy reports or blind spots.
