# Validation Summary: How to Install Molecule for Ansible Testing

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ansible
- ansible-core
- Molecule
- molecule-plugins
- Docker
- Podman
- Vagrant
- Python virtual environments
- ansible-lint
- yamllint
- VS Code Ansible extension

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Docker example: https://docs.ansible.com/projects/molecule/examples/docker/
- Ansible VS Code extension configuration documentation: https://docs.ansible.com/projects/vscode-ansible/configuration/
- PyPI metadata for molecule: https://pypi.org/project/molecule/
- PyPI metadata for molecule-plugins: https://pypi.org/project/molecule-plugins/

## Issues Found
- The prerequisites listed Python 3.8 or newer. Current Molecule and molecule-plugins package metadata require Python 3.10 or newer, so the prerequisite was updated.
- The prerequisites listed ansible-core 2.12+. Current Molecule package metadata requires ansible-core 2.15+, so the prerequisite was updated.
- The post said Molecule handles linting directly. Current Molecule documentation states ansible-lint is not included with Molecule, so the wording was changed to syntax checks and noted that linting is usually added with ansible-lint.
- The Docker plugin explanation implied the package only installs Docker support. The molecule-plugins package contains multiple plugins, while the `docker` extra installs Docker-specific dependencies, so the wording was corrected.
- The `molecule drivers` expected output was too exact and incomplete for current molecule-plugins output. It was changed to say the command should include the installed drivers and the example was updated.
- The smoke test used the removed `molecule init role ... --driver-name docker` workflow. Current Molecule exposes `molecule init scenario`, so the smoke test was updated to initialize a role with `ansible-galaxy role init`, initialize a Molecule scenario, and verify discovery with `molecule list`.
- The smoke test claimed the generated scaffold immediately runs the full Docker lifecycle. Current Molecule scaffolding includes placeholder playbooks that must be configured before `molecule test`, so the explanation was corrected.
- The troubleshooting section used `pip show molecule | grep Requires` to check version constraints. `pip show` lists dependency names but not the installed environment compatibility result, so this was replaced with `pip check`.

## Review Notes
The post remains valid as an installation overview. A future improvement would be adding a complete current Docker or Podman scenario example, because current Molecule's default scenario scaffold is intentionally a starting point rather than a ready-to-run container scenario.
