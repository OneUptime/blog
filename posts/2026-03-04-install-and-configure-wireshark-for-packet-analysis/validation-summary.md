# Validation Summary: How to Install and Configure Wireshark for Packet Analysis on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF package management
- Wireshark
- TShark
- Dumpcap
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, installing packages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 wireshark security advisory showing RHEL-provided `wireshark` and `wireshark-cli` packages: https://access.redhat.com/errata/RHSA-2023:6469
- Wireshark Developer's Guide, packet capture privilege separation through `dumpcap`: https://www.wireshark.org/docs/wsdg_html_chunked/ChWorksCapturePackets.html
- Wireshark `dumpcap` manual page, capture options and ring buffer syntax: https://www.wireshark.org/docs/man-pages/dumpcap.html
- Wireshark User's Guide, capturing with `dumpcap`: https://www.wireshark.org/docs/wsug_html_chunked/AppToolsdumpcap
- firewalld documentation, permanent configuration and reload behavior: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original post used placeholders such as `<package-name>` and `<service>`, which would not install or configure Wireshark. Replaced them with the RHEL package names `wireshark` and `wireshark-cli`, plus `wireshark --version` and `tshark --version` verification commands.
- The original preparation step installed EPEL and Development Tools even though the RHEL Wireshark packages are available from RHEL repositories and DNF resolves package dependencies automatically. Replaced that with a note that no EPEL package or development tool group is required for the RHEL packages.
- The original service configuration, systemd, journalctl, and service test commands were incorrect because Wireshark is not configured as a systemd service for local packet analysis. Replaced them with capture permission setup, Wireshark launch, TShark interface listing, and sample capture commands.
- The original firewall section suggested opening a generic service for Wireshark. Local packet capture does not require a firewalld service, so the section now explains that firewall changes are only relevant for remote capture workflows such as SSH access to a remote host.
- The original performance tuning commands targeted a nonexistent service process. Replaced them with `dumpcap` ring buffer options to bound capture file size during long-running captures.
- The original security and troubleshooting guidance was service-oriented rather than Wireshark-oriented. Updated it to cover non-root GUI usage, trusted capture group membership, sensitive capture files, missing interfaces, permissions, and large capture files.
- The conclusion referred to monitoring a service. Updated it to refer to Wireshark package updates and capture permission review.

## Review Notes
The sample interface name `enp1s0` is valid as an example, but users should replace it with an interface shown by `tshark -D` on their own RHEL system.
