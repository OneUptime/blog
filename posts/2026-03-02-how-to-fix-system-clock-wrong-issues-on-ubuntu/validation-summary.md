# Validation Summary: How to Fix 'System Clock Wrong' Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu
- systemd timedatectl
- systemd-timesyncd
- chrony / chronyd / chronyc
- NTP and SNTP time synchronization
- Hardware clock / RTC
- KVM/QEMU guest agent and PTP clock
- VMware open-vm-tools
- Bash monitoring script and cron

## Sources Consulted
- Ubuntu Server documentation: Synchronize time using timedatectl and timesyncd - https://ubuntu.com/server/docs/how-to/networking/timedatectl-and-timesyncd/
- Ubuntu Server documentation: Synchronize time using chrony - https://ubuntu.com/server/docs/how-to/networking/chrony-client/
- Ubuntu Server documentation: How to serve the Network Time Protocol with chrony - https://ubuntu.com/server/docs/how-to/networking/serve-ntp-with-chrony/
- Ubuntu manpage: timedatectl(1) - local system man page
- Ubuntu manpage: systemd-timesyncd.service(8) - local system man page
- Ubuntu manpage: timesyncd.conf(5) - local system man page
- Ubuntu manpage: chrony.conf(5) - https://manpages.ubuntu.com/manpages/noble/man5/chrony.conf.5.html
- Ubuntu manpage: chronyc(1) - https://manpages.ubuntu.com/manpages/noble/man1/chronyc.1.html
- Ubuntu manpage: hwclock(8) - https://manpages.ubuntu.com/manpages/noble/man8/hwclock.8.html
- QEMU Guest Agent documentation - https://www.qemu.org/docs/master/interop/qemu-ga.html
- QEMU Guest Agent Protocol Reference - https://www.qemu.org/docs/master/interop/qemu-ga-ref
- Linux kernel documentation: PTP_KVM support - https://docs.kernel.org/virt/kvm/arm/ptp_kvm.html
- Ubuntu Community Help Wiki: VMware Tools - https://help.ubuntu.com/community/VMware/Tools

## Issues Found
- The post stated that Ubuntu uses `systemd-timesyncd` by default. This is true for Ubuntu 24.04 LTS and many older installations, but Ubuntu documentation now says Ubuntu 25.10 and newer use `chrony` by default. Updated the wording to make the version distinction clear.
- The post described `timesyncd` large-offset behavior inaccurately. The systemd documentation says `systemd-timesyncd` steps large offsets and slews smaller deltas. Reworded the large-offset section to avoid claiming that `timesyncd` only steps gradually.
- The post used `chronyd` as the systemd unit name on Ubuntu. Ubuntu documentation shows the service unit is `chrony.service`, while `chronyd` is the daemon binary. Replaced `systemctl enable --now chronyd` with `systemctl enable --now chrony.service`.
- The large-offset chrony example enabled chrony and then restarted `systemd-timesyncd`, which could leave two time daemons competing. Changed the example to stop chrony before returning to `systemd-timesyncd`.
- The KVM/QEMU VM section mixed up `kvm-clock` with a KVM PTP clock. Changed the check from `lsmod | grep kvm` to checking for `/dev/ptp*`, matching the `refclock PHC /dev/ptp0` chrony configuration.

## Review Notes
The remaining commands and configuration snippets are technically valid for the documented tools. The monitoring script is a basic local check; a production setup should integrate it with an actual alerting system rather than only logging cron output.
