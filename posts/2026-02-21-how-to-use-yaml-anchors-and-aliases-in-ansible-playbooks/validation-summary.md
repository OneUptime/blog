# Validation Summary: How to Use YAML Anchors and Aliases in Ansible Playbooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- YAML anchors and aliases
- YAML merge keys
- Ansible playbooks
- Ansible task keywords and variables
- Ansible built-in modules: file, template, command, uri
- Jinja2 expressions in Ansible values

## Sources Consulted
- Ansible Core documentation: Advanced playbook syntax, YAML anchors and aliases: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_advanced_syntax.html
- Ansible Core documentation: Setting the remote environment: https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Ansible documentation: Playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible documentation: ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Core documentation: ansible.builtin.file module: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible documentation: ansible.builtin.template module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- YAML 1.2 specification: https://yaml.org/spec/1.2.0/
- YAML 1.1 merge key type draft: https://yaml.org/type/merge.html
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- The post described anchors as file-scoped. YAML anchors are scoped to a YAML document, so I changed the wording to "document-scoped" and clarified that anchors cannot cross YAML documents or separately parsed files.
- The multiple-merge example said the YAML specification technically only supports one `<<` merge key per mapping. The more precise issue is that YAML mappings require unique keys, while the merge key draft supports merging one or more maps through a single merge key. I updated the caveat to recommend the portable list form and avoid repeated `<<` keys.
- The limitations section said anchors cannot reference Jinja2 expressions. Anchored values can contain Jinja2 expressions, but Jinja2 cannot generate anchor or alias names because YAML parsing happens before Ansible templating. I narrowed the wording to that distinction.

## Review Notes
The Ansible examples use short module names such as `file`, `template`, `command`, and `uri`, which remain valid for built-in modules, though Ansible documentation generally recommends fully qualified collection names for linkability and to avoid name conflicts.
