# Validation Summary: How to Install GitLab CE on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- GitLab Community Edition
- GitLab Linux package / Omnibus
- firewalld
- systemd
- Postfix
- GitLab SMTP configuration
- GitLab Let's Encrypt integration
- GitLab backup tooling

## Sources Consulted
- GitLab Docs: Install the Linux package on AlmaLinux and RHEL-compatible distributions - https://docs.gitlab.com/install/package/almalinux/
- GitLab Docs: Install GitLab using the Linux package - https://docs.gitlab.com/install/package/
- GitLab Docs: Configure SSL for a Linux package installation - https://docs.gitlab.com/omnibus/settings/ssl/
- GitLab Docs: SMTP settings - https://docs.gitlab.com/omnibus/settings/smtp/
- GitLab Docs: GitLab installation requirements - https://docs.gitlab.com/install/requirements/
- GitLab Docs: Configure the bundled Puma instance of the GitLab package - https://docs.gitlab.com/administration/operations/puma/
- GitLab Docs: Run multiple Sidekiq processes - https://docs.gitlab.com/administration/sidekiq/extra_sidekiq_processes/
- GitLab Docs: Backup - https://docs.gitlab.com/omnibus/settings/backups/
- GitLab Docs: Back up GitLab - https://docs.gitlab.com/administration/backup_restore/backup_gitlab/

## Issues Found
- The firewall setup opened HTTP and HTTPS but did not explicitly open SSH, while GitLab's RHEL-compatible package installation docs list ports 80, 443, and 22 as needed. Added `sudo firewall-cmd --permanent --add-service=ssh`.
- The repository setup command used `curl -sS` without following redirects. GitLab's current package installation docs use `curl --location` for the package repository script. Updated the command accordingly.
- The Let's Encrypt configuration block was marked as `hcl`, but the snippet is GitLab's Ruby-style `/etc/gitlab/gitlab.rb` configuration. Changed the code fence language to `ruby`.

## Review Notes
The GitLab CE package is supported on RHEL 9, the `EXTERNAL_URL` install-time configuration, initial root password location, SMTP keys, Puma and Sidekiq settings, `gitlab-ctl` service commands, Let's Encrypt settings, and backup commands are consistent with current GitLab documentation. The backup section is technically correct, though GitLab also recommends backing up `/etc/gitlab` configuration with `sudo gitlab-ctl backup-etc` and considering TLS certificates and SSH host keys for full disaster recovery.
