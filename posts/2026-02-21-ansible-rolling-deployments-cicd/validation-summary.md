# Validation Summary: How to Use Ansible for Rolling Deployments in CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible rolling deployments with `serial`
- Ansible modules: `uri`, `wait_for`, `systemd`, `unarchive`, `copy`, `command`, `slurp`
- GitHub Actions
- GitLab CI
- Jenkins Pipeline

## Sources Consulted
- Ansible documentation: Controlling where tasks run, delegation, and local actions - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible documentation: Special variables - https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible documentation: `ansible.builtin.uri` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: `ansible.builtin.systemd_service` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- GitHub Actions workflow syntax - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI script syntax - https://docs.gitlab.com/ci/yaml/script/
- Jenkins Pipeline Jenkinsfile documentation - https://www.jenkins.io/doc/book/pipeline/jenkinsfile/

## Issues Found
- The migration task used `run_once: true` together with `when: inventory_hostname == ansible_play_hosts[0]`. Under `serial`, `run_once` already runs once per batch; the extra condition restricted the task to the first host of the play rather than the first host of each batch. Removed the condition so the example matches its "only on first host in batch" label and Ansible's documented `run_once` behavior.
- The GitLab CI example invoked `rolling-deploy.yml` without setting `lb_host`, even though the playbook uses `{{ lb_host }}` in the load balancer deregistration and registration tasks. Added `-e "lb_host=10.0.0.5"`.
- The Jenkins Pipeline example also omitted `lb_host`. Added the same extra variable to keep the Jenkins invocation consistent with the playbook.
- The GitLab CI command was shown as an implicitly folded YAML command. Replaced it with a documented GitLab multiline block scalar and shell continuations to make the command unambiguous.

## Review Notes
The Ansible `systemd` module name used in the post remains valid as a backward-compatible alias for `systemd_service`, though current Ansible documentation recommends the fully qualified `ansible.builtin.systemd_service` name for documentation linking and avoiding collection name conflicts. The load balancer API and artifact host URLs are illustrative placeholders and were reviewed for playbook plausibility rather than endpoint existence.
