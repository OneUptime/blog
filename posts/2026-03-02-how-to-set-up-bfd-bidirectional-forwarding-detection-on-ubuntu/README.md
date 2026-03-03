# How to Set Up BFD (Bidirectional Forwarding Detection) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, BFD, FRRouting

Description: Configure Bidirectional Forwarding Detection on Ubuntu with FRRouting to enable sub-second failure detection for routing protocols like BGP, OSPF, and IS-IS.

---

Routing protocols like BGP, OSPF, and IS-IS detect neighbor failures through their own hello mechanisms. The problem is that these hellos are typically sent every few seconds with hold timers of 30 seconds or more. In a data center or carrier network, waiting 30 seconds to detect a link failure is unacceptable. Bidirectional Forwarding Detection (BFD) solves this by running sub-second liveness checks independent of the routing protocol, then notifying the routing protocol immediately when a peer fails.

## How BFD Works

BFD establishes sessions between two endpoints. Each side sends BFD control packets at a negotiated interval (often 100ms-300ms). If a configured number of consecutive packets are missed, the session is declared down and any routing protocols using that session are notified.

BFD operates in two modes:

- **Asynchronous mode**: Both sides send and receive control packets. Either side can declare the session down based on missed packets.
- **Demand mode**: Control packets are sent only when one side requests verification. Less common.

BFD also supports an optional echo mode where one side sends packets that the other simply loops back, allowing the sender to test the return path without the remote end processing packets.

## Installing FRRouting with BFD Support

FRRouting's `bfdd` daemon handles BFD sessions:

```bash
# Add FRRouting repository
curl -s https://deb.frrouting.org/frr/keys.gpg | \
  sudo tee /usr/share/keyrings/frrouting.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/frrouting.gpg] \
  https://deb.frrouting.org/frr $(lsb_release -sc) frr-stable" | \
  sudo tee /etc/apt/sources.list.d/frr.list

sudo apt update
sudo apt install -y frr frr-pythontools
```

### Enabling the BFD Daemon

```bash
sudo nano /etc/frr/daemons
```

Enable `bfdd` and whichever routing protocol daemons you need:

```text
zebra=yes
bgpd=yes
ospfd=yes
bfdd=yes    # Enable BFD
```

```bash
sudo systemctl restart frr
sudo systemctl status frr
```

Verify bfdd is running:

```bash
sudo vtysh -c "show bfd peers"
```

## Configuring BFD with BGP

This is the most common use case. BFD runs alongside BGP to detect peer failures faster than BGP's hold timer.

### Router A Configuration (192.168.1.1)

```text
configure terminal

! Configure BGP with BFD
router bgp 65001
 bgp router-id 192.168.1.1

 neighbor 192.168.1.2 remote-as 65002
 neighbor 192.168.1.2 description "Router B"

 ! Enable BFD for this BGP neighbor
 neighbor 192.168.1.2 bfd

 ! Optional: set custom BFD timers for this neighbor
 ! Format: detect-multiplier receive-interval transmit-interval
 neighbor 192.168.1.2 bfd 3 300 300

 ! Configure address family
 address-family ipv4 unicast
  neighbor 192.168.1.2 activate
  network 10.1.0.0/24
 exit-address-family
exit

end
write memory
```

### Router B Configuration (192.168.1.2)

```text
configure terminal

router bgp 65002
 bgp router-id 192.168.1.2

 neighbor 192.168.1.1 remote-as 65001
 neighbor 192.168.1.1 description "Router A"
 neighbor 192.168.1.1 bfd

 ! Match the timers to Router A
 neighbor 192.168.1.1 bfd 3 300 300

 address-family ipv4 unicast
  neighbor 192.168.1.1 activate
  network 10.2.0.0/24
 exit-address-family
exit

end
write memory
```

The `bfd 3 300 300` parameters mean: detect-multiplier=3, minimum-receive-interval=300ms, transmit-interval=300ms. With these settings, a peer is declared down after 3 consecutive missed packets, meaning detection happens within 900ms.

## Configuring BFD with OSPF

```text
configure terminal

router ospf
 ospf router-id 192.168.1.1
 network 192.168.1.0/24 area 0

interface eth0
 ip ospf area 0
 ! Enable BFD on the OSPF interface
 ip ospf bfd
exit

end
write memory
```

## Configuring BFD with IS-IS

```text
configure terminal

router isis CORE
 net 49.0000.0000.0001.00
 is-type level-2-only
exit

interface eth1
 ip router isis CORE
 isis network point-to-point
 ! Enable BFD for IS-IS on this interface
 isis bfd
exit

end
write memory
```

## Standalone BFD Configuration

You can also configure BFD sessions directly without routing protocol integration - useful for testing or monitoring link health independently:

```text
configure terminal

bfd
 ! Create a static BFD peer
 peer 192.168.1.2
  ! Transmit interval in milliseconds
  transmit-interval 150
  !
  ! Receive interval - minimum time between received control packets
  receive-interval 150
  !
  ! Number of missed packets before declaring session down
  detect-multiplier 4
  !
  ! Optionally specify the source address
  local-address 192.168.1.1
 exit
exit

end
write memory
```

## Verifying BFD Sessions

```bash
# Show all BFD peers and session state
sudo vtysh -c "show bfd peers"
```

Output when sessions are established:

```text
BFD Peers:
        peer 192.168.1.2 vrf default
                ID: 1234567890
                Remote ID: 987654321
                Active mode
                Status: up
                Uptime: 00:05:32
                Diagnostics: ok
                Remote diagnostics: ok
                Message Received: 1120
                Peer Type: dynamic

                Local timers:
                        Detect-multiplier: 3
                        Receive-interval: 300ms
                        Transmit-interval: 300ms
                        Echo receive-interval: 50ms
                        Echo transmit-interval: 50ms

                Remote timers:
                        Detect-multiplier: 3
                        Receive-interval: 300ms
                        Transmit-interval: 300ms
```

```bash
# Show BGP neighbors to verify BFD is integrated
sudo vtysh -c "show bgp neighbors 192.168.1.2"
```

Look for the BFD section in the output:

```text
BFD: Type: single hop
  Detect Mul: 3, Min Rx interval: 300, Min Tx interval: 300
  Status: Up, Last update: 0:05:32ago
```

## Testing BFD Failure Detection

To verify BFD detects failures quickly, simulate a link failure and measure how fast the routing protocol reacts:

```bash
# On Router A, bring down the interface to Router B
# Note: this will cause actual traffic disruption in a live environment
sudo ip link set eth0 down

# Immediately on Router A, watch the BGP table
# BGP should withdraw routes within 1 second (vs. 30+ seconds without BFD)
watch -n 0.5 'sudo vtysh -c "show bgp summary"'
```

```bash
# Restore the interface
sudo ip link set eth0 up
```

## BFD Echo Mode

Echo mode improves detection speed by testing the forwarding path rather than control plane processing. One side sends echo packets that the other side loops back at the forwarding plane level:

```text
configure terminal

bfd
 peer 192.168.1.2
  ! Enable echo mode
  echo-mode
  echo-interval 50
  detect-multiplier 3
 exit
exit

end
write memory
```

Echo mode requires that the remote router forwards packets back to the sender. Not all platforms support this, and it requires careful handling in environments with asymmetric routing.

## BFD in Multi-Hop Scenarios

Standard BFD works for directly connected peers. For BGP sessions across multiple hops, use multi-hop BFD:

```text
configure terminal

bfd
 ! Multi-hop BFD peer for eBGP sessions that traverse intermediate hops
 peer 10.100.0.1 multihop local-address 10.0.0.1
  detect-multiplier 5
  receive-interval 500
  transmit-interval 500
 exit
exit

router bgp 65001
 neighbor 10.100.0.1 remote-as 65003
 neighbor 10.100.0.1 ebgp-multihop 5
 neighbor 10.100.0.1 bfd multihop
exit

end
write memory
```

## Tuning BFD Timers

Choosing BFD timers involves a tradeoff between detection speed and stability:

- **Faster timers (50-100ms)**: Detect failures very quickly but are sensitive to transient packet loss, potentially causing false positives that flap routing sessions
- **Moderate timers (200-500ms)**: A reasonable balance for most environments
- **Slower timers (1000ms+)**: More stable but slower than many routing protocol timers, reducing BFD's value

For production networks, start with 300ms intervals and a detect-multiplier of 3, then adjust based on observed behavior. Monitor BFD state changes in logs:

```bash
# Watch FRR logs for BFD events
sudo journalctl -u frr -f | grep -i bfd
```

BFD is an effective and low-overhead way to dramatically reduce routing convergence time on Ubuntu-based routers. The few minutes required to enable and configure it pays dividends when link failures occur.
