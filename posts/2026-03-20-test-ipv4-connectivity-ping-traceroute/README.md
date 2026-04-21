# How to Test IPv4 Connectivity with ping and traceroute on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Ping, Traceroute, IPv4, Network Diagnostics

Description: Use ping and traceroute to test IPv4 connectivity, measure latency and packet loss, and identify where in the network path failures or delays are occurring.

## Introduction

`ping` and `traceroute` are the two most fundamental network diagnostic tools. `ping` tests ICMP end-to-end reachability and measures round-trip latency. `traceroute` maps responding hops along the path and helps identify where delays or failures occur.

## Basic ping

```bash
# Ping a host - send 4 ICMP echo requests (Linux sends continuously without -c)

ping -c 4 8.8.8.8

# Ping the gateway to test local network
ping -c 3 192.168.1.1

# Ping using a specific source interface
ping -I eth0 -c 3 8.8.8.8
```

## Reading ping Output

```yaml
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=11.2 ms
64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=10.8 ms

--- 8.8.8.8 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 10.8/11.0/11.2/0.200 ms
```

| Field | Meaning |
|---|---|
| `ttl=118` | Time-to-Live remaining on arrival |
| `time=11.2 ms` | Round-trip latency |
| `0% packet loss` | No packets dropped |
| `mdev` | RTT variability (population standard deviation) |

## Continuous Monitoring with ping

```bash
# Ping every 0.2 seconds - good for watching intermittent loss
ping -i 0.2 192.168.1.1

# Flood ping (requires root) - stress-tests packet handling and loss
sudo ping -f -c 1000 192.168.1.1
```

## Setting Ping TTL (to test TTL exhaustion)

```bash
# Set TTL to 1 - ping will die at the first hop
ping -t 1 8.8.8.8
# Output: From 192.168.1.1: Time to live exceeded
```

## Basic traceroute

```bash
# Trace route to 8.8.8.8 using ICMP
traceroute -I 8.8.8.8

# Trace using UDP (default on Linux, may be blocked)
traceroute 8.8.8.8

# Specify source interface
traceroute -i eth0 8.8.8.8
```

## Reading traceroute Output

```text
traceroute to 8.8.8.8, 30 hops max
 1  192.168.1.1     1.234 ms   1.100 ms   1.150 ms
 2  10.5.0.1        5.321 ms   5.210 ms   5.300 ms
 3  * * *
 4  172.16.0.1      8.123 ms   8.200 ms   8.050 ms
 5  8.8.8.8        11.456 ms  11.300 ms  11.400 ms
```

- `* * *`: no reply within the timeout, often due to filtering, rate limiting, or loss
- Three latency values: three separate probe packets per hop

## tracepath - Alternative Without Root

```bash
# tracepath works without root and discovers PMTU along the way
tracepath 8.8.8.8
```

## mtr - Combined ping + traceroute

```bash
# Install mtr on Debian/Ubuntu
sudo apt install mtr-tiny

# Run interactive traceroute with continuous pings to each hop
mtr 8.8.8.8

# Non-interactive report mode (100 packets)
mtr -n -r -c 100 8.8.8.8
```

## Conclusion

Start with `ping` to confirm basic ICMP reachability and measure latency. If ping fails, use `traceroute` or `mtr` to narrow down where probes stop receiving replies. `mtr` is the most powerful single tool, combining both and showing per-hop loss and latency over time.
