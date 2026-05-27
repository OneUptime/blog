# Validation Summary: How to Use Ansible with Chef for Migration

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible playbooks, roles, handlers, modules, facts, and cron automation
- Chef Infra cookbooks, recipes, resources, attributes, templates, and Chef Infra Client
- ERB and Jinja2 templates
- Debian/Ubuntu package management with APT
- UFW firewall management

## Sources Consulted
- Ansible builtin collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- community.general timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Chef Infra Language documentation: https://docs.chef.io/infra_language/
- Chef Infra Client bundled resources documentation: https://docs.chef.io/client/19/resources/bundled/
- Chef Infra Client install documentation: https://docs.chef.io/client/19/install/
- Chef Infra Client executable documentation: https://docs.chef.io/client/19.1/reference/ctl_chef_client/

## Issues Found
- The migration mapping said Chef and Ansible concepts "map directly". This was too strong because Chef Server and Knife do not have one-to-one Ansible equivalents. Changed the wording to "map roughly" and adjusted the Chef Server and Knife rows to describe closer Ansible equivalents.
- The Ansible nginx role used `notify: reload nginx` but did not define a matching handler. Added a `roles/nginx/handlers/main.yml` example so the notification resolves correctly.
- The Chef removal task only removed the older `chef` package name. Added `chef-infra-client` to cover current Chef Infra Client package naming for native packages.
- The key takeaways repeated the direct-mapping claim. Changed it to "map closely" to avoid implying one-to-one equivalence.
- The infrastructure example used `ansible.builtin.timezone`, which is not part of current `ansible-core`; the supported module is `community.general.timezone`. Updated the module name.
- The SSH restart handler used `sshd`, which is not the Debian/Ubuntu service name. Updated it to use `ssh` on Debian-family systems and `sshd` elsewhere.
- The scheduled scan example copied a file into `/opt/scripts` without ensuring the parent directory existed. Added an `ansible.builtin.file` task to create the directory before using `ansible.builtin.copy`.

## Review Notes
The remaining examples are illustrative and assume supporting inventory variables, role defaults, template files, users, and paths exist. The post now uses current Ansible module names and avoids implying exact Chef-to-Ansible one-to-one feature parity.
