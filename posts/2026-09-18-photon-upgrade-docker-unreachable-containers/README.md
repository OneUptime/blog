# Troubleshoot Unreachable Docker Containers After a Photon OS Upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Docker, Troubleshooting

Description: Diagnose unreachable Docker containers after a Photon upgrade by tracing host networking, published ports, forwarding, and firewall ownership.

---

When Docker containers become unreachable after a Photon upgrade, begin by locating where the packet path stops. The upgrade may have changed a service startup order, network file, firewall restore, or daemon setting. Restarting everything can temporarily hide the cause and destroy the evidence needed to prevent recurrence.

## Separate application failure from network failure

Record the upgraded state and inspect the affected container:

```bash
cat /etc/os-release
uname -r
docker version
docker ps -a
docker logs --tail=100 app
docker inspect app
```

Replace `app` with the container name. Check its exit state, health status, image, command, mounts, and published ports. Treat inspection output as sensitive because environment variables may contain credentials.

If the application is not listening inside the container, investigate its own startup and configuration first. A container marked running can still contain an application bound only to loopback or waiting indefinitely for a dependency.

Inspect the declared mapping:

```bash
docker port app
docker network ls
docker network inspect bridge
```

Use the actual user-defined network name when the workload does not use the default bridge. Compare these settings with the pre-upgrade baseline or deployment manifest.

## Test the path in order

Check whether the Photon host itself is reachable on its management address. Then test the published application port from the host and from an external client. Finally test outbound traffic from the container using whatever diagnostic tools the image already contains.

| Observation | Likely investigation area |
| --- | --- |
| Host itself unreachable | Guest NIC, address, gateway, vSphere port group |
| Container cannot reach its gateway | Docker interface or network ownership |
| Local published port works, remote fails | Bind address, forwarding, host/upstream firewall |
| IP connections work, hostnames fail | Container DNS and upstream resolver reachability |
| Some destinations fail | Routing overlap, MTU, specific firewall policy |

A port bound to `127.0.0.1` is intended for host-local access. Docker's [port-publishing guide](https://docs.docker.com/engine/network/port-publishing/) notes a same-layer-2 exposure exception in releases older than 28.0.0, so check the installed version and vendor fixes when interpreting remote reachability. Confirm the binding before altering firewall rules.

## Inspect Photon networking ownership

From the console or another reliable management path, run:

```bash
ip -br address
ip route
networkctl list
networkctl status eth0
networkctl status docker0
journalctl -b -u systemd-networkd --no-pager
```

Use the real host interface and bridge names. Inspect `/etc/systemd/network` for overly broad `[Match]` rules that capture Docker bridges or veth interfaces. A host rule intended only for a physical NIC should not accidentally configure every link created by Docker.

The [systemd.network reference](https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html) describes first-match file selection. Compare active network filenames with the baseline, and inspect generated configuration if cloud-init or network-config-manager rewrites files at boot.

Fix the owning configuration deliberately. Do not delete Docker's interfaces or rewrite all network files while applications are serving traffic. Test an interface-scoping correction on a canary host before rolling it out.

## Inspect forwarding and firewall state

Capture the current rules before changing them:

```bash
sysctl net.ipv4.ip_forward
iptables -S
iptables -t nat -S
iptables -S DOCKER-USER
```

These commands apply to an installation using Docker's iptables backend. If your installed Docker version uses a different configured firewall backend, inspect that backend's rules instead; absence of an iptables chain is not automatically a fault.

Docker's [firewall documentation](https://docs.docker.com/engine/network/packet-filtering-firewalls/) explains that bridge networking depends on rules it creates. Disabling Docker's firewall management or flushing tables can break masquerading and published ports. Conversely, a host firewall restore service can remove Docker-created rules after the daemon starts.

Compare service logs around boot and inspect any local firewall persistence scripts. With the iptables backend, review application-specific filtering in `DOCKER-USER` according to [Docker's iptables guidance](https://docs.docker.com/engine/network/firewall-iptables/). Do not install a blanket forwarding accept rule as a substitute for understanding which flow is rejected.

## Check overlaps, MTU, and upstream policy

A Docker subnet that overlaps a newly introduced corporate route can send traffic to the wrong interface. Compare `ip route` with every Docker network subnet. If small requests work but large transfers stall, compare the host, bridge, and underlying network MTU before changing it.

At vSphere, confirm the NIC remains connected to the intended port group and VLAN. Test from the same external network clients actually use, including any load balancer path.

After a controlled repair, restart only the affected components when necessary and repeat the tests. Reboot the canary once more to expose ordering problems. Preserve the final network and firewall ownership rules in configuration management so the next upgrade reproduces the working state.
