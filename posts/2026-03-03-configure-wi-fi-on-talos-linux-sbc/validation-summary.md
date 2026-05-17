# Validation Summary: How to Configure Wi-Fi on Talos Linux (SBC)

## Status
not-technically-relevant

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine configuration, system extensions, Image Factory)
- Kubernetes (kubelet, controller-manager flags)
- Wi-Fi / 802.11 / wpa_supplicant
- Single-board computers (Raspberry Pi, Rock Pi, Jetson Nano, Pine64)
- talosctl CLI

## Sources Consulted
- [Talos v1.9 Machine Configuration Reference (DeviceConfig schema)](https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/)
- [siderolabs/talos Issue #11185 — Feature Request: Add 802.11 Wireless Kernel Support as a Talos Extension](https://github.com/siderolabs/talos/issues/11185) (closed as "not planned")
- [siderolabs/talos Discussion #8259 — Initial network connectivity with WiFi?](https://github.com/siderolabs/talos/discussions/8259) (Sidero maintainer states Talos does not support wireless)
- [siderolabs/extensions catalog](https://github.com/siderolabs/extensions)
- [Talos Image Factory](https://factory.talos.dev/)

## Issues Found
The entire post is fabricated. It describes a Wi-Fi configuration system in Talos Linux that does not exist and has never existed. Specifically:

1. **`wifi:` field on network interfaces does not exist.** The actual Talos `Device` schema under `machine.network.interfaces` supports only: `interface`, `deviceSelector`, `addresses`, `routes`, `bond`, `bridge`, `bridgePort`, `vlans`, `mtu`, `dhcp`, `ignore`, `dummy`, `dhcpOptions`, `wireguard`, and `vip`. There are no `wifi`, `ssid`, `psk`, or `eap` fields. Every YAML example in the post that uses these fields would fail validation.

2. **Talos does not support Wi-Fi at the kernel level.** Per Sidero maintainers (issue #11185, discussion #8259), Talos intentionally omits all 802.11 wireless support from its kernel. The feature request to add it was closed as "not planned." The claim that "Talos Linux supports Wi-Fi through the wpa_supplicant service" is false — `wpa_supplicant` is not shipped or managed by Talos.

3. **No `rpi_generic` image with built-in Wi-Fi firmware works the way described.** Even if the firmware were present, there is no wpa_supplicant or wireless stack to use it. The Raspberry Pi Wi-Fi chipset is not usable from Talos.

4. **The Image Factory schematic with `meta` key 10 containing a Wi-Fi machine config is fabricated.** Meta key 10 is not a documented mechanism for shipping a machine config with Wi-Fi fields, and the Wi-Fi fields in the embedded YAML do not exist in any case.

5. **`pod-eviction-timeout` flag advice is outdated.** This kube-controller-manager flag has been deprecated since Kubernetes 1.13 and no longer takes effect for the default taint-based eviction path used by modern clusters (Talos ships modern Kubernetes versions).

6. **The realtek-firmware extension exists but does not enable Wi-Fi.** It provides firmware blobs for Realtek devices but, again, Talos has no wireless kernel stack to load those drivers into for 802.11 use.

No edits were made to the post because the entire premise is wrong — every code block, the introduction, the chipset table's relevance, the troubleshooting section, the chicken-and-egg discussion, and the security/monitoring advice are all predicated on a feature that does not exist in Talos. "Fixing" it would mean replacing the post wholesale with a "Talos does not support Wi-Fi; here are unofficial workarounds" article, which exceeds the scope of a technical-correctness review.

## Review Notes
- A reader following this post would spend hours producing `controlplane.yaml` files that Talos rejects at apply time, and would likely conclude their hardware or image was at fault rather than the documentation. This makes the post actively harmful, not merely incorrect.
- If the blog wants to cover this topic at all, viable framings include: (a) document Talos's explicit non-support of Wi-Fi and point readers to a USB-ethernet workaround, or (b) describe the unofficial community approach of running a privileged DaemonSet with `wpa_supplicant` (mentioned in issue #11185), with appropriate caveats about kernel module availability.
- Recommend the post be removed from the blog rather than republished.
