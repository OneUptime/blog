# Validation Summary: How to Use Ansible to Configure AppArmor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- AppArmor
- Ubuntu and Debian Linux
- Docker AppArmor profiles
- Linux audit and kernel logs

## Sources Consulted
- Ubuntu Manpage: aa-enforce - https://manpages.ubuntu.com/manpages/jammy/man8/aa-enforce.8.html
- Ubuntu Manpage: aa-logprof - https://manpages.ubuntu.com/manpages/questing/man8/aa-logprof.8.html
- Ubuntu Manpage: aa-status - https://manpages.ubuntu.com/manpages/noble/man8/aa-status.8.html
- Local AppArmor 4.0.1 command help for aa-status and apparmor_parser
- AppArmor profile syntax manpage: apparmor.d(5), checked locally
- Docker Docs: AppArmor security profiles for Docker - https://docs.docker.com/engine/security/apparmor/
- Ansible documentation: ansible.builtin.apt - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: ansible.builtin.pause - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pause_module.html

## Issues Found
- The profile-generation playbook used `pause` with `minutes` while telling the operator to press Enter. Ansible documents that user input is only returned when neither `seconds` nor `minutes` is set, so the prompt was changed to describe a fixed observation window.
- The playbook attempted to run `aa-logprof` with `ansible.builtin.command`. `aa-logprof` is an interactive tool for reviewing AppArmor events and applying suggested profile changes, so this was changed to an operator pause that instructs the reviewer to run `sudo aa-logprof` on the target host and continue after saving changes.
- The Docker profile section copied and loaded profiles but did not mention that Docker containers must be started with `--security-opt apparmor=<profile>` to use a custom profile. Added a short note with the correct Docker option.
- The verification playbook used `aa-status --enforced` and `aa-status --complaining`. Those options are documented in Ubuntu's current manpage, but local AppArmor 4.0.1 help exposes the newer filter/count form. Updated the commands to `aa-status --show=profiles --filter.mode=enforce --count` and `aa-status --show=profiles --filter.mode=complain --count`.

## Review Notes
The remaining examples are technically plausible for Ubuntu/Debian hosts with AppArmor packages installed and root privileges. In a future revision, the role could be made more production-ready by replacing broad `ignore_errors: yes` usage with explicit failure handling and by documenting how generated profiles are associated with service restarts.
