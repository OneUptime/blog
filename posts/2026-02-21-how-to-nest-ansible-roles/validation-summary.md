# Validation Summary: How to Nest Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- ansible.builtin.include_role
- ansible.builtin.import_role
- Role dependencies in meta/main.yml
- Ansible handlers and tags
- Molecule dependency configuration

## Sources Consulted
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- ansible.builtin.include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- ansible.builtin.import_role module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/import_role_module.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/

## Issues Found
- The post stated that meta dependencies cannot use conditions and marked meta dependency conditionals as unsupported in the comparison table. Current Ansible documentation says role dependencies run before the role that lists them and are subject to conditionals. Updated the text and table to clarify that conditions are supported, while interleaving with parent role tasks is not.
- The post said deep nesting makes variable precedence unpredictable. Ansible variable precedence is deterministic, but deep nesting can make it harder to reason about. Updated the wording accordingly.
- The Molecule example used `requirements-file` for a role-only `requirements.yml`. Current Molecule documentation uses `role-file` for role dependency files and `requirements-file` for collection requirements. Updated the example to `role-file: requirements.yml`.

## Review Notes
- The Ansible examples use current fully qualified collection names and match the documented behavior of `include_role` and `import_role`.
- The post's guidance about tag inheritance is consistent with Ansible documentation: dynamic includes need `apply` or a block for tag inheritance, while static imports inherit tags.
- Ansible documentation notes that using `vars:` in role dependencies can affect variable scope by placing those variables at play level. The post's meta dependency examples are valid, but this caveat may be useful in a future expansion.
