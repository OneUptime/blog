# Validation Summary: How to Capture and Analyze Network Traffic with tcpdump and Wireshark on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF
- tcpdump
- Wireshark
- TShark
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 documentation, "Package manifest": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Red Hat Enterprise Linux 8 documentation, "Capturing network packets": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/capturing-network-packets_configuring-and-managing-networking
- Wireshark TShark manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark manual page: https://www.wireshark.org/docs/man-pages/wireshark
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html

## Issues Found
- The original post used placeholder package commands such as `sudo dnf install -y <package-name>` and `rpm -qi <package-name>`, which would not install or verify tcpdump or Wireshark. Replaced them with `tcpdump`, `wireshark-cli`, and `wireshark` package commands.
- The original post installed `epel-release` and the `"Development Tools"` group as generic dependencies. These are not required for normal tcpdump or Wireshark use on RHEL, so the step now verifies enabled repositories instead.
- The original post treated packet capture as a systemd service with `<service>` placeholders. tcpdump and Wireshark are command-line and GUI packet analysis tools, not a service that should be enabled with `systemctl`, so those commands were replaced with real capture and analysis commands.
- The original firewall step suggested adding an unspecified service to firewalld. Local packet capture does not require opening inbound firewall ports, so the step now explains that no firewall rule is needed for local capture and shows how to inspect firewall state.
- The original security guidance mentioned service users and TLS/SSL for a generic network service. Replaced it with packet-capture-specific guidance about minimizing capture scope, protecting pcap files, and keeping packages updated.
- The original troubleshooting section referred to generic service startup, permissions, and port conflicts. Replaced it with tcpdump/Wireshark-specific troubleshooting for interface selection, sudo permissions, SELinux-aware directory checks, and capture file growth.

## Review Notes
The corrected commands use common RHEL package management and upstream tcpdump/Wireshark options. Future improvements could add examples for remote capture, non-root capture permissions, and display filter basics, but those would be content expansion rather than validation fixes.
