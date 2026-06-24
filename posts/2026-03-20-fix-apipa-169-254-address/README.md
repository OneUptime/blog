# How to Fix IPv4 Getting a 169.254.x.x (APIPA) Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: APIPA, 169.254, DHCP, Window, Troubleshooting

Description: Learn how to fix the issue where your network adapter gets a 169.254.x.x APIPA address instead of a proper DHCP-assigned IP, indicating DHCP failure.

## What Is APIPA?

APIPA (Automatic Private IP Addressing) is an IPv4 link-local fallback mechanism. On a DHCP-enabled Windows adapter, if Windows cannot obtain an IP address from DHCP, it can assign itself an address in the 169.254.0.0/16 link-local block.

A 169.254.x.x address on a DHCP-enabled adapter usually means Windows could not get an IP address from the DHCP server or router.

## Step 1: Confirm APIPA Address

```cmd
ipconfig /all
REM Look for:
REM "Autoconfiguration IPv4 Address: 169.254.x.x"
REM On a DHCP-enabled adapter, this usually indicates DHCP failure
```

## Step 2: Check Physical Connectivity

```cmd
REM Verify link is up (cable connected / WiFi associated)
netsh interface show interface
REM Should show "Connected" status

REM For WiFi, verify association and check the State and SSID fields
netsh wlan show interfaces
```

## Step 3: Force DHCP Renewal

```cmd
REM Release APIPA address and request from DHCP
ipconfig /release
ipconfig /renew
ipconfig /all
```

## Step 4: Check DHCP Server

```bash
# On Linux/router: check whether the DHCP service is running
# Service names vary by distro and DHCP server package

systemctl status isc-dhcp-server
systemctl status dhcpd
systemctl status dnsmasq

# Check whether the DHCP server is listening on UDP port 67
ss -ulnp '( sport = :67 )'

# If dhclient is installed, request a lease and watch the exchange
# Replace eth0 with your actual interface name
sudo dhclient -v eth0
```

## Step 5: Check Firewall Blocking DHCP

```bash
# DHCP uses UDP ports 67 (server) and 68 (client)
# On a DHCP server, allow inbound UDP 67
# On a DHCP client, allow inbound UDP 68

# Linux iptables
sudo iptables -S INPUT | grep -E -- "--dport (67|68)"

# Example rules
sudo iptables -I INPUT -p udp --dport 67 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 68 -j ACCEPT
```

## Step 6: Use Static IP as a Temporary Workaround

```cmd
REM Set a temporary static IP while you investigate DHCP
netsh interface ipv4 set address name="Ethernet" source=static address=192.168.1.100 mask=255.255.255.0 gateway=192.168.1.1 store=persistent
netsh interface ipv4 set dnsservers name="Ethernet" source=static address=8.8.8.8 register=primary
```

## Conclusion

169.254.x.x addresses on a DHCP-enabled adapter usually mean Windows could not get an IP address from DHCP. Check physical connectivity first, then run `ipconfig /release` and `ipconfig /renew`, verify the DHCP server is running with `systemctl status isc-dhcp-server`, and check for firewall rules blocking UDP 67/68. If DHCP is consistently unreliable, use a static IP as a temporary workaround while you investigate the DHCP server.
