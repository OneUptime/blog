# Validation Summary: How to Tune I/O Schedulers (mq-deadline, bfq, none) on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux block layer (blk-mq, multi-queue)
- I/O schedulers: `none`, `mq-deadline`, `bfq`
- sysfs (`/sys/block/*/queue/*`)
- udev rules
- `lsblk`, `cat`, shell scripting
- `fio` (Flexible I/O Tester)
- GRUB / kernel boot parameters
- NVMe, SATA/SAS SSDs, HDDs, virtio-blk

## Sources Consulted
- Linux kernel BFQ documentation: https://www.kernel.org/doc/html/latest/block/bfq-iosched.html
- Linux kernel deadline-iosched documentation: https://docs.kernel.org/block/deadline-iosched.html
- `block/mq-deadline.c` in the Linux kernel source (defaults for read_expire, write_expire, writes_starved, fifo_batch)
- fio documentation / HOWTO: https://fio.readthedocs.io/en/latest/fio_doc.html
- Field positions for fio terse output (terse_version=3)
- Red Hat solution: `elevator=` no longer honored under blk-mq (RHEL 8+)
- Debian bug #914758 (missing equivalent of `elevator` parameter for blk-mq)
- NVMe specification overview (paired SQ/CQ queues, up to 65,535 queues)
- SATA-IO documentation on NCQ (for contrast with NVMe)

## Issues Found

1. **`elevator=` kernel boot parameter section was incorrect.** The post recommended using `GRUB_CMDLINE_LINUX="elevator=mq-deadline"` as a global default. This parameter only applied to the legacy single-queue block layer and is not honored by blk-mq, which modern Ubuntu kernels (5.x+) use exclusively. Rewrote the section to warn readers that this parameter has no effect on current systems and to direct them to the udev approach.

2. **`timeout_async` does not exist as a BFQ sysfs parameter.** BFQ only exposes `timeout_sync` (per the kernel BFQ documentation). Removed the `timeout_async` reference and added `fifo_expire_sync` / `fifo_expire_async`, which are the actual BFQ knobs analogous to mq-deadline's read/write deadlines.

3. **Wrong fio terse-output field for sequential bandwidth.** The post used `$6/1024` to print "Sequential Read MB/s". In fio's terse_version=3 output, field 6 is total KB read (cumulative, not a rate); field 7 is the read bandwidth in KB/s. Changed to `$7/1024`. The IOPS field (`$8`) was already correct.

4. **NVMe described as using "NCQ".** A comment said "supports NCQ/NQ deeply". NCQ is a SATA/AHCI feature; NVMe uses its own paired submission/completion queues, not NCQ. Updated the comment to "paired SQ/CQ, not SATA NCQ" and clarified the NVMe queue-count claim to "up to 65,535 paired submission/completion queues" (more precise than "thousands").

## Review Notes
- mq-deadline defaults stated in the post (read_expire 500ms, write_expire 5000ms, writes_starved 2, fifo_batch present) all match the values in `block/mq-deadline.c`.
- BFQ `slice_idle` default of 8000 µs (8 ms) is correct per the kernel BFQ docs.
- The udev rule patterns (`nvme[0-9]*n[0-9]*`, `sd[a-z]`, `vd[a-z]`) and the `queue/rotational` attribute match are all valid.
- The post mentions "three schedulers" with blk-mq; this glosses over `kyber`, which also exists but is not always enabled by default. Not technically wrong since `kyber` is often not loaded on stock Ubuntu, but worth noting for future expansion.
- The `lsblk -d -o NAME,TYPE,ROTA,SCHED` column set is valid for current util-linux.
- The fio terse format has shifted between versions historically; the corrected `$7` assumes terse_version=3 (the current default). If a user has explicitly set `terse_version=4` or higher, fields may shift. Worth a brief note in a future revision.
