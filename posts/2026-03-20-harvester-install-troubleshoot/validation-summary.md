# Validation Summary: How to Troubleshoot Harvester Installation Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- RKE2
- Longhorn
- Kubernetes
- `kubectl`
- `journalctl`
- `supportconfig`
- `yq`

## Sources Consulted
- Harvester Troubleshooting: https://docs.harvesterhci.io/v1.7/troubleshooting/index/
- Harvester ISO Installation: https://docs.harvesterhci.io/v1.7/install/index/
- Harvester Harvester Configuration: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Management Address: https://docs.harvesterhci.io/v1.7/install/management-address/
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.7/install/requirements/
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Token Management: https://docs.rke2.io/security/token
- RKE2 Logging: https://docs.rke2.io/reference/logging
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- Longhorn Quick Start (`wipefs` guidance for disks with existing filesystems or partition tables): https://longhorn.io/docs/latest/v2-data-engine/quick-start/

## Issues Found
- The installation log section referenced generic `journalctl` output and `/var/log/cloud-init-output.log`, which are not the installer-focused locations Harvester currently documents. I replaced those with `/var/log/console.log`, `/run/cos/target/rke2.log`, and the documented `supportconfig -k -c` workflow.
- The "Starting Services" troubleshooting section blamed interface naming and pointed readers to `/etc/rancher/rke2/config.yaml` and a non-documented `harvester-config` command. I changed it to Harvester's documented default-route troubleshooting flow using `ip route` and `/run/cos/target/rke2.log`, along with the DHCP `option routers` fix.
- The node-join section used the RKE2 `node-token` path and a `curl` probe against `https://<first-node-ip>:9345/ping`. For Harvester node joins, current documentation uses the cluster VIP on `https://cluster-VIP:443` and the cluster token stored in `/etc/rancher/rancherd/config.yaml`, so I updated the commands accordingly.
- The WebUI troubleshooting section checked generic ingress resources rather than Harvester's documented management VIP resources. I replaced it with checks against the `ingress-expose` service, the `vipHost` annotation, `mgmt-br`, and the documented `curl -fk https://<VIP>/version` API probe.
- The "Not Ready" section used `/var/lib/rancher/rke2/bin/etcdctl`. Current RKE2 CLI documentation only documents shipped host-side tools such as `kubectl`, `ctr`, and `crictl`, so I replaced the undocumented `etcdctl` check with documented RKE2 log inspection plus Harvester's official VIP/API readiness check.
- The BIOS/UEFI section claimed Secure Boot must be disabled and that RAID must be in AHCI or pass-through mode. Current Harvester requirements instead document hardware-assisted virtualization, UEFI as the recommended boot mode with legacy BIOS deprecated starting in v1.7.0, unique `product_uuid` values, and support for local disks or hardware RAID. I rewrote that list to match the current requirements.
- The support-bundle section said `Support > Download Support Bundle`, but current Harvester documentation uses `Support > Generate Support Bundle`. I corrected that wording.
- The best-practices section pointed readers to a Harvester compatibility list for NIC and storage controller models. Current documentation instead emphasizes YES-certified hardware for SUSE Linux Micro, so I updated the guidance to match the official requirements page.

## Review Notes
- `wipefs -a /dev/sdb` is technically valid for clearing a disk before Longhorn reuses it, but it is destructive and should only be used when the operator intentionally wants to erase that disk.
- The post does not pin a Harvester release, so the firmware guidance now reflects the current stable documentation as of April 30, 2026, including the v1.7.0 legacy BIOS deprecation note.
- Several commands assume they are being run on a Harvester management node or from a system with the Harvester kubeconfig already configured for `kubectl`.
