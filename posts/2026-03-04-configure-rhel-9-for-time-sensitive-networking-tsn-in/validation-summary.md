# Validation Summary: How to Configure RHEL for Time-Sensitive Networking (TSN)

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Time-Sensitive Networking (TSN)
- Precision Time Protocol (PTP)
- linuxptp
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring time synchronization, including PTP, ptp4l, and phc2sys: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Red Hat Customer Portal: How to check if a network interface supports Precision Time Protocol (PTP): https://access.redhat.com/articles/515733
- Linux PTP documentation for ptp4l and phc2sys: https://linuxptp.nwtime.org/documentation/
- Linux kernel traffic control netlink documentation, including TAPRIO and MQPRIO attributes: https://www.kernel.org/doc/html/v6.8/networking/netlink_spec/tc.html
- TSN Documentation Project for Linux: Time synchronization with Linux PTP and TSN overview: https://tsn.readthedocs.io/

## Issues Found
- The post claims to be a step-by-step guide for configuring TSN on RHEL 9, but the implementation sections contain only generic placeholders such as `/etc/<service>/config.conf` and `<service-name>`. These are not valid RHEL TSN, PTP, linuxptp, systemd, or traffic-control commands.
- The post does not configure any TSN-related mechanism, such as PTP/gPTP synchronization with `ptp4l` and `phc2sys`, hardware timestamp support, `tc` queue disciplines such as TAPRIO/ETF/MQPRIO, or NetworkManager/systemd service configuration relevant to RHEL 9.
- The troubleshooting commands are generic service and web endpoint checks. `ss -tlnp` and `curl` do not validate TSN behavior, PTP synchronization, hardware timestamping, or deterministic Ethernet scheduling.
- Because the post is placeholder content with no salvageable TSN configuration procedure, it was marked as `not-technically-relevant`. The README was not rewritten because doing so would require replacing the article with a substantially different guide.

## Review Notes
The introductory statement that TSN relates to deterministic Ethernet and that PTP is relevant to time synchronization is directionally correct, but the body of the article does not support the title or description. A future replacement should be written around a specific supported RHEL 9 setup, compatible NIC hardware, linuxptp configuration, and the applicable Linux traffic-control queue disciplines.
