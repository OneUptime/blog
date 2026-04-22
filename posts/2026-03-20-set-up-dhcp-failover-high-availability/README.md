# How to Set Up DHCP Failover for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, High Availability, Failover, Networking, Sysadmin

Description: DHCP failover pairs two servers that share lease information so that if one fails, the other continues serving clients without interruption, configured through ISC dhcpd's failover protocol or...

## DHCP Failover Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| Load Balancing | Both servers share the pool (default 50/50) | Normal operation |
| Hot Standby | Primary serves all; secondary takes over on failure | Strict primary/backup roles |

## ISC dhcpd Failover Configuration

Note: ISC DHCP is end-of-life upstream. These examples are useful for existing ISC dhcpd deployments; for new deployments, evaluate a maintained DHCP server such as Kea.

### Primary Server

```text
# /etc/dhcp/dhcpd.conf on PRIMARY (10.0.0.53)

failover peer "dhcp-failover" {
    primary;
    address 10.0.0.53;
    port 647;
    peer address 10.0.0.54;
    peer port 647;
    max-response-delay 30;
    max-unacked-updates 10;
    load balance max seconds 3;
    mclt 1800;
    split 128;      # 50/50 load balancing (128 = half of 256)
}

subnet 192.168.1.0 netmask 255.255.255.0 {
    pool {
        failover peer "dhcp-failover";
        range 192.168.1.50 192.168.1.200;
    }
    option routers 192.168.1.1;
}
```

### Secondary Server

```text
# /etc/dhcp/dhcpd.conf on SECONDARY (10.0.0.54)

failover peer "dhcp-failover" {
    secondary;
    address 10.0.0.54;
    port 647;
    peer address 10.0.0.53;
    peer port 647;
    max-response-delay 30;
    max-unacked-updates 10;
    load balance max seconds 3;
}

# Same subnet declaration as primary (must be identical)

subnet 192.168.1.0 netmask 255.255.255.0 {
    pool {
        failover peer "dhcp-failover";
        range 192.168.1.50 192.168.1.200;
    }
    option routers 192.168.1.1;
}
```

## Firewall Rules for Failover Sync

```bash
# On PRIMARY, allow failover communication with SECONDARY (TCP port 647)
iptables -A INPUT -s 10.0.0.54 -p tcp --dport 647 -j ACCEPT
iptables -A OUTPUT -d 10.0.0.54 -p tcp --dport 647 -j ACCEPT

# On SECONDARY, use the same rules with 10.0.0.53 as the peer address
```

## Windows Server DHCP Failover

```powershell
# Configure failover between two Windows DHCP servers
Add-DhcpServerv4Failover `
    -ComputerName "dhcp-primary.example.local" `
    -Name "HA-Failover" `
    -PartnerServer "dhcp-secondary.example.local" `
    -ScopeId 192.168.1.0 `
    -LoadBalancePercent 50 `
    -SharedSecret "SuperSecretKey123!"

# View failover status
Get-DhcpServerv4Failover -ComputerName "dhcp-primary.example.local"
```

## Monitoring Failover State

```bash
# Check failover peer status
journalctl -u isc-dhcp-server | grep -i "failover\|partner"

# States: normal, communications-interrupted, partner-down, recover
```

## Key Takeaways

- ISC dhcpd failover uses TCP port 647 for lease synchronization.
- For ISC dhcpd, `split 128` provides 50/50 load balancing; use `split 256` for a primary-preferred standby layout (`split 0` makes the secondary responsible for all clients).
- Both servers must have identical subnet declarations.
- Windows Server DHCP failover is simpler to configure with PowerShell cmdlets.
