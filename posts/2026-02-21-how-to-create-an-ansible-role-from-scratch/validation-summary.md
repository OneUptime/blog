# Validation Summary: How to Create an Ansible Role from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- Ansible playbooks
- Ansible handlers
- Ansible variables and role defaults
- Jinja2 templates
- Nginx configuration
- Linux package management with apt and dnf

## Sources Consulted
- Ansible role documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Lint no-relative-paths rule: https://docs.ansible.com/projects/lint/rules/no-relative-paths/
- Ansible Galaxy user guide: https://docs.ansible.com/ansible/latest/galaxy/user_guide.html

## Issues Found
- The initial directory creation comment called the role layout "minimal", but the example creates optional directories such as `vars`, `files`, and `meta`. Changed the comment to "common directory structure" to match Ansible's role structure documentation.
- The RHEL package installation task used `ansible.builtin.yum`. Current Ansible documentation points users to `ansible.builtin.dnf` for RHEL-family systems, with `yum` maintained as compatibility syntax over the dnf backend in newer ansible-core versions. Updated the task to use `ansible.builtin.dnf`.
- The static file deployment example copied into `{{ webserver_document_root }}` without ensuring that directory exists. Added an `ansible.builtin.file` task to create the document root before the copy task.
- The static file deployment task used the Debian-specific `www-data` owner and group even though the role also targets RHEL-family systems. Changed ownership to `root:root`, which is portable for a static, world-readable file.
- The final directory tree listed `vars/main.yml`, but the tutorial never creates or populates that file. Removed `main.yml` from the `vars/` entry in the tree.

## Review Notes
The examples are broadly accurate after the fixes. The role remains intentionally simple; for production use, it could add OS-specific defaults for service users, package repository setup for distributions where Nginx is not available by default, and platform-specific template paths.
