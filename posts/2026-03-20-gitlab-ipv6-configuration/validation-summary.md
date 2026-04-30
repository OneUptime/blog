# Validation Summary: How to Configure GitLab for IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- GitLab Self-Managed (Linux package / Omnibus)
- NGINX
- IPv6
- OpenSSH
- GitLab Pages
- GitLab Container Registry
- GitLab Runner
- Linux firewalling with `ip6tables`

## Sources Consulted
- GitLab Docs, "NGINX settings": https://docs.gitlab.com/omnibus/settings/nginx/
- GitLab Docs, "DNS settings": https://docs.gitlab.com/omnibus/settings/dns/
- GitLab Docs, "Configure SSL for a Linux package installation": https://docs.gitlab.com/omnibus/settings/ssl/
- GitLab Docs, "GitLab Pages administration": https://docs.gitlab.com/administration/pages/
- GitLab Docs, "Troubleshooting GitLab Pages administration": https://docs.gitlab.com/administration/pages/troubleshooting/
- GitLab Docs, "GitLab container registry administration": https://docs.gitlab.com/administration/packages/container_registry/
- GitLab Docs, "Registering runners": https://docs.gitlab.com/runner/register/
- GitLab Docs, "GitLab Runner commands": https://docs.gitlab.com/runner/commands/
- GitLab Docs, "Migrating to the new runner registration workflow": https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Docs, "Use SSH keys with GitLab": https://docs.gitlab.com/user/ssh/
- GitLab Docs, "`gitlab-sshd`": https://docs.gitlab.com/administration/operations/gitlab_sshd/
- GitLab Docs, "GitLab Shell feature list": https://docs.gitlab.com/development/gitlab_shell/features/
- GitLab Docs, "Configure GitLab running in a Docker container": https://docs.gitlab.com/ee/install/docker/configuration.html

## Issues Found
- The main Omnibus NGINX IPv6 listener used `::` instead of the documented `[::]` form. I corrected the examples to use GitLab's documented listener syntax for IPv6 addresses.
- The post set `nginx['listen_port'] = 80` while also using `external_url 'https://...'`, which conflicts with GitLab's documented HTTPS listener behavior. I removed that incorrect override.
- The SSH configuration used the wrong GitLab settings. `gitlab_shell['ssh_port']` and `gitlab_rails['gitlab_shell_ssh_host']` were replaced with the current documented `gitlab_rails['gitlab_ssh_host']` and `gitlab_rails['gitlab_shell_ssh_port']` settings.
- The SSH comments implied those GitLab settings make SSH listen on IPv6. They only affect the clone URLs GitLab shows to users. I reworded the comments to distinguish clone URL settings from the actual SSH server listener configuration.
- The SSH clone example did not actually force IPv6. I changed it to `GIT_SSH_COMMAND="ssh -6" git clone ...`, and I fixed the SSH connectivity test so `-6` is passed as an SSH option instead of as a remote command.
- The Registry and Pages IPv6 examples used undocumented or mismatched listener keys and values. I updated them to the documented service-specific NGINX `listen_addresses` settings.
- The GitLab Runner example used the deprecated `--registration-token` flow. I updated it to the current `--token` form with `--non-interactive`, which matches the current runner registration workflow.
- The runner reachability check passed a private-token header to the public `/api/v4/version` endpoint. I simplified it to an unauthenticated IPv6 `curl` check.
- The firewall section implied port `5050` is always required for the registry and used a distro-specific persistence path without qualification. I clarified that `5050` is conditional and that the `ip6tables-save` example is distro-specific.
- The conclusion overstated that a single `nginx['listen_addresses']` setting enables dual-stack access for all GitLab services. I corrected it to reflect that GitLab, Registry, Pages, and SSH each need their relevant listener settings.

## Review Notes
- The post does not pin a GitLab version, so the fixes were aligned to the current GitLab documentation available on April 30, 2026.
- `pages_external_url` and `registry_external_url` examples still assume the corresponding DNS records and TLS certificates are already in place, which is consistent with GitLab's standard setup guides.
