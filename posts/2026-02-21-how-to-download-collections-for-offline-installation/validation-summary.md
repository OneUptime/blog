# Validation Summary: How to Download Collections for Offline Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy CLI
- Ansible collections
- Ansible roles
- Ansible Galaxy requirements files
- Red Hat Automation Hub configuration
- Bash
- Python
- GitHub Actions

## Sources Consulted
- Ansible Community Documentation: Downloading collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_downloading.html
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: ansible-galaxy CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Red Hat Documentation: Getting started with automation hub - https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html-single/getting_started_with_automation_hub/index
- Local Ansible CLI help from ansible-core 2.21.0 using `python3 -m ansible.cli.galaxy collection download --help`
- Local Ansible CLI help from ansible-core 2.21.0 using `python3 -m ansible.cli.galaxy collection install --help`
- Local Ansible CLI help from ansible-core 2.21.0 using `python3 -m ansible.cli.galaxy role install --help`

## Issues Found
- The offline collection install script invoked `ansible-galaxy collection install -r "$PACKAGE_DIR/requirements.yml"` from outside the downloaded package directory. The generated `requirements.yml` contains relative tarball names, and Ansible documents that offline install should run from the folder containing the downloaded tarballs and generated requirements file. Changed the script to `cd "$PACKAGE_DIR"` before installing and to use `-r requirements.yml`.
- The offline collection install script did not use `--offline`. Added `--offline` so installation of local collection artifacts does not contact distribution servers.
- The role packaging example used the legacy top-level `ansible-galaxy install` form with a custom role path. Changed it to `ansible-galaxy role install` so the example explicitly processes roles and matches current CLI documentation.
- The role installation and listing commands in the air-gapped script used legacy top-level forms. Changed them to `ansible-galaxy role install` and `ansible-galaxy role list`.
- The Python dependency verification script imported `yaml` but did not use it, which would make the script fail on systems without PyYAML installed. Removed the unused import.
- The local file-based repository example generated requirements entries with `source: file://...`, but Ansible treats `source` as a Galaxy API URL and rejects file URLs in that field. Changed the generated entries to use the tarball path as `name` with `type: file`, matching the documented requirements-file format and verified locally with `--offline`.
- The update example installed from `./update-package/requirements.yml` while outside the package directory. Changed it to `cd ./update-package/` and install from `requirements.yml` with `--offline`.

## Review Notes
- Installing collections with `-p ./collections` may emit Ansible's standard warning if that path is not part of the configured `COLLECTIONS_PATHS`; this is expected unless the caller uses a playbook-adjacent collections directory or configures the collections path.
- The Red Hat Automation Hub endpoint shown is consistent with current Red Hat documentation for published content, and older Red Hat documentation may show different legacy `cloud.redhat.com` URL forms.
