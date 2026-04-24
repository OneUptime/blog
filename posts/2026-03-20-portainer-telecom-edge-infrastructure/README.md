# How to Set Up Portainer for Telecommunications Edge Infrastructure (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telecommunications, Edge Computing, Portainer, Docker, 5G, NFV, Network Function

Description: Deploy and manage containerized network functions and edge applications at telecom sites using Portainer to simplify NFV workload lifecycle management.

---

Telecommunications operators run distributed infrastructure across thousands of edge sites - central offices, cell towers, and data centers. Portainer's Edge Agent and Kubernetes integration support containerized network functions (CNFs) and edge applications at these sites.
The Compose examples below use representative image names and endpoints; replace them with your vendor-supplied CNF images and site-specific management URLs.

## Telecom Edge Use Cases for Portainer

- **vCPE (Virtual Customer Premises Equipment)** - SD-WAN, firewall, and routing functions
- **MEC (Multi-Access Edge Computing)** - application hosting close to the radio
- **OSS/BSS microservices** - operations and business support systems
- **Network probes** - traffic monitoring and quality measurement

## Step 1: Deploy a vCPE Stack

```yaml
# vcpe-stack.yml - virtual CPE for enterprise customer edge

services:
  # Software-defined WAN router
  sd-wan-agent:
    image: telecom/sdwan-agent:6.1.2
    cap_add:
      - NET_ADMIN    # Required for network routing functions
    network_mode: host   # Host networking for full packet access
    environment:
      - CONTROLLER_URL=https://sdwan-controller.telecom.example.com
      - SITE_ID=${SITE_ID}
      - WAN_INTERFACE=eth0
      - LAN_INTERFACE=eth1
    restart: always
    volumes:
      - sdwan-config:/etc/sdwan
      - sdwan-logs:/var/log/sdwan

  # Firewall/UTM function
  firewall:
    image: telecom/ngfw-container:3.4.1
    cap_add:
      - NET_ADMIN
      - NET_RAW
    network_mode: host   # Host networking so firewall rules apply to edge traffic
    environment:
      - POLICY_SERVER=https://policy.telecom.example.com
      - SITE_ID=${SITE_ID}
    volumes:
      - firewall-config:/etc/firewall
      - firewall-logs:/var/log/firewall
    restart: always

  # Network quality probe
  quality-probe:
    image: telecom/network-probe:2.0.1
    environment:
      - MEASUREMENT_INTERVAL=30
      - REPORTING_URL=https://nqm.telecom.example.com
      - SITE_ID=${SITE_ID}
    restart: unless-stopped

volumes:
  sdwan-config:
  sdwan-logs:
  firewall-config:
  firewall-logs:
```

## Step 2: Deploy MEC Applications

Multi-access edge computing applications run at the edge of the radio network for ultra-low latency:

```yaml
# mec-stack.yml

services:
  # AR/VR content cache and rendering offload
  mec-ar-cache:
    image: mec-platform/ar-content-cache:1.2.0
    environment:
      - CENTRAL_CACHE_URL=https://cdn.telecom.example.com
      - LOCAL_CACHE_SIZE_GB=50
      - SITE_ID=${CELL_SITE_ID}
    volumes:
      - ar-cache:/var/cache/ar-content
    ports:
      - "8443:8443"
    restart: unless-stopped

  # Vehicle-to-everything (V2X) processing
  v2x-processor:
    image: mec-platform/v2x-processor:2.1.0
    environment:
      - RSU_INTERFACE=eth1
      - LATENCY_SLA_MS=10
    cap_add:
      - NET_RAW
    restart: always

volumes:
  ar-cache:
```

## Step 3: Configure High Availability

For critical telecom functions, use restart policies supported by Docker Compose and add health checks:

```yaml
services:
  sd-wan-agent:
    image: telecom/sdwan-agent:6.1.2
    restart: always
    healthcheck:
      # Example: replace with the health endpoint exposed by your CNF image
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

## Step 4: Monitor Network Function Health

Deploy a lightweight monitoring stack alongside network functions:

```yaml
services:
  # Prometheus for NFV metrics
  prometheus:
    image: prom/prometheus:v3.11.2
    volumes:
      - /opt/telecom/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

  # Node exporter for host metrics
  node-exporter:
    image: quay.io/prometheus/node-exporter:v1.11.1
    pid: host
    network_mode: host
    volumes:
      - /:/host:ro,rslave
    command:
      - --path.rootfs=/host
    restart: unless-stopped

volumes:
  prometheus-data:
```

## Compliance and Hardening

Telecom operators must meet strict compliance requirements:

- Use signed and verified container images from a private registry
- Enforce container runtime security settings such as `no-new-privileges` and a read-only root filesystem
- Log all container operations to a centralized SIEM
- Segment network functions using isolated Docker networks where host networking is not required

## Summary

Portainer provides telecom operators with a practical approach to managing containerized network functions at edge sites. Its Edge Agent model lets remote edge environments connect outbound to the Portainer server, so you do not need inbound firewall rules on the edge sites, although the Portainer server still needs its UI and tunnel ports reachable.
