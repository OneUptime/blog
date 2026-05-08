# Validation Summary: How to Build an Image with DNS Configuration with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container image builds
- DNS resolver configuration
- `/etc/resolv.conf`
- `/etc/hosts`
- `containers.conf`
- Alpine Linux package installation
- npm registry configuration
- pip index configuration

## Sources Consulted
- Podman `podman-build(1)` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `--dns` option documentation: https://docs.podman.io/en/v4.6.0/markdown/options/dns.html
- Podman Quadlet build documentation for DNS build settings: https://docs.podman.io/en/latest/markdown/podman-build.unit.5.html
- `containers.conf(5)` documentation: https://www.mankier.com/5/containers.conf
- pip `pip config` documentation: https://pip.pypa.io/en/stable/cli/pip_config/
- npm config documentation: https://docs.npmjs.com/cli/v8/using-npm/config/

## Issues Found
No technical issues found.

## Review Notes
Podman is not installed in the local review environment, so commands could not be executed locally. The CLI flags and configuration keys were verified against official/current Podman documentation instead. The `--dns`, `--dns-option`, and `--dns-search` options affect `RUN` instructions during the build and do not persist DNS settings into the final image, which is consistent with the article's focus on build-time DNS behavior.
