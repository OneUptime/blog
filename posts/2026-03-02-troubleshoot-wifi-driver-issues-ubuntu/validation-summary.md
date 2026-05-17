# Validation Summary: How to Troubleshoot WiFi Driver Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ubuntu Linux (apt package management)
- Linux kernel WiFi drivers (iwlwifi, ath9k/10k/11k, rtlwifi, brcmfmac, mt76)
- `linux-firmware` package
- `lspci`, `lsusb`, `lsmod`, `lshw`, `dmesg`, `modinfo`, `modprobe`
- `iw`, `iwconfig`, `rfkill`, `ip`, `wpa_supplicant`
- NetworkManager (powersave configuration)
- Out-of-tree DKMS drivers (rtl8812au, rtl8821ce)
- Broadcom proprietary driver (`bcmwl-kernel-source` / `broadcom-sta-dkms`)
- `udev` rules, `/etc/modprobe.d` configuration
- `ubuntu-drivers` utility

## Sources Consulted
- Ubuntu Noble `linux-firmware` package: https://www.ubuntuupdates.org/package/core/noble/main/updates/linux-firmware
- Debian `firmware-iwlwifi` package: https://packages.debian.org/trixie/firmware-iwlwifi
- Debian `firmware-brcm80211` package: https://packages.debian.org/unstable/firmware-brcm80211
- kernel.org ath9k bugs wiki: https://wireless.wiki.kernel.org/en/users/drivers/ath9k/bugs
- kernel.org ASPM documentation: https://wireless.docs.kernel.org/en/latest/en/users/documentation/aspm.html
- iwlwifi module parameters source: https://github.com/torvalds/linux/blob/master/drivers/net/wireless/intel/iwlwifi/iwl-modparams.h
- Gentoo iwlwifi wiki: https://wiki.gentoo.org/wiki/Iwlwifi
- Ubuntu Core NetworkManager `wifi.powersave`: https://documentation.ubuntu.com/core/explanation/system-snaps/network-manager/how-to-guides/configure-the-snap/wifi-powersave/
- Ubuntu Jammy `bcmwl-kernel-source`: https://launchpad.net/ubuntu/jammy/+package/bcmwl-kernel-source
- aircrack-ng/rtl8812au repo: https://github.com/aircrack-ng/rtl8812au
- tomaspinho/rtl8821ce repo: https://github.com/tomaspinho/rtl8821ce
- DeviceHunt PCI ID 8086:2723 (Intel AX200): https://devicehunt.com/view/type/pci/vendor/8086/device/2723

## Issues Found

1. **Step 3 — Debian-specific firmware packages presented as Ubuntu packages.** The original text claimed "Ubuntu provides firmware through several packages" and listed `firmware-linux-free`, `firmware-linux-nonfree`, and `firmware-iwlwifi`. These are Debian package names; Ubuntu does not ship them. Ubuntu bundles all of this into a single `linux-firmware` package. Rewrote the install block to install `linux-firmware` and added a clarifying comment that the split firmware packages are Debian-only.

2. **Step 4 — `firmware-brcm80211` is also a Debian-only package.** Replaced the conditional install with `linux-firmware` and added a note that on Ubuntu 24.04+ `bcmwl-kernel-source` is now a transitional package that pulls in `broadcom-sta-dkms`.

3. **Step 9 — ath9k comment did not match the option.** The text said "disable ASPM if you have disconnects" but the configured option was `options ath9k nohwcrypt=1`, which disables hardware encryption (forces software crypto via mac80211) — it has nothing to do with ASPM. There is no ath9k module parameter for ASPM. Corrected the comment to describe what `nohwcrypt=1` actually does, and added a separate note that ASPM-induced disconnects must be addressed via the global `pcie_aspm=off` kernel boot parameter.

## Review Notes
- The `aircrack-ng/rtl8812au` repository README now marks the driver as **DEPRECATED** and redirects users to `github.com/lwfinger/rtw88` (mac80211-based). The repo still works for now, but a future revision of this post should switch to the rtw88 driver as the recommended path for RTL8812AU/RTL8814AU.
- `iwconfig` (Step 8) is deprecated in favor of `iw`, but it still exists in `wireless-tools` and is widely used in WiFi power-management recipes; leaving it alone is reasonable for a troubleshooting guide.
- All other commands (`lspci -nn`, `iw dev`, `rfkill list all`, `ubuntu-drivers devices`, NetworkManager `wifi.powersave = 2`, iwlwifi `swcrypto=1` / `11n_disable=1`, the Intel AX200 PCI ID `[8086:2723]`, the `rtl8821ce` repo URL) verified correct against authoritative sources.
- The `bcmwl-kernel-source` package name is still valid on Ubuntu 22.04 and works as a transitional alias on 24.04+, so the command itself does not need changing.
