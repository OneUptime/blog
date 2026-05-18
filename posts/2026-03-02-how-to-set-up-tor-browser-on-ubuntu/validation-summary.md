# Validation Summary: How to Set Up Tor Browser on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tor / Tor Browser
- Tor Browser Launcher (torbrowser-launcher)
- Ubuntu (20.04 / 22.04 / 24.04)
- APT package management and deb822-style signed-by repository configuration
- Flatpak / Flathub
- GPG signature verification (WKD key location, `gpg --verify`)
- Tor pluggable transports (obfs4, meek, Snowflake)
- Tor relay configuration (`torrc`, `ORPort`, `RelayBandwidthRate`, `RelayBandwidthBurst`)
- systemd (`systemctl`) and `timedatectl`

## Sources Consulted
- Tor Project APT repository setup docs: https://support.torproject.org/apt/tor-deb-repo/
- Tor Browser signature verification docs: https://support.torproject.org/tbb/how-to-verify-signature/
- Flathub listing for the official Tor Browser Launcher: https://flathub.org/apps/org.torproject.torbrowser-launcher
- Flathub repo for the legacy launcher package: https://github.com/flathub/com.github.micahflee.torbrowser-launcher
- torbrowser-launcher upstream (Tor Project mirror): https://github.com/torproject/torbrowser-launcher
- Tor manual (`tor(1)`) for `torrc` directive syntax (ORPort, RelayBandwidthRate, etc.)

## Issues Found
- **Outdated Flatpak application ID.** The post installed and updated `com.github.micahflee.torbrowser-launcher`, which is the legacy app ID. The Tor Project's currently maintained Flathub package is `org.torproject.torbrowser-launcher`. Updated both the `flatpak install` and `flatpak update` commands to use the new ID.

## Review Notes
- The Tor Project signing key fingerprint quoted in the post (`EF6E 286D DA85 EA2A 4BA7 DE68 4E2C 6E87 9329 8290`) matches the official Tor Browser Developers signing key (`0xEF6E286DDA85EA2A4BA7DE684E2C6E8793298290`).
- The apt repository GPG key URL (`https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc`) and `signed-by` apt source format are valid. The post uses the keyring filename `tor-archive-keyring.gpg` rather than the official docs' `deb.torproject.org-keyring.gpg`; this is a naming preference and works correctly because the apt source line references the same path consistently.
- The official verification workflow in Tor's docs uses `gpgv --keyring ./tor.keyring …`. The post's approach (`gpg --auto-key-locate nodefault,wkd --locate-keys …` followed by `gpg --verify`) is a valid alternative that imports the key into the default keyring before verifying.
- The Tor Browser version referenced in the Direct Download section (`13.0.16`) is a real release but may be outdated by the time readers follow this guide; users should check https://www.torproject.org/download/ for the current version. Direct version pinning in a tutorial like this is acceptable as illustrative.
- The window size claim (1000x1000 initial) matches Tor Browser's letterboxing defaults (rounded to multiples of 200x100).
- `meek` is mentioned as a common pluggable transport; in practice, modern Tor Browser primarily ships obfs4 and Snowflake, with meek-azure having been deprecated. The post's framing as "common bridge types" is still technically accurate as background information.
- `RelayBandwidthRate 100 KB` is accepted by Tor's config parser (KBytes alias). No change needed.

Sources:
- [Tor Project APT repository setup](https://support.torproject.org/apt/tor-deb-repo/)
- [How to verify Tor Browser signatures](https://support.torproject.org/tbb/how-to-verify-signature/)
- [Flathub: org.torproject.torbrowser-launcher](https://flathub.org/apps/org.torproject.torbrowser-launcher)
- [GitHub: torproject/torbrowser-launcher](https://github.com/torproject/torbrowser-launcher)
