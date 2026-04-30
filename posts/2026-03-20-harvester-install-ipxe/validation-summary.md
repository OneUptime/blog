# Validation Summary: How to Install Harvester with iPXE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harvester
- iPXE
- PXE boot
- dnsmasq
- tftpd-hpa
- DHCP
- HTTP boot file serving

## Sources Consulted
- Harvester v1.3 PXE Boot Installation: https://docs.harvesterhci.io/v1.3/install/pxe-boot-install/
- Harvester v1.3 Configuration Reference: https://docs.harvesterhci.io/v1.3/install/harvester-configuration
- Harvester v1.3 Authentication: https://docs.harvesterhci.io/v1.3/authentication/
- Harvester v1.5 PXE Boot Installation, including the UEFI `initrd=` requirement: https://docs.harvesterhci.io/v1.5/install/pxe-boot-install/
- iPXE DHCP user-class documentation: https://ipxe.org/cfg/user-class
- iPXE platform and DHCP architecture detection notes: https://ipxe.org/cfg/platform
- iPXE image download and kernel command references: https://ipxe.org/cmd/imgfetch and https://ipxe.org/cmd/kernel
- Ubuntu dnsmasq man page: https://manpages.ubuntu.com/manpages/jammy/man8/dnsmasq.8.html
- Ubuntu Server netboot documentation for `tftpd-hpa` and `/srv/tftp`: https://ubuntu.com/server/docs/how-to/installation/netboot-the-server-installer-via-uefi-pxe-on-arm-aarch64-arm64-and-x86-64-amd64/
- Debian `ipxe` package file list for `undionly.kpxe` and `ipxe.efi`: https://packages.debian.org/bullseye/all/ipxe/filelist
- Harvester release artifact: https://releases.rancher.com/harvester/v1.3.0/harvester-v1.3.0-amd64.iso
- Harvester release artifact: https://releases.rancher.com/harvester/v1.3.0/harvester-v1.3.0-vmlinuz-amd64
- Harvester release artifact: https://releases.rancher.com/harvester/v1.3.0/harvester-v1.3.0-initrd-amd64
- Harvester release artifact: https://releases.rancher.com/harvester/v1.3.0/harvester-v1.3.0-rootfs-amd64.squashfs

## Issues Found
- The DHCP pool overlapped with the Harvester VIP (`192.168.1.100`). I moved the `dnsmasq` range to start at `192.168.1.110` so the VIP remains free, which Harvester requires.
- The `dnsmasq` example did not identify iPXE clients before redirecting them to the HTTP script. I added `dhcp-userclass=set:ipxe,iPXE` and explicit BIOS/UEFI matching so the chainload logic works as described.
- The `dnsmasq` example enabled its built-in TFTP server even though the post separately configured `tftpd-hpa`. I removed the `enable-tftp` and `tftp-root` lines to avoid a port 69 conflict and kept `tftpd-hpa` as the TFTP server.
- The `tftpd-hpa` example copied boot files into `/var/lib/tftpboot` without configuring that as the TFTP root. I changed the example to use `/srv/tftp`, which matches Ubuntu’s documented example path.
- The iPXE script omitted the `initrd=` kernel argument, which Harvester documents as required for UEFI boot. I added `initrd=harvester-${harvester_version}-initrd-amd64`.
- The Harvester configuration example used an incorrect schema with top-level `network` and `harvester` sections and misplaced fields like `mode`, `token`, `vip`, and `management_interface`. I rewrote it to use the documented `token`, `os`, and `install` structure for Harvester v1.3.
- The post claimed the configuration file set the Harvester UI admin password. Harvester v1.3 prompts for the default `admin` password on first login, so I removed that incorrect setting from the install config example.
- The join-node example used the wrong schema and was missing fields required for PXE/kernel-based installs, including the top-level `server_url` and `install.iso_url`. I corrected the schema and added a note that joining nodes need a separate iPXE script or DHCP rule pointing `harvester.install.config_url` at `config-join.yaml`.
- The `tcpdump` troubleshooting command placed `-n` after the filter expression. I corrected it to `tcpdump -ni eth0 'port 67 or port 68'`.
- The prerequisites omitted Harvester’s documented requirement for at least 8 GiB of RAM during PXE installation. I added that requirement.

## Review Notes
- Harvester `v1.3.0` is EOL as of April 30, 2026. The article is still technically usable after the fixes above, but readers should expect newer Harvester versions to have updated documentation and potentially different recommended examples.
