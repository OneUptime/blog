# Validation Summary: How to Fix Fragmentation Issues with VXLAN Overlays

## Status
validated

## Post Type
Guide

## Technologies Covered
- VXLAN
- Linux `iproute2`
- Linux `iptables` / TCPMSS
- Docker overlay networking
- Kubernetes networking
- Flannel
- Calico

## Sources Consulted
- RFC 7348, VXLAN frame format and default UDP port: https://www.rfc-editor.org/rfc/rfc7348.html
- `ip-link(8)` VXLAN syntax: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `iptables-extensions(8)` TCPMSS behavior: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ping(8)` PMTU discovery options: https://man7.org/linux/man-pages/man8/ping.8%40%40iputils.html
- `tracepath(8)` MTU discovery behavior: https://man7.org/linux/man-pages/man8/tracepath.8.html
- Docker `dockerd` reference (`--mtu` for the default bridge network): https://docs.docker.com/reference/cli/dockerd/
- Docker `docker network create` reference (`com.docker.network.driver.mtu`): https://docs.docker.com/reference/cli/docker/network/create/
- Docker Swarm networking docs (overlay MTU examples): https://docs.docker.com/engine/swarm/networking/
- Docker bridge network driver docs (`daemon.json` MTU example for the default bridge): https://docs.docker.com/engine/network/drivers/bridge/
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Upstream Flannel manifest: https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
- Flannel CNI plugin documentation: https://github.com/flannel-io/cni-plugin

## Issues Found
- The jumbo-frame example set `vxlan10` MTU to `1950` while the surrounding text said the goal was a full 1500-byte overlay MTU. I changed it to `1500` and updated the PMTU validation ping from `1422` to `1472` bytes so the example actually validates a 1500-byte overlay MTU.
- The Docker section implied that Docker daemon `mtu` config fixes VXLAN overlay networks. Docker documents `--mtu` / `"mtu"` as the default bridge network setting, while overlay networks use `com.docker.network.driver.mtu`. I clarified the section so the overlay network is configured directly and the daemon setting is kept only for the default bridge network.
- The Flannel example used the wrong namespace and the wrong config location. Current upstream Flannel installs `kube-flannel-cfg` in the `kube-flannel` namespace, and the shipped config exposes `cni-conf.json` with a `delegate` block, not `net-conf.json` with `Backend.MTU`. I updated the example accordingly and added the DaemonSet restart needed to apply the copied CNI config.
- The Calico example used a tunnel-only Felix field and an incomplete operator patch. Current Calico MTU guidance sets `spec.calicoNetwork.mtu` for operator installs or `veth_mtu` in `calico-config` for manifest installs. I replaced the `felixconfiguration` example with the documented operator and manifest methods, including the fully qualified `installation.operator.tigera.io` resource.
- The verification note implied existing pods would immediately show the new MTU. Calico documents that updated MTU values apply to new workloads, so I changed the verification step to recreate or start a new pod before checking pod MTU.
- The conclusion overstated Docker daemon MTU applicability and used only `IpReasmFails` as the confirmation signal. I updated it to distinguish overlay versus default bridge MTU handling in Docker and to watch both `IpFragCreates` and `IpReasmFails` for counters that should stop increasing.

## Review Notes
- The Linux `ip link add ... type vxlan`, `ping -M do`, `tracepath -n`, and `iptables ... TCPMSS` examples were otherwise consistent with current command syntax and documented behavior.
- The fixed `1410` MSS value is appropriate for IPv4 VXLAN with a 1450-byte overlay MTU; `--clamp-mss-to-pmtu` remains the more adaptive option when path MTU can vary.
- Kubernetes distributions sometimes ship vendor-modified manifests, so namespaces and DaemonSet names can differ from upstream defaults even though the corrected examples now match the current upstream Flannel and Calico documentation.
