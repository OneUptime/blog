# Validation Summary: How to Configure VNC over IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- TigerVNC server (Xvnc, vncserver wrapper)
- TigerVNC vncviewer client
- x11vnc
- Remmina (mentioned)
- systemd unit files
- ss (iproute2)
- UFW and ip6tables
- SSH local port forwarding
- IPv6 addressing and bracket notation

## Sources Consulted
- TigerVNC upstream Xvnc man page (github.com/TigerVNC/tigervnc, `unix/xserver/hw/vnc/Xvnc.man`)
- TigerVNC upstream vncviewer man page (github.com/TigerVNC/tigervnc, `vncviewer/vncviewer.man`)
- TigerVNC parameter definitions (`UseIPv4`, `UseIPv6`, `Interface`) in the server source
- x11vnc source / help output (github.com/LibVNC/x11vnc, `help.c` describing `-6`, `-listen`, `-no6`)
- Ubuntu 24.04 package metadata for `tigervnc-standalone-server` (1.13.1)
- ss(8) output conventions for IPv6 dual-stack sockets (`:::port`)
- SSH command syntax for IPv6 literal hosts and `-6` flag

## Issues Found

1. **Invalid Xvnc option `-rfbListen`** — This flag does not exist in TigerVNC. The correct option to restrict listening to a specific interface (including the IPv6 wildcard `::`) is `-interface`. Fixed both the inline `vncserver` example and the systemd `ExecStart=` line to use `-interface ::` instead of `-rfbListen ::`. Also reworded the surrounding paragraph to note that TigerVNC 1.12+ already listens on both address families by default (via `-UseIPv4` / `-UseIPv6`), so the `-interface` flag is only needed for explicit binding.

2. **Incorrect vncviewer IPv6 syntax** — The post's two vncviewer examples had the colon/double-colon semantics swapped:
   - `vncviewer [2001:db8::10]:5901` was presented as the normal connection example. In TigerVNC vncviewer, `host:N` means *display N* (port 5900 + N), so this form actually resolves to display 5901 (port 11801), not port 5901.
   - `vncviewer [2001:db8::10]::1` was labeled "short-form display number". The double-colon form `host::port` is interpreted as a literal TCP port, so this would have connected to port 1, not display 1.

   Fixed to use the correct idioms: `vncviewer [2001:db8::10]:1` for the display-number form (port 5901) and `vncviewer [2001:db8::10]::5901` for the explicit-port form.

3. **x11vnc IPv6 invocation** — The example used `-listen ::` to enable IPv6. In x11vnc, `-listen` is passed to LibVNCServer as the IPv4 bind address; enabling IPv6 requires the separate `-6` flag. Replaced `-listen ::` with `-6` so the command actually accepts IPv6 connections.

## Review Notes

- The Remmina connection hint (`[2001:db8::10]:5901`) was left as-is. Remmina's VNC plugin parses `host:port` with port treated literally, so the bracketed-IPv6 + port format works in Remmina even though the identical string would mean "display 5901" for TigerVNC vncviewer. Worth being aware of if readers paste the same string into multiple clients.
- The `ip6tables-save | tee /etc/ip6tables.rules` step writes to a non-standard path. On Debian/Ubuntu, `iptables-persistent` expects `/etc/iptables/rules.v6`; on RHEL/Fedora, `/etc/sysconfig/ip6tables`. The chosen path will not be restored automatically on reboot unless the user wires up their own unit. Kept as-written since it is not technically incorrect, but readers using persistence packages should adjust.
- The `ss` expected-output line (`:::5901  :::*`) matches the typical iproute2 rendering for a dual-stack IPv6 wildcard socket and is correct.
- TigerVNC's `-localhost no` is the documented way to lift the default localhost restriction; kept as-is.
- The systemd `ExecStart=` uses `590%i`, which works for single-digit display numbers (`:1` → 5901, `:9` → 5909) but breaks for double-digit displays. Not a bug for the typical use case, but a caveat worth keeping in mind.
