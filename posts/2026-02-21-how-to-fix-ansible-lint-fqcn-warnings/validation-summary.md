# Validation Summary: How to Fix ansible-lint FQCN (Fully Qualified Collection Name) Warnings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- Ansible collections
- YAML playbooks
- Shell scripting with `find` and `sed`

## Sources Consulted
- Ansible-lint FQCN rule documentation: https://docs.ansible.com/projects/lint/rules/fqcn/
- Ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible-lint autofix documentation: https://docs.ansible.com/projects/lint/autofix/
- Ansible-lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible collection usage documentation: https://docs.ansible.com/projects/ansible-core/devel/collections_guide/collections_using_playbooks.html
- Ansible builtin collection index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- `ansible.builtin.gather_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/gather_facts_module.html
- `ansible.posix.seboolean` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- `community.docker.docker_container` module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- `amazon.aws.ec2_instance` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- `community.general.slack` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html
- PyPI package lookup via `python3 -m pip index versions` for `ansible-lint` and `ansible-fqcn-converter`

## Issues Found
- The post said it covered every type of FQCN warning, but ansible-lint documents additional FQCN checks such as `fqcn[deep]` and `fqcn[keyword]`. Changed the wording to scope the article to common module-related FQCN warnings.
- The explanation said Ansible searches all installed collections for short module names. Ansible documentation describes a configured collection search order. Updated the wording to avoid overstating the lookup behavior.
- The builtin module reference mapped `systemd` to `ansible.builtin.systemd`, but current Ansible documentation identifies `ansible.builtin.systemd_service` as the canonical module and `systemd` as an alias/redirect. Updated the mapping and the sed conversion example.
- The `fqcn[canonical]` example used `ansible.posix.seboolean` as both the old and canonical name, so it did not demonstrate a canonical-name fix. Replaced it with the documented `ansible.builtin.systemd` alias to `ansible.builtin.systemd_service` canonical example.
- The automated conversion section recommended `pip install ansible-fqcn-converter`, but that package was not available from the PyPI index in this environment. Replaced it with the official `ansible-lint --fix=fqcn` command documented by ansible-lint.
- The `find` command in the sed conversion script did not restrict matches to files. Added `-type f` and grouped the filename predicates so the script only processes YAML files.

## Review Notes
The examples are generally valid for current Ansible documentation, but the sed script remains intentionally limited and should still be reviewed manually after use because YAML keys in vars, task data, or block scalars can resemble module names.
