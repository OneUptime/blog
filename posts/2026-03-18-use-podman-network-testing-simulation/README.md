# How to Use Podman for Network Testing and Simulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Networking, Testing, Simulation, DevOps

Description: Learn how to use Podman to create isolated network environments for testing, simulating network conditions, and validating distributed application behavior.

---

> Podman's networking capabilities make it an excellent tool for building isolated test environments that simulate real-world network conditions. From latency injection to multi-subnet topologies, Podman gives you full control over the network layer.

Testing distributed applications requires realistic network conditions that are difficult to reproduce on a single machine. Podman's container networking, combined with Linux network tools, lets you simulate complex network topologies, inject failures, and validate application behavior under adverse conditions. This guide shows you how to build comprehensive network testing environments with Podman.

---

## Creating Isolated Networks

### Basic Network Isolation

Create separate networks to isolate groups of containers:

```bash
# Create isolated networks

podman network create frontend-net
podman network create backend-net
podman network create database-net

# Verify
podman network ls
```

### Custom Subnet Configuration

Define specific subnets for precise network control:

```bash
podman network create \
  --subnet 10.10.0.0/24 \
  --gateway 10.10.0.1 \
  test-net-a

podman network create \
  --subnet 10.20.0.0/24 \
  --gateway 10.20.0.1 \
  test-net-b

podman network create \
  --subnet 10.30.0.0/24 \
  --gateway 10.30.0.1 \
  --internal \
  test-net-internal
```

The `--internal` flag removes the default route and restricts DNS lookups to container names on that network, creating an isolated environment without external network access by default.

## Multi-Container Network Testing

### DNS Resolution Testing

Podman provides automatic DNS resolution between containers on the same network:

```bash
# Create a network
podman network create dns-test-net

# Start named containers
podman run -d --name web-server \
  --network dns-test-net \
  nginx:latest

podman run -d --name app-server \
  --network dns-test-net \
  python:3.11-slim \
  python3 -c "import time; time.sleep(3600)"

# Test DNS resolution
podman exec app-server python3 -c "
import socket
ip = socket.gethostbyname('web-server')
print(f'web-server resolves to: {ip}')
"

# Test HTTP connectivity
podman exec app-server python3 -c "
import urllib.request
response = urllib.request.urlopen('http://web-server:80')
print(f'HTTP Status: {response.status}')
"
```

### Cross-Network Communication Testing

Test connectivity between different networks. A container attached to both can reach each network, but containers on separate networks remain isolated unless you add routing explicitly:

```bash
# Create two networks
podman network create --subnet 10.50.0.0/24 net-alpha
podman network create --subnet 10.60.0.0/24 net-beta

# Container only on net-alpha
podman run -d --name alpha-only \
  --network net-alpha \
  alpine sleep 3600

# Container on both networks (can reach both networks itself)
podman run -d --name bridge-host \
  --network net-alpha \
  alpine sleep 3600
podman network connect net-beta bridge-host

# Container only on net-beta
podman run -d --name beta-only \
  --network net-beta \
  alpine sleep 3600

# Test: alpha-only cannot reach beta-only directly
podman exec alpha-only ping -c 1 -W 2 beta-only 2>&1 || echo "Expected: cannot reach"

# Test: bridge-host can reach containers on both networks
podman exec bridge-host ping -c 1 alpha-only
podman exec bridge-host ping -c 1 beta-only
```

## Simulating Network Conditions

### Using tc (Traffic Control) for Network Simulation

Build a container with network simulation tools:

```dockerfile
# Containerfile.nettools
FROM fedora:latest

RUN dnf install -y \
    iproute \
    iptables \
    nftables \
    iputils \
    bind-utils \
    nmap \
    tcpdump \
    net-tools \
    curl \
    wget \
    python3 \
    python3-pip \
    iperf3 \
    && dnf clean all

RUN pip3 install requests aiohttp

CMD ["/bin/bash"]
```

```bash
podman build -t nettools -f Containerfile.nettools .
```

### Simulating Latency

```bash
# Start a web server
podman run -d --name target-server \
  --network test-net-a \
  nginx:latest

# Start a client with network tools (needs NET_ADMIN for tc)
podman run --rm -it \
  --network test-net-a \
  --cap-add NET_ADMIN \
  nettools \
  bash -c '
    # Measure baseline latency
    echo "=== Baseline ==="
    ping -c 5 target-server

    # Add 100ms latency
    tc qdisc add dev eth0 root netem delay 100ms 10ms

    echo "=== With 100ms latency ==="
    ping -c 5 target-server

    # Add packet loss
    tc qdisc change dev eth0 root netem delay 100ms 10ms loss 5%

    echo "=== With 100ms latency + 5% packet loss ==="
    ping -c 10 target-server
  '
```

### Simulating Bandwidth Limits

```bash
podman run --rm -it \
  --network test-net-a \
  --cap-add NET_ADMIN \
  nettools \
  bash -c '
    # Limit bandwidth to 1 Mbps
    tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms

    echo "=== Bandwidth limited to 1 Mbps ==="
    curl -o /dev/null -w "Speed: %{speed_download} bytes/sec\n" \
      http://target-server/

    # For a more meaningful throughput test, run against an iperf3 server
    # iperf3 -c iperf-server
  '
```

### Simulating Packet Corruption

```bash
podman run --rm -it \
  --network test-net-a \
  --cap-add NET_ADMIN \
  nettools \
  bash -c '
    # Corrupt 10% of packets
    tc qdisc add dev eth0 root netem corrupt 10%

    echo "=== With 10% packet corruption ==="
    curl -v http://target-server/ 2>&1 | tail -5
  '
```

## Network Monitoring and Analysis

### Packet Capture with tcpdump

```bash
# Start a container with tcpdump
podman run -d --name packet-capture \
  --network test-net-a \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  nettools \
  tcpdump -i eth0 -w /tmp/capture.pcap

# Generate some traffic
podman exec packet-capture curl -s http://target-server/ > /dev/null

# Stop and extract the capture
podman stop packet-capture
podman cp packet-capture:/tmp/capture.pcap ./capture.pcap
podman rm packet-capture

# Analyze on host
tcpdump -r capture.pcap | head -20
```

### Network Performance Testing with iperf3

```bash
# Start iperf3 server
podman run -d --name iperf-server \
  --network test-net-a \
  nettools \
  iperf3 -s

# Run iperf3 client
podman run --rm \
  --network test-net-a \
  nettools \
  iperf3 -c iperf-server -t 10

# Clean up
podman stop iperf-server && podman rm iperf-server
```

## Python-Based Network Testing

### Automated Network Test Suite

```python
#!/usr/bin/env python3
"""Network testing framework using Podman."""

import subprocess
import time

class NetworkTestEnvironment:
    """Create and manage network test environments."""

    def __init__(self, name):
        self.name = name
        self.network = f"{name}-net"
        self.containers = []

    def setup(self):
        """Create the test network."""
        subprocess.run(
            ["podman", "network", "create", "--subnet", "172.30.0.0/24", self.network],
            capture_output=True
        )
        print(f"Created network: {self.network}")

    def add_server(self, name, image, command=None):
        """Add a server container."""
        cmd = ["podman", "run", "-d",
               "--name", f"{self.name}-{name}",
               "--network", self.network]
        cmd.append(image)
        if command:
            cmd.extend(command)

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            self.containers.append(f"{self.name}-{name}")
            print(f"Started: {name}")
        return result.returncode == 0

    def test_connectivity(self, source, target, port=80):
        """Test connectivity between two containers."""
        result = subprocess.run(
            ["podman", "exec", f"{self.name}-{source}",
             "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
             "--connect-timeout", "5",
             f"http://{self.name}-{target}:{port}"],
            capture_output=True, text=True
        )
        status = result.stdout.strip()
        success = status == "200"
        print(f"  {source} -> {target}:{port}: {'PASS' if success else 'FAIL'} (HTTP {status})")
        return success

    def test_latency(self, source, target, count=5):
        """Measure latency between containers."""
        result = subprocess.run(
            ["podman", "exec", f"{self.name}-{source}",
             "ping", "-c", str(count), "-q", f"{self.name}-{target}"],
            capture_output=True, text=True
        )
        # Parse ping output for avg latency
        for line in result.stdout.splitlines():
            if "avg" in line:
                parts = line.split("=")[1].strip().split("/")
                avg_ms = float(parts[1])
                print(f"  {source} -> {target}: avg {avg_ms}ms")
                return avg_ms
        return -1

    def teardown(self):
        """Clean up all resources."""
        for container in self.containers:
            subprocess.run(["podman", "rm", "-f", container], capture_output=True)
        subprocess.run(["podman", "network", "rm", self.network], capture_output=True)
        print(f"Cleaned up {self.name} environment")

# Usage
env = NetworkTestEnvironment("net-test")
env.setup()

env.add_server("web", "nginx:latest")
env.add_server("client", "nettools",
               ["sleep", "3600"])

time.sleep(3)  # Wait for containers to start

print("\nConnectivity Tests:")
env.test_connectivity("client", "web")

print("\nLatency Tests:")
env.test_latency("client", "web")

env.teardown()
```

## Load Testing

### HTTP Load Testing with Containers

```bash
# Start the target server
podman run -d --name load-target \
  --network test-net-a \
  nginx:latest

# Run load test with multiple concurrent connections
podman run --rm \
  --network test-net-a \
  nettools \
  bash -c '
    pip3 install httpx
    python3 -c "
import httpx
import asyncio
import time
import statistics

url = \"http://load-target:80/\"
request_count = 100
concurrency = 10
results = []

async def fetch(client, sem):
    async with sem:
        start = time.perf_counter()
        response = await client.get(url)
        response.raise_for_status()
        elapsed = (time.perf_counter() - start) * 1000
        results.append(elapsed)

async def main():
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient() as client:
        await asyncio.gather(*(fetch(client, sem) for _ in range(request_count)))

print(\"Starting load test...\")
asyncio.run(main())

sorted_results = sorted(results)
print(f\"Requests: {len(results)}\")
print(f\"Concurrency: {concurrency}\")
print(f\"Avg: {statistics.mean(results):.1f}ms\")
print(f\"P50: {statistics.median(results):.1f}ms\")
print(f\"P95: {sorted_results[94]:.1f}ms\")
print(f\"P99: {sorted_results[98]:.1f}ms\")
print(f\"Max: {max(results):.1f}ms\")
"
  '
```

## Simulating Microservice Architectures

Create a realistic microservice network for testing:

```bash
#!/bin/bash
# setup-microservices.sh

# Create service networks
podman network create --subnet 10.100.0.0/24 public-net
podman network create --subnet 10.101.0.0/24 --internal service-net
podman network create --subnet 10.102.0.0/24 --internal data-net

# Public entry point placeholder (public + service)
podman run -d --name api-gateway \
  --network public-net \
  -p 8080:80 \
  nginx:latest
podman network connect service-net api-gateway

# User Service (service only)
podman run -d --name user-service \
  --network service-net \
  python:3.11-slim \
  python3 -c "
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'service': 'user', 'status': 'ok'}).encode())

HTTPServer(('0.0.0.0', 8001), Handler).serve_forever()
"

# Database (data only)
podman run -d --name test-db \
  --network data-net \
  -e POSTGRES_PASSWORD=testpass \
  postgres:15

# Connect user-service to data network
podman network connect data-net user-service

echo "Microservice network topology created"
echo "Public entry point: http://localhost:8080"
echo ""
echo "Network topology:"
echo "  public-net:  api-gateway"
echo "  service-net: api-gateway, user-service"
echo "  data-net:    user-service, test-db"
```

## Firewall Rule Testing

Test firewall rules in isolated environments:

```bash
podman run --rm -it \
  --network test-net-a \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  nettools \
  bash -c '
    # Block specific port
    iptables -A OUTPUT -p tcp --dport 443 -j DROP

    # Test blocked connection
    echo "Testing blocked HTTPS..."
    curl --connect-timeout 3 https://example.com 2>&1 || echo "Blocked as expected"

    # Test allowed connection
    echo "Testing allowed HTTP..."
    curl --connect-timeout 3 http://target-server/ 2>&1 | head -3
  '
```

## Cleanup Script

```bash
#!/bin/bash
# cleanup-network-tests.sh

echo "Cleaning up network test environment..."

# Stop and remove all test containers
for container in $(podman ps -a --format '{{.Names}}' | grep -E '^(web-server|app-server|alpha-only|bridge-host|beta-only|target-server|packet-capture|iperf-server|load-target|api-gateway|user-service|test-db|net-test-.*)$'); do
    podman rm -f "$container" 2>/dev/null
    echo "  Removed container: $container"
done

# Remove test networks
for network in $(podman network ls --format '{{.Name}}' | grep -E '^(frontend-net|backend-net|database-net|dns-test-net|net-alpha|net-beta|test-net.*|public-net|service-net|data-net)$'); do
    podman network rm "$network" 2>/dev/null
    echo "  Removed network: $network"
done

echo "Cleanup complete"
```

## Conclusion

Podman's networking capabilities make it a powerful platform for network testing and simulation. By creating isolated networks, injecting latency and packet loss, and monitoring traffic, you can thoroughly test distributed applications under realistic conditions. Combined with Python scripting, you can automate complex test scenarios and integrate network testing into your CI/CD pipelines. The key advantage of using Podman for network testing is the ability to create repeatable, isolated environments that closely mirror production network topologies.
