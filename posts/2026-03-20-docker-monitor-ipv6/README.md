# How to Monitor Docker Container IPv6 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Monitoring, Traffic Analysis, tcpdump, Metric

Description: Monitor IPv6 traffic in Docker containers using tcpdump, netstat, and container stats, set up IPv6 traffic monitoring with Prometheus and cAdvisor, and analyze container IPv6 connection patterns.

## Introduction

Monitoring IPv6 traffic in Docker containers involves capturing traffic on bridge interfaces, analyzing per-container network statistics, and tracking IPv6 connection counts. Docker exposes aggregate network metrics through the stats API, and tools like tcpdump on bridge interfaces can capture container IPv6 traffic. cAdvisor provides detailed per-container network metrics with Prometheus integration, including TCPv6 connection-state metrics.

## Capture IPv6 Traffic on Docker Bridges

```bash
# Find bridge interface for a Docker network on Linux
BRIDGE=$(docker network inspect mynet \
    --format '{{with index .Options "com.docker.network.bridge.name"}}{{.}}{{end}}')

# If no custom bridge name was set, Docker typically uses br-<network-id-prefix>
if [ -z "$BRIDGE" ]; then
    NETWORK_ID=$(docker network inspect mynet --format '{{.Id}}')
    BRIDGE="br-${NETWORK_ID:0:12}"
fi

# Capture all IPv6 traffic on the bridge
sudo tcpdump -i "$BRIDGE" -n ip6 -v

# Capture IPv6 HTTP traffic
sudo tcpdump -i "$BRIDGE" -n "ip6 and tcp port 80"

# Capture for 30 seconds and save to file for analysis
sudo timeout -s INT 30 tcpdump -i "$BRIDGE" -n ip6 -w /tmp/docker-ipv6.pcap

# Analyze the capture
tcpdump -r /tmp/docker-ipv6.pcap -n ip6 | head -50
```

## Monitor Container Network Stats

```bash
# View real-time aggregate network I/O for all containers
docker stats --format "table {{.Name}}\t{{.NetIO}}"

# Monitor specific container
docker stats mycontainer --no-stream \
    --format "{{.Name}}: NetIO={{.NetIO}}"

# Get detailed per-interface network totals via Docker API
curl -s --unix-socket /var/run/docker.sock \
    "http://localhost/containers/mycontainer/stats?stream=false" | \
    python3 -c "
import json, sys
stats = json.load(sys.stdin)
nets = stats.get('networks', {})
for iface, data in nets.items():
    print(f'Interface: {iface}')
    print(f'  RX bytes: {data[\"rx_bytes\"]}')
    print(f'  TX bytes: {data[\"tx_bytes\"]}')
    print(f'  RX packets: {data[\"rx_packets\"]}')
    print(f'  TX packets: {data[\"tx_packets\"]}')
"
```

## IPv6 Connections Inside Containers

```bash
# List IPv6 connections in a container
docker exec mycontainer sh -c "
    # Show IPv6 TCP sockets in a readable form
    ss -t6 -n

    # Or inspect the raw kernel table if ss is unavailable
    cat /proc/net/tcp6 | awk 'NR>1 {print \$2, \$3, \$4}' | head -20
"

# Count active IPv6 connections
docker exec mycontainer ss -Htan6 state established | wc -l

# Monitor connection count over time
watch -n 5 'docker exec mycontainer ss -Htan6 state established | wc -l'
```

## Prometheus Monitoring with cAdvisor

```yaml
# compose.yaml - IPv6 monitoring stack

networks:
  monitoring:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.25.0.0/24
        - subnet: fd00:monitoring::/64

services:
  cadvisor:
    image: ghcr.io/google/cadvisor:v0.56.2
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro
    ports:
      - "[::]:8080:8080"
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "[::]:9090:9090"
    networks:
      - monitoring
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

## Useful Prometheus Queries for Container Network and IPv6 Metrics

```promql
# Container network receive bytes per second (all traffic on container interfaces)
rate(container_network_receive_bytes_total{name!=""}[5m])

# IPv6 TCP connections for a specific container, broken out by state
container_network_tcp6_usage_total{name="mycontainer"}

# Established IPv6 TCP connections by container
container_network_tcp6_usage_total{name!="",tcp_state="established"}
```

## Conclusion

Monitor Docker IPv6 traffic using `tcpdump -i br-<id> ip6` to capture raw IPv6 packets on Linux bridge interfaces, `docker stats` for aggregate network I/O, and the Docker stats API for per-container per-interface totals. Run cAdvisor with Prometheus for time-series container network monitoring and TCPv6 connection-state metrics. Use `ss -t6` inside containers to monitor active IPv6 TCP connections. On Linux, user-defined bridge interfaces typically follow the pattern `br-<first-12-chars-of-network-id>` unless `com.docker.network.bridge.name` was set; confirm the actual interface with `ip link show type bridge`.
