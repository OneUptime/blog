# Validation Summary: Which Network Interface Should You Graph Without Duplicating Traffic?

## Status
validated

## Post Type
Technical guide / monitoring reference

## Technologies Covered
- Linux network interfaces and standard interface statistics
- Linux bonding
- Linux Ethernet bridges and bridge VLAN statistics
- IEEE 802.1Q VLAN subinterfaces
- Virtual Ethernet (veth) pairs and network namespaces
- Tunnel, WireGuard, CNI, SR-IOV, and switchdev representor interfaces
- Prometheus and PromQL
- Prometheus node_exporter netdev and textfile collectors

## Sources Consulted
- Linux kernel interface statistics documentation: https://docs.kernel.org/networking/statistics.html
- Linux kernel Ethernet bridge documentation: https://docs.kernel.org/networking/bridge.html
- Linux bridge transmit and local-delivery counter implementation: https://github.com/torvalds/linux/blob/master/net/bridge/br_device.c and https://github.com/torvalds/linux/blob/master/net/bridge/br_input.c
- Linux kernel Ethernet bonding driver documentation: https://docs.kernel.org/networking/bonding.html
- Linux kernel network-function representor documentation: https://docs.kernel.org/networking/representors.html
- Linux kernel SR-IOV documentation: https://docs.kernel.org/networking/sriov.html
- iproute2 `ip`, `ip-link`, and `bridge` manual pages: https://man7.org/linux/man-pages/man8/ip.8.html, https://man7.org/linux/man-pages/man8/ip-link.8.html, and https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux `veth(4)` manual page: https://man7.org/linux/man-pages/man4/veth.4.html
- node_exporter README, including netdev filters and textfile collector guidance: https://github.com/prometheus/node_exporter/blob/master/README.md
- node_exporter netdev collector implementation and metric naming: https://github.com/prometheus/node_exporter/blob/master/collector/netdev_common.go and https://github.com/prometheus/node_exporter/blob/master/collector/netdev_linux.go
- Prometheus query operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus `rate()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus text exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- **The interface-selection table allowed the bridge master device for forwarded traffic.** Linux updates the bridge device's receive counters when a frame is passed up for local delivery and its transmit counters when the host transmits through the bridge. Frames forwarded between bridge ports must instead be measured at the relevant ports. Changed the row to select bridge ports for forwarded traffic and retain the bridge device only as supporting detail for traffic delivered to or originated by the host.
- **The bridge-device guidance described only host-terminated traffic.** The bridge device also counts traffic originated by the host on its transmit side. Updated the wording to cover traffic delivered to or originated by the host.
- **Physical-interface byte counters were described as wire-level traffic.** Standard Linux Ethernet byte counters exclude the frame check sequence and do not include all physical-wire overhead. Replaced “wire-level distribution” with the more accurate “physical-link distribution.”
- **A veth pair was described as necessarily connecting two network namespaces.** Veth devices are created as interconnected pairs and may remain in the same namespace; placing their endpoints in different namespaces is a common use, not a requirement. Corrected the definition while preserving the container-platform example.
- **All tunnel underlay traffic was described as encrypted.** Many tunnels are not encrypted, and the relevant lower boundary is an underlay interface rather than necessarily a physical interface. Updated the text to describe encapsulated bytes and overhead, with ciphertext specifically for encrypted tunnels.
- **SR-IOV virtual functions and representors were conflated as hardware-switch views.** A virtual function exposes its assigned traffic, whereas a representor models a virtual-switch port and its slow/control path. Split the descriptions accordingly.

## Review Notes
- The PromQL examples are syntactically valid. The byte-counter queries use `rate()` correctly, multiplication by 8 converts bytes per second to bits per second, and the `and on (instance, device)` expression correctly filters the left-hand traffic series using the role metric.
- The `node_network_receive_errs_total` example uses node_exporter's default legacy-compatible metric names. If node_exporter is run with `--collector.netdev.enable-detailed-metrics`, the incompatible detailed name is `node_network_receive_errors_total`.
- The `master` sysfs symlink exists only when that interface is enslaved to another device. A failed `readlink` therefore means that the interface has no master at that layer.
- All five links in the post's Official Documentation section returned successful responses and pointed to the intended primary documentation.
- No technology versions are pinned in the post, and no deprecated commands or flags are used.
