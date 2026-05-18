# Validation Summary: How to Understand Memory Management (Virtual Memory) on Ubuntu

## Status
validated

## Post Type
Guide / Tutorial — a reference explainer covering Linux virtual memory concepts (VMA, page cache, swap, OOM killer, overcommit, THP, PSI) with diagnostic commands and tuning examples.

## Technologies Covered
- Linux kernel virtual memory subsystem (page tables, MMU)
- procfs (`/proc/meminfo`, `/proc/<pid>/stat`, `/proc/<pid>/status`, `/proc/<pid>/oom_score*`, `/proc/pressure/memory`)
- sysfs (`/sys/kernel/mm/transparent_hugepage/`, `/sys/kernel/mm/hugepages/`)
- `free`, `vmstat`, `sar`, `swapon`, `fallocate`, `mkswap`, `sysctl` (procps / util-linux / sysstat)
- `vm.swappiness`, `vm.overcommit_memory`, `vm.overcommit_ratio`, `vm.dirty_ratio`, `vm.dirty_background_ratio`, `vm.min_free_kbytes`, `vm.zone_reclaim_mode`, `vm.nr_hugepages`
- hugetlbfs, Transparent Huge Pages (THP)
- systemd `OOMScoreAdjust=`
- Linux Pressure Stall Information (PSI)

## Sources Consulted
- `man 1 free` (procps-ng) — verified `used` column semantics (`total - available`)
- `man 8 vmstat` (procps-ng) — verified vmstat column meanings and package ownership
- `dpkg -S /usr/bin/vmstat` — confirmed `vmstat` is shipped by `procps`, not `sysstat`
- Linux kernel `Documentation/admin-guide/sysctl/vm.rst` — verified swappiness, overcommit, dirty_ratio, min_free_kbytes semantics
- Linux kernel commit `f81a6c1d8a` / changelog — verified swappiness max raised from 100 to 200 in kernel 5.8
- Linux kernel `Documentation/admin-guide/mm/transhuge.rst` — verified THP enabled values
- Linux kernel `Documentation/admin-guide/mm/concepts.rst` — verified OOM scoring (`oom_score_adj` range -1000..1000)
- Linux kernel `Documentation/accounting/psi.rst` — verified PSI output format
- `proc(5)` — verified `/proc/<pid>/stat` field positions (minflt=10, majflt=12)
- systemd.exec(5) — verified `OOMScoreAdjust=` directive

## Issues Found

1. **`free` "used" column described incorrectly.** The post said `used = in use (including cache/buffers)`. Per `man free` (procps-ng), `used` is calculated as `total - available` and explicitly excludes reclaimable buff/cache. Rewrote the comment to reflect the actual definition. Also tightened the `buff/cache` description to mention reclaimable slab (which is what `Cached` in newer procps includes).

2. **`vmstat` install instruction was wrong.** The post told the reader to `apt install sysstat` to obtain `vmstat`, but `vmstat` is provided by the `procps` package (installed by default on Ubuntu). `sysstat` provides `sar`/`iostat`/`mpstat`. Corrected the comment so the reader doesn't think they need an extra package for `vmstat`, while still noting where `sar` (used earlier in the post) comes from.

3. **`vm.swappiness` range was outdated.** The post said the range was 0–100. Since Linux 5.8 the upper bound is 200. Ubuntu 22.04 (kernel 5.15) and later all support up to 200. Updated the explanation to note both ranges and what values above 100 do.

## Review Notes

- The "64-bit process sees a 128 TB address space" claim is correct for x86-64 with 4-level page tables (48-bit virtual addresses → 128 TiB user half). Hosts with 5-level page tables enabled (kernel 4.14+, opt-in) get up to 128 PiB, but 128 TB is the right default to quote for Ubuntu.
- The `/proc/<pid>/stat` field offsets (minflt=10, majflt=12) are correct per `proc(5)`.
- The `mount -t hugetlbfs none /mnt/hugepages` form is accepted; `nodev` is the more conventional placeholder but `none` works.
- `fallocate`-created swap files work fine on ext4 (Ubuntu's default). On Btrfs the supported procedure is different (`chattr +C`, no CoW, kernel 5.0+); this post doesn't claim Btrfs support, so no change needed, but readers on Btrfs should consult the Btrfs swap docs.
- `vmstat`'s `bi`/`bo` columns are technically KiB/s in current procps-ng, not raw "blocks"; the post's plain-English phrasing is acceptable for a high-level overview.
- `oom_score_adj` of -1000 effectively makes a process OOM-immune (`OOM_SCORE_ADJ_MIN`); the post conveys this correctly.
