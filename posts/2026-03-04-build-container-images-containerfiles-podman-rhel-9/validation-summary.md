# Validation Summary: How to Build Container Images Using Containerfiles with Podman on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Containerfile/Dockerfile syntax
- Universal Base Images (UBI)
- OpenSCAP container image scanning
- Linux container image builds

## Sources Consulted
- Podman build official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman images official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Red Hat Enterprise Linux 9 building, running, and managing containers documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Enterprise Linux 9 security hardening documentation for OpenSCAP container image scanning: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening

## Issues Found
- The ENTRYPOINT vs CMD example used `/usr/bin/python3` on `ubi-minimal` without installing Python. Added a `microdnf install -y python3` step so the image can run as described.
- The `--squash` comment said it squashes all layers into one. Podman documents `--squash` as squashing the image's new layers, not preexisting base-image layers. Updated the comment.
- The resource-limited build example used `--cpus 2`, which is not a documented `podman build` option. Replaced it with documented `--cpu-period` and `--cpu-quota` flags.
- The image scanning example used `podman image scan`, which is not a current built-in Podman image subcommand. Replaced it with the RHEL-documented OpenSCAP workflow using `oscap-podman` and RHEL 9 OVAL data.

## Review Notes
- Podman was not installed in the review workspace, so CLI verification was performed against official Podman and Red Hat documentation rather than local `--help` output.
- The post uses `registry.access.redhat.com` UBI references, which remain plausible for unauthenticated UBI pulls. Red Hat documentation also commonly shows `registry.redhat.io` for authenticated registry access.
