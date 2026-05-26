# Validation Summary: How to Use FQCN (Fully Qualified Collection Names) in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible collections
- Fully Qualified Collection Names (FQCNs)
- ansible-galaxy
- ansible-lint
- Community Ansible collections

## Sources Consulted
- Ansible documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- Ansible documentation: Installing collections with ansible-galaxy and requirements.yml - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible builtin collection index - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- ansible-lint fqcn rule documentation - https://docs.ansible.com/projects/lint/rules/fqcn/
- ansible-lint configuration and CLI usage documentation - https://docs.ansible.com/projects/lint/configuring/ and https://docs.ansible.com/projects/lint/usage/
- community.general.ufw module documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- community.mysql.mysql_db module documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_db_module.html
- community.docker.docker_image module documentation - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- amazon.aws.s3_bucket module documentation - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_module.html

## Issues Found
- The introduction said playbooks using short module names would "eventually break." Short names are still supported in many cases, but they are less explicit and can be ambiguous. Changed the wording to describe the actual collision risk.
- The migration example described short module names as "deprecated style." Official documentation recommends FQCNs, but short module names are not generally documented as deprecated. Changed this to "less explicit style."
- The `collections` keyword section said collections could be declared at the playbook or block level. Official documentation describes use in playbooks and in role `meta/main.yml`. Changed this to playbook level or role metadata.
- The summary said "FQCNs are not optional anymore." This overstated the current behavior. Changed it to "FQCNs are the recommended practice."

## Review Notes
The collection versions in the sample `requirements.yml` are older pinned examples, but the format is valid. In a real project, readers should choose versions that match their supported Ansible and collection compatibility matrix.
