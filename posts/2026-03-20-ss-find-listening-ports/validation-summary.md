# Validation Summary: How to Find All Listening Ports with ss -l

## Status
validated

## Post Type
Tutorial / command-line guide

## Technologies Covered
- Linux `ss` / iproute2
- TCP and UDP listening sockets
- Bash shell commands
- IPv4 and IPv6 socket binding
- NGINX `listen` directives

## Sources Consulted
- Local `ss --help`, `ss -V`, and `man ss` output from iproute2 6.1.0.
- iproute2 `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- NGINX `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Linux kernel IP sysctl documentation for `bindv6only` / `IPV6_V6ONLY`: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html

## Issues Found
- The sample `ss -tulnp` output omitted the `Peer Address:Port` column. Updated the output example so the columns match real `ss` output.
- The `0.0.0.0` explanation implied guaranteed external accessibility. Reworded it to say the socket is potentially externally reachable if firewall and routing allow it.
- The IPv4 wildcard audit used `grep '0.0.0.0:'`, which can also match the peer-address column. Changed it to filter the local-address field with `awk`.
- The baseline and port-range examples only handled TCP and the shell port parser could miss IPv6 addresses. Updated them to use `-tulnp`, `-H`, and `ss`'s native `sport` filter.
- The wait-for-port script ignored the `HOST` variable and matched any listener on the port. Updated it to check the requested host plus IPv4 and IPv6 wildcard listeners.
- The IPv6 section implied `[::]:80` was always IPv6-only. Clarified that an IPv6 wildcard socket may accept IPv4-mapped connections when `IPV6_V6ONLY` is off, and changed the check to use `ss`'s `sport = :80` filter.

## Review Notes
UDP sockets are displayed by `ss` with state `UNCONN`, which is expected for UDP services. Process details from `ss -p` may require elevated privileges; the command syntax was verified locally without `sudo` where privilege escalation was unavailable.
