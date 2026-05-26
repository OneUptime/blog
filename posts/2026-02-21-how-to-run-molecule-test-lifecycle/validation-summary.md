# Validation Summary: How to Run Molecule Test Lifecycle

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Molecule
- Ansible Galaxy
- Testinfra
- CI/CD shell workflows

## Sources Consulted
- Ansible Molecule Workflow Reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule Command Line Reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule Configuration Reference: https://docs.ansible.com/projects/molecule/configuration/
- Local `molecule 26.4.0` CLI help for `test`, `converge`, `verify`, `login`, `idempotence`, `side-effect`, and `syntax`.

## Issues Found
- The introduction said the `molecule test` lifecycle includes linting. Current Molecule documentation lists `syntax`, not a lint phase, in the default test sequence. Changed the wording to "checking syntax."
- The dependency example said it installs collections and roles but only configured `requirements-file`. Current Molecule documentation says `role-file` is used for roles and `requirements-file` is used for collections; if using one combined requirements file, both should point to the same path. Added `role-file: requirements.yml`.
- The cleanup and side effect examples implied that placing `cleanup.yml` or `side_effect.yml` in the scenario is enough. Current Molecule documentation says these optional playbooks are enabled through `provisioner.playbooks`. Added the required configuration snippets.
- The verify examples used trailing CLI arguments (`molecule verify -- -k ...` and `molecule verify -- -vvv`). Current `molecule verify` does not accept trailing verifier args. Replaced them with documented Testinfra verifier options in `molecule.yml`.
- The minimal test sequence comment said it skipped lint even though current Molecule has no lint action. Updated the comment to name the skipped phases accurately.

## Review Notes
Molecule 26.4.0 marks some multi-scenario execution controls such as `--workers`, `--report`, and `--shared-state` as experimental, and `--parallel` as deprecated. The post's manual shell backgrounding example is still a valid shell pattern, but Molecule also has built-in worker-based execution for current versions.
