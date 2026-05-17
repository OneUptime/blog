# Validation Summary: How to Configure PTP (Precision Time Protocol) on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS) and system extensions
- Precision Time Protocol (PTP) / IEEE 1588
- `linuxptp` (`ptp4l`, `phc2sys`)
- PTP Hardware Clock (PHC) and hardware timestamping
- Talos Image Factory (factory.talos.dev) for custom installer images
- `talosctl` (services, logs, read, upgrade, patch machineconfig)
- NTP (RFC 5905) for comparison

## Sources Consulted
- Sidero Labs extensions repository: https://github.com/siderolabs/extensions
- Talos Image Factory official extensions API: https://factory.talos.dev/version/v1.7.0/extensions/official and https://factory.talos.dev/version/v1.9.0/extensions/official
- GitHub issue/PR search across siderolabs/extensions for "ptp" (no matching extension found)
- linuxptp `ptp4l(8)` man page: https://manpages.debian.org/unstable/linuxptp/ptp4l.8.en.html
- linuxptp `phc2sys(8)` man page: https://manpages.debian.org/unstable/linuxptp/phc2sys.8.en.html
- The Linux PTP Project: https://linuxptp.sourceforge.net/
- Linux kernel PTP Hardware Clock subsystem (PHC devices exposed at `/dev/ptpN` and `/sys/class/ptp/ptpN/`)

## Issues Found

1. **Non-existent `ghcr.io/siderolabs/ptp:latest` system extension** — The post claimed PTP support comes via an official Sidero Labs `ptp` extension and instructed the reader to add `ghcr.io/siderolabs/ptp:latest` to `machine.install.extensions`. I queried the Talos Image Factory official extensions list for both `v1.7.0` and `v1.9.0` and searched the [siderolabs/extensions](https://github.com/siderolabs/extensions) repository (directory listing and issue/PR search): there is no `ptp`, `ptp4l`, or `linuxptp` extension in the official catalog, and no open or merged PR proposing one. A user following the original install snippet would get an image-pull failure on upgrade. Rewrote the "Installing PTP Support on Talos" section to state that no official extension exists, that the user needs to build (or source from a community fork) their own `linuxptp` extension, and to reference it as `ghcr.io/<your-org>/linuxptp:<tag>`. Updated the corresponding reference in the "Configuring ptp4l" snippet for consistency.

2. **Wrong path for inspecting PHC devices** — The "Checking Hardware Timestamping Support" section used `talosctl ... read /proc/net/ptp0`. The Linux kernel does not expose PHC information at `/proc/net/ptp0`; PHC character devices live under `/dev/ptpN` and their attributes are exported via sysfs at `/sys/class/ptp/ptpN/` (e.g. `clock_name`, `capabilities`, `max_adj`, `n_alarm`, etc.). Replaced the bogus path with `/sys/class/ptp/ptp0/clock_name` and `/sys/class/ptp/ptp0/capabilities`, which are the canonical ways to confirm a PHC is present and inspect its capabilities.

## Review Notes

- All `ptp4l.conf` directives used in both the verbose and minimal examples (`twoStepFlag`, `clockClass`, `clockAccuracy`, `dataset_comparison G.8275.x`, `G.8275.defaultDS.localPriority`, `pi_proportional_*`, `clock_servo pi`, `delay_mechanism E2E`, `network_transport UDPv4`, `transportSpecific`, `ptp_dst_mac`, `p2p_dst_mac`, `udp_ttl`, `udp6_scope`, etc.) were cross-checked against the `ptp4l(8)` man page and are valid option names. The trailing `[eth0]` per-port section is the standard way to attach the daemon to an interface in linuxptp.
- The `phc2sys` options `-s <iface> -c CLOCK_REALTIME -O 0 -R 16` are all valid per `phc2sys(8)`. Note that `-O 0` means the system clock will run on the same scale as the source PHC — if the PTP grandmaster is announcing TAI (typical for default IEEE 1588), the system clock will be ~37 s ahead of UTC. Users who need UTC on the system clock either need an offset (`-O -37` at the time of writing) or to use `phc2sys`'s automatic UTC offset handling (`-u`/`-O auto` modes / `--update_rate`) when a PTP-aware grandmaster announces `currentUtcOffset`. The post's `-O 0` comment ("PTP uses TAI, not UTC") is technically accurate as a simplification but the leap-second handling is left to the reader; not changed.
- `machine.time.disabled: true` and the JSON-patch form `{"op": "replace", "path": "/machine/time/disabled", "value": true}` are correct for Talos machine config. `replace` semantically requires the path to already exist; in practice Talos's strategic-merge style patcher accepts this against the default empty `time` block, so the example works.
- The extension service names referenced for log inspection (`ext-ptp4l`, `ext-phc2sys`) follow the Talos `ext-<service>` convention, but the exact names ultimately depend on the `service.spec.yaml` declared in whichever custom linuxptp extension the user builds. Left as illustrative.
- The post's accuracy figures (NTP "1-10 ms", PTP "10-100 ns" with hardware timestamping and PTP-aware switches) are consistent with industry references and the PTP literature. The narrative around boundary clocks, transparent clocks, and end-to-end (E2E) vs peer-to-peer (P2P) delay mechanisms is accurate.
- The monitoring script uses `grep -oP` (PCRE) which requires GNU grep — fine on the host where `talosctl` is invoked but worth noting if anyone runs it on BSD/macOS without GNU grep.
