# Validation Summary: How to Use iostat to Monitor Disk I/O Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- `iostat` (from the `sysstat` package)
- `sysstat` systemd service (collection)
- Linux block layer (I/O schedulers: `mq-deadline`, `none`, `kyber`, `bfq`)
- Adjacent tooling referenced: `iotop`, `pidstat`, `blktrace`, `smartctl`
- Ubuntu (apt) as the install target

## Sources Consulted
- `iostat(1)` manpage from sysstat 12.6.1 (`man iostat`)
- Live `iostat -V`, `iostat --help`, `iostat -x 1 1`, `iostat -dx 1 1`, and `iostat -xh 1 1` output on Ubuntu (sysstat 12.6.1, kernel 6.17)
- sysstat upstream changelog regarding the removal of `svctm` in sysstat 12.0 — https://github.com/sysstat/sysstat/blob/master/CHANGES
- `/etc/default/sysstat` (Ubuntu packaging defaults) and `systemctl list-unit-files | grep sysstat`
- `/sys/block/<dev>/queue/scheduler` to verify available multi-queue schedulers
- Linux kernel changelog: legacy block layer and `cfq` removed in Linux 5.0 — https://kernelnewbies.org/Linux_5.0

## Issues Found

1. **Extended `iostat -x` output format was outdated.** The post showed the pre-sysstat-12 column layout (`r/s w/s rkB/s wkB/s rrqm/s wrqm/s %rrqm %wrqm r_await w_await aqu-sz rareq-sz wareq-sz svctm %util`) and included the `svctm` column. sysstat 12.0 reorganized the report to group read/write/discard/flush metrics and removed `svctm` because it could no longer be reliably computed on multi-queue devices. I replaced the sample output with the actual sysstat 12.x layout (`r/s rkB/s rrqm/s %rrqm r_await rareq-sz w/s wkB/s wrqm/s %wrqm w_await wareq-sz d/s dkB/s drqm/s %drqm d_await dareq-sz f/s f_await aqu-sz %util`), added bullet entries for the new discard (`d/*`) and flush (`f/*`) metrics, and added a note about the `svctm` removal.

2. **Incorrect description of the `-h` flag.** The post said "Use `-h` for megabytes instead of kilobytes." Per the manpage, `-h` is equivalent to `--human --pretty` — it auto-formats sizes (k/M/G/…) and reorganises the report; it does not force megabyte units. The flag that forces MB is `-m`. I rewrote the section to describe what `-h` actually does and added an `iostat -xm 1` example for users who specifically want MB/s.

3. **Reference to the `cfq` scheduler was anachronistic.** The post recommended `mq-deadline`/`none` "over `cfq`," but `cfq` (and the legacy single-queue block layer) was removed from the kernel in Linux 5.0 — and the post's own example output is from kernel 5.15, where `cfq` is unavailable. I updated the paragraph to list the actually-available multi-queue schedulers on modern Ubuntu (`none`, `mq-deadline`, `kyber`, `bfq`) and noted that `cfq` and the legacy single-queue `deadline` were removed in 5.0.

4. **`io-health-check.sh` referenced wrong column for `await`.** The script computed `await_val = $(NF-6)`, which was approximately correct for the old column layout but in modern sysstat lands on `%drqm` (discard-merge percentage), not on any `*await` field. I rewrote the awk block to use explicit positional fields based on the sysstat-12 layout — `$6` for `r_await`, `$12` for `w_await`, `$23` for `%util` — and used `iostat -dx 1 2` so the device-only report has a stable column count. I also added a short comment in the script documenting the column positions so future readers can adjust if the format changes again.

## Review Notes
- The `systemctl enable sysstat` / `systemctl start sysstat` instructions are correct as far as they go, but on Debian/Ubuntu the package additionally ships `/etc/default/sysstat` with `ENABLED="false"` which gates whether `sadc` actually collects data on boot. Users who want long-term `sar` history typically also need to set `ENABLED="true"` there. This isn't strictly wrong in the post (running iostat ad-hoc doesn't depend on it), so I left it alone, but it's worth a future enhancement.
- The latency baselines (5–20 ms HDD, 0.1–1 ms SATA SSD, <0.1 ms NVMe) are reasonable rules of thumb and consistent with common storage-performance references.
- `iotop -o -d 1` is correct: `-o` shows only processes doing I/O, `-d` sets the delay.
- `pidstat -d` correctly reports per-process I/O stats; `blktrace` and `smartctl` references are accurate.
- The first awk one-liner (`if ($NF+0 > 80) print "HIGH UTIL: "`) is still correct in sysstat 12.x because `%util` remains the final column.
