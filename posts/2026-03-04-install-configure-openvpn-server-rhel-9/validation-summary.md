# Validation Summary: How to Install and Configure an OpenVPN Server on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- OpenVPN
- Easy-RSA
- firewalld
- systemd
- Linux networking and IP forwarding

## Sources Consulted
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN 2.6 man page: https://build.openvpn.net/man/openvpn-2.6/openvpn.8.html
- Easy-RSA official documentation: https://easy-rsa.readthedocs.io/en/latest/
- Easy-RSA quickstart: https://raw.githubusercontent.com/OpenVPN/easy-rsa/master/README.quickstart.md
- Fedora EPEL 9 OpenVPN package metadata: https://packages.fedoraproject.org/pkgs/openvpn/openvpn/epel-9.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat EPEL installation guidance for RHEL 9: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The EPEL enablement command used `sudo dnf install -y epel-release`, which is not the documented RHEL 9 installation path. Updated it to enable CodeReady Linux Builder and install the EPEL release RPM from Fedora's EPEL URL.
- The TLS auth key was generated under `/etc/openvpn/server/` without elevated privileges. Added `sudo` to the `openvpn --genkey` command.
- The server and client examples used `cipher AES-256-GCM`. OpenVPN 2.5+ recommends `data-ciphers` for negotiated data-channel ciphers, so both examples now use `data-ciphers AES-256-GCM:AES-128-GCM`.
- The client configuration did not verify that the peer certificate is a server certificate. Added `remote-cert-tls server`.
- The client setup referenced separate `ca.crt`, `client1.crt`, `client1.key`, and `ta.key` files without copying them into the distribution directory. Added the missing copy commands and wrote the `.ovpn` file into that same directory.

## Review Notes
- The OpenVPN systemd unit name and `/etc/openvpn/server/server.conf` path match the EPEL 9 package layout.
- The firewalld `--add-port` and `--add-masquerade` commands are valid, but real deployments may need zone-specific rules depending on interface assignment and local routing policy.
