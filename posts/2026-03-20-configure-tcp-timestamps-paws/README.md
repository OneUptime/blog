# How to Configure TCP Timestamps for PAWS Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Timestamp, PAWS, Linux, Sysctl, Security

Description: Learn how TCP timestamps work, how they enable PAWS (Protection Against Wrapped Sequence numbers), and when to enable or disable them on Linux.

## What Are TCP Timestamps?

TCP timestamps (RFC 1323) add two 32-bit timestamp fields to each TCP segment:
- **TSval**: Sender's current timestamp
- **TSecr**: Echo of the receiver's last timestamp

They serve two purposes:

1. **PAWS (Protection Against Wrapped Sequence numbers)** - On high-speed links, the 32-bit sequence number can wrap around in under a minute. Old duplicate segments could be misaccepted. Timestamps allow the receiver to reject old duplicates even if sequence numbers wrapped.

2. **RTT measurement** - More accurate RTT sampling by timestamping every segment, not just selected ones.

## Step 1: Check Current Timestamp Setting

```bash
# Check if TCP timestamps are enabled

sysctl net.ipv4.tcp_timestamps
# 0 = disabled
# 1 = enabled with random per-connection offsets (default)
# 2 = enabled, but without random offsets
```

## Step 2: Enable TCP Timestamps

```bash
# Enable timestamps (required for PAWS)
sudo sysctl -w net.ipv4.tcp_timestamps=1

# Make persistent
echo "net.ipv4.tcp_timestamps = 1" | sudo tee /etc/sysctl.d/99-tcp-timestamps.conf

sudo sysctl -p /etc/sysctl.d/99-tcp-timestamps.conf
```

## Step 3: Verify PAWS Is Active

With timestamps enabled, PAWS automatically activates on connections that negotiate timestamps during the handshake:

```bash
# Capture a TCP handshake to verify timestamp negotiation
sudo tcpdump -i any -c 10 'tcp[tcpflags] & tcp-syn != 0' -v 2>&1 | grep -E "Timestamp|TS"

# Look for: options [nop,nop,TS val 123456 ecr 0]
# in the SYN packet - this means timestamps are being used

# Verify with tshark
sudo tcpdump -i any -c 10 -w /tmp/ts-check.pcap 'tcp[tcpflags] & tcp-syn != 0'
tshark -r /tmp/ts-check.pcap -T fields \
  -e tcp.options.timestamp.tsval \
  -Y "tcp.flags.syn == 1"
```

## Step 4: PAWS in Action

PAWS rejects old duplicate segments by comparing their timestamp against the most recent timestamp received on the connection:

```bash
# Check PAWS rejection counters
cat /proc/net/netstat | tr ' ' '\n' | grep -i PAWS

# Or with nstat
nstat TcpExtPAWSEstab TcpExtPAWSActive

# High PAWS counts indicate:
# - Old duplicate segments arriving (normal on busy networks)
# - Misconfigured NTP causing timestamp clock skew (unusual)
```

## Step 5: When to Disable Timestamps

Timestamps add 10 bytes of overhead per segment and may reveal OS uptime (a minor privacy concern). Disable if:

1. You're running behind NAT with multiple hosts sharing one IP (timestamps from different hosts can confuse PAWS)
2. Debugging PAWS-related connection failures

```bash
# Disable timestamps (not recommended for production)
sudo sysctl -w net.ipv4.tcp_timestamps=0

# Check if connections work without timestamps
curl -v http://example.com/

# Re-enable after testing
sudo sysctl -w net.ipv4.tcp_timestamps=1
```

## Step 6: Timestamps and NAT Compatibility

Behind NAT, multiple internal hosts with different system clocks share one external IP. This can cause PAWS to incorrectly reject packets:

```bash
# If running a NAT gateway and seeing PAWS rejections:
# Option 1: Disable timestamps on the NAT gateway
sudo sysctl -w net.ipv4.tcp_timestamps=0

# Option 2: Use net.ipv4.tcp_tw_reuse carefully
# (requires timestamps to be enabled)
sysctl net.ipv4.tcp_tw_reuse

# Check NAT-related PAWS drops
nstat TcpExtPAWSEstab
```

## Conclusion

TCP timestamps should be enabled on all Linux systems (the default). They provide accurate RTT measurement and are required for PAWS protection on high-speed links where sequence number wrap-around is a real concern. Disable them only when running NAT with multiple hosts sharing an IP and experiencing PAWS-related connection failures. Monitor PAWS counters with `nstat TcpExtPAWSEstab` to detect unusual rejection patterns.
