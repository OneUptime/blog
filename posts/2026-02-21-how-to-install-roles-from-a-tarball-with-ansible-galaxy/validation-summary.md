# Validation Summary: How to Install Roles from a Tarball with Ansible Galaxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy CLI
- Ansible roles
- YAML requirements files
- Bash scripting
- tar archives
- SHA-256 checksums
- HTTP artifact repositories

## Sources Consulted
- Ansible Community Documentation: ansible-galaxy CLI, role install options and behavior: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Galaxy user guide, role requirements file format and tarball URL examples: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Documentation: Galaxy server configuration and token settings: https://docs.ansible.com/projects/ansible/4/galaxy/user_guide.html
- Local Ansible CLI behavior via `python3 -m ansible.cli.galaxy` from installed Ansible 2.21.0.

## Issues Found
- Direct tarball installs do not use `galaxy_info.role_name` as the installed directory name in current Ansible behavior. Added a note that direct installs use the archive argument or URL basename and that `requirements.yml` with `name` should be used when a specific role directory is required.
- The checksum verification install script installed each local tarball directly, which could produce archive-based role directory names. Updated it to install from the generated `requirements-offline.yml` file after checksum verification.
- The artifact repository authentication guidance incorrectly suggested `[galaxy] token = your_api_token` for generic tarball downloads. Replaced it with `.netrc` guidance and clarified that Galaxy token settings are for Galaxy API servers, not generic HTTP artifact repositories.
- The troubleshooting section claimed flat tarballs would not work. Current Ansible accepts archives that contain role contents at the archive root as long as `meta/main.yml` is present. Replaced that item with guidance about unexpected installed role directory names.

## Review Notes
- `ansible-galaxy` was not available as a shell command in this environment, but the installed Ansible 2.21.0 Python package provided the same Galaxy CLI through `python3 -m ansible.cli.galaxy`.
- The local and `file://` tarball examples were tested with temporary roles. The remote tarball URL behavior was tested against a temporary local HTTP server.
