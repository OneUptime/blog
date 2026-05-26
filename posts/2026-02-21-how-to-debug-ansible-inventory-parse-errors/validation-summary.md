# Validation Summary: How to Debug Ansible Inventory Parse Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ansible inventory
- INI inventory format
- YAML inventory format
- Dynamic inventory scripts
- Ansible inventory plugins
- amazon.aws.aws_ec2 inventory plugin
- yamllint

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.ini inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ini_inventory.html
- Ansible Community Documentation: ansible.builtin.yaml inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible Community Documentation: ansible-inventory CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible Community Documentation: How to build your inventory: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: Working with dynamic inventory: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- Ansible Community Documentation: Developing dynamic inventory, inventory script conventions: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_inventory.html
- Ansible Community Documentation: Ansible configuration settings, INVENTORY_IGNORE_EXTS: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: amazon.aws.aws_ec2 inventory plugin: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html

## Issues Found
- The INI example said variables with spaces in a `:vars` section must be quoted. Official Ansible docs say `:vars` sections accept one entry per line and everything after `=` is the value; whitespace quoting is required for inline host variables because host lines accept multiple `key=value` parameters. Changed the example to demonstrate the actual inline-host-variable case.
- The dynamic inventory script checklist said scripts must return host variables for `--host <hostname>`. Official inventory script conventions require accepting `--host` and printing a JSON object, but that object may be empty. Updated the wording to say it can return an empty JSON object.
- The inventory directory section said Ansible tries to parse all files and listed backup files, `.retry`, `~`, and `.pyc` as examples that cause errors. Official docs say Ansible ignores several extensions by default, including `~`, `.orig`, `.bak`, `.ini`, `.cfg`, `.retry`, `.pyc`, and `.pyo`. Updated the text to say Ansible parses non-ignored files and changed the ignore-extension example to preserve the default-style list while adding `.swp`.

## Review Notes
- The local environment did not have `ansible-inventory` or `ansible-doc` installed, so CLI flags and plugin behavior were verified against current official Ansible documentation rather than local `--help` output.
- The AWS EC2 inventory snippet is syntactically consistent with the current `amazon.aws.aws_ec2` plugin documentation, including `plugin`, `regions`, `keyed_groups`, and `filters` usage. The file name `aws_ec2.yml` also matches the documented suffix requirement.
