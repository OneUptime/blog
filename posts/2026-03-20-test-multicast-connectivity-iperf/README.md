# How to Test Multicast Connectivity with iperf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, iperf, Network Testing, Linux, Performance

Description: Use iperf and iperf3 to test multicast UDP connectivity, measure throughput, and verify that packets are being delivered to all group members on your network.

## Introduction

`iperf` is a standard network performance tool that supports multicast UDP testing. By binding a server to a multicast group address, you can verify end-to-end multicast delivery and measure the actual data rate reaching each receiver.

## Prerequisites

- `iperf` (v2) installed on sender and receivers (`sudo apt install iperf`)
- All hosts on the same Layer 2 network, or multicast routing enabled between subnets
- Receivers able to join the test group

## Basic Multicast Test with iperf (v2)

iperf2 has native multicast support via the `-B` bind option.

Start the receiver first - it joins the multicast group:

```bash
# On the receiver: bind to multicast group 224.1.1.1 on port 5001

# -s = server mode, -u = UDP, -B = bind address, -i = report interval
iperf -s -u -B 224.1.1.1 -i 1
```

Then start the sender:

```bash
# On the sender: send UDP multicast to 224.1.1.1 at 1 Mbit/s for 10s
# -c = client mode, -u = UDP, -b = bandwidth, -t = duration, -T = TTL
iperf -c 224.1.1.1 -u -b 1M -t 10 -T 10 -i 1
```

Expected receiver output:

```text
[ ID] Interval       Transfer    Bandwidth   Jitter   Lost/Total Datagrams
[  3]  0.0- 1.0 sec  125 KBytes  1.02 Mbits/sec  0.123 ms   0/  89 (0%)
```

Zero lost datagrams confirms multicast delivery is working for that receiver.

## Testing with Multiple Receivers

Start the `iperf -s` command on each receiver simultaneously before starting the sender. Each receiver independently joins the group and reports its own statistics.

## Sending at Higher Rates

```bash
# Send at 10 Mbit/s - useful for capacity testing
iperf -c 224.1.1.1 -u -b 10M -t 30 -T 15 -i 1
```

Increase `-T` (TTL) if the multicast needs to cross multiple router hops.

## Using iperf3 for Multicast (Limited Support)

iperf3 does not natively support multicast in the same way iperf2 does. For multicast testing, iperf2 remains the standard tool. However, you can use iperf3 to test unicast performance between hosts while using a separate tool for multicast verification.

## Alternative: Using socat for Multicast UDP Testing

```bash
# Receiver: join group and print received data
socat UDP4-RECVFROM:5001,ip-add-membership=224.1.1.1:eth0,fork -

# Sender: send test data to multicast group
echo "multicast test" | socat - UDP4-DATAGRAM:224.1.1.1:5001,ip-multicast-ttl=10
```

## Verifying Traffic with tcpdump During the Test

```bash
# On an intermediate host or the receiver - watch multicast UDP arrive
sudo tcpdump -i eth0 -n "dst 224.1.1.1 and udp port 5001"
```

## Interpreting Results

| Metric | Good | Problem Indicator |
|---|---|---|
| Lost/Total | 0% loss | >1% = congestion, forwarding, or buffer issues |
| Jitter | <1ms | >5ms = congestion or scheduling issues |
| Bandwidth | Matches sent rate | Lower = packet drops in the network or on the receiver |

## Conclusion

iperf2 provides the simplest multicast UDP test: start receivers on the group, fire the sender, and read per-receiver statistics. Zero packet loss confirms end-to-end multicast delivery for that receiver; any loss points to forwarding, congestion, or buffering problems along the path.
