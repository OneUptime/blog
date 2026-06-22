# Validation Summary: How to Test Ansible with Molecule

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker scenarios
- Testinfra / pytest-testinfra
- ansible-lint
- yamllint
- GitHub Actions
- GitLab CI
- Docker

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule Docker container example: https://docs.ansible.com/projects/molecule/examples/docker/
- Current Molecule CLI help from `molecule 26.4.0` installed into an isolated temporary target directory: `molecule init scenario --help`, `molecule test --help`, and `molecule login --help`
- Ansible `ansible-galaxy role init` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible `service_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible `package_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible `include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- pytest-testinfra module documentation: https://testinfra.readthedocs.io/en/latest/modules.html

## Issues Found
- The post used `molecule init scenario -d docker` and `molecule init scenario --scenario-name with_ssl -d docker`. Current Molecule `26.4.0` no longer exposes `-d/--driver-name` on `molecule init scenario`, so these commands would fail. Changed them to `molecule init scenario` and `molecule init scenario with_ssl`, and clarified that the Docker driver is configured in `molecule.yml`.
- The post said the scenario command creates a fixed structure including Testinfra tests. Current generated Molecule scenarios vary by version and verifier, and Testinfra files are not always generated. Changed the wording to "typically uses this structure" to avoid overstating generated output.
- Docker-based Molecule scenarios require the Docker-related Ansible collections in modern Molecule examples, especially `community.docker` and `ansible.posix`. Added `ansible-galaxy collection install community.docker ansible.posix` to local installation and CI setup examples.
- The GitLab CI matrix defined `SCENARIO` but ran `molecule test` without selecting the matrix scenario. Changed the script to `molecule test -s "$SCENARIO"`.

## Review Notes
- The post uses a pre-ansible-native Docker-style Molecule configuration. This remains useful, but the official Molecule documentation now emphasizes ansible-native examples and documents Docker container testing through explicit Ansible playbooks.
- Full Molecule execution was not run because this post is illustrative and the workspace does not include the target role or Docker test instances. CLI behavior and schema acceptance were checked by installing Molecule into an isolated temporary target directory, and module/configuration semantics were checked against official documentation.
