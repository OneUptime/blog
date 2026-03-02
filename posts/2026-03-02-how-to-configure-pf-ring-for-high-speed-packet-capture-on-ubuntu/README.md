# How to Configure PF_RING for High-Speed Packet Capture on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Packet Capture, PF_RING, Security

Description: Learn how to install and configure PF_RING on Ubuntu to achieve high-speed packet capture for network monitoring and security analysis at multi-gigabit rates.

---

Standard packet capture using libpcap works fine for low-traffic environments, but once you get into multi-gigabit capture requirements, the default kernel path becomes a bottleneck. Packets get copied multiple times between kernel and user space, interrupts fire constantly, and the CPU struggles to keep up. PF_RING is a kernel module that drastically reduces this overhead by implementing a high-performance packet capture mechanism with zero-copy support and hardware-accelerated capture for supported NICs.

PF_RING is used by network security tools like ntopng, Suricata, and Zeek when deployed in high-bandwidth environments. This guide covers installing PF_RING on Ubuntu, configuring the kernel module, and using it with common capture tools.

## PF_RING Variants

There are three variants of PF_RING to know:

- **PF_RING** - the basic kernel module that improves standard capture
- **PF_RING ZC (Zero Copy)** - uses DPDK-style kernel bypass for maximum throughput
- **PF_RING DNA** - direct NIC access (older, largely superseded by ZC)

This guide focuses on standard PF_RING and ZC for supported Intel NICs.

## Installing Build Dependencies

```bash
sudo apt update
sudo apt install -y build-essential bison flex linux-headers-$(uname -r) \
    libnuma-dev git wget pkg-config libssl-dev ethtool
```

## Downloading and Building PF_RING

```bash
# Clone the ntop repository
git clone https://github.com/ntop/PF_RING.git
cd PF_RING

# Build the kernel module
cd kernel
make
sudo make install

# Build the user-space library
cd ../userland/lib
./configure --prefix=/usr/local
make
sudo make install
sudo ldconfig

# Build the libpcap replacement with PF_RING support
cd ../libpcap
./configure --prefix=/usr/local
make
sudo make install
```

## Loading the Kernel Module

Load the PF_RING module:

```bash
# Load PF_RING with a ring buffer of 65536 slots per ring
sudo modprobe pf_ring min_num_slots=65536

# Verify it loaded
lsmod | grep pf_ring

# Check the module parameters
cat /sys/module/pf_ring/parameters/min_num_slots
```

Make it persistent:

```bash
# Add to modules list
echo 'pf_ring min_num_slots=65536' | sudo tee /etc/modules-load.d/pf_ring.conf

# Or configure via modprobe options
echo 'options pf_ring min_num_slots=65536' | sudo tee /etc/modprobe.d/pf_ring.conf
```

## Configuring the Capture Interface

Set up the capture interface for optimal performance:

```bash
# Identify your capture interface
ip link show

# Disable offloading features that interfere with capture
# (These cause packets to look different than what's on the wire)
sudo ethtool -K eth1 rx off tx off sg off tso off gso off gro off lro off

# Set the ring buffer size for the NIC to maximum
sudo ethtool -G eth1 rx 4096 tx 4096

# Enable promiscuous mode
sudo ip link set eth1 promisc on

# For high traffic, set CPU affinity and interrupt tuning
# Find IRQ numbers for the interface
grep eth1 /proc/interrupts

# Set IRQ affinity to specific CPUs (example: pin to CPUs 0-3)
echo 0f | sudo tee /proc/irq/128/smp_affinity   # Adjust IRQ number
```

## Using PF_RING ZC for Zero-Copy Capture

For ZC mode, you need a supported Intel NIC (i350, i210, X520, X710, etc.):

```bash
# Build and install ZC drivers
cd PF_RING/drivers/intel

# Build the i40e ZC driver (for X710/XL710)
cd i40e/i40e-*/src
make -f Makefile.pf_ring
sudo make -f Makefile.pf_ring install

# Load the ZC driver
sudo rmmod i40e
sudo modprobe i40e-zc

# Verify ZC is available
ls /proc/net/pf_ring/

# Check device availability for ZC
cat /proc/net/pf_ring/dev/eth1/info
```

Allocate huge pages for ZC operation:

```bash
# Allocate 1GB huge pages
echo 1024 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Mount hugetlbfs
sudo mkdir -p /mnt/huge
sudo mount -t hugetlbfs nodev /mnt/huge

# Make persistent
echo 'nodev /mnt/huge hugetlbfs defaults 0 0' | sudo tee -a /etc/fstab
echo 'vm.nr_hugepages=1024' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Capturing Packets with PF_RING Tools

PF_RING comes with several capture utilities:

```bash
# pfcount - basic packet counting/capture
pfcount -i eth1

# pfcount with statistics
pfcount -i eth1 -s -v

# Capture to pcap file using PF_RING
pfcount -i eth1 -w /tmp/capture.pcap

# pfsend - replay packets from a pcap file
pfsend -f /tmp/capture.pcap -i eth1 -r 1    # Replay at 1x speed
pfsend -f /tmp/capture.pcap -i eth1 -r 10   # Replay at 10x speed
```

For ZC interfaces, prefix the interface name with `zc:`:

```bash
# Capture using ZC mode
pfcount -i zc:eth1

# Distribute capture across CPU cores using ZC cluster
pfcount -i zc:eth1@1    # Worker 1 of a ZC cluster
pfcount -i zc:eth1@2    # Worker 2 of a ZC cluster
```

## Integrating with Suricata

Suricata supports PF_RING natively. Configure it to use PF_RING:

```bash
sudo nano /etc/suricata/suricata.yaml
```

```yaml
# /etc/suricata/suricata.yaml - PF_RING configuration section
pfring:
  - interface: eth1
    threads: 4          # Number of capture threads
    cluster-id: 99      # Unique cluster ID
    cluster-type: cluster_flow  # Balance by flow (keeps flow packets on same thread)
    bpf-filter: ""      # Optional BPF filter
    checksum-checks: auto
```

Start Suricata with PF_RING:

```bash
sudo suricata -c /etc/suricata/suricata.yaml --pfring
```

## Performance Tuning

### CPU and NUMA affinity

For best performance, pin capture processes to CPUs that are on the same NUMA node as the NIC:

```bash
# Find which NUMA node the NIC is on
cat /sys/class/net/eth1/device/numa_node

# Run capture process on that NUMA node's CPUs
numactl --cpunodebind=0 --membind=0 pfcount -i eth1
```

### Kernel receive buffer tuning

```bash
# Increase kernel socket buffer sizes
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.rmem_default=134217728
sudo sysctl -w net.core.netdev_max_backlog=250000

# Make persistent
cat << 'EOF' | sudo tee /etc/sysctl.d/99-pf-ring.conf
net.core.rmem_max=134217728
net.core.rmem_default=134217728
net.core.netdev_max_backlog=250000
EOF
sudo sysctl -p /etc/sysctl.d/99-pf-ring.conf
```

### Monitoring capture statistics

```bash
# Monitor PF_RING statistics in real time
watch -n 1 cat /proc/net/pf_ring/info

# Check for dropped packets per ring
ls /proc/net/pf_ring/
cat /proc/net/pf_ring/0/      # Ring 0 statistics
```

PF_RING significantly increases the packet rates you can capture without dropping, especially when combined with ZC mode and proper NIC/CPU affinity. For monitoring networks above 10 Gbps, it is essentially a requirement for any serious network security monitoring deployment.
