# Validation Summary: How to Troubleshoot Specified Install Disk Does Not Exist in Talos

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos machine configuration
- Talos install disk configuration and disk selectors
- Talos system extensions and imager
- Linux block device naming
- Proxmox/KVM, VMware, AWS EC2, and bare metal storage

## Sources Consulted
- Talos v1.7 Getting Started: Modifying the machine configs - https://docs.siderolabs.com/talos/v1.7/getting-started/getting-started
- Talos v1.7 talosctl CLI reference - https://docs.siderolabs.com/talos/v1.7/reference/cli
- Talos latest configuration reference: `machine.install` and `diskSelector` - https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos latest CLI reference: `talosctl apply-config` and config patches - https://www.talos.dev/latest/reference/cli/
- Talos latest insecure flag guide - https://www.talos.dev/v1.10/talos-guides/configuration/insecure/
- Talos v1.9 What's New: disk command changes and `get blockdevices` - https://docs.siderolabs.com/talos/v1.9/getting-started/what%27s-new-in-talos
- Talos Disk Management: listing disks with `talosctl get disks` - https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos System Extensions guide - https://www.talos.dev/v1.9/talos-guides/configuration/system-extensions/
- Talos Boot Assets guide - https://www.talos.dev/latest/talos-guides/install/boot-assets/
- Sidero Labs extensions repository - https://github.com/siderolabs/extensions
- Amazon EBS NVMe documentation - https://docs.aws.amazon.com/ebs/latest/userguide/nvme-ebs-volumes.html

## Issues Found
- The diagnostic example for `talosctl get disks` used an incomplete table that did not match current Talos disk resource output. Updated the sample columns to match the documented `NODE`, `NAMESPACE`, `TYPE`, `ID`, `SIZE`, `READ ONLY`, `TRANSPORT`, `ROTATIONAL`, `MODEL`, and related fields.
- The post said `--insecure` is needed because TLS is not configured yet. Talos maintenance mode still uses TLS, but without normal PKI authentication. Updated the wording to say PKI/authentication is not configured yet.
- The post presented `talosctl get blockdevices` without a version caveat. Added that it applies to Talos 1.9 and newer, matching the Talos documentation that introduced `get blockdevices` as a replacement path for disk inspection.
- The missing-driver section implied that adding a system extension is enough in all cases. Clarified that missing boot-time disk detection may require boot media or an installer image that already includes the needed driver or storage-related extension.
- The system-extension guidance did not mention matching extension versions to the Talos release. Added that caveat because Sidero Labs publishes extension images per compatible Talos version.

## Review Notes
The post remains technically valid as a Talos troubleshooting guide. It uses a Talos v1.7 installer image in examples, while some commands reflect newer Talos behavior; the added caveats make those differences explicit without restructuring the article.
