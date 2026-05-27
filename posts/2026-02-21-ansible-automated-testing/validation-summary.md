# Validation Summary: How to Use Ansible for Automated Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker driver
- Testinfra / pytest-testinfra
- ansible-lint
- GitHub Actions
- Docker-based role testing

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule pre ansible-native configuration reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule custom image guide: https://docs.ansible.com/projects/molecule/guides/custom-image/
- Testinfra documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- Testinfra quick start: https://testinfra.readthedocs.io/
- ansible-lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/
- ansible-lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- ansible-lint rules index: https://docs.ansible.com/projects/lint/rules/
- ansible-lint GitHub Action repository: https://github.com/ansible/ansible-lint

## Issues Found
- The install commands used the older standalone `molecule-docker` package. Current Molecule documentation says most non-default drivers are provided by `molecule-plugins`, so the commands now install `"molecule-plugins[docker]"`.
- The post configured `verifier: testinfra` but did not install Testinfra. Testinfra is an optional verifier and the current package name is `pytest-testinfra`, so the install commands now include `pytest-testinfra`.
- The `molecule init role my_nginx --driver-name docker` example omitted a namespace. Molecule checks role names against Galaxy-style fully qualified role naming, so the example now uses `acme.my_nginx`.
- The Molecule dependency example used `requirements-file` for role dependencies. Current Molecule documentation uses `role-file` for role requirements and `requirements-file` for collection requirements, so the snippet now uses `role-file: requirements.yml`.
- The Testinfra examples assumed Debian-specific nginx paths and the `www-data` user while the Molecule platforms include Rocky Linux 9. The tests now choose `/etc/nginx/sites-enabled/testserver.conf` and `www-data` on Debian/Ubuntu, and `/etc/nginx/conf.d/testserver.conf` and `nginx` elsewhere.
- The Molecule lifecycle list included a `lint` step. Current Molecule workflow documentation lists the default `molecule test` sequence without a lint action, and Molecule documentation notes that ansible-lint is not included with Molecule. The lifecycle list was corrected.
- The ansible-lint `enable_list` contained obsolete or non-optional rule names. It now uses documented opt-in rule examples, `no-log-password` and `name[prefix]`.

## Review Notes
The Testinfra verifier remains supported for pre ansible-native Molecule configurations, but it is no longer Molecule's default verifier. Future updates could show an Ansible `verify.yml` alternative for teams that prefer the current default verifier.
