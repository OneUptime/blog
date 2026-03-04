# How to Configure MTU and Jumbo Frames on RHEL 9 for High-Performance Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking, Performance

Description: Step-by-step guide on configure mtu and jumbo frames on rhel 9 for high-performance networking with practical examples and commands.

---

Jumbo frames and MTU tuning improve network throughput for large data transfers on RHEL 9.

## Check Current MTU

```bash
ip link show eth0 | grep mtu
```

## Set MTU Temporarily

```bash
sudo ip link set eth0 mtu 9000
```

## Set MTU Permanently with NetworkManager

```bash
sudo nmcli con mod "System eth0" 802-3-ethernet.mtu 9000
sudo nmcli con up "System eth0"
```

## Verify End-to-End MTU

```bash
# Test with ping (subtract 28 bytes for IP+ICMP headers)
ping -M do -s 8972 remote-host
```

## Verify Jumbo Frame Support

```bash
# Check interface capabilities
ethtool -i eth0
```

## Switch Configuration

Jumbo frames must be enabled on all network switches between endpoints. Verify with your network team.

## Performance Testing

```bash
# Before (MTU 1500)
iperf3 -c remote-host -t 30

# After (MTU 9000)
iperf3 -c remote-host -t 30
```

## Troubleshoot MTU Issues

```bash
# Find the maximum MTU without fragmentation
for mtu in 9000 8000 4000 2000 1500; do
  echo "Testing MTU $mtu"
  ping -M do -s $((mtu - 28)) -c 1 remote-host 2>&1 | grep -E "bytes|too large"
done
```

## Conclusion

Jumbo frames on RHEL 9 can significantly improve throughput for bulk data transfers. Ensure all network devices in the path support the configured MTU to avoid fragmentation and packet drops.

