# Validation Summary: How to Configure Time Synchronization with NTP

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Linux time synchronization
- NTP
- chrony / chronyd / chronyc
- systemd-timesyncd
- timedatectl
- ntpd / NTPsec
- Linux timezone and RTC configuration
- firewalld, UFW, iptables
- Prometheus monitoring

## Sources Consulted
- chrony.conf(5) official documentation: https://chrony-project.org/doc/4.1/chrony.conf.html
- Ubuntu Server chrony documentation: https://ubuntu.com/server/docs/how-to/networking/chrony-client/
- systemd-timesyncd.service(8) manual: https://man7.org/linux/man-pages/man8/systemd-timesyncd.service.8.html
- timesyncd.conf(5) manual: https://manpages.debian.org/testing/systemd-timesyncd/timesyncd.conf.5.en.html
- timedatectl(1) manual: https://man7.org/linux/man-pages/man1/timedatectl.1.html
- Red Hat Enterprise Linux 7 ntpd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-configuring_ntp_using_ntpd
- NTPsec ntpd documentation: https://docs.ntpsec.org/latest/ntp_conf.html
- Google Public NTP documentation: https://developers.google.com/time
- Cloudflare Time Services NTP documentation: https://developers.cloudflare.com/time-services/ntp/
- NTP Pool Project usage guidance: https://www.ntppool.org/en/zone/us

## Issues Found
- The chrony service commands used `chronyd` everywhere. This is correct for RHEL/CentOS/Rocky and Arch, but Ubuntu documents the service as `chrony.service`. Updated status/start/enable examples to show `chrony` for Debian/Ubuntu and `chronyd` for RHEL/CentOS/Rocky/Arch.
- The examples mixed `time.google.com` with `pool.ntp.org` and `time.cloudflare.com`. Google Public NTP uses leap smearing, while Cloudflare explicitly warns that mixing smearing and non-smearing sources can cause anomalous results. Removed `time.google.com` from mixed-source configurations and updated the best-practices diagram to warn against mixing leap-smearing and non-smearing sources.
- The systemd-timesyncd enablement section manually enabled and started `systemd-timesyncd`; official systemd documentation recommends `timedatectl set-ntp true` to enable and start the available synchronization service. Updated the command accordingly after disabling other NTP services.
- The traditional ntpd section assumed `ntp` and `ntpd.service` across Debian/Ubuntu and RHEL. Modern Debian/Ubuntu commonly uses NTPsec, with different package/service/config paths. Added the NTPsec package, service, and `/etc/ntpsec/ntp.conf` path while preserving the legacy ntpd examples.
- The chrony symmetric key example generated a SHA1 key without the documented `HEX:` prefix. Updated it to a SHA256 key using `HEX:` and a 256-bit random value, matching chrony's keyfile format guidance.
- The chrony key ownership command assumed the `chrony` group everywhere. Added a note that Debian/Ubuntu may use `_chrony`.

## Review Notes
- Most core chrony directives in the post (`pool`, `server`, `allow`, `local stratum`, `driftfile`, `rtcsync`, `makestep`, `logdir`, `log`, and `hwtimestamp *`) match current chrony documentation.
- The systemd-timesyncd settings shown (`NTP`, `FallbackNTP`, `RootDistanceMaxSec`, `PollIntervalMinSec`, and `PollIntervalMaxSec`) match current systemd documentation.
- The ntpd section is best treated as legacy guidance. For new Linux deployments, chrony or a current NTPsec setup is usually more appropriate.
