# Validation Summary: How to Use Ansible Retry Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and retry files
- Ansible inventory patterns and `--limit`
- Ansible configuration via `ansible.cfg` and environment variables
- Ansible modules: `community.docker.docker_image`, `ansible.builtin.systemd`, `ansible.builtin.file`, `ansible.builtin.uri`
- GitLab CI/CD
- Jenkins Pipeline
- Python subprocess scripting

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible inventory patterns and `--limit @file`: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible playbook executor source for retry file path/output behavior: https://github.com/ansible/ansible/blob/devel/lib/ansible/executor/playbook_executor.py
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `community.docker.docker_image` module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- GitLab job artifacts documentation: https://docs.gitlab.com/ci/jobs/job_artifacts/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- Jenkins Pipeline environment documentation: https://www.jenkins.io/doc/pipeline/tour/environment/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- The post implied Ansible always generates retry files after failed hosts. Current Ansible defaults `retry_files_enabled` to `False`, so I clarified that retry files are generated only when enabled.
- The sample recap output used `Retry limit reached: deploy.retry`, which is not the Ansible retry message. I changed it to the documented/source-backed `to retry, use: --limit @...` form.
- The configuration comment said the default was true in older versions and false in newer versions. I updated it to state the current default directly.
- The negated `--limit` example used double quotes. Ansible's pattern documentation recommends single quotes for negated patterns to avoid shell history expansion, so I changed that example.
- The GitLab CI example passed `ANSIBLE_RETRY_FILES_SAVE_PATH` through `-e`, which creates an Ansible extra variable and does not set the Ansible configuration option. I changed it to environment-variable assignment and added `ANSIBLE_RETRY_FILES_ENABLED=True`.
- The GitLab CI example stored artifacts under `/tmp`, but GitLab artifact paths must be relative to the project directory. I changed the retry directory to `retry-files/`.
- The Jenkins example set only `ANSIBLE_RETRY_FILES_SAVE_PATH`; with current Ansible defaults this would not create retry files. I added `ANSIBLE_RETRY_FILES_ENABLED = "True"`.
- The gotcha about overwrite behavior was too broad. I narrowed it to playbook runs that actually write a retry file.

## Review Notes
Ansible was not installed in the local workspace, so CLI behavior was checked against official Ansible documentation and the upstream Ansible source. The `community.docker.docker_image` example is still valid, though current collection documentation recommends newer specialized modules such as `community.docker.docker_image_pull` for focused pull operations.
