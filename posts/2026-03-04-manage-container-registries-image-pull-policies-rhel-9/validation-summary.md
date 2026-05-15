# Validation Summary: How to Manage Container Registries and Image Pull Policies on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- containers registries.conf
- containers containers.conf
- containers auth.json
- Registry TLS certificates
- Skopeo

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Working with container registries": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers
- Podman `podman-run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman `podman-login` documentation: https://docs.podman.io/en/v5.1.2/markdown/podman-login.1.html
- containers `registries.conf` man page: https://www.mankier.com/5/containers-registries.conf
- containers `containers.conf` upstream man page source: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md
- containers `auth.json` upstream man page source: https://raw.githubusercontent.com/containers/image/main/docs/containers-auth.json.5.md
- containers `certs.d` upstream man page source: https://raw.githubusercontent.com/containers/image/main/docs/containers-certs.d.5.md

## Issues Found
- The default pull policy configuration used `image_pull_policy`, which is not the documented `containers.conf` key. Changed it to `[engine] pull_policy = "missing"`.
- The post listed `newer` as a default `containers.conf` pull policy option. `podman run --pull=newer` is valid, but the documented `containers.conf` `pull_policy` values are `always`, `missing`, and `never`; removed `newer` from the default configuration options list.
- The short-name aliases example wrote directly to `/etc/containers/registries.conf.d/shortnames.conf` with shell redirection, which fails for normal users even when the command is intended to modify a root-owned file. Changed it to use `sudo tee`.
- The credential-helper example configured `helper_binaries_dir`, which controls helper binary search paths for Podman components and does not configure registry credential helpers. Replaced it with an `auth.json` `credHelpers` example and clarified the `docker-credential-` suffix convention.
- The registry certificate note said the cert directory must match the registry hostname. The documented directory name is the registry `host:port`; updated the wording.

## Review Notes
The article is technically relevant and broadly accurate for RHEL 9 and Podman after the fixes. The `--pull=newer` command-line example is valid, but administrators should be aware that it compares image digests rather than timestamps.
