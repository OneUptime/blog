# Validation Summary: How to Install ClickHouse on Windows with WSL

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse (server and client)
- Windows Subsystem for Linux (WSL2)
- Ubuntu 22.04
- systemd (under WSL2)
- PowerShell / `netsh interface portproxy`
- APT package management

## Sources Consulted
- ClickHouse official install docs: https://clickhouse.com/docs/en/install (DEB/Ubuntu instructions and GPG key import)
- Microsoft WSL install docs: https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft WSL networking docs: https://learn.microsoft.com/en-us/windows/wsl/networking (localhost forwarding behavior)
- Microsoft WSL systemd support docs: https://learn.microsoft.com/en-us/windows/wsl/systemd (`/etc/wsl.conf` `[boot] systemd=true`)
- Microsoft `wsl.exe` CLI reference: https://learn.microsoft.com/en-us/windows/wsl/basic-commands (`wsl --install`, `--set-default-version`, `-d`)
- `netsh interface portproxy` reference: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface-portproxy

## Issues Found
1. **Missing GPG key import for the ClickHouse APT repository.** The original snippet referenced `signed-by=/usr/share/keyrings/clickhouse-keyring.gpg` in the sources list but never created that keyring file. As written, `apt-get update` would fail (or warn that the keyring is missing) and `apt-get install` would not be able to verify the package signatures. Added the official `gpg --recv-keys 8919F6BD2B48D754` step that creates the keyring at the expected path, and added `arch=${ARCH}` to the `deb` line to match the official ClickHouse install instructions.
2. **Misleading `netsh portproxy` command.** The original used `connectaddress=localhost`, which forwards Windows port 8123 to Windows' own loopback. WSL2's automatic localhost forwarding only bridges Windows `localhost` to WSL2 processes that bind to `0.0.0.0` (or the eth0 IP), not to processes bound to `127.0.0.1` inside WSL2. Replaced with a snippet that captures the WSL2 IP via `wsl hostname -I` and uses it as `connectaddress`. Also clarified that the proxy is only needed when exposing the service to other LAN machines — Windows-local tools can reach WSL2 directly via localhost (when bound to `0.0.0.0`) or via the WSL2 IP.

## Review Notes
- The post pins a specific common-static `.deb` URL (`clickhouse-common-static_24.3.3.102_amd64.deb`) but never installs it — it is shown only as an alternative to the repository approach. This is fine, but readers should know the version will become stale; the repository path is preferred for ongoing updates.
- `wsl --set-default-version 2` is correct, but on modern Windows 11 with `wsl --install`, version 2 is already the default. The command is harmless and a useful safety net for older systems.
- Newer WSL2 versions (Windows 11 23H2+ with `wsl.exe` 2.0+) support **mirrored networking mode** (`networkingMode=mirrored` in `.wslconfig`), which makes `localhost` work transparently in both directions and removes the need for `netsh portproxy` entirely. Worth mentioning in a future revision.
- ClickHouse binds to `127.0.0.1` by default in `/etc/clickhouse-server/config.xml`. To expose it to Windows tools, users may need to uncomment `<listen_host>::</listen_host>` (or `0.0.0.0`) in the config. The post does not call this out — a future revision could add a one-liner about it.
- The `[boot] systemd=true` flag and the corresponding `wsl --shutdown` requirement are correctly described; just note that the post says "restart WSL" without giving the explicit `wsl --shutdown` command, which may trip up beginners.
