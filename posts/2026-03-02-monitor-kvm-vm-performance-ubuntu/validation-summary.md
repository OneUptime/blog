# Validation Summary: How to Monitor KVM VM Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KVM / QEMU hypervisor
- libvirt (`virsh` CLI)
- `virt-top` real-time monitor
- Linux `perf` (perf kvm stat)
- QEMU monitor protocol (HMP via `virsh qemu-monitor-command`)
- systemd unit files
- Prometheus libvirt exporter (`prometheus-libvirt-exporter` / kumina-style)
- Bash scripting, awk, iostat

## Sources Consulted
- libvirt `virsh` reference: https://libvirt.org/manpages/virsh.html (subcommands `domstats`, `dommemstat`, `domblkstat`, `domifstat`, `domblklist`, `domiflist`, `vcpuinfo`, `domjobinfo`, `domblkinfo`, `qemu-monitor-command`)
- libvirt domain statistics groups (`--cpu-total`, `--balloon`, `--interface`, `--block`) documentation
- `virt-top(1)` man page (`-d`, `--csv` options)
- `perf-kvm(1)` man page (`perf kvm stat report --event=all|vmexit|mmio|ioport`, `perf kvm stat live`)
- Kumina libvirt_exporter README (default metrics port 9177, exposed metric names)
- QEMU HMP commands (`info status`, `info balloon`, `info block`, `info network`, `info cpus`)
- systemd unit reference (Service/Install sections)

## Issues Found
No technical issues found.

## Review Notes
- `virsh dommemstat` values are documented as KiB by libvirt; the post says "KB" which is the common informal usage and is acceptable.
- `prometheus-libvirt-exporter` is available in some Debian/Ubuntu repos but may not be present on every Ubuntu release; the author's fallback to a Docker image (`alekseizakharov/libvirt-exporter`) handles that case. The more widely used image is `kumina/libvirt_exporter`, but the metric names listed in the post (e.g. `libvirt_domain_cpu_time_seconds_total`, `libvirt_domain_memory_stats_rss_bytes`) are consistent with both implementations.
- The monitoring script uses `awk 'NR==3 {print $1}'` to pick the first device from `virsh domblklist` / `domiflist`. This works because the output has two header lines followed by data, but it is brittle if libvirt ever changes its tabular output. Not a correctness bug for current libvirt versions.
- `virsh domiflist myvm | grep -v "Interface"` will leave the dashed separator line in the output. It still works as a quick filter but a stricter parser (e.g. `awk 'NR>2'`) would be cleaner.
- All commands assume libvirt 1.2+/recent QEMU, which is the case on currently supported Ubuntu releases (20.04+).
