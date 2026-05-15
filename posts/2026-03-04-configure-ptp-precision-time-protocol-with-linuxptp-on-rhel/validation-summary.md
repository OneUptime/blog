# Validation Summary: How to Configure PTP (Precision Time Protocol) with linuxptp on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Precision Time Protocol (PTP / IEEE 1588)
- linuxptp
- ptp4l
- phc2sys
- ethtool
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Configuring PTP Using ptp4l": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-configuring_ptp_using_ptp4l
- linuxptp ptp4l(8) documentation: https://www.linuxptp.org/documentation/ptp4l/
- linuxptp phc2sys(8) documentation: https://www.linuxptp.org/documentation/phc2sys/
- linuxptp default configuration parameters: https://www.linuxptp.org/documentation/default/

## Issues Found
- The hardware timestamping check only told readers to look for `hardware-transmit` and `hardware-receive`. Red Hat documents that hardware timestamping support should include `SOF_TIMESTAMPING_TX_HARDWARE`, `SOF_TIMESTAMPING_RX_HARDWARE`, and `SOF_TIMESTAMPING_RAW_HARDWARE`, with a PTP Hardware Clock index. Updated the check comments accordingly.
- The grandmaster section implied that running `ptp4l` without `-s` directly runs the host as a grandmaster. `ptp4l` participates in the Best Master Clock Algorithm, so the host becomes grandmaster only if selected as the best clock. Updated the heading and command comment, and noted that priority or clock quality settings such as `priority1` should be configured to prefer the host.
- The verification section stated that offsets should be under 100 nanoseconds with hardware timestamping. This is too absolute because achievable offset depends on hardware, switches, profiles, and topology. Replaced it with a dependency-aware verification note.
- The conclusion claimed nanosecond-level accuracy generally. Red Hat documents sub-microsecond accuracy with hardware support, so the conclusion now states sub-microsecond accuracy with suitable hardware and network design.

## Review Notes
The remaining commands and configuration options are consistent with linuxptp and Red Hat documentation. The systemd service examples assume the packaged service configuration reads `/etc/ptp4l.conf` and uses the distribution defaults for `phc2sys`, which is typical on RHEL-family systems but may need `/etc/sysconfig/ptp4l` or `/etc/sysconfig/phc2sys` adjustment in specific deployments.
