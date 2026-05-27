# Validation Summary: How to Use Ansible to Set Up a GitLab Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- GitLab Community Edition Linux package
- GitLab Omnibus configuration
- GitLab Runner
- Docker Engine
- Let's Encrypt
- SMTP
- GitLab backup and restore

## Sources Consulted
- GitLab Docs: Install the Linux package on Debian - https://docs.gitlab.com/install/package/debian/
- GitLab Docs: GitLab installation requirements - https://docs.gitlab.com/install/requirements/
- GitLab Docs: Configure SSL for a Linux package installation - https://docs.gitlab.com/omnibus/settings/ssl/
- GitLab Docs: SMTP settings - https://docs.gitlab.com/omnibus/settings/smtp/
- GitLab Docs: Back up GitLab - https://docs.gitlab.com/administration/backup_restore/backup_gitlab/
- GitLab Docs: Restore GitLab - https://docs.gitlab.com/administration/backup_restore/restore_gitlab/
- GitLab Docs: Registering runners - https://docs.gitlab.com/runner/register/
- GitLab Docs: Container registry administration - https://docs.gitlab.com/administration/packages/container_registry/
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Ansible Docs: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Docs: ansible.builtin.cron module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The prerequisite package task placed `env` under the Ansible `apt` module arguments. Ansible task environment variables belong under the task-level `environment` key, so the snippet was corrected to set `DEBIAN_FRONTEND` there.
- The runner tasks attempted to install `docker-ce` and `docker-ce-cli` without first adding Docker's official apt repository, and omitted the required `containerd.io` package. The snippet now creates `/etc/apt/keyrings`, downloads Docker's repository key, adds the Docker apt repository, and installs `containerd.io` with Docker Engine.
- The run instructions said the initial root password is in `/etc/gitlab/initial_root_password` without noting GitLab removes that file after 24 hours. The comment now states the 24-hour availability window.
- The restore playbook stopped all GitLab services and then manually started PostgreSQL and Redis. GitLab's Linux package restore documentation says to leave GitLab running and stop only services connected to the database, specifically Puma and Sidekiq. The restore example was updated accordingly.
- The restore example described restoring from the "latest" backup while requiring a `BACKUP={{ gitlab_backup_timestamp }}` value. The task name was changed to "selected backup" to match GitLab's documented restore behavior.
- The restore command included both `force=yes` and `GITLAB_ASSUME_YES=1`. GitLab documents `GITLAB_ASSUME_YES=1` for disabling prompts, so the redundant `force=yes` argument was removed.
- The restore flow did not include a post-restore GitLab check. The example now runs `gitlab-rake gitlab:check SANITIZE=true`, matching GitLab's documented verification step.

## Review Notes
The role remains an illustrative tutorial rather than a complete production role. Future improvements could include firewall tasks for ports 22, 80, and 443, explicit backup handling for `/etc/gitlab/gitlab-secrets.json`, remote backup storage, Docker repository defaults for Debian hosts, and using fully qualified Ansible collection names such as `ansible.builtin.apt`.
