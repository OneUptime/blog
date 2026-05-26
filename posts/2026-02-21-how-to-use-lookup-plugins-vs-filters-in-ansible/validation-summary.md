# Validation Summary: How to Use Lookup Plugins vs Filters in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible lookup plugins
- Ansible filters
- Jinja2 templating
- YAML playbooks
- HashiCorp Vault lookup integration

## Sources Consulted
- Ansible lookup plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible playbook lookup guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible filters documentation: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- ansible.builtin.file lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html
- ansible.builtin.env lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/env_lookup.html
- ansible.builtin.password lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_lookup.html
- ansible.builtin.fileglob lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- ansible.builtin.regex_replace filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/regex_replace_filter.html
- ansible.builtin.slurp module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- ansible.builtin.contains test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/contains_test.html

## Issues Found
- The introduction said both lookups and filters "transform data." Lookups primarily retrieve data from outside sources, while filters transform existing data. Changed this to say both participate in data processing.
- The filters section described filters as pure functions where the same input always produces the same output and there are no side effects. That is too absolute for Ansible's broader filter ecosystem, so the wording now applies to most data-shaping filters.
- The Vault example used the short `hashi_vault` lookup name. Current collection documentation specifies `community.hashi_vault.hashi_vault`, so the example now uses the fully qualified collection name.
- The CSV parsing example used unescaped backreferences in the `regex_replace` replacement string. Updated `\1`, `\2`, and `\3` to `\\1`, `\\2`, and `\\3`, matching Ansible's documented `regex_replace` usage.

## Review Notes
The examples use short names for several built-in Ansible plugins and modules, such as `file`, `env`, `password`, `fileglob`, `debug`, `set_fact`, and `slurp`. These remain valid in typical playbooks, though Ansible documentation recommends fully qualified collection names for easier linking and to avoid name conflicts. The local environment did not have `ansible` or `ansible-doc` installed, so verification was performed against official Ansible documentation rather than local command output.
