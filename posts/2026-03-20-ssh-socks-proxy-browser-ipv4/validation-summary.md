# Validation Summary: How to Route Browser Traffic Through an SSH SOCKS Proxy on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenSSH dynamic port forwarding
- SOCKS4 and SOCKS5 proxies
- IPv4 SSH connections
- Firefox proxy settings
- Chrome/Chromium proxy command-line flags
- curl SOCKS proxy options and proxy environment variables
- Linux networking inspection with `ss`

## Sources Consulted
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- Local OpenSSH client docs and parser output from OpenSSH_9.6p1
- curl command-line manual: https://curl.se/docs/manpage.html
- Chromium proxy documentation: https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md
- Chromium SOCKS proxy setup note: https://www.chromium.org/developers/design-documents/network-stack/socks-proxy/
- Mozilla Firefox connection settings help: https://support.mozilla.org/en-US/kb/connection-settings-firefox
- MDN `proxy.settings` documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/settings
- RFC 1928, SOCKS Protocol Version 5: https://www.rfc-editor.org/rfc/rfc1928
- ifconfig.me command-line output page: https://ifconfig.me/
- IANA Example Domain: https://example.com/

## Issues Found
- The introductory wording and verification comment said proxied traffic would appear from the remote server's IPv4 address. `ssh -4` and `AddressFamily inet` force the SSH connection itself to use IPv4, but they do not necessarily force the remote server's outbound connections to websites to use IPv4. Updated the wording to say the traffic appears from the remote server's public egress address.
- The "System-Wide SOCKS Proxy" section used shell environment variables, which affect tools that honor those variables rather than the whole Linux system. Renamed the heading to "CLI SOCKS Proxy Environment Variables (Linux)".
- The CLI proxy environment example used `socks5://`. curl documents `socks5://` as equivalent to `--socks5`, while `socks5h://` is equivalent to `--socks5-hostname` and lets the proxy resolve hostnames. Updated the environment variables and takeaway to use `socks5h://`.

## Review Notes
OpenSSH `-D`, `-4`, `-C`, `-f`, `-N`, `DynamicForward`, `AddressFamily inet`, `Compression`, and the server-alive options were verified as current and valid. Chrome's SOCKS5 proxy flag and host resolver rule pattern matched Chromium documentation. Firefox manual proxy configuration and proxy DNS behavior were verified against Mozilla documentation. The example author, `example.com`, and `ifconfig.me` URLs were reachable and appropriate for the post.
