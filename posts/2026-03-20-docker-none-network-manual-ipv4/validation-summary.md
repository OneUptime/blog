# Validation Summary: How to Use Docker none Network Mode and Manually Configure IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine container networking
- Docker CLI (`docker run`, `docker exec`, `docker inspect`)
- Linux network namespaces
- `nsenter`
- `iproute2` (`ip link`, `ip addr`, `ip route`)
- `iptables`
- CNI and Kubernetes networking concepts

## Sources Consulted
- Docker Docs: None network driver — https://docs.docker.com/engine/network/drivers/none/
- Docker Docs: `docker container run` — https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: `docker container exec` — https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: `docker inspect` — https://docs.docker.com/reference/cli/docker/inspect/
- CNI Specification — https://www.cni.dev/docs/spec/
- CNI `ptp` plugin docs — https://www.cni.dev/plugins/v0.8/main/ptp/
- Linux `nsenter` manual — https://man7.org/linux/man-pages/man1/nsenter.1.html
- Linux `ip-link` manual — https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `ip-address` manual — https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux `ip-route` manual — https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `iptables` manual — https://man7.org/linux/man-pages/man8/iptables.8.html

## Issues Found
- The original startup example used `docker run -it --network none alpine sh`, but the later steps assumed a named container called `my-container` that was still running. I changed the flow to start a detached named container and then open a shell with `docker exec` so the later `docker inspect` and namespace steps work against the same running container.
- The route example added a default route as if it were always required. I marked that step as optional and added `dev veth-ctr` because a default route is only needed when the host is going to forward traffic beyond the directly connected veth network.
- The CNI comparison said Kubernetes CNI plugins use `nsenter` to configure the pod-side interface. I changed that to describe the lower-level behavior more accurately: CNI plugins create/configure interfaces inside the target network namespace, but the spec passes a namespace path and does not require the `nsenter` command specifically.
- The firewall example described the `FORWARD` chain as blocking all outbound traffic from the container. I corrected the wording and commands so they explicitly apply to forwarded traffic on the host, and I used rule numbers to make the intended allow-before-drop ordering unambiguous.

## Review Notes
- Docker was not installed in the local review environment, so Docker-specific commands were validated against current official Docker documentation rather than executed locally.
- The post now correctly covers host-to-container IPv4 wiring. If it is later expanded to demonstrate Internet or off-host connectivity from the container, it should also document host IP forwarding and any required NAT or bridge setup.
