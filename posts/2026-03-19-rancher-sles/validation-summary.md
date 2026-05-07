# Validation Summary: How to Install Rancher on SLES (SUSE Linux Enterprise Server)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- SUSE Linux Enterprise Server 15 SP5
- Docker
- SUSEConnect
- firewalld
- AppArmor
- RKE2

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Port Requirements — https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher: Setting up the Bootstrap Password — https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher: Installation Requirements — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher: Advanced Options for Docker Installs — https://ranchermanager.docs.rancher.com/v2.14/reference-guides/single-node-rancher-in-docker/advanced-options
- SUSE: Registering SUSE Linux Enterprise and managing modules/extensions (SLES 15 SP5) — https://documentation.suse.com/sles/15-SP5/html/SLES-all/cha-register-sle.html
- SUSE: Modules and Extensions Quick Start (SLES 15 SP5) — https://documentation.suse.com/sles/15-SP5/single-html/SLES-modules/
- SUSE: Security and Hardening Guide, Regulations and Compliance (SLES 15 SP5) — https://documentation.suse.com/en-us/sles/15-SP5/html/SLES-all/part-compliance.html
- SUSE: Release Notes for SLES 15 SP5 — https://documentation.suse.com/releasenotes/legacy/sles/15-SP5/index.html
- SUSE: Support and Maintenance for Rancher Prime — https://www.suse.com/support/rancher-prime/
- SUSE: Rancher Manager Support Matrix — https://www.suse.com/suse-rancher/support-matrix
- RKE2: Introduction — https://documentation.suse.com/cloudnative/rke2/latest/en/introduction.html
- RKE2: FIPS 140-2 Enablement — https://documentation.suse.com/cloudnative/rke2/latest/en/security/fips_support.html
- Docker Docs: Configure logging drivers — https://docs.docker.com/engine/logging/configure/

## Issues Found
- The post treated Rancher's single-container Docker install as if it were appropriate for enterprise production use. I updated the description, introduction, high-availability note, and conclusion to reflect Rancher's official guidance that Docker installs are for development and testing only.
- The firewall section incorrectly opened inbound `6443/tcp` and enabled masquerading on the Rancher host. I removed those instructions and clarified that `6443/tcp` is an outbound requirement when Rancher connects to hosted or imported cluster API servers.
- The support section incorrectly implied that a SLES subscription includes Rancher support. I corrected this to distinguish SLES support from separate SUSE Rancher Prime support.
- The compliance section used outdated and inaccurate certification wording for SLES 15 SP5, including a blanket Common Criteria / FIPS claim and a FIPS 140-2 reference. I updated it to service-pack-specific FIPS 140-3 guidance and changed the verification command to `fips-mode-setup --check`.
- The RKE2 section described RKE2 as simply "FIPS 140-2 compliant." I revised this to the more accurate wording that RKE2 provides FIPS enablement.

## Review Notes
- Rancher's official Docker examples still use `rancher/rancher:latest`, but the current support matrix notes that `latest` tags are intended for community testing rather than production use.
- The remaining Docker, SUSEConnect, bootstrap-password, AppArmor, and logging examples are consistent with the cited documentation after the corrections above.
