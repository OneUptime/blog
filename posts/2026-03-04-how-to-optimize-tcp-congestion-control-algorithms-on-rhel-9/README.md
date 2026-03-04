# How to Optimize TCP Congestion Control Algorithms on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on optimize tcp congestion control algorithms on rhel 9 with practical examples and commands.

---

TCP congestion control algorithms affect how RHEL 9 handles network throughput. Choosing the right algorithm improves performance.

## Check Current Algorithm

```bash
sysctl net.ipv4.tcp_congestion_control
```

## List Available Algorithms

```bash
sysctl net.ipv4.tcp_available_congestion_control
```

## Common Algorithms

| Algorithm | Best For |
|-----------|----------|
| cubic | General purpose (default) |
| bbr | High-bandwidth, high-latency links |
| htcp | High-speed networks |
| reno | Legacy compatibility |

## Switch to BBR

```bash
sudo modprobe tcp_bbr
sudo tee /etc/sysctl.d/99-bbr.conf <<EOF
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF
sudo sysctl -p /etc/sysctl.d/99-bbr.conf
```

## Make BBR Persistent

```bash
echo "tcp_bbr" | sudo tee /etc/modules-load.d/bbr.conf
```

## Verify BBR is Active

```bash
sysctl net.ipv4.tcp_congestion_control
lsmod | grep bbr
```

## Benchmark Different Algorithms

```bash
for algo in cubic bbr; do
  sudo sysctl -w net.ipv4.tcp_congestion_control=$algo
  echo "=== $algo ==="
  iperf3 -c remote-host -t 30 2>&1 | tail -3
done
```

## Conclusion

BBR congestion control on RHEL 9 often provides better throughput than the default cubic algorithm on high-bandwidth or high-latency links. Test both algorithms with your specific network to determine which performs better.

