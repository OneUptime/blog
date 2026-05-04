# Validation Summary: How to Set Up Container DNS Resolution in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (embedded DNS resolver at 127.0.0.11)
- Docker Compose (dns, dns_search, dns_opt, extra_hosts)
- Docker daemon configuration (daemon.json)
- Portainer (container exec for DNS testing)
- Unbound DNS resolver (split-horizon configuration, DoT forwarding)
- dnsmasq (DNS caching)
- iptables (DOCKER_OUTPUT chain)
- nslookup, tcpdump (DNS troubleshooting tools)

## Sources Consulted
- Docker networking and embedded DNS documentation: https://docs.docker.com/engine/network/#dns-services
- Docker daemon configuration reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose reference (dns, dns_search, dns_opt, extra_hosts): https://docs.docker.com/reference/compose-file/services/
- Unbound configuration manual (forward-zone, forward-tls-upstream): https://nlnetlabs.nl/documentation/unbound/unbound.conf/
- dnsmasq man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- mvance/unbound Docker Hub image documentation
- resolv.conf options (ndots, timeout, attempts) - resolv.conf(5) man page

## Issues Found
No technical issues found.

All technical claims are accurate:
- 127.0.0.11 is the correct address for Docker's embedded DNS resolver
- `options ndots:0` matches what Docker injects into containers in user-defined networks
- Docker Compose service-level keys (`dns`, `dns_search`, `dns_opt`, `extra_hosts`) are correctly named and used
- daemon.json keys (`dns`, `dns-search`, `dns-opts`) are correct
- Unbound `forward-addr IP@PORT#tls-auth-name` syntax is correct for DNS-over-TLS
- The `DOCKER_OUTPUT` iptables chain in the nat table is indeed where Docker installs the DNS interception rules
- Port mappings to mvance/unbound (container port 5335) align with the example unbound.conf
- `extra_hosts` colon-separated syntax (`hostname:ip`) is valid Compose syntax
- Referenced images (mvance/unbound, jpillora/dnsmasq, nicolaka/netshoot) all exist on Docker Hub

## Review Notes
- The introduction states the embedded DNS "runs at 127.0.0.11 inside every container." Technically, the embedded DNS resolver is only used for service-name resolution in user-defined networks; the default `bridge` network uses /etc/hosts and the legacy `--link` mechanism. However, since Compose deployments (the focus of this post) always create user-defined networks by default, this simplification is acceptable for the audience.
- `version: "3.8"` in the Compose snippets is now obsolete in modern Compose v2 (the version field is ignored), but it does not cause errors and is still widely seen.
- The `// /etc/docker/daemon.json` line at the top of the JSON snippet is annotation only and not valid JSON; readers should not paste the `//` comment line into the actual file. This is a common tutorial convention and is unlikely to cause confusion.
- The snippet showing the unbound service in Step 4 omits the `services:` parent key, presenting it as a continuation. Readers integrating it into a fresh compose file would need to nest it correctly under `services:`.
