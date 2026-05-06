# How to Configure DHCP Lease Duration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Networking, Lease Duration, IP Addressing, Sysadmin

Description: DHCP lease duration determines how long a client holds an IP address before renewing, with shorter leases freeing addresses faster and longer leases reducing network traffic and renewal overhead.

## What Is Lease Duration?

The lease duration (or lease time) is the period for which a DHCP server grants an IP address to a client. By default, the client attempts to renew at T1 (50% of the lease) and rebind at T2 (87.5%), unless the server provides different renewal and rebinding timers.

## Choosing the Right Lease Time

| Network Type | Recommended Lease | Reason |
|-------------|------------------|--------|
| Static servers | 7 days or DHCP reservation | Stable, low renewal overhead |
| Office workstations | 24 hours | Balances stability and address recovery |
| Guest WiFi | 30–60 minutes | Frequent client turnover |
| VoIP phones | 1–4 hours | Need up-to-date TFTP/config info |
| Conference rooms | 8 hours | Devices present only during business hours |
| Mobile/event networks | 10–30 minutes | High churn, limited pool |

## ISC dhcpd Configuration

```text
# /etc/dhcp/dhcpd.conf

# Global defaults (used if scope doesn't override)

default-lease-time 86400;    # 24 hours in seconds
max-lease-time 604800;       # 7 days maximum (client can request up to this)

# Office LAN - 24 hour leases
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;
    option routers 192.168.1.1;
    default-lease-time 86400;
    max-lease-time 604800;
}

# Guest WiFi - 30 minute leases
subnet 192.168.99.0 netmask 255.255.255.0 {
    range 192.168.99.10 192.168.99.250;
    option routers 192.168.99.1;
    default-lease-time 1800;    # 30 minutes
    max-lease-time 3600;        # Maximum 1 hour
}
```

## dnsmasq Configuration

```text
# 24 hours for office VLAN
dhcp-range=10.0.10.50,10.0.10.200,255.255.255.0,24h

# 30 minutes for guests
dhcp-range=10.0.99.10,10.0.99.250,255.255.255.0,30m

# Use 'infinite' for reservations (permanent leases)
dhcp-host=aa:bb:cc:dd:ee:ff,192.168.1.50,server1,infinite
```

## Viewing Lease Times on Linux (Client Side)

```bash
# If using ISC dhclient, check current lease and expiry time
cat /var/lib/dhcp/dhclient.leases

# With NetworkManager, show DHCP info for an interface
nmcli device show <interface> | grep DHCP
```

## Calculating Default T1 and T2

```python
def lease_timers(lease_seconds: int) -> dict:
    """Calculate default T1 and T2 from lease duration."""
    t1 = lease_seconds * 0.5
    t2 = lease_seconds * 0.875
    return {
        "lease": lease_seconds,
        "T1_renewal": f"{t1:.0f}s ({t1/3600:.1f}h)",
        "T2_rebind":  f"{t2:.0f}s ({t2/3600:.1f}h)",
    }

for seconds in [1800, 3600, 86400, 604800]:
    t = lease_timers(seconds)
    print(f"Lease {t['lease']:>7}s: T1={t['T1_renewal']:>12} T2={t['T2_rebind']:>12}")
```

## Key Takeaways

- `default-lease-time` = time given if client doesn't request a specific duration.
- `max-lease-time` = maximum the server will grant, regardless of client request.
- By default, T1 = 50% of lease → unicast renewal attempt.
- By default, T2 = 87.5% of lease → broadcast rebind to any DHCP server.
- Shorter leases trade more DHCP traffic for faster address recovery in high-turnover environments.
