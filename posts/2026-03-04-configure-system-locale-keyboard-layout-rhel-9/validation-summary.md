# Validation Summary: How to Configure the System Locale and Keyboard Layout on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd `localectl`
- Linux locale configuration
- Linux virtual console keymaps
- X11 keyboard layout configuration
- OpenSSH client environment forwarding
- RHEL glibc langpack packages

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring the system locale" and "Configuring the keyboard layout": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- `localectl(1)` man page, systemd
- `locale.conf(5)` man page, systemd
- `ssh_config(5)` man page, OpenSSH
- Red Hat Enterprise Linux package manifest for `glibc-langpack-*`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Podman `podman-run(1)` documentation for container environment handling: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Docker `docker container run` documentation for environment variable handling: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The post said `localectl set-locale` updates the running session. `localectl` updates the system setting and writes `/etc/locale.conf`, but existing shells generally do not automatically receive the new environment. Changed the wording to say it updates the system setting at runtime.
- The post recommended `source /etc/locale.conf` to apply locale changes to the current session. Because newly introduced `LC_*` shell variables might not be exported, changed the example to use `set -a`, `source /etc/locale.conf`, and `set +a`.
- The post described console and X11 keymap changes as separate without noting `localectl`'s default conversion behavior. Added notes that `set-keymap` and `set-x11-keymap` also apply the closest matching converted setting unless `--no-convert` is used.
- The X11 example described an AZERTY variant while passing an empty variant. Changed the comment to "French" because the command sets the French layout without specifying a variant.
- The container tip said containers inherit the host locale unless explicitly configured. This is not generally true for OCI containers; they use image/runtime-provided environment variables unless the runtime is told to pass host variables. Updated the tip to recommend passing `LANG` or `LC_*` explicitly when needed.

## Review Notes
The core RHEL 9 locale and keyboard commands are current and consistent with Red Hat documentation and `localectl(1)`. The OpenSSH `SendEnv -LC_* -LANG` syntax is supported by OpenSSH for clearing previously set `SendEnv` patterns, but administrators should still account for client configuration ordering and server-side `AcceptEnv` settings.
