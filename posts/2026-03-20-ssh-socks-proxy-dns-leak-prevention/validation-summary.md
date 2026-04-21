# Validation Summary: How to Set Up an SSH SOCKS Proxy with DNS Leak Prevention on IPv4

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenSSH dynamic SOCKS forwarding
- SOCKS5 and SOCKS5 remote hostname resolution
- curl SOCKS proxy options
- Firefox proxy settings
- dnscrypt-proxy configuration
- Chromium SOCKS proxy flags
- dig and tcpdump verification commands
- IPv4 proxy routing

## Sources Consulted
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- SOCKS Protocol Version 5, RFC 1928: https://www.rfc-editor.org/rfc/rfc1928
- curl SOCKS proxy documentation: https://everything.curl.dev/usingcurl/proxies/socks.html
- Local `curl(1)` manual for `--socks5-hostname` and `--socks5`
- dnscrypt-proxy example configuration: https://raw.githubusercontent.com/DNSCrypt/dnscrypt-proxy/master/dnscrypt-proxy/example-dnscrypt-proxy.toml
- Mozilla Firefox connection settings documentation: https://support.mozilla.org/en-US/kb/connection-settings-firefox
- Mozilla Firefox policy templates for proxy settings: https://mozilla.github.io/policy-templates/#proxy
- Mozilla Searchfox `ProxyPolicies.sys.mjs`: https://searchfox.org/firefox-main/source/browser/components/enterprisepolicies/helpers/ProxyPolicies.sys.mjs
- Chromium SOCKS proxy design document: https://www.chromium.org/developers/design-documents/network-stack/socks-proxy/
- Chromium proxy support documentation: https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md
- Local `dig(1)` and `tcpdump(8)` manuals for verification command syntax

## Issues Found
- The description claimed all IPv4 traffic goes through the SSH server. An SSH SOCKS proxy only handles traffic from applications configured to use it, so the description now says configured/proxied IPv4 traffic.
- The SSH command used `203.0.113.10` without explaining it as a placeholder. Added a short note to replace it with the user's SSH server IPv4 address and changed verification text to refer to the user's server IP.
- The post described `SOCKS5h` as if it were the SOCKS5 protocol name. Updated this to describe `socks5h` as the client/curl mode for proxy-side hostname resolution.
- The Firefox `about:config` snippet omitted `network.proxy.type: 1`, so the listed proxy preferences might not be active as manual proxy settings. Added the missing preference.
- The dnscrypt-proxy configuration used an invalid `[proxy] socks5_proxy` table. Replaced it with the documented top-level `proxy = 'socks5://127.0.0.1:1080'`.
- The dnscrypt-proxy example did not force TCP. SSH dynamic SOCKS forwarding carries TCP connections, so `force_tcp = true` is now included to prevent upstream DNS from bypassing the SOCKS proxy over UDP.
- The dnscrypt-proxy section did not state that the system resolver must use the local dnscrypt-proxy listener. Added that note and set `listen_addresses = ['127.0.0.1:53']` so the later `dig` check matches the configuration.
- The dnscrypt-proxy service command used `start` after editing configuration. Changed it to `restart` so changes are applied whether or not the service was already running.
- The Chromium comment overstated that the flags force all DNS resolution through the proxy. Updated it to the narrower documented behavior: preventing local DNS resolution for proxied URL loads.
- The dnsleaktest.com `curl` command did not actually run a browser DNS leak test. Replaced it with an instruction to open the DNS leak test in the configured proxied browser.
- The `dig` verification used `myip.opendns.com` without requiring an OpenDNS upstream and referenced port 5353 even though dnscrypt-proxy was not configured for that port. Replaced it with a local listener check against `example.com` on port 53.
- The tcpdump command assumed an `eth0` interface. Replaced it with a command that derives the external route interface on Linux before capturing port 53 traffic.
- The SSH config block was marked as `bash` even though it is an SSH config snippet. Changed the code fence to `text`.

## Review Notes
- The Chromium `--proxy-bypass-list="<-loopback>"` flag is valid, but Chromium documents security implications when overriding implicit loopback bypass rules. It is acceptable for the stated "all proxied URL loads" goal but should be used intentionally.
- The dnscrypt-proxy system-wide setup may require distribution-specific resolver configuration, especially on systems using systemd-resolved or another local resolver already bound to port 53.
