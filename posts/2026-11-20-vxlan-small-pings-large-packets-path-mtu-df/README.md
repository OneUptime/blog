# Diagnose VXLAN Packet Loss with Don't-Fragment MTU Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, Networking, Troubleshooting

Description: Calculate VXLAN packet sizes, compare underlay and overlay probes, and distinguish local MTU rejection from fragmentation and missing ICMP feedback.

A small ping crosses the VXLAN overlay, but a larger transfer stalls. Packet size is a useful suspect, especially when the underlay supports ordinary 1500-byte IP packets and the overlay adds encapsulation. It is not proof by itself: filtering, packet loss, and different forwarding paths can produce similar symptoms.

Use a staged test that records packet sizes, source context, fragmentation policy, and observations at both tunnel endpoints. The commands below target Linux with **iputils 20240905** and use IPv4 explicitly. macOS and Windows ping options differ; do not copy these switches into another implementation and assume the same behavior.

## Count bytes at the correct layer

MTU means maximum transmission unit. An interface's IP MTU describes the largest IP packet it can carry without needing fragmentation at that layer. A ping's `-s` value is its data payload, not the complete IP packet.

For the ordinary IPv4 echo request used here, add 20 bytes of IPv4 header and 8 bytes of ICMP header to the payload. Linux's ping documentation describes these additional headers. [Pinned ping manual](https://raw.githubusercontent.com/iputils/iputils/20240905/doc/ping.xml).

For basic VXLAN over outer IPv4, with no inner VLAN tag or IP options, the outer IP packet contains:

| Component | Bytes |
| --- | ---: |
| Outer IPv4 header | 20 |
| UDP header | 8 |
| VXLAN header | 8 |
| Inner Ethernet header | 14 |
| Inner IP packet | Depends on the workload |

That is 50 bytes above the inner IP packet size. The outer Ethernet header is outside the outer IP MTU calculation. Additional tags, IPv6 headers, encryption, or another tunnel require their own accounting. [VXLAN packet format](https://www.rfc-editor.org/rfc/rfc7348.html).

Under these assumptions:

| Ping payload | Inner IPv4 packet | Outer IPv4 VXLAN packet |
| --- | ---: | ---: |
| 1200 | 1228 | 1278 |
| 1422 | 1450 | 1500 |
| 1423 | 1451 | 1501 |
| 1472 | 1500 | 1550 |

The table is arithmetic, not measured reachability. It gives you useful boundary values to test.

## Inventory the path and local limits

Assume workload A at `10.20.0.11` reaches workload B at `10.20.0.12` through VTEPs `192.0.2.10` and `192.0.2.20`. A VTEP is a VXLAN tunnel endpoint. Replace all addresses and device names with your staging topology.

On each VTEP host, inspect:

```bash
ip -d link show dev vxlan100
ip link show dev br100
ip link show dev UNDERLAY_INTERFACE
ip route get 192.0.2.20 from 192.0.2.10
```

Use reciprocal addresses on the other host. Record the tunnel, bridge, physical interface, and workload-interface MTUs. The route lookup identifies the selected route and may show learned route information; it is not a packet-delivery test. [Linux route lookup](https://man7.org/linux/man-pages/man8/ip-route.8.html).

Inspect the workload's interface from inside its own namespace. A host interface set to 1500 does not establish that its guest or container has the same limit.

## Separate inner DF from outer DF

DF means “don't fragment” in an IPv4 header. Setting it on an overlay ping controls the inner packet. The VXLAN device has a separate policy for the outer IPv4 header: `df unset`, `df set`, or `df inherit`. Linux documents the default as unset. Inspect that setting rather than assuming the inner flag is copied. [VXLAN DF configuration](https://man7.org/linux/man-pages/man8/ip-link.8.html).

```mermaid
flowchart LR
    A[Workload ping with inner DF] --> B[Local overlay MTU check]
    B --> C[VTEP adds outer headers]
    C --> D[Outer DF policy applies]
    D --> E[Underlay path MTU]
    E --> F[Remote decapsulation and reply]
```

This is why an overlay ping with DF can succeed without proving that the outer network carried one unfragmented packet. Check the encapsulated traffic too. RFC 7348 warns that destination VTEPs may discard fragmented VXLAN packets; depending on fragmentation is not a reliable repair strategy. [VXLAN fragmentation considerations](https://www.rfc-editor.org/rfc/rfc7348.html).

## Establish an underlay baseline

From the source VTEP host, send a bounded probe directly to the remote VTEP:

```bash
ping -4 -n -c 3 -W 2 -w 10 -M do -s 1472 192.0.2.20
```

This tests a 1500-byte IPv4 ICMP packet without VXLAN encapsulation. `-M do` sets DF while respecting the kernel's path-MTU checks; a known-too-large packet can be rejected locally. `-W` controls response waiting and `-w` supplies an overall deadline. [iputils probe options](https://raw.githubusercontent.com/iputils/iputils/20240905/doc/ping.xml).

A successful result is a useful baseline. It does not guarantee that VXLAN UDP takes the same route as ICMP, nor does it prove that the path carries 1550-byte outer packets. Record the source interface and repeat from the other VTEP.

## Probe the overlay boundary from the workload

Run these individually inside workload A, targeting workload B. Stop and record the output after each command:

```bash
ping -4 -n -c 3 -W 2 -w 10 -M do -s 1200 10.20.0.12
ping -4 -n -c 3 -W 2 -w 10 -M do -s 1422 10.20.0.12
ping -4 -n -c 3 -W 2 -w 10 -M do -s 1423 10.20.0.12
```

If the first probe succeeds, compare the two boundary probes. A repeatable change between them is consistent with a 1450-byte inner limit under the stated assumptions. Determine where the rejection occurred before calling it an underlay fault.

If the workload interface itself has MTU 1450, a 1451-byte inner packet can fail before VXLAN sends anything. That is a useful local limit, not evidence that a remote switch dropped the frame. A cached path-MTU result can also cause local rejection. Preserve these messages instead of treating every failure as a timeout.

Repeat both initiating directions. If losses are irregular at every size, investigate general connectivity or congestion before deriving an MTU from a single lost packet.

## Correlate errors with a bounded capture

On an authorized staging VTEP, capture the outer path while running one test:

```bash
sudo tcpdump -nn -vv -i UNDERLAY_INTERFACE -c 30 \
  '(host 192.0.2.10 and host 192.0.2.20) or icmp'
```

Replace the interface and addresses. Stop with Ctrl-C if the packet limit is not reached. This filter includes traffic between the endpoints plus ICMP feedback, rather than looking only for a UDP port that later fragments may not contain. Capture at the receiving VTEP as well when needed. [tcpdump reference](https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/tcpdump-4.99.5/tcpdump.1.in).

Inspect outer IP length, DF, fragment offset, and ICMP errors. A router that cannot forward an IPv4 DF packet because of its size uses an ICMP “fragmentation needed” response for path-MTU discovery. If feedback is filtered, the sender can experience a size-dependent black hole instead of learning the smaller limit. [IPv4 path-MTU discovery](https://www.rfc-editor.org/rfc/rfc1191.html).

Host offloads can make local captures differ from the eventual wire representation. When sizes look impossible, corroborate them at another observation point before changing MTUs based on that capture alone.

## Turn observations into a specific repair

| Evidence | What it supports |
| --- | --- |
| Immediate local size rejection | Local interface or known path-MTU limit |
| Outer DF packet followed by fragmentation-needed feedback | A reported limit on the observed outer route |
| Outer fragments visible | Success may depend on fragmentation; inspect tunnel policy and path capacity |
| Large packets disappear without feedback | Possible MTU black hole; also rule out size-dependent filtering and route differences |

Choose the repair from the actual network design: make the underlay support the required encapsulated size, or configure an appropriate lower tenant MTU across the intended endpoints. Preserve needed ICMP feedback and retest application traffic. Changing only TCP MSS does not repair oversized UDP or every other protocol using the overlay.

Local validation for this article constructed synthetic VXLAN frames to confirm the 1450/1500-byte inner and 1500/1550-byte outer calculations and independently chosen DF flags. No live Linux ping or path-MTU test was run. Your acceptance record should identify the tested route, sizes, fragmentation behavior, both directions, and application result rather than claiming a universal MTU from one successful ping.
