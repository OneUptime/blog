# Validation Summary: How to Deploy WireGuard VPN with Web UI on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- WireGuard
- wireguard-tools
- wg-quick systemd service
- Linux networking commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring a WireGuard server by using the wg-quick service": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- WireGuard Quick Start, key generation and command-line usage: https://www.wireguard.com/quickstart/
- WireGuard tools wg-quick(8) manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- WireGuard tools wg(8) manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8

## Issues Found
- The post claimed to deploy WireGuard "with Web UI," but the procedure only used the CLI and `wg-quick`. Updated the title, description, and opening sentence to describe a WireGuard VPN deployment without a web UI.
- The key generation commands wrote to `/etc/wireguard` without using `sudo` for all privileged file operations. Updated the commands to create `/etc/wireguard` with restricted permissions and generate keys through `sudo sh -c`.
- The generated private key file and `wg0.conf` needed restrictive permissions because both contain private key material. Updated the commands to use `umask 077` for key files and `chmod 600` for `wg0.conf`.
- The configuration heredoc read `/etc/wireguard/private.key` as the invoking user, which can fail after restricting the private key file. Updated it to read the private key with `sudo cat` before writing the configuration.
- The `tee` command for `wg0.conf` would echo the private key to the terminal. Redirected `tee` output to `/dev/null`.
- The service management and troubleshooting examples used placeholders such as `<service-name>` and `<package-name>`. Replaced them with the concrete `wg-quick@wg0` systemd unit and `wireguard-tools` package name.

## Review Notes
The guide now matches the basic RHEL 9 `wg-quick` workflow. For a fuller production guide, future revisions could add firewalld rules, UDP 51820 exposure, IP forwarding, routing/masquerading guidance, and actual RHEL Web Console steps if the post is intended to cover a web UI.
