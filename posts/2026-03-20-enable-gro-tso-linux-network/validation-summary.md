# Validation Summary: How to Enable Generic Receive Offload (GRO) and TCP Segmentation Offload (TSO)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking offloads
- `ethtool`
- GRO
- TSO
- GSO
- LRO
- NetworkManager dispatcher scripts
- `iperf3`

## Sources Consulted
- Linux kernel networking documentation: Segmentation Offloads https://docs.kernel.org/networking/segmentation-offloads.html
- Linux kernel networking documentation: Interface statistics https://www.kernel.org/doc/html/latest/networking/statistics.html
- `ethtool` upstream project page https://www.kernel.org/pub/software/network/ethtool/
- NetworkManager dispatcher documentation https://networkmanager.dev/docs/api/latest/NetworkManager-dispatcher.html
- NetworkManager ethtool settings reference https://www.networkmanager.dev/docs/api/latest/settings-ethtool.html
- Red Hat Performance Tuning Guide, NIC offloads discussion https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html-single/performance_tuning_guide/index
- Local CLI help: `ethtool --help` (ethtool 6.7)

## Issues Found
- The GRO explanation implied the NIC itself performs GRO. I changed it to describe GRO as kernel-side packet aggregation, which matches the Linux kernel documentation.
- The post made hard performance claims like "double or triple throughput" and "30-50% CPU reduction" without enough qualification. I softened those claims to reflect that benefits depend on workload, NIC, driver, kernel, and traffic pattern.
- The TSO dependency wording was too absolute. I changed it to note that TSO normally depends on transmit checksum offload, and that scatter-gather is commonly needed, which is closer to how the kernel documents the dependency chain.
- The LRO section described LRO as "hardware GRO" and suggested it was simply more efficient. I corrected that wording and kept the routing/bridging caveat, because LRO and GRO are distinct mechanisms and LRO has known forwarding limitations.
- The "full offload suite" example included `rx on`, which is not directly part of the GRO/TSO path and could distract from the core feature set. I narrowed the example to the related features and made the verification grep target the relevant offloads.
- The `ethtool -S` verification example assumed fixed statistic names like `tx_tso` and `rx_gro`. I changed it to note that these counters are driver-defined and that names vary by NIC/driver.
- The benchmarking example used `iperf3 -c localhost`, which would exercise loopback rather than the NIC being tuned. I replaced it with a two-host example that actually sends traffic through `eth0`.
- The virtualization note incorrectly grouped VMware and KVM under `virtio-net`. I changed it to a correct KVM-specific `virtio-net` example and made the surrounding text driver/hypervisor-specific.
- The NetworkManager dispatcher example used a bare `ethtool` invocation and unquoted shell variables. I updated it to use a POSIX shell, quote variables, and resolve an absolute `ethtool` path for a more reliable script.
- The post did not state that feature-changing `ethtool -K` commands require administrative privileges. I added that note.

## Review Notes
- The post is technically relevant and salvageable; no removal was warranted.
- Feature availability and mutability are driver-dependent. Readers should expect some offloads to show as unsupported or `[fixed]`.
- If NetworkManager fully manages the interface, its native ethtool connection properties can also be used for persistence; the dispatcher example remains valid, but it is not the only option.
