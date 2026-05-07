# Validation Summary: How to Configure an Insecure Registry in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers registries.conf
- Container registries
- TLS verification
- Docker Distribution registry image
- firewalld

## Sources Consulted
- containers-registries.conf manual page: https://www.mankier.com/5/containers-registries.conf
- Podman pull manual page: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman push manual page: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman login manual page: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- Podman info manual page: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- firewalld rich language documentation: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html

## Issues Found
- The reverting example said it removed insecure registry blocks, but the shown `sed` command only deletes lines containing `insecure = true`. Updated the comment to say it removes insecure flags from registry blocks, matching the actual command behavior.

## Review Notes
- The post's `registries.conf` examples use the current TOML v2 `[[registry]]` and `[[registry.mirror]]` format with valid `prefix`, `location`, and `insecure` fields.
- The `--tls-verify=false` examples for `podman pull`, `podman push`, and `podman login` match current Podman CLI options.
- Podman is not installed in this local environment, so CLI behavior was checked against official Podman documentation rather than local `--help` output.
