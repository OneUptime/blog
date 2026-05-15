# Validation Summary: How to Benchmark VDO Deduplication and Compression on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM and LVM-VDO
- VDO deduplication and compression
- XFS
- fio
- jq
- Linux command-line storage tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL, including VDO installation, LVM-VDO creation, XFS formatting, discard/TRIM behavior, compression and deduplication defaults, and VDO sizing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- fio official documentation for job options, generated target files, `--direct`, `--runtime`, `--time_based`, `--group_reporting`, latency percentiles, and JSON output: https://fio.readthedocs.io/en/master/fio_doc.html
- GNU coreutils `tr` behavior was checked locally to verify that `tr '\0' '\x41'` does not generate `A` bytes.
- Local shell availability checks for referenced commands were performed where possible; this environment has `jq` but does not include RHEL VDO/LVM tooling.

## Issues Found
- The prerequisites and install command omitted the `vdo` package, which Red Hat documents as part of the required VDO software and which provides VDO management utilities such as `vdostats`. Added `vdo`.
- The post used `jq` to parse fio JSON output but did not list or install it. Added `jq` to the prerequisites and package installation command.
- The fio benchmarking commands did not use direct I/O. Without `--direct=1`, results can be dominated by the Linux page cache instead of measuring the underlying LVM/VDO storage path. Added `--direct=1` to the fio throughput, IOPS, mixed workload, and latency commands.
- The command `tr '\0' '\x41'` does not produce the byte `A` with GNU `tr`; it produced `x` in local testing. Replaced it with `tr '\0' 'A'`, matching the earlier compressible-data example.

## Review Notes
- The `mount -o discard` example is valid for LVM-VDO, but Red Hat recommends periodic `fstrim` over continuous online discard for many deployments because online discard can have a significant performance impact. For a future benchmarking article, it would be useful to explicitly state whether discard behavior is part of the test scenario.
- The expected performance-impact table is presented as typical guidance rather than a documented guarantee. Actual values depend heavily on CPU, VDO settings, deduplication ratio, storage media, and workload shape.
