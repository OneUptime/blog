# Validation Summary: How to Install Harvester with USB Boot

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Harvester
- USB boot media creation
- Linux `dd`, `lsblk`, `sha512sum`, `smartctl`, and `wipefs`
- macOS `diskutil` and `dd`
- Rufus on Windows
- RKE2 / Kubernetes
- Longhorn
- BIOS/UEFI server boot configuration

## Sources Consulted
- Harvester ISO Installation (v1.7): https://docs.harvesterhci.io/v1.7/install/index/
- Harvester USB Installation (v1.7): https://docs.harvesterhci.io/v1.7/install/usb-install/
- Harvester Hardware and Network Requirements (v1.7): https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester Management Address (v1.7): https://docs.harvesterhci.io/v1.7/install/management-address/
- Harvester Post-installation Steps (v1.7): https://docs.harvesterhci.io/v1.7/install/post-install/
- Harvester releases page: https://github.com/harvester/harvester/releases
- Harvester v1.7.1 checksum manifest: https://releases.rancher.com/harvester/v1.7.1/harvester-v1.7.1-amd64.sha512

## Issues Found
- The post described `v1.3.0` as the release to download even though Harvester `v1.3.x` is EOL. I updated the examples to `v1.7.1`, which is on a current supported stable branch and matches the maintained interactive install documentation.
- The checksum URL used `harvester-...-amd64.iso.sha512`, but Harvester publishes `harvester-...-amd64.sha512`. I corrected the download URL.
- The checksum verification command used `sha512sum -c` against the whole manifest. The published `.sha512` file contains hashes for multiple artifacts, so that command would fail unless all artifacts were present. I changed it to verify only the ISO entry.
- The installer flow incorrectly claimed that both an admin UI password and an SSH password are set during installation. Harvester’s installer sets one node password for the default SSH user `rancher`, while the `admin` UI password is set on first login. I corrected both the installer step and the post-install access section.
- The boot menu label was written as `Install Harvester`, but the official docs refer to the boot option as `Harvester Installer`. I corrected the label.
- The prerequisites implied that extra VM storage disks are required. Harvester recommends a separate data disk, but it is not mandatory for every installation. I changed that wording.
- The installation summary included version-specific internal details that were not accurate as written for the corrected release line, including the explicit base OS claim and exact partition description. I simplified that summary to match the documented install behavior.
- The BIOS and Rufus guidance treated legacy BIOS as a normal target. Current Harvester docs deprecate legacy BIOS booting for new installs, so I aligned the guidance to UEFI/GPT.

## Review Notes
- The remaining commands and paths in the post are technically valid for a Harvester management node, including the use of `/etc/rancher/rke2/rke2.yaml` for kubeconfig-based verification.
- Future version bumps should keep the selective checksum-verification pattern unless the structure of Harvester’s published `.sha512` manifest changes.
