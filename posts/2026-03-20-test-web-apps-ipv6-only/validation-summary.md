# Validation Summary: How to Test Web Applications with IPv6-Only Connections

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- IPv6 networking
- curl
- Linux routing with iproute2
- iptables
- Docker bridge networking
- Chrome DevTools
- Firefox about:config preferences
- Python socket and ssl modules
- strace, ss, tcpdump

## Sources Consulted
- curl IPv6 tutorial: https://curl.se/docs/tutorial.html#IPv6
- curl CURLOPT_RESOLVE documentation: https://curl.se/libcurl/c/CURLOPT_RESOLVE.html
- Docker bridge networking documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Docker networking documentation: https://docs.docker.com/network/
- Mozilla Firefox StaticPrefList source: https://raw.githubusercontent.com/mozilla-firefox/firefox/main/modules/libpref/init/StaticPrefList.yaml
- Chrome DevTools Network panel reference: https://developer.chrome.com/docs/devtools/network/reference
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- Python ssl module documentation: https://docs.python.org/3/library/ssl.html
- Linux ip-route manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- strace manual page: https://man7.org/linux/man-pages/man1/strace.1.html
- Local command help output for curl 8.5.0, iptables 1.8.10, and `ip route`

## Issues Found
- The `curl --resolve` IPv6 example did not bracket the IPv6 address. curl documentation says IPv6 addresses for resolve entries should be provided within brackets, so the command now uses `example.com:443:[2001:db8::1]` and explicitly says to replace the documentation address.
- The certificate check used a Debian/Ubuntu-specific CA bundle path. curl already validates certificates with its configured default CA store, so the command now omits the non-portable `--cacert` path.
- The IPv4-blocking iptables example included a rule with `! -d 0.0.0.0/0`, which would not block normal IPv4 destinations. It was removed, and the remaining INPUT/OUTPUT rules now include matching delete commands for restoration.
- The Docker network example claimed to be IPv6-only but did not include Docker's documented `--ipv4=false` option. The command now includes `--ipv4=false`.
- The Docker IPv6 subnet used `2001:db8:test::/64`, which is not valid IPv6 syntax because `test` is not a hexadecimal hextet. It now uses a valid ULA prefix, `fd00:dead:beef:1::/64`.
- The Docker test client targeted an assumed container IPv6 address. The example now uses the application container name on a user-defined bridge network, matching Docker's documented automatic DNS resolution.
- The application container command was foreground-only, which prevented the following test client command from running in the same sequence. It now starts detached with `-d`.
- The browser section referenced Chrome IPv6 preferences and Firefox `network.dns.disableIPv4`; Chrome does not expose a supported per-browser IPv4-disable switch, and current Firefox prefs include `network.dns.disableIPv6` and `network.dns.preferIPv6`, not `network.dns.disableIPv4`. The section now directs browser testing through an IPv6-only host/network and corrects the Firefox prefs.
- The Chrome DevTools guidance pointed to a request Headers detail as "Remote Address". Current DevTools documentation lists Remote address as a request-table column, so the guidance now says to enable the Remote address column.
- The DNS monitoring comment said an IPv6-only test should only show AAAA lookups. Dual-stack clients can still query A and AAAA, so the wording now says AAAA should be present and A-only lookups can reveal IPv4-only paths.

## Review Notes
The Python example compiles and uses current `socket.getaddrinfo`, `socket.AF_INET6`, `ssl.create_default_context`, and `SSLContext.wrap_socket` APIs. `example.com`, `https://test-ipv6.com`, and the GitHub author URL were checked and are reachable. Docker was not installed in the local environment, so Docker command validation was based on current Docker documentation rather than local execution.
