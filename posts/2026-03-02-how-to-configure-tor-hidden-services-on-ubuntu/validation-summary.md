# Validation Summary: How to Configure Tor Hidden Services on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Tor onion services
- Tor Project Debian package repository
- Nginx
- UFW
- OpenSSL and X25519 client authorization keys
- OpenSSH ProxyCommand and OpenBSD netcat
- systemd journal logging

## Sources Consulted
- Tor Project Support: Debian / Ubuntu Tor package repository, https://support.torproject.org/apt/tor-deb-repo/
- Tor Project Community: Set up Your Onion Service, https://community.torproject.org/en/onion-services/setup/
- Tor Project Community: Client Authorization, https://community.torproject.org/onion-services/advanced/client-auth/
- Debian torrc(5) manual page for HiddenServiceDir and HiddenServicePort, https://manpages.debian.org/stretch-backports/tor/torrc.5.en.html
- Ubuntu nc_openbsd(1) manual page for `-x` and `-X` proxy options, https://manpages.ubuntu.com/manpages/jammy/man1/nc_openbsd.1.html
- Cryptography X25519 documentation, https://cryptography.io/en/latest/hazmat/primitives/asymmetric/x25519/
- Tor Project status note on v2 onion service deprecation, https://status.torproject.org/issues/2021-05-6-v2-deprecation/

## Issues Found
- The Tor repository setup used a custom keyring path. The commands would initially work, but the Tor Project documents `/usr/share/keyrings/deb.torproject.org-keyring.gpg`, which aligns with the `deb.torproject.org-keyring` package used to keep signing keys current. Updated the keyring path and added installation of `gnupg` and `lsb-release`, which the setup commands require.
- The client authorization Python snippet used `private_bytes_raw()` and `public_bytes_raw()`, which are convenience methods added in newer `cryptography` releases and are not reliable for Ubuntu 22.04's packaged Python cryptography version. Replaced the snippet with the Tor Project documented OpenSSL/basez workflow for v3 onion-service client authorization keys.
- The SSH-over-Tor example did not explicitly select SOCKS5. OpenBSD netcat defaults to SOCKS5 when `-X` is omitted, but the documented option exists and makes the intended Tor SOCKS proxy behavior explicit. Added `-X 5`.
- The monitoring section referenced `/var/log/tor/log`, which is not a reliable default path for Tor's packaged systemd service on modern Ubuntu/Debian systems. Replaced those examples with `journalctl` and `systemctl` commands that cover the common `tor@default.service` and `tor.service` units.

## Review Notes
The core onion service configuration, v3 address description, multiple `HiddenServiceDir` usage, `HiddenServicePort` syntax, localhost binding recommendation, and UFW examples are technically consistent with Tor and Ubuntu behavior. Future improvements could mention Unix sockets for onion services and Tor Browser's separate SOCKS port behavior, but those are enhancements rather than correctness fixes.
