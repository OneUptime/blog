# Validation Summary: How to Monitor System Temperatures with lm-sensors on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- lm-sensors (sensors, sensors-detect)
- Kernel hwmon modules (coretemp, k10temp, nct6775, drivetemp)
- hddtemp
- smartmontools (smartctl)
- nvme-cli
- nvidia-smi (NVIDIA driver utilities)
- radeontop (AMD GPU monitoring)
- Prometheus node_exporter
- systemd
- Bash scripting (jq, awk, cron)

## Sources Consulted
- lm-sensors `sensors(1)` manpage on Ubuntu: https://manpages.ubuntu.com/manpages/jammy/man1/sensors.1.html
- Linux kernel `drivetemp` driver documentation: https://docs.kernel.org/hwmon/drivetemp.html
- lm_sensors project wiki: https://hwmon.wiki.kernel.org/lm_sensors
- Prometheus node_exporter v1.7.0 release: https://github.com/prometheus/node_exporter/releases/tag/v1.7.0
- Ubuntu apt package metadata for `lm-sensors` (1:3.6.0-9build1)
- General knowledge of `nvidia-smi dmon`, `smartctl`, and bash regex behavior

## Issues Found

1. **`drivetemp` module described as "NVMe drive temperatures"** — incorrect.
   The `drivetemp` kernel module reads temperatures from SATA/SCSI drives via
   ATA SCT / SMART. NVMe drives are not supported by this module; they expose
   temperature through the in-kernel `nvme` driver's own hwmon interface
   (no separate module needed). Fixed the inline comment to clarify this:
   `# SATA/SCSI drive temperatures (NVMe drives report through their own hwmon interface)`.

2. **`sensors -l` listed as "Show all chip names"** — this flag does not exist in
   lm-sensors. Verified against the `sensors(1)` manpage: valid flags include
   `-c`, `-s`, `-A`, `-u`, `-j`, `-f`, `-v`, `-h`, and `--bus-list`/`-B`, but
   there is no `-l`. Replaced the example with `sensors --bus-list`, which is a
   real and useful flag (generates bus statements for sensors.conf).

## Review Notes
- `hddtemp` is no longer maintained upstream and has been dropped from newer
  Debian/Ubuntu archives in some releases (it remained available in Ubuntu 22.04
  LTS universe but its use is discouraged). The post recommends `smartctl` /
  `nvme-cli` as alternatives, which is the correct modern approach — so this is
  not flagged as an error, but readers on newer Ubuntu releases may find
  `hddtemp` unavailable.
- The bash regex in the temperature alert script uses `\s` inside `[[ =~ ]]`.
  Bash uses POSIX ERE, which does not officially recognize `\s`; in practice it
  often works on glibc-based systems but `[[:space:]]` is the strictly portable
  form. Left unchanged because the pattern works in typical Ubuntu environments
  and rewriting it would be a style change rather than a correctness fix.
- The node_exporter systemd unit includes `--collector.drbd`, which is a valid
  collector but unrelated to temperature monitoring. Not technically wrong, just
  unnecessary in this context. Left unchanged.
- `sensors-detect` writes to `/etc/modules` on Debian/Ubuntu, which the post
  states correctly. On other distributions it may use `/etc/modules-load.d/`.
- `nvidia-smi dmon -s p` correctly shows both power and temperatures per the
  `nvidia-smi` documentation (the `p` selector covers "Power and Temperatures").
- The `nvidia-utils-535` package is a real Ubuntu package; readers should pick
  the version matching their installed driver.
