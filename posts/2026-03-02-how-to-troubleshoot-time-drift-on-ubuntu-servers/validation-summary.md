# Validation Summary: How to Troubleshoot Time Drift on Ubuntu Servers

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- systemd-timesyncd
- chrony / chronyc
- ntpdate (deprecated, mentioned with caveat)
- sntp
- ufw / iptables
- hwclock (RTC management)
- systemd-detect-virt
- KVM/QEMU pvclock, VMware open-vm-tools, VirtualBox additions
- gnuplot (for drift visualization)
- Bash scripting

## Sources Consulted
- chrony.conf(5) official documentation — https://chrony-project.org/doc/4.5/chrony.conf.html
- chrony.conf(5) older version — https://chrony-project.org/doc/3.5/chrony.conf.html
- systemd timesyncd.conf(5) — https://manpages.ubuntu.com/manpages/jammy/man5/timesyncd.conf.5.html
- chronyc(1) man page for tracking output format
- timedatectl(1) man page

## Issues Found

1. **Incorrect awk field index in the "Analyzing Drift Patterns" gnuplot example.**
   The original used `awk 'NR > 1 {print $2, $5}'` while labeling the chart axis "Offset (seconds)". In chrony's tracking.log, field `$5` is `Freq ppm`, not Offset — Offset is field `$7`. The plot would have shown frequency in ppm while claiming to show offset in seconds. Changed to `$7` for both the gnuplot pipeline and the fallback `tail` line. Also switched the header-skip from `NR > 1` to `$1 ~ /^[0-9]/` because chrony periodically re-emits its banner header into the log, so simple line-number skipping is unreliable.

2. **Inaccurate field-list comment for chrony tracking.log.**
   The original listed fields as `Date, Time, IP, Freq(ppm), Skew(ppm), Offset, RMS_offset`. This omits the Stratum column between IP and Freq, and `RMS_offset` is not a tracking.log field (it appears in `chronyc tracking`, not in the log). Updated the comment to reflect the actual column order per chrony docs: `Date, Time, IP, Stratum, Freq(ppm), Skew(ppm), Offset, Leap, Co, Offset_sd, Rem_corr, Root_delay, Root_disp`.

## Review Notes
- `makestep 0.1 -1` syntax is correct: the negative `limit` argument disables the step-count limit so stepping remains allowed indefinitely (default in distro configs is `makestep 1.0 3`).
- `RootDistanceMaxSec=5` is a valid `[Time]` directive in `timesyncd.conf` (default 5s); the inline explanation simplifies the meaning (it bounds upstream root distance, not the local offset directly) but is accurate enough as a heuristic.
- The drift monitoring script's `sed 's/[^0-9.]//g'` strips the sign of the offset, which is intentional and correct for absolute-value threshold comparison.
- `ntpdate` is correctly flagged as deprecated; on modern Ubuntu it is provided via `ntpsec-ntpdate` or the legacy `ntpdate` package — both still function for the `-q`/`-u` usage shown.
- `worldtimeapi.org` in the "When All Else Fails" section has had reliability issues historically; the script falls back to `date` so the example degrades gracefully.
- `chronyc tracking | grep "System time" | awk '{print $4}'` correctly extracts the numeric offset given the standard "System time : N.NNNNNN seconds slow of NTP time" format.
