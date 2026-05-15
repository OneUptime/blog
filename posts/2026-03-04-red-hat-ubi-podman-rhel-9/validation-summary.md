# Validation Summary: How to Use Red Hat Universal Base Images (UBI) with Podman on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Universal Base Images
- Podman
- Containerfile builds
- DNF and microdnf
- Skopeo
- systemd in containers

## Sources Consulted
- Red Hat Enterprise Linux 9: Building, running, and managing containers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/
- Red Hat UBI images, repositories, packages, and source code - https://access.redhat.com/articles/4238681
- Red Hat Ecosystem Catalog: UBI 9 standard - https://catalog.redhat.com/en/software/containers/ubi9/ubi/615bcf606feffc5384e8452e
- Red Hat Ecosystem Catalog: UBI 9 minimal - https://catalog.redhat.com/en/software/containers/ubi9/ubi-minimal/615bd9b4075b022acc111bf5
- Red Hat Ecosystem Catalog: UBI 9 micro - https://catalog.redhat.com/en/software/containers/ubi9-micro/61832b36dd607bfc82e66399
- Red Hat Ecosystem Catalog: UBI 9 init - https://catalog.redhat.com/en/software/containers/ubi9-init/6183297540a2d8e95c82e8bd
- Red Hat Ecosystem Catalog: Python 3.11 for UBI 9 - https://catalog.redhat.com/en/software/containers/ubi9/python-311/63f764b03f0b02a2e2d63fff
- Red Hat Ecosystem Catalog: Node.js 22 for UBI 9 - https://catalog.redhat.com/en/software/containers/ubi9/nodejs-22/66431d1785c5c3a31edd24f1
- Red Hat Ecosystem Catalog: Go Toolset for UBI 9 - https://catalog.redhat.com/en/software/containers/ubi9/go-toolset/61e5c00b4ec9945c18787690
- Podman documentation - https://docs.podman.io/

## Issues Found
- Corrected the introductory subscription claim. UBI repositories are available without a subscription, but subscribed RHEL hosts provide access to entitled RHEL repositories rather than an unrestricted "full RHEL package set."
- Updated UBI 9.7 image sizes to match the current Red Hat Ecosystem Catalog and labeled them as approximate uncompressed sizes.
- Corrected the UBI micro multi-stage Containerfile to use uppercase `AS` and a safer DNF `--installroot` command form with `--releasever=/`.
- Replaced the invalid `sshd` package install with `openssh-server`; the enabled service remains `sshd`.
- Removed the claim that the shown `podman run` command used special flags for systemd, because the example did not include any.
- Corrected the RHEL 9 UBI repository IDs to `ubi-9-baseos-rpms` and `ubi-9-appstream-rpms`.
- Clarified how subscribed RHEL host entitlement data is exposed to standard UBI containers.
- Replaced deprecated `ubi9/nodejs-18` with current generally available `ubi9/nodejs-22`.
- Replaced the minimal-image `microdnf updateinfo list` advisory example with a standard UBI `dnf updateinfo list` example.
- Replaced the outdated pinned UBI 9.3 tag with a current UBI 9.7 tag.
- Updated the Mermaid comparison sizes to match the corrected table.

## Review Notes
Podman was not installed in the local environment, so CLI verification used official Red Hat and Podman documentation rather than local `podman --help` output.
