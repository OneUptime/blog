# Validation Summary: Read InfiniBand Counters That Actually Implicate a Bad Cable

## Status

validated

## Post Type

Technical diagnostic guide

## Technologies Covered

- InfiniBand and Linux RDMA port counters
- rdma-core diagnostics: `ibstat`, `perfquery`, `ibqueryerrors`, and `iblinkinfo`
- NVIDIA MFT and `mlxlink`
- NVIDIA IBUtils2 and `ibdiagnet`
- Physical-layer diagnostics, BER, FEC, LLR, optical-module telemetry, and cable fault isolation

## Sources Consulted

- [Linux kernel stable InfiniBand counter sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [rdma-core `perfquery(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/perfquery.8.in.rst)
- [rdma-core `ibqueryerrors(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibqueryerrors.8.in.rst)
- [rdma-core `ibqueryerrors` implementation](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/ibqueryerrors.c)
- [rdma-core `iblinkinfo(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/iblinkinfo.8.in.rst)
- [rdma-core `ibstat(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- [GNU Coreutils `date` options](https://www.gnu.org/software/coreutils/manual/html_node/Options-for-date.html)
- [NVIDIA UFM Enterprise 6.25.1 high-frequency telemetry fields](https://networking-docs.nvidia.com/ufmenterpriseum/6251/high-frequency-primary-telemetry-fields)
- [NVIDIA DOCA telemetry service counter definitions](https://networking-docs.nvidia.com/doca/archive/3-1-0-core-update/doca-telemetry-service-guide)
- [NVIDIA MFT 4.36 `mlxlink` documentation](https://networking-docs.nvidia.com/mftswum/4.36.0/mlxlink-utility)
- [NVIDIA MLNX_OFED InfiniBand fabric utilities and FDR LLR documentation](https://networking-docs.nvidia.com/mlnxofedswum/542413/infiniband-fabric-utilities)
- [NVIDIA IBUtils2 2.26 PHY diagnostics](https://networking-docs.nvidia.com/ibdiagnetutilityum/2.26.0/phy-diagnostics)
- [NVIDIA IBUtils2 2.26 BER documentation](https://networking-docs.nvidia.com/ibdiagnetutilityum/2.26.0/bit-error-rate-ber)
- [NVIDIA IBUtils2 2.26 cable-diagnostic deprecation notice](https://networking-docs.nvidia.com/ibdiagnetutilityum/2.26.0/cable-diagnostic)
- [OpenFabrics Enterprise Distribution documentation](https://www.openfabrics.org/wp-content/uploads/mediawiki/OpenFabrics-OFED-MediaWiki.pdf)

## Issues Found

- **Legacy and extended symbol counters were conflated.** The standard `symbol_error`/`SymbolErrorCounter` reports minor physical-lane link errors, while NVIDIA's definition for bits not corrected by PHY correction belongs to `SymbolErrorCounterExtended`. The table now lists them separately.
- **The EBP delimiter was expanded incorrectly.** “Error-at-bad-packet” was changed to the standard term “End Bad Packet (EBP).”
- **`link_downed` was described as a generic link-down transition counter.** It specifically counts failed link-error-recovery attempts that force the link down. The explanation now distinguishes it from generic operative-state-down events while retaining the need to correlate increases with interventions.
- **Reset scope was imprecise.** The post now says that `perfquery -r` resets selected counters after reporting, `perfquery -R` resets them without reporting, and `ibqueryerrors --clear-errors` clears error counters after reading on scanned ports rather than clearing every kind of fabric counter.
- **`ibqueryerrors` thresholds were incorrectly described as rates.** Threshold-file values are absolute counter values; deltas and rates must be calculated externally. The guidance now accounts for counter age and reset policy.
- **The `mlxlink` commands did not request FEC capabilities.** Added the read-only `--show_fec` query and updated the description to refer to the combined output of all three queries.
- **The recommended `ibdiagnet` cable and BER workflows were deprecated.** Replaced them with `ibdiagnet --get_phy_info` for current fabric-wide PHY/BER collection and explicitly identified the legacy cable plugin and `--ber_test` as deprecated.
- **The retry explanation was too broad.** NVIDIA's cited LLR behavior is proprietary to FDR links, so the text now scopes the CRC and partial-packet retransmission claim to FDR. Corrected FEC errors are described as link-margin evidence, while retransmissions—not correction alone—are identified as the possible source of bandwidth loss.
- **Two diagnostic interpretations were too narrow.** A lane-local problem can originate at the transmitter as well as the media, connector, or receiver; high `PortXmitWait` can reflect credit starvation or arbitration/QoS contention rather than only generic congestion. Both statements were corrected.
- **The warning about advanced `mlxlink` operations treated all eye and counter operations as disruptive.** The post now distinguishes the read-only `--show_eye` query, production-impacting tests or state changes, and counter clearing that erases diagnostic history without itself testing the link.
- **Version-specific NVIDIA links were stale.** The MFT and IBUtils2 references now point to current 4.36 and 2.26 documentation, and the telemetry reference now points to UFM Enterprise 6.25.1.

## Review Notes

- All displayed command forms and flags are valid in the cited GNU Coreutils, rdma-core, and NVIDIA documentation after the corrections above.
- `port_rcv_errors` remains correctly characterized as broader than a cable fault; it is a composite receive-error counter, so detail counters should be used when available.
- Legacy InfiniBand PMA counters have finite widths and can saturate. Monitoring logic should account for saturation and resets when calculating deltas, and use extended counters where supported.
- NVIDIA PHY, module, FEC, and per-lane fields vary by device and firmware, as the post notes.
