# Validation Summary: How to Use Podman on IBM Z (s390x)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- IBM Z / Linux on IBM Z / s390x
- OCI container images
- RHEL 8 and RHEL 9 container tools
- Ubuntu package-based Podman installation
- SUSE Linux Enterprise Server container tooling
- Skopeo
- Buildah
- Quadlet / systemd integration
- Prometheus node_exporter
- IBM Cloud Container Registry

## Sources Consulted
- Podman `info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman Quadlet / systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman manifest push documentation: https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Red Hat Enterprise Linux 9 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Enterprise Linux 8 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Ubuntu package information for Podman on s390x: https://packages.ubuntu.com/podman
- SUSE Container Guide: https://documentation.suse.com/en-us/container/all/html/Container-guide/index.html
- IBM Cloud Container Registry public image documentation: https://cloud.ibm.com/docs/Registry?topic=Registry-public_images
- IBM documentation for OpenSSL acceleration on IBM Z: https://www.ibm.com/docs/en/linux-on-systems?topic=linuxone-openssl-ibmz
- IBM documentation for `lszcrypt`: https://www.ibm.com/docs/en/linux-on-systems?topic=commands-lszcrypt
- IBM documentation for Secure Execution: https://www.ibm.com/docs/en/linux-on-systems?topic=ki-secure-execution
- Prometheus node_exporter documentation: https://github.com/prometheus/node_exporter

## Issues Found
- The RHEL install steps did not follow Red Hat's documented current install path. I changed RHEL 9 to `dnf install -y container-tools` and RHEL 8 to `dnf module install -y container-tools` to match Red Hat documentation.
- The IBM Cloud Container Registry example used anonymous `podman pull` commands for `icr.io/ibmz/...` images, which did not validate and returned an authorization error during review. I replaced that with IBM's documented `ibmcloud` CLI flow for discovering IBM-published images.
- The crypto acceleration section incorrectly implied that OpenSSL acceleration on IBM Z required passing `/dev/z90crypt` into the container. IBM documents that supported OpenSSL algorithms use CPACF automatically, so I removed the misleading device mapping and replaced it with a runnable benchmark example.
- The original crypto benchmark used `ubuntu:24.04` as if `openssl` were already present in the image. It is not, so I updated the command to install `openssl` before running the benchmark.
- The Quadlet example used `systemctl --user enable --now` on a generated Quadlet service. Podman documents that these units are transient and not enabled with `systemctl enable`; I changed the command to `systemctl --user start enterprise-api.service`.
- The monitoring section described the node_exporter example as exporting container metrics, but the example is for host metrics. I corrected the wording and aligned the command with the node_exporter project's documented containerized deployment pattern, including the official `quay.io/prometheus/node-exporter:latest` image reference.
- The FIPS section specifically referenced FIPS 140-2, which is outdated wording. I changed it to the technically safer and current phrasing of running Linux in FIPS mode.

## Review Notes
- The image tags in the examples are valid, but several are version-pinned and will age over time. Future reviews should re-check tag availability and `s390x` manifest coverage.
- The IBM Cloud Container Registry example assumes the IBM Cloud CLI and Container Registry plugin are already installed.
