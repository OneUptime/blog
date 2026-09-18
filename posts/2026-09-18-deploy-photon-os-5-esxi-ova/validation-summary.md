# Validation Summary: How to Deploy Photon OS 5 on ESXi from an OVA

## Status
validated

## Post Type
Technical deployment guide with guest verification and package-management commands.

## Technologies Covered
- Photon OS 5 and its OVA images
- VMware ESXi, ESXi Host Client, vCenter, and vSphere
- Linux networking, DHCP, DNS, and name-service resolution
- systemd, systemctl, networkctl, and resolvectl
- TDNF, RPM, and Photon package repositories
- Docker Engine
- SHA-512 checksums and TLS certificate validity

## Sources Consulted
- [Photon OS download wiki, official raw content](https://raw.githubusercontent.com/wiki/vmware/photon/Downloading-Photon-OS.md): Photon OS 5 GA OVA architectures, virtual hardware, firmware, and SHA-512 checksums. The rendered GitHub page timed out; its raw wiki content was accessible.
- [Photon OS 5 OVA installation guide](https://vmware.github.io/photon/docs-v5/installation-guide/run-photon-on-vsphere/importing-photon-os-from-ova-on-vsphere/): import workflow, storage provisioning, automatic startup, and initial password change.
- [Broadcom vSphere OVF deployment specification](https://developer.broadcom.com/xapis/vsphere-automation-api/latest/data-structures/Vcenter%20Ovfs%20DeploySpec/): deployment parameters and optional power-on behavior.
- [Broadcom vCenter migration guidance](https://knowledge.broadcom.com/external/article/429739/cross-vcenter-vmotion-fails-with-error-v.html): Deploy OVF Template on the destination cluster.
- [GNU SHA-2 utilities](https://www.gnu.org/s/coreutils/manual/html_node/sha2-utilities.html) and [Perl shasum documentation](https://perldoc.perl.org/shasum): checksum algorithms and command options.
- [Photon repository migration notice, official raw content](https://raw.githubusercontent.com/wiki/vmware/photon/changes-to-repository-location-in-photon.md): migration to packages-prod.broadcom.com through photon-repos updates. The rendered GitHub page timed out; the raw content was accessible.
- [Photon OS 5 TDNF commands](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/) and [repository configuration](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/configuration-files-and-repositories/): repolist, check-update, update, install, and repository file locations.
- [Photon OS 5 DNS configuration](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/adding-a-dns-server/): systemd-resolved and network configuration.
- Upstream manual pages hosted by man7.org: [os-release](https://man7.org/linux/man-pages/man5/os-release.5.html), [systemctl](https://man7.org/linux/man-pages/man1/systemctl.1.html), [networkctl](https://man7.org/linux/man-pages/man1/networkctl.1.html), [resolvectl](https://man7.org/linux/man-pages/man1/resolvectl.1.html), [ip](https://man7.org/linux/man-pages/man8/ip.8.html), and [getent](https://man7.org/linux/man-pages/man1/getent.1.html). Direct freedesktop.org manual requests were blocked; the upstream manual mirrors were accessible.
- [RPM command reference](https://rpm.org/docs/4.20.x/man/rpm.8): installed-package queries.
- [Photon OS 5 Docker guidance](https://vmware.github.io/photon/docs-v5/administration-guide/containers/docker-containers/), [Docker version](https://docs.docker.com/reference/cli/docker/version/), and [Docker info](https://docs.docker.com/reference/cli/docker/system/info/): package/service handling and client/daemon inspection.
- [RFC 5280](https://www.rfc-editor.org/rfc/rfc5280.html), sections 4.1.2.5 and 6.1.3: certificate validity periods and time-dependent validation.
- [Photon OS 5 clone identity guidance](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/clearing-the-machine-id-of-a-cloned-instance-for-dhcp/): machine identity and DHCP behavior after cloning.

## Issues Found
1. **Checksum algorithm mismatch.** The linked Photon OS 5 GA downloads publish SHA-512 digests, while the post instructed readers to calculate SHA-256. Replaced `sha256sum` with `sha512sum` and `shasum -a 256` with `shasum -a 512`, and named the digest algorithm explicitly. Different algorithms cannot produce comparable checksums.
2. **Pre-boot inspection could be bypassed by automatic startup.** The deployment flow can power on the VM when import completes. Added an instruction to disable automatic power-on in the wizard when offered, preserving the intended inspection before the first boot.
3. **Name-service resolution was described as proof of DNS resolution.** `getent hosts` uses configured name-service sources and can succeed through `/etc/hosts`. Corrected the explanation so success is not treated as proof that DNS or HTTPS works.
4. **Docker installation appeared after commands that require it.** The original sequence tried to enable Docker and run its CLI before explaining what to do if the package was absent. Made the RPM query and conditional `tdnf install docker` instruction precede service enablement and CLI checks. Existing installations remain supported without an unnecessary install.

## Review Notes
- Reviewed all command blocks and inline commands for their documented purpose and syntax. Parsed all Bash blocks with `bash -n`; this checks syntax, not behavior inside a Photon guest.
- No ESXi host or running Photon OS 5 VM was available for a live deployment test. OVA import, package downloads, actual network connectivity, Docker execution, reboot persistence, monitoring, and backup recovery were not executed.
- The download wiki still contains legacy packages.vmware.com binary links. Verified the wiki's image metadata and checksum guidance, but did not download or hash an OVA. Operators must confirm the selected artifact is retrievable and use the checksum for that exact filename.
- The repository migration notice confirms the Broadcom hostname and photon-repos migration mechanism. It documents `tdnf update --refresh grep sed photon-repos`; whether an older image can bootstrap that update depends on its existing repository connectivity.
- Interface names, firmware compatibility, resource sizing, initial access, and service availability depend on the selected image and destination host. The post appropriately calls for checking the actual deployment instead of prescribing universal values.
- The guide remains scoped to Photon OS 5; no claim that it is the newest Photon release was added. No sections or unrelated stylistic changes were made to the post.
