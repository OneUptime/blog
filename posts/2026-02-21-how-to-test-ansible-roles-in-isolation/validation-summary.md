# Validation Summary: How to Test Ansible Roles in Isolation

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible roles and playbooks
- Molecule
- Molecule Docker driver / molecule-plugins
- Docker containers
- pytest-testinfra
- GitHub Actions

## Sources Consulted
- Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Molecule Docker container example: https://docs.ansible.com/projects/molecule/examples/docker/
- pytest-testinfra module documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- Ansible built-in module documentation, including `apt`, `package`, `service`, `stat`, `command`, and `wait_for`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- GitHub Actions `actions/checkout` and `actions/setup-python` documentation: https://github.com/actions/checkout and https://github.com/actions/setup-python

## Issues Found
- The `molecule init scenario --driver-name docker` command is no longer valid in current Molecule. Molecule 26.4.0 reports `No such option '--driver-name'` for `molecule init scenario`, and the current CLI accepts the scenario name as an optional positional argument. Updated the default scenario command to `molecule init scenario`.
- The additional scenario command used invalid options for current Molecule: `molecule init scenario --scenario-name tls --driver-name docker`. Updated it to `molecule init scenario tls`.
- The generated file list omitted `create.yml` and `destroy.yml`, which current `molecule init scenario` generates. Added both files to the example tree.
- The documented `molecule test` flow included a `lint` action. Current Molecule workflow documentation lists `dependency`, `cleanup`, `destroy`, `syntax`, `create`, `prepare`, `converge`, `idempotence`, `side_effect`, `verify`, `cleanup`, and `destroy`; `lint` is not part of the current default sequence. Updated the Mermaid diagram accordingly.
- The post showed testinfra usage but did not install `pytest-testinfra`. Added `pytest-testinfra` to the local install command and GitHub Actions dependency install step.

## Review Notes
- The Docker driver configuration shown is a pre ansible-native Molecule configuration. Current Molecule documentation still documents these fields, but newer generated scenarios use ansible-native scaffolding with explicit `create.yml` and `destroy.yml` playbooks.
- The Docker/systemd platform examples are plausible for role testing, but systemd-in-container behavior can vary by Docker host, cgroup version, and image contents.
