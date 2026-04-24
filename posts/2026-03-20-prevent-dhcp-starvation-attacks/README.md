# How to Prevent DHCP Starvation Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Security, Starvation Attack, Network Security, Sysadmin

Description: DHCP starvation attacks exhaust the address pool by sending thousands of DHCP requests with fake MAC addresses, and can be mitigated through DHCP snooping, rate limiting, port security, and MAC...

## How DHCP Starvation Works

An attacker uses tools like `dhcpstarv` or `yersinia` to flood the network with DHCPDISCOVER messages, each using a different spoofed MAC address. The server assigns an IP to each "fake" device until the pool is exhausted. Legitimate clients then receive no DHCPOFFER for new requests, and clients trying to reuse an invalid or expired address may receive DHCPNAK.

## Mitigation 1: DHCP Snooping with Rate Limiting (Cisco)

```text
! Enable DHCP snooping
ip dhcp snooping
ip dhcp snooping vlan 10

! Rate-limit DHCP packets on access ports (15 packets/second)
interface range GigabitEthernet0/1-24
  ip dhcp snooping limit rate 15

! Trusted uplinks (no limit)
interface GigabitEthernet0/48
  ip dhcp snooping trust
```

## Mitigation 2: Port Security (Cisco)

Port security limits the number of MAC addresses learned on a port, which helps contain MAC churn during a starvation attempt:

```text
interface GigabitEthernet0/2
  switchport mode access
  switchport port-security
  switchport port-security maximum 2     ! Max 2 MACs per port
  switchport port-security violation restrict
  switchport port-security aging time 5
  switchport port-security aging type inactivity
```

## Mitigation 3: Short Lease Times

Short lease times can help the pool recover faster after an attack stops, but shrinking the pool by itself does not prevent starvation:

```text
# /etc/dhcp/dhcpd.conf

# Short lease times help the pool recover more quickly
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    default-lease-time 300;              # 5 min lease
    max-lease-time 600;
}
```

## Mitigation 4: MAC-Based Access Control (dhcpd)

Only serve known devices from the dynamic pool:

```text
# /etc/dhcp/dhcpd.conf
subnet 10.0.10.0 netmask 255.255.255.0 {
    option routers 10.0.10.1;

    pool {
        range 10.0.10.100 10.0.10.150;
        deny unknown-clients;       # Only clients with host declarations can use this pool
    }
}

host workstation-1 { hardware ethernet aa:bb:cc:dd:ee:01; fixed-address 10.0.10.10; }
host workstation-2 { hardware ethernet aa:bb:cc:dd:ee:02; fixed-address 10.0.10.11; }
```

## Mitigation 5: Monitoring and Alerting

```bash
#!/bin/bash
# Monitor pool utilization and alert when > 80% full
POOL_SIZE=50  # Adjust to your pool size

ACTIVE=$(awk '
  $1 == "lease" && $3 == "{" { ip=$2; state=""; in_lease=1; next }
  in_lease && $1 == "binding" && $2 == "state" { gsub(/;/, "", $3); state=$3; next }
  in_lease && $1 == "}" { if (ip != "") latest[ip]=state; in_lease=0; ip=""; state=""; next }
  END {
      c=0
      for (ip in latest)
          if (latest[ip] == "active")
              c++
      print c
  }
' /var/lib/dhcp/dhcpd.leases 2>/dev/null)
ACTIVE=${ACTIVE:-0}
UTIL=$(( ACTIVE * 100 / POOL_SIZE ))

if [ "$UTIL" -gt 80 ]; then
    echo "ALERT: DHCP pool ${UTIL}% full (${ACTIVE}/${POOL_SIZE})" | \
        mail -s "DHCP Pool Alert" admin@example.com
fi
```

## Key Takeaways

- DHCP snooping with rate limiting on untrusted access ports is a strong switch-level defense.
- Port security limits learned MAC addresses per port, which can blunt spoofed-MAC floods.
- `deny unknown-clients` in a `pool` declaration blocks dynamic leases to devices that are not explicitly registered.
- Monitor pool utilization and alert when it exceeds 80% to detect attacks early.
