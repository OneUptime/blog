# Validation Summary: How to Install Real-Time Kernel (PREEMPT_RT) on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Linux PREEMPT_RT real-time kernel
- Ubuntu 22.04 LTS / 24.04 LTS
- Ubuntu Pro (`pro` CLI) and realtime-kernel service
- Linux low-latency kernel (`linux-lowlatency`)
- Kernel build toolchain (`make menuconfig`, `scripts/config`, `make deb-pkg`)
- GRUB boot configuration
- `cyclictest` from `rt-tests`
- CPU frequency scaling (`cpufrequtils`, scaling governors)

## Sources Consulted
- Phoronix coverage of PREEMPT_RT merge into Linux 6.12: https://www.phoronix.com/news/Linux-6.12-Does-Real-Time
- Ubuntu Pro Client docs — Enable Real-time Ubuntu: https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_realtime_kernel/
- Canonical announcement on free Ubuntu Pro (5 personal machines): https://canonical.com/blog/ubuntu-pro-beta-release
- cyclictest(8) Debian manpage: https://manpages.debian.org/testing/rt-tests/cyclictest.8.en.html
- Linux Foundation Realtime wiki (PREEMPT_RT versions): https://wiki.linuxfoundation.org/realtime/preempt_rt_versions
- kernel.org RT patches index: https://mirrors.edge.kernel.org/pub/linux/kernel/projects/rt/
- Ubuntu package metadata for `pahole` / `dwarves` (verified via `apt-cache show pahole`)

## Issues Found

1. **Inaccurate PREEMPT_RT mainline merge claim.** The post said "Starting with kernel 6.x, PREEMPT_RT was merged into the mainline Linux kernel, which means Ubuntu's kernel packages now include RT support." Full PREEMPT_RT was actually merged in **Linux 6.12** (Sep/Oct 2024), and Ubuntu's default stock kernels are still not built with `CONFIG_PREEMPT_RT=y` — readers still need the Ubuntu Pro realtime kernel or a custom build. Updated the sentence to specify 6.12 and clarify Ubuntu's stock kernel does not have RT enabled by default.

2. **Broken RT patch download URL and incorrect path on apply.** Two related issues in Method 3:
   - The patch `patch-6.8-rt8.patch.xz` no longer lives at `…/rt/6.8/` — it has been moved to `…/rt/6.8/older/` (the top directory only holds the current rt patch). Fixed the `wget` URL to include `older/` and added a comment telling readers to check the directory listing for the current rt patch.
   - After `cd linux-6.8` the patch is downloaded into the kernel source directory, but the subsequent `xzcat ../${RT_PATCH}` looked one level up, which would fail. Changed to `xzcat ${RT_PATCH}` so it reads from the current directory where wget placed it.

## Review Notes

- The `pahole` package exists as a separate Ubuntu package (split from `dwarves` since version 1.22), so the build-deps line is fine on current Ubuntu releases.
- `cyclictest -t1 -p80 -i1000 -n -l 60000` flags are all correct; the run takes ~60 seconds (60000 loops × 1000µs).
- `linux-lowlatency` is a valid Ubuntu meta-package; the description of it being lower-latency but not full PREEMPT_RT is accurate.
- The `--variant generic` flag style works (argparse accepts both space and `=` forms); Ubuntu's official docs prefer `--variant=generic` but this is stylistic, not an error.
- The verification step `cat /sys/kernel/debug/sched/features` shows scheduler features but is not the most direct way to confirm PREEMPT_RT — `/sys/kernel/realtime` reads `1` on an RT kernel and would be a more authoritative check. Left as-is since the `/boot/config` and `/proc/version` checks already in the post are sufficient.
- RT patch numbering moves quickly; specific patch versions in any guide will become outdated. The added comment about checking the kernel.org directory listing should help readers find the current patch.
