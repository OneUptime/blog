# Port Mirroring, SPAN, and Packet Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Packet Capture, Span, Port Mirroring, Network Diagnostics

Description: A practical guide to port mirroring and SPAN (Switched Port Analyzer) configurations for network packet capture and traffic analysis.

## What is Port Mirroring?

Port mirroring (also called SPAN - Switched Port Analyzer) is a network switch feature that copies traffic from one or more source ports to a destination port where a monitoring device or packet analyzer is connected. It is used for:

- Network troubleshooting and diagnostics
- Intrusion detection system (IDS) monitoring
- Traffic analysis and bandwidth monitoring
- Security auditing

## SPAN vs RSPAN vs ERSPAN

| Type | Description |
|---|---|
| **SPAN** | Local mirroring on the same switch |
| **RSPAN** | Remote SPAN - mirrors traffic to a VLAN across switches |
| **ERSPAN** | Encapsulated Remote SPAN - tunnels mirrored traffic over IP using GRE |

## Configuring SPAN on Cisco IOS

### Local SPAN

```text
Switch(config)# monitor session 1 source interface GigabitEthernet0/1 both
Switch(config)# monitor session 1 destination interface GigabitEthernet0/24
```

- `source interface` - the port to mirror
- `destination interface` - where the analyzer is connected
- `both` - mirror ingress and egress; use `rx` or `tx` for one direction

### Verify SPAN Session

```yaml
Switch# show monitor session 1
Session 1
---------
Type                   : Local Session
Source Ports           :
    Both               : Gi0/1
Destination Ports      : Gi0/24
```

## Configuring RSPAN

```text
Switch-A(config)# vlan 999
Switch-A(config-vlan)# remote-span
Switch-A(config)# monitor session 1 source interface GigabitEthernet0/1
Switch-A(config)# monitor session 1 destination remote vlan 999

Switch-B(config)# vlan 999
Switch-B(config-vlan)# remote-span
Switch-B(config)# monitor session 1 source remote vlan 999
Switch-B(config)# monitor session 1 destination interface GigabitEthernet0/24
```

## Linux Software Mirroring with tc

On Linux, you can mirror ingress traffic using the Traffic Control (tc) tool:

```bash
# Mirror ingress traffic on eth0 to eth1

sudo tc qdisc add dev eth0 ingress
sudo tc filter add dev eth0 parent ffff: protocol all u32 match u32 0 0 action mirred egress mirror dev eth1
```

Or use `iptables` with the `TEE` target to copy packets to a monitoring host:

```bash
sudo iptables -t mangle -A PREROUTING -i eth0 -j TEE --gateway 192.168.1.99
sudo iptables -t mangle -A POSTROUTING -o eth0 -j TEE --gateway 192.168.1.99
```

## Packet Capture on the Monitor Port

Once mirroring is configured, use `tcpdump` or Wireshark on the monitoring host:

```bash
# Capture all traffic on the monitoring interface
sudo tcpdump -i eth1 -w capture.pcap

# Capture HTTP traffic only
sudo tcpdump -i eth1 tcp port 80 -w http-capture.pcap

# Capture with timestamp and verbose output
sudo tcpdump -i eth1 -v -tttt
```

## Analyzing with Wireshark

Open the `.pcap` file in Wireshark:

```bash
wireshark capture.pcap &
```

Useful Wireshark filters for analysis:

```text
# Filter by IP
ip.addr == 192.168.1.10

# Filter HTTP traffic
http

# Filter DNS queries
dns

# Filter TCP resets (connection problems)
tcp.flags.reset == 1

# Filter retransmissions (packet loss indicator)
tcp.analysis.retransmission
```

## ERSPAN Configuration (Cisco)

```text
Switch(config)# monitor session 1 type erspan-source
Switch(config-mon-erspan-src)# source interface GigabitEthernet0/1 both
Switch(config-mon-erspan-src)# destination
Switch(config-mon-erspan-src-dst)# erspan-id 1
Switch(config-mon-erspan-src-dst)# ip address 10.0.0.99
Switch(config-mon-erspan-src-dst)# origin ip address 10.0.0.1
Switch(config-mon-erspan-src-dst)# exit
Switch(config-mon-erspan-src)# no shutdown
```

## Best Practices

1. **Mirror only necessary traffic** - full mirroring at high speeds can overwhelm the monitoring host
2. **Use ERSPAN** for monitoring across data centers over IP networks
3. **Separate monitoring VLANs** to keep analyzer traffic isolated
4. **Set capture filters early** - writing to disk is the bottleneck at high traffic volumes
5. **Rotate capture files** using tcpdump's `-C` and `-W` flags to limit disk usage

## Conclusion

Port mirroring and SPAN are essential tools for network visibility. Whether you use hardware SPAN on a managed switch or software mirroring on Linux, captured traffic enables deep analysis with tools like tcpdump and Wireshark for troubleshooting and security monitoring.
