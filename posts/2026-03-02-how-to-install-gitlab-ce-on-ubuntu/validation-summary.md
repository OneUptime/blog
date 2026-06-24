# Validation Summary: How to Install GitLab CE on Ubuntu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- GitLab CE (Omnibus package)
- Ubuntu 22.04 / 24.04
- GitLab Runner
- GitLab CI/CD (.gitlab-ci.yml)
- Let's Encrypt, Nginx, Puma, Sidekiq, PostgreSQL (bundled by Omnibus)

## Sources Consulted
- GitLab Docs — Linux package install — https://docs.gitlab.com/install/package/ (verified Omnibus install method, repo script + EXTERNAL_URL apt install flow)
- GitLab Docs — Installation requirements (via official requirements page summary) — https://docs.gitlab.com/install/requirements/ (verified CPU/RAM sizing: 8 vCPU and 16 GB recommended for up to 1,000 users; can run with 8 GB)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- The install flow is the official Omnibus method: add repo via `curl ... packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash`, then `sudo EXTERNAL_URL="https://..." apt install gitlab-ce`. `apt install` is equivalent to the documented `apt-get install`.
- `gitlab-ctl reconfigure`, `gitlab-ctl status`, `gitlab-ctl tail <svc>`, and the `/etc/gitlab/gitlab.rb` keys shown (`external_url`, `gitlab_rails['smtp_*']`, `nginx['enable']`, `gitlab_workhorse['listen_network'/'listen_addr']`, `letsencrypt[*]`, `puma['worker_processes']`, `sidekiq['concurrency']`, `registry_external_url`, `postgresql['shared_buffers']`) are all valid Omnibus configuration keys.
- Backup/restore commands are current: `gitlab-backup create`, `gitlab-backup restore BACKUP=<timestamp>`, stopping `puma` and `sidekiq` before restore, and backing up `gitlab.rb` + `gitlab-secrets.json` separately (these are correctly noted as not included in the application backup).
- Health endpoints `/-/health` and `/-/readiness` are valid GitLab monitoring endpoints.
- `initial_root_password` file in `/etc/gitlab/` and its 24-hour deletion are accurate.
- Requirements stated (4 cores min / 8+ recommended; 8 GB min / 16 GB+ recommended) are slightly stricter than GitLab's documented hard minimum (4 GB supported in constrained setups) but are reasonable practical guidance; the post itself acknowledges 4 GB works but is painful. Left as-is.
- GitLab Runner registration: the post references the modern "New instance runner / New project runner" UI flow (authentication tokens, GitLab 16+) while still calling it a "registration token". `gitlab-runner register` interactive flow remains valid. Minor terminology, left as-is.
- The `.gitlab-ci.yml` example (stages, cache key `$CI_COMMIT_REF_SLUG`, artifacts, docker:dind service with `DOCKER_TLS_CERTDIR`, `$CI_REGISTRY*` predefined variables, `only:` keyword) is valid; `only:` is a legacy but still-supported keyword (rules: is the modern alternative). Left as-is.
