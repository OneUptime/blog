# Validation Summary: How to Use Ansible with Monorepo Structure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible and ansible-core configuration
- Ansible inventories, playbooks, roles, collections, and callbacks
- ansible-lint
- GitHub Actions workflow path filters
- Terraform outputs, `templatefile`, and generated local files
- community.docker Ansible modules
- CODEOWNERS
- Makefile targets

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugins: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- `ansible.builtin.default` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible deprecated plugins index: https://docs.ansible.com/ansible/12/collections/deprecations.html
- `ansible.posix.timer` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible POSIX collection index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/index.html
- community.docker `docker_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- community.docker `docker_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform splat expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/splat
- Terraform local provider `local_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

## Issues Found
- The Ansible configuration used `stdout_callback = yaml`, which depends on the older YAML stdout callback style and is deprecated in current community.general documentation. Changed it to `stdout_callback = default` with `callback_result_format = yaml`, which is the current ansible-core-supported way to get YAML-formatted callback output.
- The Ansible configuration enabled `timer` and `profile_tasks` without declaring the collection that provides them when using `ansible-core`. Changed `callbacks_enabled` to `ansible.posix.timer, ansible.posix.profile_tasks` and added `ansible.posix` to `requirements.yml`.
- The Docker image push task used `push: yes`. YAML accepts this, but strict ansible-lint commonly flags truthy values. Changed it to `push: true`, matching current Ansible documentation examples.

## Review Notes
- The examples are illustrative and assume variables such as `app_image_name`, `app_version`, `app_name`, `app_port`, and `app_internal_port` are defined elsewhere.
- The Terraform `local_file` resource writes inventory into the repository working tree, which is valid but can create generated-file churn in CI or local development. Teams may prefer a dynamic inventory plugin or a generated artifact outside the tracked source tree.
- Local validation commands could not be run because `ansible`, `ansible-lint`, and `terraform` are not installed in this environment.
