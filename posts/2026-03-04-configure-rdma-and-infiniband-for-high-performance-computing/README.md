# How to Configure RDMA and InfiniBand for High-Performance Computing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Networking, Performance, Linux

Description: Step-by-step guide on configure rdma and infiniband for high-performance computing using Red Hat Enterprise Linux 9.

---

RDMA (Remote Direct Memory Access) and InfiniBand provide extremely low-latency, high-bandwidth network communication. These technologies are essential for HPC clusters and storage networks where standard Ethernet performance is insufficient.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install RDMA and InfiniBand Packages

Install the core RDMA packages and InfiniBand diagnostic tools:

```bash
# Install the RDMA core packages, OpenSM, and verification tools
sudo dnf install -y rdma-core opensm libibverbs-utils infiniband-diags
```

InfiniBand fabrics require a subnet manager. If your switch does not provide one, enable OpenSM on one host in the fabric:

```bash
# Enable and start OpenSM on the subnet manager host
sudo systemctl enable --now opensm
```

## Step 2: Configure IP over InfiniBand

Create a NetworkManager profile for the InfiniBand interface. Replace `mlx4_ib0` and the IP address with values from your environment. Use `datagram` mode for broad hardware compatibility; older adapters can use `connected` mode with an MTU of `65520` if supported.

```bash
# Create an IPoIB profile
sudo nmcli connection add type infiniband con-name mlx4_ib0 ifname mlx4_ib0 \
    transport-mode datagram mtu 2044

# Configure IPv4 settings
sudo nmcli connection modify mlx4_ib0 ipv4.method manual \
    ipv4.addresses 192.0.2.10/24
```

If your fabric uses InfiniBand partitions, set the partition key:

```bash
# Optional: configure an InfiniBand partition key
sudo nmcli connection modify mlx4_ib0 infiniband.p-key 0x8002
```

## Step 3: Activate the InfiniBand Connection

```bash
# Bring up the IPoIB connection
sudo nmcli connection up mlx4_ib0

# Check the subnet manager if this host runs OpenSM
sudo systemctl status opensm
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# List available InfiniBand devices
ibv_devices

# Display device details
ibv_devinfo

# Check InfiniBand port state
ibstat

# Confirm the IPoIB interface is up
ip addr show mlx4_ib0
```

## Troubleshooting

- If OpenSM fails to start, check the logs with `journalctl -u opensm -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep -E 'rdma-core|opensm|libibverbs-utils|infiniband-diags'`.
- If non-root users run RDMA applications, add appropriate `memlock` limits in `/etc/security/limits.conf`, such as `@rdma soft memlock unlimited` and `@rdma hard memlock unlimited`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
