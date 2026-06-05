# Validation Summary: How to Fix Docker Containers Losing Network After Host Reboot

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Docker Engine networking
- Docker bridge networks
- Docker restart policies
- Docker Compose
- iptables / netfilter
- Linux sysctl IP forwarding
- systemd services and unit ordering
- UFW

## Sources Consulted
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: dockerd CLI reference and daemon configuration - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: Compose file services `restart` field - https://docs.docker.com/reference/compose-file/services/
- Ubuntu manpage: ufw-framework - https://manpages.ubuntu.com/manpages/jammy/man8/ufw-framework.8.html
- freedesktop.org systemd.unit manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- Local command help for `iptables`, `ip link`, `docker network inspect`, and `docker compose config`

## Issues Found
- The systemd Docker override added `Requires=docker.socket`, which is not needed to order Docker after firewall services and can add an unrelated socket dependency. Removed that line and included `ufw.service` in the `After=` ordering.
- The persistent sysctl snippet set `net.bridge.bridge-nf-call-iptables` and `net.bridge.bridge-nf-call-ip6tables`. Those bridge sysctls are not the core Docker IP-forwarding setting, may be unavailable unless `br_netfilter` is loaded, and were not needed for the stated fix. Removed them and kept `net.ipv4.ip_forward = 1`.
- The restart policy descriptions were slightly inaccurate for `always` and `on-failure`. Updated them to match Docker's documented daemon-restart behavior.
- The UFW `after.rules` snippet included a nested `*filter`/`COMMIT` block and only returned from `DOCKER-USER`, which was misleading for an existing UFW rules file. Replaced it with rules to define/use `DOCKER-USER`, send packets through `ufw-user-forward`, and then return to Docker's normal firewall processing.

## Review Notes
Docker's official documentation notes that Docker and UFW can be incompatible for published container ports because Docker uses NAT rules before UFW's usual INPUT/OUTPUT processing. The corrected post now uses the documented `DOCKER-USER` path, but production systems should still test their exact firewall policy after reload and reboot.
