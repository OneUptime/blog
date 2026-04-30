# Validation Summary: How to Install Harvester on Bare Metal

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Harvester
- Kubernetes
- RKE2
- Longhorn
- Rancher
- Bare-metal server installation
- Linux CLI tools (`wget`, `dd`, `kubectl`, `sha512sum`)

## Sources Consulted
- Harvester ISO Installation: https://docs.harvesterhci.io/v1.7/install/index/
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.7/install/requirements/
- Harvester Authentication: https://docs.harvesterhci.io/v1.7/authentication
- Harvester FAQ: https://docs.harvesterhci.io/v1.7/faq
- Harvester Rancher Integration: https://docs.harvesterhci.io/v1.7/rancher/rancher-integration/
- Harvester Monitoring: https://docs.harvesterhci.io/v1.6/monitoring/harvester-monitoring/
- Harvester Add-ons / configuration behavior: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester releases page: https://github.com/harvester/harvester/releases
- Harvester project README and release table: https://github.com/harvester/harvester

## Issues Found
- The post claimed to download the "latest stable" ISO but hard-coded `v1.3.0`, which is now EOL. I updated the example to use `HARVESTER_VERSION=v1.7.1`, the stable release listed by the project on 2026-04-30.
- The checksum example used the wrong asset name (`.iso.sha512`). Harvester publishes `harvester-<version>-amd64.sha512`, so I corrected the URL.
- The original `sha512sum -c` example would try to verify multiple release artifacts that were not downloaded. I changed it to verify only the ISO checksum line.
- The hardware requirements were incomplete for production use. I updated CPU, memory, storage, and networking guidance to match current Harvester development/testing vs production requirements.
- The network prerequisites implied DNS for the VIP was mandatory. I corrected this to require DNS servers for the nodes and make VIP DNS optional for name-based access.
- The firmware guidance said to disable Secure Boot, which is not the current installation guidance. I replaced it with the current recommendation to use UEFI boot mode because legacy BIOS boot is deprecated in Harvester v1.7 and later.
- The boot menu entry was labeled `Install Harvester`, but the current installer entry is `Harvester Installer`. I corrected the menu text.
- The storage section said Harvester automatically uses remaining disks for VM storage. Current installation flow explicitly distinguishes an installation disk and a data disk, with persistent partition sizing when reusing a single disk. I updated the explanation and example.
- The password section incorrectly said the installer sets the cluster `admin` password. Current Harvester sets the node `rancher` password during install and prompts for the `admin` password on first UI login. I corrected both the setup step and the UI login step.
- The base OS reference to `openSUSE Leap Micro` was outdated. I corrected it to SUSE Linux Micro.
- The `kubectl` examples assumed direct access to `/etc/rancher/rke2/rke2.yaml` without privilege escalation. I changed them to explicit `sudo kubectl --kubeconfig ...` commands so the examples are self-contained.
- The post-installation guidance said to install Rancher "on top of Harvester" and described monitoring as a built-in stack. I updated this to current Rancher integration wording and to enabling the `rancher-monitoring` add-on when needed.

## Review Notes
- The example release in the post is version-sensitive. As of 2026-04-30, Harvester `v1.7.1` was listed by the project as the current stable release, while `v1.8.0` was the newest release.
- Legacy BIOS boot is deprecated in Harvester `v1.7` and later, so future revisions of this post should continue to prefer UEFI-first guidance.
- Monitoring behavior is version-sensitive. Since Harvester `v1.2.0`, monitoring has been add-on based rather than something readers should assume is enabled by default on new installations.
