# How to Optimize Compute Engine Network Throughput by Enabling Tier 1 Networking and Jumbo Frames

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Networking, Performance, Google Cloud

Description: Maximize network throughput on Google Cloud Compute Engine instances by enabling Tier 1 networking performance and configuring jumbo frames for high-bandwidth workloads.

---

If you are running network-intensive workloads on Compute Engine - think data replication, distributed databases, media streaming, or large-scale batch processing - you might find that your instances do not hit the network throughput numbers you expected. The default networking configuration on GCE instances is designed for general-purpose workloads, not maximum throughput. Google Cloud offers Tier 1 networking (also called per-VM networking performance) and jumbo frames support that can dramatically increase your available bandwidth. This post covers how to enable and configure both.

## Understanding Network Performance Tiers

Compute Engine instances have two levels of network performance:

**Default (Tier 0)**: Network bandwidth scales with vCPU count, up to a maximum that varies by machine type. A general-purpose instance with 16 vCPUs typically gets up to 32 Gbps egress.

**Tier 1 (per-VM networking)**: Available on select machine types with 46 or more vCPUs. Provides up to 100 Gbps egress bandwidth per instance. This is a significant jump from the default tier.

The key insight is that Tier 1 is not just about raw bandwidth - it also provides higher packet-per-second (PPS) rates and more consistent performance under load.

## Step 1: Choose the Right Machine Type

Tier 1 networking is available on these machine families with sufficient vCPU count:

| Machine Family | Min vCPUs for Tier 1 | Max Bandwidth |
|---|---|---|
| C2 | 60 vCPUs | 100 Gbps |
| C2D | 56 vCPUs | 100 Gbps |
| C3 | 46 vCPUs | 100 Gbps |
| N2 | 46 vCPUs | 100 Gbps |
| N2D | 48 vCPUs | 100 Gbps |

Check the bandwidth for your current machine type:

```bash
# Describe a machine type to see its network performance
gcloud compute machine-types describe c3-standard-88 \
    --zone=us-central1-a \
    --format="json(name, guestCpus, memoryMb, maximumPersistentDisksSizeGb)"
```

## Step 2: Enable Tier 1 Networking on an Instance

Tier 1 networking is enabled at instance creation time through the `--network-performance-configs` flag:

```bash
# Create an instance with Tier 1 networking enabled
gcloud compute instances create high-throughput-vm \
    --zone=us-central1-a \
    --machine-type=c3-standard-88 \
    --network-performance-configs=total-egress-bandwidth-tier=TIER_1 \
    --network-interface=network=your-vpc,subnet=your-subnet \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud
```

The `total-egress-bandwidth-tier=TIER_1` setting is the key. Without it, even a large instance uses default tier networking.

For existing instances, you cannot change the networking tier. You need to create a new instance with the correct configuration. If you are using instance templates (which you should be for production), update the template:

```bash
# Create an instance template with Tier 1 networking
gcloud compute instance-templates create high-throughput-template \
    --machine-type=n2-standard-64 \
    --network-performance-configs=total-egress-bandwidth-tier=TIER_1 \
    --network-interface=network=your-vpc,subnet=your-subnet \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-type=pd-ssd \
    --boot-disk-size=100GB
```

## Step 3: Configure Jumbo Frames

Standard Ethernet frames have a Maximum Transmission Unit (MTU) of 1460 bytes on GCE (slightly less than the typical 1500 bytes due to VPC overhead). Jumbo frames increase the MTU to 8896 bytes, which means each network packet carries more data. This reduces CPU overhead from packet processing and improves throughput for large transfers.

First, configure the VPC network to support jumbo frames:

```bash
# Update the VPC network MTU to support jumbo frames
gcloud compute networks update your-vpc \
    --mtu=8896
```

Note: Changing the VPC MTU requires all instances in the network to be updated. Existing connections might be disrupted during the change.

Then configure the instance's network interface to use jumbo frames. On Linux, this is done at the OS level:

```bash
# Set the MTU on the network interface inside the VM
# Run this via SSH on the instance
sudo ip link set dev ens4 mtu 8896

# Verify the MTU is set
ip link show dev ens4
```

To make this persistent across reboots, add it to the network configuration:

For Ubuntu/Debian:

```bash
# Create a netplan configuration file for jumbo frames
sudo tee /etc/netplan/99-jumbo-frames.yaml << 'EOF'
network:
  version: 2
  ethernets:
    ens4:
      mtu: 8896
EOF

# Apply the configuration
sudo netplan apply
```

For RHEL/CentOS:

```bash
# Add MTU to the network configuration
sudo nmcli connection modify "System ens4" 802-3-ethernet.mtu 8896
sudo nmcli connection up "System ens4"
```

## Step 4: Verify Network Performance

After enabling Tier 1 and jumbo frames, test the actual throughput between two instances:

```bash
# Install iperf3 on both instances
sudo apt-get update && sudo apt-get install -y iperf3

# On the receiver instance, start iperf3 in server mode
iperf3 -s

# On the sender instance, run the throughput test
iperf3 -c RECEIVER_INTERNAL_IP -t 30 -P 8 -w 2M
```

The flags:
- `-t 30`: Run for 30 seconds
- `-P 8`: Use 8 parallel streams (needed to saturate high-bandwidth links)
- `-w 2M`: Set TCP window size to 2 MB

For Tier 1 networking between instances in the same zone, you should see throughput close to 100 Gbps with multiple streams.

## Step 5: Tune TCP Settings for High Throughput

The default Linux TCP settings are not optimized for 100 Gbps. Tune the kernel parameters:

```bash
# TCP tuning for high throughput - add to /etc/sysctl.conf
sudo tee -a /etc/sysctl.conf << 'EOF'
# Increase TCP buffer sizes for high-bandwidth networks
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 16777216
net.core.wmem_default = 16777216
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 87380 134217728

# Increase the network backlog for high PPS
net.core.netdev_max_backlog = 250000

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1

# Enable BBR congestion control for better throughput
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF

# Apply the settings
sudo sysctl -p
```

BBR (Bottleneck Bandwidth and Round-Trip) congestion control is particularly effective on Google Cloud's network and can significantly improve throughput compared to the default CUBIC algorithm.

## Step 6: Use Multiple Network Interfaces

For workloads that need even more bandwidth or traffic isolation, you can attach multiple network interfaces to an instance:

```bash
# Create an instance with multiple NICs
gcloud compute instances create multi-nic-vm \
    --zone=us-central1-a \
    --machine-type=c3-standard-88 \
    --network-performance-configs=total-egress-bandwidth-tier=TIER_1 \
    --network-interface=network=vpc-1,subnet=subnet-1 \
    --network-interface=network=vpc-2,subnet=subnet-2 \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud
```

Each interface can handle traffic to its respective VPC, and the total bandwidth is shared across interfaces from the Tier 1 allocation.

## Step 7: Consider Placement Policy for Low Latency

If you need maximum throughput between specific instances, use a placement policy to ensure they are physically close:

```bash
# Create a compact placement policy
gcloud compute resource-policies create group-placement high-throughput-group \
    --collocation=COLLOCATED \
    --vm-count=4 \
    --region=us-central1

# Create instances with the placement policy
gcloud compute instances create vm-1 \
    --zone=us-central1-a \
    --machine-type=c3-standard-88 \
    --network-performance-configs=total-egress-bandwidth-tier=TIER_1 \
    --resource-policies=high-throughput-group \
    --network-interface=network=your-vpc,subnet=your-subnet \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud
```

Collocated instances are placed on the same physical rack or cluster, reducing network hops and providing the lowest possible latency and highest throughput.

## Step 8: Monitor Network Performance

Set up monitoring to track your actual network usage:

```bash
# View network metrics for an instance
gcloud monitoring time-series list \
    --filter='metric.type="compute.googleapis.com/instance/network/sent_bytes_count" AND resource.labels.instance_id="INSTANCE_ID"' \
    --interval-start-time=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
```

Key metrics to track:
- `network/sent_bytes_count` - Egress bandwidth
- `network/received_bytes_count` - Ingress bandwidth
- `network/sent_packets_count` - Egress PPS
- `network/received_packets_count` - Ingress PPS

## Cost Considerations

Tier 1 networking is not free. It adds an incremental cost per vCPU-hour on top of the instance cost. Calculate whether the throughput improvement justifies the additional cost for your workload. For data-intensive workloads where faster transfers save on total compute time, Tier 1 often pays for itself.

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to continuously monitor network throughput and latency for your high-performance instances. Dashboards showing actual vs expected bandwidth help you verify that Tier 1 networking and jumbo frames are delivering the performance you need.

The combination of Tier 1 networking, jumbo frames, and proper TCP tuning can increase your Compute Engine network throughput by 2-3x compared to default settings. For network-bound workloads, this is one of the highest-impact optimizations you can make.
