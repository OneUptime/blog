# Validation Summary: How to Tune Ubuntu for Audio Production Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04 LTS / 24.04 LTS
- Linux low-latency kernel (`linux-lowlatency`)
- Ubuntu Pro real-time kernel
- JACK Audio Connection Kit (JACK2 / `jackd2`, `qjackctl`)
- PAM real-time limits (`/etc/security/limits.d/audio.conf`)
- `cpupower` / CPU governors / CPU frequency scaling
- Kernel boot parameters (GRUB, `processor.max_cstate`, `intel_idle.max_cstate`)
- IRQ affinity (`/proc/irq/*/smp_affinity_list`)
- PipeWire / PipeWire-JACK bridge
- realTimeConfigQuickScan (raboof)
- `rt-tests` / `cyclictest`
- ALSA tools (`aplay`, `arecord`, `/proc/asound/cards`)

## Sources Consulted
- [Ubuntu Server documentation — The cpupower tool](https://documentation.ubuntu.com/server/explanation/performance/perf-tune-cpupower/)
- [Launchpad bug #1960841 — linux-tools-common provides cpupower](https://bugs.launchpad.net/ubuntu/+source/linux/+bug/1960841)
- [kernel.org — intel_idle CPU Idle Time Management Driver](https://docs.kernel.org/admin-guide/pm/intel_idle.html)
- [kernel.org — CPU Idle Time Management](https://docs.kernel.org/driver-api/pm/cpuidle.html)
- [torvalds/linux drivers/idle directory](https://github.com/torvalds/linux/tree/master/drivers/idle)
- [Ubuntu packages — pipewire-audio-client-libraries (Noble)](https://packages.ubuntu.com/noble/pipewire-audio-client-libraries)
- [Launchpad — linux-lowlatency in Noble (24.04)](https://launchpad.net/ubuntu/noble/+source/linux-lowlatency)
- [jackaudio.org — Linux RT config FAQ](https://jackaudio.org/faq/linux_rt_config.html)
- [Ubuntu Community Help Wiki — HowToJACKConfiguration](https://help.ubuntu.com/community/HowToJACKConfiguration)
- [Ubuntu Pro Client documentation — Enable Real-time Ubuntu](https://documentation.ubuntu.com/pro-client/en/latest/howtoguides/enable_realtime_kernel/)
- [raboof/realtimeconfigquickscan on GitHub](https://github.com/raboof/realtimeconfigquickscan)

## Issues Found

1. **Wrong package for `cpupower`.** The post instructed `sudo apt install -y cpufrequtils`, but `cpufrequtils` provides `cpufreq-info`/`cpufreq-set`, not `cpupower`. On Ubuntu 22.04/24.04, `cpupower` is shipped by `linux-tools-common` together with the kernel-matched `linux-tools-generic`. Running `cpupower frequency-set ...` after only installing `cpufrequtils` would fail with "command not found." Fixed by changing the install line to `sudo apt install -y linux-tools-common linux-tools-generic`.

2. **`amd_idle.max_cstate=1` is not a real kernel parameter.** There is no `amd_idle` driver in the mainline Linux kernel (only `intel_idle.c` exists under `drivers/idle/`). AMD systems use the generic `acpi_idle` driver, which is already covered by `processor.max_cstate=N`. Fixed by replacing the bogus AMD example with `processor.max_cstate=1 idle=nomwait` and adding an inline note explaining that no `amd_idle` driver exists.

## Review Notes

- `pipewire-audio-client-libraries` is still a valid package name on both Ubuntu 22.04 and 24.04, but on 24.04 (Noble) it is a transitional metapackage that pulls in `pipewire-alsa` and `pipewire-jack`. Future revisions could reference the two replacement packages directly for forward compatibility. Left as-is since it still works.
- The post correctly relies on the debconf prompt during `jackd2` install to create `/etc/security/limits.d/audio.conf` automatically. If a user declined that prompt, manually creating the file (as shown) is the correct fallback. `sudo dpkg-reconfigure -p high jackd2` is an alternative not mentioned in the post but not necessary.
- The `nice -19` limit and accompanying comment are technically correct (lower nice = higher priority); the wording is a little awkward but accurate, so left untouched.
- `jackd -P80 -d alsa -d hw:USB ...` correctly uses the ALSA driver's own `-d` (device) flag after the top-level `-d alsa` driver selection — verified against jackd manpage usage.
- `cyclictest -t1 -p80 -i1000 -n -l 10000` flags are all valid (`-t` threads, `-p` priority, `-i` interval µs, `-n` clock_nanosleep, `-l` loops).
- The PipeWire `context.properties` SPA-JSON snippet matches the format used by the stock `/usr/share/pipewire/pipewire.conf`.
