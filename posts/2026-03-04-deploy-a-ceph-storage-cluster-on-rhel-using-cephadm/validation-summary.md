# Validation Summary: How to Deploy a Ceph Storage Cluster on RHEL Using cephadm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Ceph Storage
- Ceph
- cephadm
- Ceph Orchestrator CLI
- firewalld
- Podman
- Chrony

## Sources Consulted
- Red Hat Ceph Storage 9 Installation Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/9/html-single/installation_guide/index
- Red Hat Ceph Storage 9 Installation Guide PDF: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/9/pdf/installation_guide/Red_Hat_Ceph_Storage-9-Installation_Guide-en-US.pdf
- Ceph upstream cephadm deployment documentation: https://docs.ceph.com/en/latest/cephadm/install/
- Ceph upstream cephadm host management documentation: https://docs.ceph.com/en/latest/cephadm/host-management/
- Ceph upstream OSD service documentation: https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph upstream network configuration reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/

## Issues Found
- The prerequisites said only "RHEL 9 with a valid subscription." Current Red Hat Ceph Storage 9 documentation is specific to supported RHEL minor releases and requires access to Red Hat Ceph Storage content, so this was changed to RHEL 9.6 or 9.7 with the appropriate Red Hat subscription and content access.
- The prerequisites required passwordless SSH between the admin node and all cluster nodes. For this direct cephadm flow, the cluster SSH key is generated during bootstrap and copied to additional hosts before adding them, so the prerequisite was corrected to SSH being installed and running with root-level access.
- The install step used `dnf install -y cephadm` without enabling the required RHEL and Red Hat Ceph Storage repositories. Repository enablement commands were added, and `ceph-common`, `podman`, `lvm2`, and `chrony` were included so the later CLI commands and host preparation steps work.
- The bootstrap command omitted Red Hat registry authentication required for Red Hat Ceph Storage container images. The `--registry-url`, `--registry-username`, `--registry-password`, and `--yes-i-know` options were added.
- The firewall example opened ports `6800-7300/tcp`, but current Ceph documentation recommends opening the full `6800-7568/tcp` range for OSD, MDS, and manager daemons. The firewall command was updated.

## Review Notes
The post remains a concise manual cephadm workflow. Red Hat's documented installation flow also recommends `cephadm-ansible` preflight automation and using `--registry-json` to avoid exposing registry credentials in shell history; those are good future improvements but were not added to avoid restructuring the article.
