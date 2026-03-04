# How to Use Docker with DPDK for Network Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, DPDK, Networking, High Performance, Containers, Linux, Packet Processing

Description: Run DPDK applications inside Docker containers for high-speed packet processing with millions of packets per second.

---

The Data Plane Development Kit (DPDK) is a set of libraries that move packet processing from the kernel into user space. By bypassing the kernel's network stack entirely, DPDK achieves packet processing rates of tens of millions of packets per second on commodity hardware. Running DPDK applications inside Docker containers gives you the performance benefits of DPDK with the deployment flexibility of containers.

This guide covers setting up a Docker host for DPDK, building DPDK-enabled container images, and running packet processing applications with practical configuration examples.

## How DPDK Achieves High Performance

The Linux kernel's network stack processes each packet through multiple layers: NIC driver, interrupt handler, softirq, socket buffers, protocol stacks, and finally the application. Each step adds latency and consumes CPU cycles.

DPDK takes a different approach:

- **Poll mode drivers (PMDs)** replace interrupt-driven NIC drivers with continuous polling
- **Huge pages** provide large, contiguous memory regions without TLB misses
- **CPU core pinning** dedicates cores to packet processing without context switches
- **User-space drivers** bypass the kernel entirely for data plane traffic

The tradeoff is that DPDK takes exclusive ownership of network interfaces. Those interfaces become invisible to the kernel.

## Host Prerequisites

Before running DPDK in Docker, configure the host:

```bash
# Enable IOMMU in the kernel boot parameters
# Add to /etc/default/grub: GRUB_CMDLINE_LINUX="intel_iommu=on iommu=pt"
sudo update-grub
sudo reboot
```

After reboot, set up huge pages:

```bash
# Allocate 1024 huge pages (2MB each, total 2GB)
echo 1024 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Create the hugepages mount point
sudo mkdir -p /dev/hugepages
sudo mount -t hugetlbfs nodev /dev/hugepages

# Make huge pages persistent across reboots
echo "vm.nr_hugepages = 1024" | sudo tee /etc/sysctl.d/99-hugepages.conf
echo "nodev /dev/hugepages hugetlbfs defaults 0 0" | sudo tee -a /etc/fstab

# Verify huge pages are allocated
grep HugePages /proc/meminfo
```

Load the required kernel modules:

```bash
# Load vfio-pci module for DPDK device binding
sudo modprobe vfio-pci

# Make it persistent
echo "vfio-pci" | sudo tee /etc/modules-load.d/vfio-pci.conf
```

## Binding a Network Interface to DPDK

Identify and bind a NIC to the DPDK-compatible driver:

```bash
# List network devices and their current drivers
dpdk-devbind.py --status

# If dpdk-devbind.py is not installed, check PCI devices manually
lspci | grep Ethernet

# Unbind the interface from the kernel driver
sudo ip link set eth1 down
echo "0000:03:00.0" | sudo tee /sys/bus/pci/drivers/ixgbe/unbind

# Bind to vfio-pci
echo "vfio-pci" | sudo tee /sys/bus/pci/devices/0000:03:00.0/driver_override
echo "0000:03:00.0" | sudo tee /sys/bus/pci/drivers/vfio-pci/bind

# Verify the binding
dpdk-devbind.py --status
```

## Building a DPDK Docker Image

Create a Docker image with DPDK libraries and a sample application:

```dockerfile
# Dockerfile - DPDK application container
FROM ubuntu:22.04 AS builder

# Install build dependencies for DPDK
RUN apt-get update && apt-get install -y \
    build-essential \
    meson \
    ninja-build \
    python3-pyelftools \
    libnuma-dev \
    pkg-config \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download and build DPDK
WORKDIR /opt
RUN wget https://fast.dpdk.org/rel/dpdk-23.11.tar.xz && \
    tar xf dpdk-23.11.tar.xz && \
    cd dpdk-23.11 && \
    meson setup build && \
    cd build && \
    ninja && \
    ninja install && \
    ldconfig

# Build our custom packet processing application
COPY src/ /opt/app/src/
COPY meson.build /opt/app/
WORKDIR /opt/app
RUN meson setup build && cd build && ninja

# Runtime image
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libnuma1 \
    && rm -rf /var/lib/apt/lists/*

# Copy DPDK libraries and our application
COPY --from=builder /usr/local/lib/x86_64-linux-gnu/ /usr/local/lib/x86_64-linux-gnu/
COPY --from=builder /opt/app/build/packet-processor /usr/local/bin/

RUN ldconfig

ENTRYPOINT ["packet-processor"]
```

## Writing a Simple DPDK Application

A basic packet forwarding application:

```c
// src/main.c - DPDK packet forwarder that receives and forwards packets
#include <stdio.h>
#include <stdlib.h>
#include <rte_eal.h>
#include <rte_ethdev.h>
#include <rte_mbuf.h>

#define RX_RING_SIZE 1024
#define TX_RING_SIZE 1024
#define NUM_MBUFS 8191
#define MBUF_CACHE_SIZE 250
#define BURST_SIZE 32

static const struct rte_eth_conf port_conf_default = {
    .rxmode = { .max_lro_pkt_size = RTE_ETHER_MAX_LEN },
};

/* Initialize a DPDK port with one RX and one TX queue */
static int port_init(uint16_t port, struct rte_mempool *mbuf_pool) {
    struct rte_eth_conf port_conf = port_conf_default;
    int retval;
    uint16_t nb_rxd = RX_RING_SIZE;
    uint16_t nb_txd = TX_RING_SIZE;

    retval = rte_eth_dev_configure(port, 1, 1, &port_conf);
    if (retval != 0) return retval;

    retval = rte_eth_dev_adjust_nb_rx_tx_desc(port, &nb_rxd, &nb_txd);
    if (retval != 0) return retval;

    retval = rte_eth_rx_queue_setup(port, 0, nb_rxd,
        rte_eth_dev_socket_id(port), NULL, mbuf_pool);
    if (retval < 0) return retval;

    retval = rte_eth_tx_queue_setup(port, 0, nb_txd,
        rte_eth_dev_socket_id(port), NULL);
    if (retval < 0) return retval;

    retval = rte_eth_dev_start(port);
    if (retval < 0) return retval;

    rte_eth_promiscuous_enable(port);
    return 0;
}

/* Main packet processing loop */
int main(int argc, char *argv[]) {
    struct rte_mempool *mbuf_pool;
    uint16_t portid;

    /* Initialize the DPDK EAL */
    int ret = rte_eal_init(argc, argv);
    if (ret < 0) rte_exit(EXIT_FAILURE, "EAL init failed\n");

    /* Create the mbuf pool */
    mbuf_pool = rte_pktmbuf_pool_create("MBUF_POOL", NUM_MBUFS,
        MBUF_CACHE_SIZE, 0, RTE_MBUF_DEFAULT_BUF_SIZE,
        rte_socket_id());
    if (mbuf_pool == NULL) rte_exit(EXIT_FAILURE, "Cannot create mbuf pool\n");

    /* Initialize all ports */
    RTE_ETH_FOREACH_DEV(portid) {
        if (port_init(portid, mbuf_pool) != 0)
            rte_exit(EXIT_FAILURE, "Cannot init port %u\n", portid);
    }

    printf("DPDK packet processor running. Ctrl+C to stop.\n");

    /* Main processing loop */
    struct rte_mbuf *bufs[BURST_SIZE];
    for (;;) {
        RTE_ETH_FOREACH_DEV(portid) {
            uint16_t nb_rx = rte_eth_rx_burst(portid, 0, bufs, BURST_SIZE);
            if (nb_rx == 0) continue;

            /* Forward packets back out the same port (simple loopback) */
            uint16_t nb_tx = rte_eth_tx_burst(portid, 0, bufs, nb_rx);

            /* Free any packets that were not sent */
            if (nb_tx < nb_rx) {
                for (uint16_t i = nb_tx; i < nb_rx; i++)
                    rte_pktmbuf_free(bufs[i]);
            }
        }
    }

    return 0;
}
```

## Running DPDK Containers

Launch the DPDK container with the required privileges and device access:

```bash
# Run the DPDK container with access to hugepages and VFIO devices
docker run -d \
  --name dpdk-processor \
  --privileged \
  -v /dev/hugepages:/dev/hugepages \
  -v /dev/vfio:/dev/vfio \
  -v /sys/bus/pci:/sys/bus/pci \
  -v /sys/kernel/mm/hugepages:/sys/kernel/mm/hugepages \
  --cpuset-cpus="2,3" \
  dpdk-app:latest \
  -l 2,3 -n 4 --socket-mem 1024
```

Breaking down the flags:

- `--privileged` - Required for direct hardware access
- `-v /dev/hugepages:/dev/hugepages` - Mount huge pages
- `-v /dev/vfio:/dev/vfio` - Mount VFIO device files
- `--cpuset-cpus="2,3"` - Pin to specific CPU cores
- `-l 2,3` - DPDK EAL lcore mask (must match cpuset-cpus)
- `-n 4` - Number of memory channels
- `--socket-mem 1024` - Allocate 1024MB from NUMA socket 0

## Docker Compose for DPDK Applications

```yaml
# docker-compose.yml - DPDK packet processing stack
services:
  packet-processor:
    image: dpdk-app:latest
    privileged: true
    volumes:
      - /dev/hugepages:/dev/hugepages
      - /dev/vfio:/dev/vfio
      - /sys/bus/pci:/sys/bus/pci
      - /sys/kernel/mm/hugepages:/sys/kernel/mm/hugepages
    cpuset: "2,3,4,5"
    command: ["-l", "2-5", "-n", "4", "--socket-mem", "2048"]

  stats-collector:
    image: dpdk-stats:latest
    volumes:
      - dpdk-shared:/var/run/dpdk
    depends_on:
      - packet-processor

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"

volumes:
  dpdk-shared:
```

## Performance Tuning

Optimize DPDK performance inside containers:

```bash
# Isolate CPU cores from the kernel scheduler
# Add to kernel boot parameters: isolcpus=2,3,4,5
# This prevents the kernel from scheduling other tasks on DPDK cores

# Disable CPU frequency scaling for consistent performance
for cpu in /sys/devices/system/cpu/cpu{2..5}/cpufreq/scaling_governor; do
  echo "performance" | sudo tee $cpu
done

# Disable IRQ balancing on DPDK cores
sudo service irqbalance stop
```

Inside the container, verify DPDK is using huge pages and the correct cores:

```bash
# Check DPDK memory allocation
docker exec dpdk-processor cat /proc/self/numa_maps | grep huge

# Verify CPU affinity
docker exec dpdk-processor taskset -p 1
```

## Monitoring DPDK Applications

DPDK provides telemetry through shared memory:

```bash
# Connect to DPDK telemetry socket from the host
# (if the socket is shared via a volume)
dpdk-telemetry.py -c /var/run/dpdk/rte/telemetry

# Query port statistics
# In the telemetry client:
# --> /ethdev/stats,0
# --> /ethdev/info,0
```

Export metrics to Prometheus using a sidecar:

```python
# dpdk_exporter.py - Export DPDK statistics to Prometheus format
import json
import socket
from http.server import HTTPServer, BaseHTTPRequestHandler

DPDK_TELEMETRY_SOCK = "/var/run/dpdk/rte/telemetry"

def query_dpdk(command):
    """Send a command to the DPDK telemetry socket and return the response."""
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)
    sock.connect(DPDK_TELEMETRY_SOCK)
    # Read the initial connection info
    sock.recv(4096)
    # Send the command
    sock.send(command.encode())
    response = sock.recv(4096)
    sock.close()
    return json.loads(response)

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        stats = query_dpdk("/ethdev/stats,0")
        data = stats.get("/ethdev/stats", {})
        metrics = []
        metrics.append(f'dpdk_rx_packets {{port="0"}} {data.get("ipackets", 0)}')
        metrics.append(f'dpdk_tx_packets {{port="0"}} {data.get("opackets", 0)}')
        metrics.append(f'dpdk_rx_bytes {{port="0"}} {data.get("ibytes", 0)}')
        metrics.append(f'dpdk_tx_bytes {{port="0"}} {data.get("obytes", 0)}')
        metrics.append(f'dpdk_rx_errors {{port="0"}} {data.get("ierrors", 0)}')

        body = "\n".join(metrics) + "\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(body.encode())

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 9100), MetricsHandler)
    print("DPDK metrics exporter on port 9100")
    server.serve_forever()
```

## Security Considerations

DPDK containers run with elevated privileges, which requires careful security practices:

```bash
# Instead of --privileged, use specific capabilities and device access
docker run -d \
  --name dpdk-processor \
  --cap-add=SYS_RAWIO \
  --cap-add=IPC_LOCK \
  --cap-add=SYS_ADMIN \
  --device=/dev/vfio/vfio \
  --device=/dev/vfio/42 \
  -v /dev/hugepages:/dev/hugepages \
  --ulimit memlock=-1:-1 \
  --cpuset-cpus="2,3" \
  dpdk-app:latest
```

This grants only the specific capabilities DPDK needs instead of full root privileges.

## Conclusion

DPDK inside Docker containers delivers line-rate packet processing for workloads that cannot tolerate kernel networking overhead. The setup is more involved than standard Docker networking: you need huge pages, VFIO devices, CPU isolation, and privileged containers. But for network-intensive applications like packet capture, firewalls, load balancers, and trading systems, the performance difference is dramatic. Standard bridge networking might handle 2-3 million packets per second; DPDK can handle 20-40 million on the same hardware. Start with the sample forwarder, measure the performance on your hardware, and build from there.
