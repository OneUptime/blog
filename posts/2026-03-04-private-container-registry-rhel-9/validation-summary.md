# Validation Summary: How to Set Up a Private Container Registry on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Podman Quadlet systemd units
- CNCF Distribution / Docker Registry v2
- TLS certificates with OpenSSL
- htpasswd basic authentication
- RHEL system trust store
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers, including Quadlet search paths and Podman/systemd integration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Podman Quadlet documentation for `.container` units, `PublishPort=`, `Volume=`, and generated services: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- CNCF Distribution registry configuration documentation for TLS, htpasswd authentication, delete configuration, and environment overrides: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution garbage collection documentation: https://distribution.github.io/distribution/about/garbage-collection/
- Red Hat Enterprise Linux 9 documentation: Using shared system certificates and `update-ca-trust extract`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks
- Red Hat Quay documentation for Podman trust paths under `/etc/containers/certs.d/<registry>/ca.crt`: https://docs.redhat.com/en/documentation/red_hat_quay/
- systemd.exec documentation for quoting `Environment=` values containing spaces: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Local OpenSSL version check: `openssl version`

## Issues Found
- The OpenSSL certificate generation command wrote into `/opt/registry/certs`, which was created with `sudo`; changed the command to run `openssl` with `sudo` so it can write the key and certificate.
- The `sudo cat > ...` redirection examples would fail because the shell redirection is not performed by `sudo`; changed them to `sudo tee ... > /dev/null`.
- The Quadlet `Environment=` line for `REGISTRY_AUTH_HTPASSWD_REALM=Private Registry` contained a space without quoting the full assignment; updated it to systemd-compatible quoting.
- The systemd service instructions started the Quadlet while the earlier manually launched registry container would still be running on port 5000; added `podman stop` and `podman rm` before enabling the service.
- The RHEL system trust store command should use `update-ca-trust extract`; updated the client-machine command accordingly.
- The registry catalog examples used `admin:password`, which could be mistaken for the literal password; changed it to `admin:your-password`.
- The "Configuring Storage Quotas" section did not configure quotas, because CNCF Distribution's shown settings configure filesystem storage and enable deletion; renamed the section and adjusted the introductory sentence.

## Review Notes
- Podman was not installed in the review workspace, so Podman commands were validated against Red Hat and upstream Podman documentation rather than local CLI help.
- The registry image's htpasswd backend supports bcrypt-formatted htpasswd entries, and the post uses `htpasswd -B`, which matches the registry documentation.
- Garbage collection guidance correctly notes that the registry must be stopped or in read-only mode before running garbage collection.
