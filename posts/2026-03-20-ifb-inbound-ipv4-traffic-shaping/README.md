# How to Use IFB Devices for Inbound IPv4 Traffic Shaping on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IFB, tc, IPv4, Linux, Inbound Traffic Shaping, QoS

Description: Use Linux Intermediate Functional Block (IFB) virtual devices to redirect and shape inbound IPv4 traffic since tc can only directly control egress queues.

Linux `tc` can only shape outgoing (egress) traffic because by the time incoming (ingress) packets arrive, they've already consumed bandwidth. IFB (Intermediate Functional Block) devices solve this by redirecting incoming packets to a virtual interface where standard egress shaping can be applied.

## How IFB Works

```text
Inbound packets → eth0 ingress → redirect to ifb0 → ifb0 egress qdisc → shapes traffic
```

The redirection happens instantly, and the actual packet processing (delivery to the application) is delayed by the IFB shaping rules.

## Step 1: Load the IFB Module

```bash
# Load the IFB kernel module

sudo modprobe ifb

# Load automatically at boot on systemd-based systems
echo "ifb" | sudo tee /etc/modules-load.d/ifb.conf

# Verify the module is loaded
lsmod | grep ifb
```

## Step 2: Create and Bring Up an IFB Interface

```bash
# Create an IFB device (ifb0)
sudo ip link add ifb0 type ifb
sudo ip link set ifb0 up

# Verify
ip link show ifb0
```

## Step 3: Redirect Ingress Traffic to IFB

```bash
# Add an ingress qdisc to the physical interface
sudo tc qdisc add dev eth0 ingress

# Redirect all inbound traffic from eth0 to ifb0
sudo tc filter add dev eth0 parent ffff: protocol ip u32 \
  match u32 0 0 \
  action mirred egress redirect dev ifb0
```

## Step 4: Apply Shaping Rules on the IFB Interface

Now that inbound traffic flows through `ifb0`, apply any standard egress qdisc:

```bash
# Limit inbound traffic to 20 Mbps with TBF
sudo tc qdisc add dev ifb0 root tbf \
  rate 20mbit \
  burst 32kb \
  latency 400ms
```

Or use HTB for priority-based inbound shaping:

```bash
# HTB on ifb0 for inbound traffic classification
sudo tc qdisc add dev ifb0 root handle 1: htb default 30

sudo tc class add dev ifb0 parent 1: classid 1:1 htb rate 20mbit
sudo tc class add dev ifb0 parent 1:1 classid 1:10 htb rate 10mbit ceil 20mbit prio 1
sudo tc class add dev ifb0 parent 1:1 classid 1:30 htb rate 10mbit ceil 20mbit prio 2

# Filter: high-priority inbound TCP traffic from SSH (source port 22)
sudo tc filter add dev ifb0 protocol ip parent 1:0 prio 1 u32 \
  match ip protocol 6 0xff \
  match tcp src 22 0xffff flowid 1:10
```

## Step 5: Combine with Outbound Shaping

```bash
# Apply TBF to outbound traffic on eth0
sudo tc qdisc add dev eth0 root tbf rate 20mbit burst 32kb latency 400ms
```

Now both inbound and outbound are shaped.

## Verifying IFB Traffic Flow

```bash
# Check statistics on ifb0 to confirm traffic is flowing through it
sudo tc -s qdisc show dev ifb0

# Download a large file and monitor the rate
wget -O /dev/null https://proof.ovh.net/files/10Mb.dat &
sudo tc -s qdisc show dev ifb0
```

## Cleanup

```bash
sudo tc qdisc del dev eth0 ingress
sudo tc qdisc del dev ifb0 root
sudo ip link del ifb0
```

IFB is the standard solution for symmetric (inbound + outbound) traffic shaping in Linux, commonly used in router configurations and ISP edge devices.
