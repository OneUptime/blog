# How to Configure DMVPN Phase 2 with IPv4 on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, DMVPN, Phase 2, IPv4, IOS, VPN, Spoke-to-Spoke, NHRP

Description: Configure DMVPN Phase 2 on Cisco IOS to enable direct spoke-to-spoke IPv4 tunnels after initial hub routing, reducing hub bandwidth requirements in large deployments.

## Introduction

DMVPN Phase 2 extends Phase 1 by allowing spokes to build direct tunnels to each other. When Spoke A needs to reach Spoke B, the routing protocol must point to Spoke B's tunnel IP as the next hop. If no NHRP mapping exists yet, Spoke A queries the NHRP hub for Spoke B's public IP and then encapsulates traffic directly to Spoke B.

## Key Differences from Phase 1

```text
Phase 1: Spoke → Hub → Spoke (all traffic via hub)
Phase 2: Spoke → Spoke direct tunnel (routing next-hop points to remote spoke)

Configuration changes from Phase 1:
  Hub:   Disable EIGRP split-horizon on the tunnel
         Disable EIGRP next-hop-self on the tunnel
  Spoke: No additional Phase 2-specific NHRP command is required
  Both:  Spokes must learn remote spoke prefixes with the real spoke next-hop
```

## Hub Configuration (additions to Phase 1)

```cisco
interface Tunnel0
 no ip split-horizon eigrp 100   ! Advertise spoke routes back out the tunnel
 no ip next-hop-self eigrp 100   ! Preserve the original spoke next-hop
```

## Spoke Configuration (additions to Phase 1)

```cisco
interface Tunnel0
 ! No additional Phase 2-specific NHRP command is required here
 ! Spoke-to-spoke works when routing points to the remote spoke tunnel IP

! Do NOT use only a default route via hub for spoke-to-spoke traffic
! Instead, use specific routes or EIGRP to learn spoke prefixes
```

## EIGRP for DMVPN Phase 2

```cisco
! Hub - EIGRP configuration
router eigrp 100
 network 10.100.0.0 0.0.0.255   ! Tunnel network
 network 192.168.1.0 0.0.0.255  ! Hub LAN

! On hub tunnel interface
interface Tunnel0
 no ip split-horizon eigrp 100
 no ip next-hop-self eigrp 100

! Spoke - EIGRP configuration
router eigrp 100
 network 10.100.0.0 0.0.0.255   ! Tunnel network
 network 192.168.2.0 0.0.0.255  ! Spoke LAN
```

## Traffic Flow in Phase 2

```text
1. Spoke A sends packet to Spoke B's LAN (192.168.2.0)
2. EIGRP route shows 192.168.2.0 via 10.100.0.3 (Spoke B tunnel IP)
3. Spoke A checks NHRP for a mapping for 10.100.0.3
4. If no mapping exists, Spoke A sends an NHRP resolution request to the hub/NHS
5. The hub replies with Spoke B's NBMA/public IP, for example 203.0.113.3
6. Spoke A encapsulates traffic directly to Spoke B; subsequent packets use the same direct path
```

## Verify Spoke-to-Spoke Tunnels

```cisco
! Show NHRP cache (includes spoke-to-spoke entries)
show ip nhrp

! Show dynamic spoke-to-spoke entries
show ip nhrp dynamic

! Show active tunnels (should see spoke-to-spoke after traffic)
show dmvpn

! Sample output:
! Type:Spoke, NHRP Peers:2,
!  # Ent  Peer NBMA Addr  Peer Tunnel Add  State  UpDn Tm  Attrb
!  -----  -------------   ---------------  -----  -------  -----
!      1  203.0.113.1     10.100.0.1         UP   00:05:23  S
!      1  203.0.113.3     10.100.0.3         UP   00:00:45  D   ! Dynamic spoke-to-spoke
```

## Conclusion

DMVPN Phase 2 enables direct spoke-to-spoke tunnels by preserving the remote spoke as the routing next hop. Ensure the hub does not advertise itself as the next hop for spoke prefixes (`no ip next-hop-self eigrp`) and disables EIGRP split horizon on the tunnel. When a spoke needs a mapping for that remote tunnel IP, NHRP resolves the remote NBMA address so traffic can flow directly.
