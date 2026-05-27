# Validation Summary: How to Use Ansible to Harden Docker Installations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Docker Engine / Docker CE
- Docker daemon configuration
- Linux systemd
- Linux sysctl
- auditd
- seccomp
- CIS Docker Benchmark guidance

## Sources Consulted
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: dockerd CLI and daemon configuration reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Seccomp security profiles for Docker - https://docs.docker.com/engine/security/seccomp/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Isolate containers with a user namespace - https://docs.docker.com/engine/security/userns-remap/
- Docker Docs: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker Docs: CIS Benchmark overview - https://docs.docker.com/dhi/core-concepts/cis/
- Ansible Documentation: ansible.builtin.stat module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html

## Issues Found
- The post deployed a custom seccomp profile but did not configure Docker to use it by default. Added `"seccomp-profile": "/etc/docker/seccomp/default.json"` to `daemon.json`, matching Docker's documented daemon option.
- The runtime restrictions section said the role creates an AppArmor profile, but the code only creates a seccomp profile. Updated the wording to avoid claiming an AppArmor profile is configured.
- The `icc` explanation overstated the scope of Docker's setting. Updated it to say it blocks unrestricted communication on the default bridge network.
- The Docker socket task description called the socket a directory. Corrected the task name to refer to the Docker socket.
- The systemd task that removes a TCP listener only notified a daemon reload. Added a Docker restart notification so an active unit change is applied.
- The verification playbook's TCP check could output two zeroes because `grep -c` exits nonzero when there are no matches and the shell fallback also prints `0`. Replaced it with an `awk` count that always emits one numeric value.

## Review Notes
- Docker's official seccomp documentation says Docker's default profile is generally recommended. The custom profile shown in the post may need application-specific testing before production use because restrictive allowlists can break workloads.
- The Docker apt repository example uses an older but still plausible keyring layout. Docker's current Ubuntu documentation uses `/etc/apt/keyrings/docker.asc` and a deb822 `.sources` file.
- The playbook is Ubuntu-specific even though some conditions use `ansible_os_family == "Debian"`. Future cleanup could either state Ubuntu explicitly in the setup section or make the repository URL/key setup conditional for Debian and Ubuntu separately.
