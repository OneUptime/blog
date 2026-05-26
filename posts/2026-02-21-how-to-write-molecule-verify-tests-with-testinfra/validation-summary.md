# Validation Summary: How to Write Molecule Verify Tests with Testinfra

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible Molecule
- Testinfra / pytest-testinfra
- pytest
- Docker-based Molecule scenarios
- Python infrastructure tests

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Testinfra documentation: https://testinfra.readthedocs.io/en/latest/
- Testinfra invocation documentation: https://testinfra.readthedocs.io/en/latest/invocation.html
- Testinfra modules documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- pytest invocation documentation: https://doc.pytest.org/en/latest/how-to/usage.html
- Local CLI/source checks for current `molecule`, `pytest`, and `pytest-testinfra` behavior.

## Issues Found
- The post placed Testinfra files directly under `molecule/default/`, but current Molecule defaults the Testinfra verifier directory to `molecule/default/tests/`. Updated the text and example path to use `molecule/default/tests/test_default.py`.
- The nginx version comparison checked major and minor numbers independently, which would incorrectly fail versions such as `2.0`. Updated the assertion to compare `(major, minor)` as a tuple.
- The multi-host example used `pytest.skip()` without importing `pytest`. Added the missing import.
- The `molecule verify -- -k ...` and `molecule verify -- -vvv` examples are not valid for the current Molecule CLI. Replaced them with supported scenario selection and debug-output commands.

## Review Notes
The Testinfra module examples align with the documented package, service, file, socket, command, user, and group APIs. Molecule's Testinfra verifier is documented as a pre ansible-native construct and is not the default verifier, but it remains supported when configured explicitly.
