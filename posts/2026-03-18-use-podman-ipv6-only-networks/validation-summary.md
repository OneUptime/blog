# Validation Summary: How to Use Podman with IPv6-Only Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- IPv6
- Linux networking
- NAT64 / DNS64
- Jool
- BIND 9
- Pi-hole
- Nginx

## Sources Consulted
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network create` documentation for Podman 4.4: https://docs.podman.io/en/v4.4/markdown/podman-network-create.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman network inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Pi-hole Docker configuration documentation: https://docs.pi-hole.net/docker/configuration/
- ISC BIND 9 Docker image documentation: https://hub.docker.com/r/internetsystemsconsortium/bind9
- BIND 9 configuration reference: https://bind9.readthedocs.io/en/v9.20.16/reference.html
- Jool Stateful NAT64 run documentation: https://www.jool.mx/en/run-nat64.html
- Jool DNS64 documentation: https://www.jool.mx/en/dns64.html
- Jool `instance` mode documentation: https://www.jool.mx/en/usr-flags-instance.html

## Issues Found
- The IPv6-only network section incorrectly said `--ipv6` should be omitted for a true IPv6-only Podman network. Current Podman docs show `--ipv6` should be used with an IPv6 subnet for this case, so I corrected both the explanation and the command.
- The dual-stack section implied `--ipv6` was required even when both IPv4 and IPv6 subnets are explicitly provided. Podman’s documented dual-stack example creates that network by specifying both subnets directly, so I removed the flag and clarified the wording.
- The port-publishing example described `[::]:8080:80` as binding to a specific IPv6 address, but `[::]` is the IPv6 wildcard address. I corrected the description and added a matching IPv6 access test for port `8080`.
- The Pi-hole example used deprecated `DNS1` and `DNS2` environment variables. I replaced them with the current `FTLCONF_dns_upstreams` syntax and added `FTLCONF_dns_listeningMode=all` to match current Pi-hole container guidance for bridge-style networking.
- The DNS64 setup wrote `~/dns64/named.conf` without creating the parent directory. I added `mkdir -p ~/dns64` so the snippet works as written.
- The NAT64 validation step used `ipv4only.example.com`, which is only a documentation placeholder and not a working target. I replaced it with a DNS64 lookup of `nat64-tutorial.mx` and a direct NAT64 reachability test to `64:ff9b::8.8.8.8`.
- The Nginx reverse-proxy example wrote into `~/nginx-ipv6/conf.d` without creating the directory first. I added `mkdir -p ~/nginx-ipv6/conf.d`.
- The IPv6 forwarding section used `sudo cat > /etc/sysctl.d/...`, which fails because shell redirection occurs before `sudo` is applied. I changed it to `sudo tee ... > /dev/null`.
- The troubleshooting section suggested pinging `fe80::1%eth0` as if it were a predictable gateway. Link-local gateway addresses are not guaranteed to use `fe80::1`, so I changed the test to the configured gateway address `fd00:dead:beef::1`.

## Review Notes
- The post’s remaining Podman CLI usage, including `--ip6`, `--dns`, published port syntax, and inspect-template fields such as `.GlobalIPv6Address`, matched current Podman documentation.
- The post pins `internetsystemsconsortium/bind9:9.18`; that is acceptable, but readers may choose a newer supported BIND tag depending on their environment.
- Jool packaging can vary by distribution, so the installation step may still require distro-specific package adjustments even though the module-loading and `jool instance add --netfilter --pool6 ...` workflow matches upstream Jool documentation.
