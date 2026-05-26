# Validation Summary: How to Run Ansible Playbooks in Jenkins Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jenkins Declarative Pipeline
- Jenkins Ansible plugin
- Jenkins Credentials Binding plugin
- Jenkins SSH Agent plugin
- Jenkins Docker agents
- Ansible Vault
- ansible-lint

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible release and maintenance documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/index.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible-lint documentation: https://docs.ansible.com/ansible-lint/index.html
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Credentials Binding plugin Pipeline step documentation: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins SSH Agent plugin Pipeline step documentation: https://www.jenkins.io/doc/pipeline/steps/ssh-agent/
- Jenkins Ansible plugin documentation: https://plugins.jenkins.io/ansible/
- Jenkins post-build cleanup and notification documentation: https://www.jenkins.io/doc/pipeline/tour/post

## Issues Found
- The post pinned Ansible installation to `ansible==8.7.0`, which is now an unmaintained Ansible community package release. Updated the install examples to use the current documented `python3 -m pip install --user ansible` pattern and added the user install path where needed.
- The Jenkins Ansible plugin example used `extras: '-e deploy_version=${BUILD_NUMBER}'`. Because this is a single-quoted Groovy string, Jenkins would pass the value literally instead of interpolating the build number. Replaced it with the plugin-supported `extraVars` map using `env.BUILD_NUMBER`.
- Several examples wrote the Vault password to a fixed `/tmp/vault_pass.txt` path and removed it only after a successful playbook run. Replaced this with `mktemp`, restrictive permissions, `printf`, and `trap` cleanup so the file is removed even if `ansible-playbook` fails.
- The credential example copied an SSH private key to `~/.ssh/id_rsa` and only removed it after a successful run. Added `trap` cleanup so the copied key is removed on failure.
- The parameterized build example used a free-form `string` parameter for `PLAYBOOK` and interpolated it into a shell command. Changed it to a constrained `choice` parameter to avoid unsafe arbitrary command/path input.

## Review Notes
- The Ansible CLI flags used in the examples, including `--syntax-check`, `--vault-password-file`, `--private-key`, `--check`, `--diff`, `-i`, `-u`, and `-e`, match the official `ansible-playbook` documentation.
- `ANSIBLE_FORCE_COLOR` and `ANSIBLE_HOST_KEY_CHECKING` are valid Ansible configuration environment variables. The note about needing the AnsiColor plugin for Jenkins console color handling is consistent with the Jenkins Ansible plugin documentation.
- The Docker agent example uses a third-party `cytopia/ansible` image. It is plausible and maintained, but a production pipeline should normally pin an immutable version tag or use a project-specific Ansible execution environment image.
