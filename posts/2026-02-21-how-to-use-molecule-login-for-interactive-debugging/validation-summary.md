# Validation Summary: How to Use Molecule login for Interactive Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule scenarios and drivers
- Docker and Podman container debugging
- Vagrant-based test instances
- Linux service, package, network, and filesystem troubleshooting commands

## Sources Consulted
- Ansible Molecule Command Line Reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule Workflow Reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule Configuration Reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Pre Ansible-Native Configuration Reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Molecule source for `login` command options and behavior: https://raw.githubusercontent.com/ansible/molecule/main/src/molecule/command/login.py
- Molecule source for CLI option definitions, including `--host`, `--scenario-name`, and `--destroy`: https://raw.githubusercontent.com/ansible/molecule/main/src/molecule/click_cfg.py
- Ansible CLI reference for ad-hoc command flags: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible ad-hoc commands guide: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Docker `exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/

## Issues Found
- The post described Docker-based `molecule login` as equivalent to `docker exec -it <container> /bin/bash`. Current Molecule behavior depends on the driver's `login_cmd_template`, and the official example uses `docker exec -ti {instance} bash`. Updated the wording to say it is commonly equivalent to `docker exec -it <container> bash`, depending on the configured template.
- The post implied Ansible commands could always be run from inside the instance. Since test images do not always include Ansible, updated the text to say this applies when Ansible is installed in the instance.
- The database connectivity example used `curl database:5432`, which sends an HTTP-style request to a non-HTTP database port and is a poor connectivity test. Replaced it with `nc -vz database 5432`.
- The ad-hoc Ansible examples used `molecule/default/.molecule/ansible_inventory.yml`, which does not match the current documented generated inventory location. Updated the examples to use the documented cache path pattern under `~/.cache/molecule/YOUR_ROLE/default/inventory/ansible_inventory.yml`.
- The Docker container discovery example used `docker ps --filter "label=creator=molecule"`, but that label is not a reliable documented Molecule label. Changed it to `docker ps`.
- The direct shell example said it was the same as `molecule login` and used `/bin/bash`. Updated it to a plain direct Docker shell example using `bash`.

## Review Notes
The post is technically relevant and useful. Some commands, especially `systemctl` and `journalctl`, depend on the test image running systemd or exposing journald; this is common in some Molecule role-testing images but not universal for minimal containers.
