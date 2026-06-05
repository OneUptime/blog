# Validation Summary: How to Limit Network Bandwidth for Docker Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Linux traffic control (`tc`)
- Token Bucket Filter (`tbf`)
- Network Emulator (`netem`)
- Wondershaper
- Pumba
- iperf3

## Sources Consulted
- Docker documentation: Running containers and Linux capabilities: https://docs.docker.com/engine/containers/run/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Linux `tc-tbf(8)` manual page: https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- Linux `tc-netem(8)` manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Pumba network chaos documentation: https://github.com/alexei-led/pumba/blob/master/docs/network-chaos.md
- Wondershaper usage documentation: https://github.com/magnific0/wondershaper
- Docker Hub `networkstatic/iperf3` image documentation: https://hub.docker.com/r/networkstatic/iperf3/
- Local command/package checks: `docker --version`, `tc -V`, `ip -V`, `man tc-tbf`, `man tc-netem`, `apt-cache show iproute2`, `apt-cache show wondershaper`

## Issues Found
- Ubuntu container examples used `tc` before installing it. Added `apt-get install -y iproute2` before the first `tc` command because `tc` is provided by the `iproute2` package and is not guaranteed to be present in a minimal Ubuntu container.
- The host-side veth discovery used the container interface index, which does not reliably identify the host peer. Changed it to read `/sys/class/net/eth0/iflink` inside the container network namespace and match that peer index with `ip -o link` on the host.
- The combined `netem` plus `tbf` examples attached `tbf` beneath `netem`, which is not the documented pattern for this use case. Replaced those examples with documented `netem rate` usage combined with `delay` and `loss`.
- The Pumba examples used the older `gaiaadm/pumba` image and did not specify the current documented nettools helper image. Updated them to `ghcr.io/alexei-led/pumba:latest` with `--tc-image ghcr.io/alexei-led/pumba-alpine-nettools:latest`.
- The description and introduction claimed the post covered Docker plugins and proxy-based throttling, but the body covered `tc`, Wondershaper, `netem`, and Pumba. Updated the wording to match the actual technical content.

## Review Notes
The examples shape egress traffic from the interface where the qdisc is installed. Host-side shaping on the host veth egress controls traffic entering the container; inbound shaping for other cases may require IFB, ingress qdiscs, or Pumba's iptables-based incoming traffic features.
