# Validation Summary: How to Install and Set Up Wireshark for IPv4 Packet Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Wireshark GUI
- TShark
- tcpdump
- Linux packet-capture permissions (`dumpcap`, Linux capabilities, `wireshark` group)
- APT and DNF package installation
- Homebrew casks on macOS
- SSH and SCP for remote capture transfer

## Sources Consulted
- Wireshark User's Guide, "Start Capturing": https://www.wireshark.org/docs/wsug_html_chunked/ChCapCapturingSection
- Wireshark User's Guide, capture and display filtering sections: https://www.wireshark.org/docs/wsug_html/
- Wireshark `wireshark(1)` man page: https://www.wireshark.org/docs/man-pages/wireshark.html
- Wireshark `tshark(1)` man page: https://www.wireshark.org/docs/man-pages/tshark.html
- Wireshark Developer's Guide, "Binary Packaging" privilege section: https://www.wireshark.org/docs/wsdg_html_chunked/ChSrcBinary.html
- Wireshark capture privileges guide: https://wiki.wireshark.org/CaptureSetup/CapturePrivileges
- Wireshark User's Guide, `tcpdump` appendix: https://www.wireshark.org/docs/wsug_html_chunked/AppToolstcpdump.html
- Homebrew cask page for Wireshark GUI: https://formulae.brew.sh/cask/wireshark-app
- Homebrew formula page for CLI-only `wireshark`: https://formulae.brew.sh/formula/wireshark
- Fedora package page for `wireshark`: https://packages.fedoraproject.org/pkgs/wireshark/wireshark/
- Debian package page for `tshark`: https://packages.debian.org/stable/net/tshark
- `tcpdump(8)` man page: https://man7.org/linux/man-pages/man8/tcpdump.8.html

## Issues Found
- The Fedora/RHEL example used `yum install wireshark wireshark-qt`, which does not match current package naming on current Fedora/RHEL-compatible systems. I changed it to `dnf install wireshark`.
- The macOS Homebrew command used the older `wireshark` cask token. Current Homebrew publishes the GUI app as `wireshark-app`, so I updated the command.
- The permissions section described the method as a setuid approach even though the commands were using Linux capabilities on `dumpcap`. I corrected the explanation and aligned the `setcap` syntax with current Wireshark guidance.
- The live `tshark` examples used `sudo` even though the post is explicitly configuring non-root capture and Wireshark recommends privilege separation instead of running the analyzer as root. I removed `sudo` from those examples.
- The remote streaming `tcpdump` example omitted `-U`, which can buffer capture output instead of streaming packets promptly to Wireshark. I added `-U` and quoted the remote command.

## Review Notes
- `wireshark -i eth0` is valid for selecting an interface from the command line. If the intent is to begin capturing immediately, Wireshark's documented form is `wireshark -i eth0 -k`.
- The Linux permission steps are distro-specific. Debian-family installs often handle the `wireshark` group during package configuration; other distros may package `dumpcap` privileges slightly differently.
