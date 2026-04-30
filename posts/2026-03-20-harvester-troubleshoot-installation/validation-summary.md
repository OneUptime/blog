# Validation Summary: How to Troubleshoot Harvester Installation Issues - Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- RKE2
- Kubernetes
- Longhorn
- Linux system administration
- Linux storage and networking tools

## Sources Consulted
- Harvester Troubleshooting: Installation - https://docs.harvesterhci.io/v1.5/troubleshooting/index/
- Harvester Troubleshooting: Operating System - https://docs.harvesterhci.io/v1.5/troubleshooting/os/
- Harvester ISO Installation - https://docs.harvesterhci.io/v1.7/install/index/
- Harvester USB Installation - https://docs.harvesterhci.io/v1.5/install/usb-install/
- Harvester Hardware and Network Requirements - https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester Configuration - https://docs.harvesterhci.io/v1.5/install/harvester-configuration/
- RKE2 High Availability - https://docs.rke2.io/install/ha
- RKE2 Requirements - https://docs.rke2.io/install/requirements
- RKE2 Certificate Management - https://docs.rke2.io/security/certificates
- RKE2 Token Management - https://docs.rke2.io/security/token
- Longhorn Installation Requirements - https://longhorn.io/docs/latest/deploy/install/
- Kubernetes kubectl Quick Reference - https://kubernetes.io/docs/reference/kubectl/quick-reference

## Issues Found
- The post said to press `Ctrl+C` or `Alt+F2` to get an installer shell. Harvester documents `Ctrl+Alt+F2` for logging into the live installer shell, so both references were corrected.
- The network troubleshooting example used `eth0` and `dhclient`, which are not Harvester-specific assumptions. I changed the commands to use a generic `<interface>` placeholder and added an `ip route` check because Harvester documents missing default routes as a common installer failure cause.
- The `nomodeset` guidance was incorrectly tied to RAID controllers. Harvester documents `nomodeset` as a display/graphics-related workaround, so that explanation was corrected.
- The RKE2 certificate troubleshooting step deleted `/var/lib/rancher/rke2/server/tls`. RKE2 explicitly warns against overwriting in-use TLS material, so I replaced it with the supported `rke2 certificate rotate` workflow after fixing time synchronization.
- The node-join section used RKE2 token paths and `/healthz` checks that do not match Harvester's documented installation troubleshooting flow. I updated it to use `rancherd` logs, `/etc/rancher/rancherd/config.yaml` token checks, and `curl -fk https://<VIP>/version`.
- The firewall guidance was incomplete for Harvester node-to-node traffic and the MTU claim that the underlay "must be at least 1550" was too absolute. I aligned the port guidance with Harvester/RKE2 requirements and changed the MTU note to a generic mismatch check.
- The Longhorn section suggested `zypper install open-iscsi` directly on a Harvester node. Because Harvester uses an immutable OS, I removed the direct install step and kept the package presence check plus `iscsid` service verification.
- The general debug bundle command used `tar` with process substitution, which archives `/dev/fd/*` references instead of the intended command output. I replaced it with Harvester's official `supportconfig -k -c` command and kept a separate Kubernetes events command, updated to sort by `.metadata.creationTimestamp` per current Kubernetes docs.

## Review Notes
- The example ISO filename `harvester-v1.3.0-amd64.iso` is acceptable as an example, but Harvester installation guidance has evolved since v1.3 and newer releases deprecate legacy BIOS booting in favor of UEFI.
- Harvester's troubleshooting and OS guidance are version-sensitive. The corrected commands are valid for current documented Harvester/RKE2 behavior as of April 30, 2026.
