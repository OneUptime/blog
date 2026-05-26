# Validation Summary: How to Use ansible-lint with Collections

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-lint
- Ansible collections
- ansible-galaxy
- GitHub Actions
- YAML configuration

## Sources Consulted
- Ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible-lint usage and dependency handling documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible-lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible-lint FQCN rule documentation: https://docs.ansible.com/projects/lint/rules/fqcn/
- Ansible-lint galaxy rule documentation: https://docs.ansible.com/projects/lint/rules/galaxy/
- Ansible-lint schema rule documentation: https://docs.ansible.com/projects/lint/rules/schema/
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible collection metadata documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html#collections-paths
- Ansible module/plugin lifecycle documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/module_lifecycle.html

## Issues Found
- The post showed `collections_paths` as an ansible-lint configuration option. ansible-lint does not document that key; collection lookup uses Ansible's `COLLECTIONS_PATHS` / `[defaults] collections_path`. I changed the section to configure collection paths through `ansible.cfg`.
- The missing collection workaround suggested skipping `fqcn[action]`. That does not resolve unknown module or missing collection syntax-check errors. I replaced it with a `mock_modules` example and clarified that offline mode is only appropriate after local dependencies are installed.
- The collection development config used `enable_list` for `galaxy[no-changelog]` and `galaxy[version-incorrect]`. `enable_list` is for optional rules, while the `shared` profile already includes collection publishing checks. I changed the comment to reflect the profile behavior.
- The `galaxy.yml` example included both `license` and `license_file`, which are mutually exclusive in official collection metadata. I removed `license_file`.
- The description of `galaxy[version-incorrect]` said it checks semantic versioning. ansible-lint documents this rule as requiring collection versions to be `1.0.0` or greater. I updated the text.
- The role metadata example omitted `galaxy_info.standalone`, which ansible-lint's schema rule requires for role `meta/main.yml` files. I added `standalone: false` for a role inside a collection.
- The dependency resolution diagram referred to `collections_paths` and a generic missing collection error. I updated it to reference Ansible `COLLECTIONS_PATHS` and syntax-check errors.

## Review Notes
The local workspace does not have `ansible-lint` or `ansible-galaxy` installed, so command behavior was verified against official documentation rather than local CLI output.
