# Validation Summary: How to Use Ansible Module with Facts Return

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible module development
- Ansible facts
- Python
- YAML

## Sources Consulted
- Ansible Community Documentation: Developing modules - Creating an info or a facts module: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_modules_general.html
- Ansible Community Documentation: ansible.builtin.service_facts module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible Documentation: INJECT_FACTS_AS_VARS configuration setting: https://docs.ansible.com/ansible/3/reference_appendices/config.html#inject-facts-as-vars

## Issues Found
- The key takeaway said facts modules "typically" return `changed=False`. Current Ansible module development documentation says dedicated facts modules must not make changes, so the wording was changed to say dedicated facts modules should return `changed=False` since they only gather information.

## Review Notes
- Returning `ansible_facts` from `module.exit_json()` is correct, and Ansible documents this as the required return field for `*_facts` modules.
- The examples showing facts being used without `register` are consistent with Ansible documentation. Top-level fact variable access depends on the default `INJECT_FACTS_AS_VARS` behavior; facts also remain available through the `ansible_facts` dictionary.
