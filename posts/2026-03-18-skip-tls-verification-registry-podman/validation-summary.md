# Validation Summary: How to Skip TLS Verification for a Registry in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers-registries.conf
- containers-certs.d
- Skopeo
- Buildah
- OpenSSL
- TLS for container registries

## Sources Consulted
- Podman pull documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman push documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman login documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Podman global configuration and environment variables: https://docs.podman.io/en/stable/markdown/podman.1.html
- containers-registries.conf man page: https://www.mankier.com/5/containers-registries.conf
- containers-certs.d man page: https://www.mankier.com/5/containers-certs.d
- Skopeo inspect man page: https://www.mankier.com/1/skopeo-inspect
- Skopeo copy man page: https://www.mankier.com/1/skopeo-copy
- Buildah push man page: https://www.mankier.com/1/buildah-push
- Red Hat RHEL container registry configuration documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/building_running_and_managing_containers/using-podman-events-for-auditing_assembly_monitoring-containers

## Issues Found
- The mirror example used `docker.io` as the primary registry. Docker Hub has special `/library` normalization rules, which can make generic mirror examples misleading unless the prefix and location are chosen carefully. Changed the example to use `registry.example.com` so the mirror syntax demonstrates the intended TLS behavior without Docker Hub-specific caveats.
- The OpenSSL TLS verification probe did not pass SNI. Added `-servername dev-registry.local` so the check works correctly with registries behind virtual-hosted TLS endpoints.

## Review Notes
The core Podman guidance is accurate: `--tls-verify=false` is supported for pull, push, and login; `insecure = true` in `registries.conf` permits unencrypted HTTP and TLS with untrusted certificates; user-level registries configuration is supported; and `CONTAINERS_REGISTRIES_CONF` can override the registries.conf path. The Skopeo and Buildah flags shown are current.
