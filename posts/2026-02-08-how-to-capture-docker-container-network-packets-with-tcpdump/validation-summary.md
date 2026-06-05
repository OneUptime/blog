# Validation Summary: How to Capture Docker Container Network Packets with tcpdump

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Linux network namespaces
- Linux bridge networking and veth interfaces
- tcpdump
- libpcap/BPF capture filters
- Wireshark/pcap analysis

## Sources Consulted
- Docker Docs: Running containers and container networking, https://docs.docker.com/engine/containers/run/
- Docker Docs: Docker networking and `--network container:<name|id>`, https://docs.docker.com/network/
- Docker Docs: Bridge network driver options, including `com.docker.network.bridge.name`, https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Compose networking and `network_mode: service:{name}`, https://docs.docker.com/compose/how-tos/networking/
- Docker CLI local help: `docker --help`, `docker run --help`, `docker network inspect --help`, `docker compose --help`
- tcpdump local help: `tcpdump --help`
- Wireshark/libpcap pcap-filter manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Linux pcap-filter manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- util-linux `nsenter` local help: `nsenter --help`

## Issues Found
- The post implied that running tcpdump inside a container only depends on tcpdump being present or installable. I added that the process also needs permission to capture packets, because packet capture requires the relevant Linux capabilities/privileges.
- The host-side veth section stated that every container interface has a host veth pair. I narrowed this to containers on Linux bridge networks, because other Docker network modes and drivers do not necessarily expose a corresponding host veth pair in the same way.
- The Docker bridge inspect command used `{{.Options.com.docker.network.bridge.name}}`, which is not valid Go template syntax for a map key containing dots. I changed it to `{{index .Options "com.docker.network.bridge.name"}}`.

## Review Notes
The tcpdump flags and BPF filters were syntactically checked with local `tcpdump -d`/`tcpdump --help`, and the Docker/Compose examples match current Docker CLI and Compose networking documentation. The examples assume Linux Docker Engine bridge networking and a target interface named `eth0`; containers with host networking, macvlan/ipvlan, multiple attached networks, or different interface names may require adjusted commands.
