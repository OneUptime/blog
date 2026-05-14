# Validation Summary: How to Set Up Ansible Pull Mode on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- ansible-pull
- Git
- systemd services and timers
- cron
- SSH daemon configuration

## Sources Consulted
- Ansible `ansible-pull` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-pull.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Red Hat article on RHEL System Roles and Ansible Core availability in RHEL 9 AppStream: https://access.redhat.com/articles/3050101
- Git `init` command help from the local Git CLI, confirming `-b` / `--initial-branch`.
- Local `systemd.syntax(7)`, `systemd.service(5)`, and `systemd.timer(5)` documentation for unit-file continuation syntax, `ExecStart`, journald output settings, `OnBootSec`, `OnUnitActiveSec`, and `RandomizedDelaySec`.

## Issues Found
- The repository setup used `git init` and later pushed `main`. Depending on Git configuration, `git init` may create a different initial branch. Changed it to `git init -b main` so the later `git push -u origin main` works consistently.
- The playbook used `community.general.timezone`, but the installation step only installed `ansible-core` and `git`. The `community.general` collection is not included in `ansible-core`, so the playbook could fail. Added `sudo ansible-galaxy collection install community.general`.
- The playbook started `chronyd` and `firewalld` but did not install the packages that provide those services. Added `chrony` and `firewalld` to the base package list so the service tasks do not depend on the target image already having them installed.
- The systemd unit creation examples used `sudo cat > /etc/systemd/system/...`. The shell redirection is performed by the caller's shell, so this can fail for non-root users. Replaced both commands with `sudo tee ... > /dev/null`.

## Review Notes
- The `ansible-pull` flags shown in the post are current: `-U` specifies the repository URL, `-C` selects the checkout, `-d` selects the destination directory, `--clean` removes modified files in the working tree, and `-f` forces playbook execution even if the repository update fails.
- The post correctly notes that `ansible-pull` falls back to `local.yml`; official documentation says it first checks for playbooks matching the host FQDN and hostname, then `local.yml`.
- The systemd timer syntax and randomized delay configuration are valid. systemd also applies timer accuracy/coalescing behavior by default, so exact run times may vary slightly beyond the configured interval.
