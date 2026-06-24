# How to Simulate Packet Loss on an IPv4 Interface Using tc netem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, Netem, IPv4, Packet Loss, Network Testing, Linux

Description: Use tc netem to simulate IPv4 packet loss with configurable rates and correlation to test application resilience under poor network conditions.

Simulating packet loss helps validate how TCP applications handle retransmissions, UDP applications handle missing data, and how quickly applications detect and recover from network degradation.

## Basic Packet Loss

```bash
# Drop 5% of all outgoing packets on eth0

sudo tc qdisc add dev eth0 root netem loss 5%

# Test with ping - some packets should not receive replies
ping -c 20 8.8.8.8

# Expected: ~1 out of 20 packets dropped (on the outgoing side)
# Ping should report roughly 5% loss because this qdisc affects packets leaving eth0
```

## Correlated Packet Loss (Bursty Loss)

Real-world packet loss often comes in bursts, not purely independently. The older correlated random-loss parameter is deprecated, so use the state model for a bursty pattern:

```bash
# 4-state Markov loss: p13 enters the burst-loss state, p31 leaves it
sudo tc qdisc add dev eth0 root netem loss state 10% 25%
```

## Gilbert-Elliott Loss Model (Realistic Bursty Loss)

```bash
# Two-state Markov model for realistic bursty packet loss
# p: probability of entering the bad state, r: probability of leaving the bad state
# 1-h: loss probability in the bad state, 1-k: loss probability in the good state
sudo tc qdisc add dev eth0 root netem loss gemodel 10% 80% 100% 0%
```

## Combined Loss with Delay

```bash
# Simulate a bad cellular connection: 200ms latency + 3% packet loss
sudo tc qdisc add dev eth0 root netem delay 200ms 50ms loss 3%
```

## Applying Loss on the Loopback for Local Testing

```bash
# Useful for testing local services without needing a remote endpoint
sudo tc qdisc add dev lo root netem loss 2%

# Test a local server
curl http://localhost:8080

# Remove when done
sudo tc qdisc del dev lo root
```

## Monitoring Loss Effects

```bash
# Use ping with count and flood option to measure loss (requires root for flood mode)
sudo ping -c 100 -f 8.8.8.8

# Use mtr for continuous monitoring with per-hop loss stats
mtr --report --report-cycles 50 8.8.8.8

# Capture TCP traffic for later retransmission analysis
sudo tcpdump -i eth0 -w tcp-loss-test.pcap -c 200 tcp
```

## Testing TCP Retransmission Behavior

```bash
# Apply 5% loss and then do a large file transfer
sudo tc qdisc add dev eth0 root netem loss 5%

# Transfer a large file and observe retransmissions
scp largefile.bin user@remote:/tmp/

# Check TCP retransmission counters
nstat -az TcpRetransSegs TcpExtTCPSynRetrans
```

## Removing Loss Simulation

```bash
# Remove all netem rules
sudo tc qdisc del dev eth0 root

# Or change to zero loss (effectively removes loss but keeps netem)
sudo tc qdisc change dev eth0 root netem loss 0%
```

Packet loss simulation is particularly valuable for testing UDP-based applications (video streaming, gaming, VoIP) and verifying that TCP connection recovery works correctly in your application stack.
