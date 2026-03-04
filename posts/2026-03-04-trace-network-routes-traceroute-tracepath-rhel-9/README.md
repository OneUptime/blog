# How to Trace Network Routes with traceroute and tracepath on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, traceroute, tracepath, Networking, Linux

Description: Learn how to use traceroute and tracepath on RHEL 9 to trace packet paths across networks, identify routing issues, discover MTU problems, and diagnose latency bottlenecks.

---

When packets aren't reaching their destination, you need to know where they're getting lost. Traceroute and tracepath show you every hop between your RHEL 9 system and a remote host, letting you pinpoint exactly where things break down. Both tools are similar but have important differences.

## traceroute vs tracepath

| Feature | traceroute | tracepath |
|---------|------------|-----------|
| Root required | Yes (for ICMP) | No |
| MTU discovery | No | Yes |
| Protocol options | ICMP, UDP, TCP | UDP only |
| Max hops control | Yes | Yes |
| Pre-installed | No | Yes |

## Installing traceroute

tracepath is included in RHEL 9 by default. traceroute needs to be installed.

```bash
# Install traceroute
sudo dnf install -y traceroute
```

## Basic Usage

```bash
# Trace route using traceroute (uses UDP by default)
traceroute example.com

# Trace route using tracepath (no root required)
tracepath example.com

# Trace with numeric output only (faster, no DNS lookups)
traceroute -n 8.8.8.8
tracepath -n 8.8.8.8
```

## Understanding the Output

```
 1  192.168.1.1 (192.168.1.1)  0.512 ms  0.487 ms  0.463 ms
 2  10.0.0.1 (10.0.0.1)  1.234 ms  1.198 ms  1.176 ms
 3  * * *
 4  203.0.113.50 (203.0.113.50)  15.432 ms  15.401 ms  15.389 ms
```

Each line is a hop. The three time values are the round-trip times for the three probes sent. An asterisk (`*`) means no response was received for that probe.

## Using Different Protocols

Some firewalls block certain protocols. Try different ones to get through.

```bash
# Use ICMP (like ping) - requires root
sudo traceroute -I 8.8.8.8

# Use TCP SYN to port 80 (great for web server reachability)
sudo traceroute -T -p 80 example.com

# Use TCP SYN to port 443
sudo traceroute -T -p 443 example.com

# Use UDP (default)
traceroute -U 8.8.8.8

# Specify a starting UDP port
traceroute -p 33434 8.8.8.8
```

## tracepath for MTU Discovery

tracepath's unique advantage is Path MTU Discovery. It tells you the MTU at each hop.

```bash
# Trace with MTU discovery
tracepath -n 8.8.8.8
```

The output includes MTU information:

```
 1?: [LOCALHOST]                      pmtu 1500
 1:  192.168.1.1                       0.512ms
 2:  10.0.0.1                          1.234ms asymm  3
 3:  203.0.113.1                      15.432ms reached
     Resume: pmtu 1500 hops 3 back 3
```

The `pmtu` value shows the Path MTU, which is the smallest MTU along the entire path.

## Tracing IPv6 Routes

```bash
# traceroute over IPv6
traceroute -6 2001:4860:4860::8888

# Or use traceroute6
traceroute6 example.com

# tracepath over IPv6
tracepath -6 example.com

# Or use tracepath6
tracepath6 example.com
```

## Setting Maximum Hops

```bash
# Limit to 15 hops
traceroute -m 15 example.com

# tracepath uses -m too
tracepath -m 15 example.com
```

## Setting Probe Timeouts

```bash
# Wait only 2 seconds for each response
traceroute -w 2 example.com

# Send only 1 probe per hop (faster)
traceroute -q 1 example.com
```

## Interpreting Common Patterns

**All asterisks at one hop:**
```
 3  * * *
 4  * * *
```
The device at hop 3 and 4 is either filtering ICMP/UDP responses or is configured not to respond. This doesn't necessarily mean traffic is blocked - it just means you can't see that hop.

**Increasing latency at a specific hop:**
```
 4  10.0.0.1    5.2 ms
 5  172.16.0.1  150.3 ms
 6  203.0.113.1 151.1 ms
```
The jump at hop 5 suggests congestion or a long physical distance (intercontinental link, for example).

**Asymmetric routing:**
```
 2:  10.0.0.1    1.234ms asymm  4
```
tracepath detected that the return path takes a different number of hops. This is normal on the internet but can indicate routing issues on internal networks.

## Real-World Troubleshooting

**Web server unreachable, find where it breaks:**

```bash
# Trace TCP to port 443
sudo traceroute -T -p 443 web.example.com
```

**Internal network routing issue:**

```bash
# Trace to an internal host
tracepath -n 10.20.30.40

# Check if the route goes through the expected gateway
ip route get 10.20.30.40
```

**MTU problems (fragmentation issues):**

```bash
# Use tracepath to find the path MTU
tracepath -n problematic-host.example.com

# Then verify with ping
ping -M do -s 1472 -c 4 problematic-host.example.com
# -M do means don't fragment
# -s 1472 = 1500 - 28 bytes (IP + ICMP headers)
```

## Scripting with traceroute

```bash
# Output parseable format
traceroute -n -q 1 8.8.8.8 | awk '{print NR, $2, $3}'

# Check if a specific hop is responding
traceroute -n -m 5 -q 1 8.8.8.8 | grep -v '*'
```

## Wrapping Up

traceroute and tracepath are complementary tools on RHEL 9. Use tracepath when you don't have root access or need MTU discovery. Use traceroute when you need protocol flexibility (TCP, ICMP) to get through firewalls. When diagnosing routing problems, start with `ip route get` to check local routing, then use traceroute to see the full path. Asterisks in the output are not always a problem, so focus on where the trace stops or where latency spikes.
