# Validation Summary: How to Configure PF_RING for High-Speed Packet Capture on Ubuntu

## Status
validated

## Post Type
Tutorial / technical configuration guide

## Technologies Covered
- Ubuntu
- Linux kernel modules and module loading
- PF_RING and PF_RING ZC
- Intel NIC ZC drivers
- ethtool
- Linux huge pages
- PF_RING tools: pfcount and pfsend
- Suricata PF_RING capture
- Linux sysctl networking tunables

## Sources Consulted
- PF_RING Installing from GIT: https://www.ntop.org/guides/pf_ring/get_started/git_installation.html
- PF_RING Installing from packages: https://www.ntop.org/guides/pf_ring/get_started/packages_installation.html
- PF_RING ZC documentation: https://www.ntop.org/guides/pf_ring/zc.html
- PF_RING sample applications documentation: https://www.ntop.org/guides/pf_ring/examples.html
- PF_RING Load Balancing / RSS documentation: https://www.ntop.org/guides/pf_ring/rss.html
- PF_RING current GitHub source tree and sample tool help text: https://github.com/ntop/PF_RING
- Suricata PF_RING configuration documentation: https://docs.suricata.io/en/suricata-7.0.6/configuration/suricata-yaml.html
- Suricata 8 PF_RING plugin upgrade note: https://docs.suricata.io/en/latest/upgrade/8.0-pfring-plugin.html
- Suricata command line manual: https://docs.suricata.io/en/latest/manpages/suricata.html
- systemd modules-load.d manual: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html

## Issues Found
- The `/etc/modules-load.d/pf_ring.conf` example included a module parameter on the module line. `modules-load.d` files should contain module names only, so the example was changed to write `pf_ring` there and keep `min_num_slots=65536` in `/etc/modprobe.d/pf_ring.conf`.
- The NIC ring buffer command described `4096` as "maximum", but the supported maximum is NIC and driver dependent. The wording now tells readers to adjust the value to one supported by their NIC.
- The PF_RING ZC driver build/load flow used a non-current `Makefile.pf_ring` and `modprobe i40e-zc` sequence. The current PF_RING source and docs use `./configure && make` under `drivers/intel` and the driver's `load_driver.sh`, so the commands were updated.
- The hugepage comment said "Allocate 1GB huge pages" while the command allocates 1024 2MB huge pages, which is 2GB total. The comment was corrected.
- The `pfcount` examples used `-w /tmp/capture.pcap` for pcap output, but current `pfcount` uses `-o <path>` for pcap dumps and `-w` for watermark. The capture command was changed to `pfcount -i eth1 -o /tmp/capture`.
- The `pfcount -i eth1 -s -v` example was invalid because `-v` requires a mode argument, and `-s` enables hardware timestamping rather than general statistics. It was changed to `pfcount -i eth1 -v 1` with a corrected comment.
- The `pfsend -r 1` and `-r 10` comments described replay speed multipliers, but current `pfsend` uses `-r` for Gbit/s and `-r -1` for pcap capture rate. The examples were corrected.
- The ZC `zc:eth1@1` examples described workers of a ZC cluster, but that syntax identifies RSS queues on a multi-queue ZC interface. The comments were corrected to queue terminology.
- Suricata 8.x moved PF_RING support behind a dynamically loaded plugin. A short plugin-loading snippet was added before the existing PF_RING configuration example.
- The monitoring section used `cat /proc/net/pf_ring/0/`, but current PF_RING per-socket statistics are exposed under generated files in `/proc/net/pf_ring/stats/`. The example now lists that directory and shows the generated filename pattern.

## Review Notes
The guide remains source-build oriented. PF_RING's official documentation also recommends package-based installation with the `pf_ring` systemd service and `pf_ringcfg` for many Ubuntu deployments, which may be easier to maintain across kernel updates.
