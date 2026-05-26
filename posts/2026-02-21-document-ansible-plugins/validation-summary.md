# Validation Summary: How to Document Ansible Plugins

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible plugins
- ansible-doc
- ansible-test sanity tests
- antsibull-docs
- YAML documentation blocks
- Python plugin files

## Sources Consulted
- Ansible plugin development documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_plugins.html
- Ansible module format and documentation guide: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_modules_documenting.html
- Ansible markup reference: https://docs.ansible.com/projects/ansible/latest/dev_guide/ansible_markup.html
- ansible-doc CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-doc.html
- Ansible sanity tests reference: https://docs.ansible.com/projects/ansible/latest/dev_guide/testing/sanity/index.html
- antsibull-docs collection documentation: https://docs.ansible.com/projects/antsibull-docs/collection-docs/
- Local ansible-core 2.21.0 CLI checks with ansible-doc.

## Issues Found
- The post said the guide covered the documentation format for every plugin type. Changed this to "common documentation formats" because Ansible plugin documentation support and shape vary by plugin type.
- The post said every plugin should include `DOCUMENTATION`, `EXAMPLES`, and `RETURN` blocks. Changed this to "most plugins that support embedded documentation" and updated the summary wording because filter/test plugins can use adjacent YAML files and plugin types vary.
- The filter plugin example documented per-filter behavior with Python function docstrings. `ansible-doc` does not render those docstrings as per-filter documentation. Replaced the example with the supported adjacent YAML documentation pattern for multi-filter files, plus an inline single-filter example.
- The filter plugin example returned `title_slug` from `filters()` without defining `title_slug`. Removed that undeclared filter entry.
- The callback plugin example used `type: notification` in `DOCUMENTATION`. Changed it to `callback_type: notification`, matching the Ansible callback documentation format.
- The "wrong option type" mistake said `type: string` is wrong and `type: str` is required. Ansible documentation and built-in plugins use both forms in different contexts, so this was changed to warn about type declarations that do not match plugin behavior.
- The markup list omitted newer semantic/plugin macros. Added `P()`, `E()`, and `V()` to align with current Ansible markup documentation.
- The automated validation description said `validate-modules` validates all documentation. Clarified that it validates module documentation, while `ansible-doc` sanity checks parsing.

## Review Notes
The local environment initially lacked `ansible-doc` and `ansible-test`; ansible-core 2.21.0 was installed in the user Python environment for CLI verification. The corrected filter documentation example was validated in a temporary collection with `ansible-doc -t filter myorg.myutils.snake_case`.
