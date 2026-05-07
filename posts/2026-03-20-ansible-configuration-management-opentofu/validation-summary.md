# Validation Summary: How to Use Ansible for Configuration Management After OpenTofu Apply

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu CLI and output values
- Ansible playbooks and variable loading
- Ansible `apt`, `template`, `service`, and `include_vars`
- GitHub Actions workflow artifacts and job outputs
- Python 3 for transforming OpenTofu output data

## Sources Consulted
- OpenTofu `tofu output` command docs: https://opentofu.org/docs/cli/commands/output/
- OpenTofu CLI basics and `-chdir` docs: https://opentofu.org/docs/cli/commands/
- Ansible variable files and `--extra-vars` docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `include_vars` docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible playbook keywords docs: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible `apt` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `service` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `template` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- GitHub Actions workflow syntax docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions artifacts docs: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
- GitHub Actions example workflow docs: https://docs.github.com/actions/use-cases-and-examples/creating-an-example-workflow
- GitHub-hosted runner images reference: https://github.com/actions/runner-images
- OpenTofu GitHub setup action: https://github.com/opentofu/setup-opentofu

## Issues Found
- The original OpenTofu-to-Ansible handoff was inconsistent. `tofu output -json` returns an object keyed by output name, so a single `ansible_vars` output produced nested data that did not match later flat variable references such as `db_endpoint`, `redis_endpoint`, and `region`. I updated the bridge script to flatten the `ansible_vars` object before writing the Ansible vars file.
- The original bridge script depended on `PyYAML` through `import yaml`, but the post did not install that dependency. I changed the handoff artifact to JSON and switched the playbook example to `include_vars`, which officially supports loading JSON and YAML files.
- The GitHub Actions workflow omitted repository checkout and OpenTofu setup, so the runner would not reliably have the repository files or the `tofu` CLI available. I added `actions/checkout@v5` and `opentofu/setup-opentofu@v1`.
- The workflow used inconsistent OpenTofu working directories and uploaded an artifact that was not explicitly consumed by the final Ansible command. I changed the OpenTofu steps to use `-chdir=infrastructure`, reused the same bridge script in CI, and passed the downloaded vars file to `ansible-playbook` with `--extra-vars`.

## Review Notes
- `tofu output -json` exposes sensitive output values in plain text at the CLI level, so filtering sensitive outputs before writing the Ansible vars artifact remains important.
- The workflow now matches `ubuntu-latest`, which currently includes `ansible-core` on GitHub-hosted runners. If this is adapted to a different runner image or a self-hosted runner, add an explicit Ansible installation step.
