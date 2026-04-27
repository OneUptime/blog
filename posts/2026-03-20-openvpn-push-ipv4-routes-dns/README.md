# How to Push IPv4 Routes and DNS Settings to OpenVPN Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, VPN, IPv4, DNS, Routing, Server Configuration

Description: Use OpenVPN server-side push directives to automatically configure IPv4 routes and DNS settings on connecting clients.

The `push` directive in OpenVPN server configuration allows the server to automatically send routing and DNS configuration to clients when they connect. This centralizes configuration management on the server.

## Pushing Routes to Clients

Add `push "route ..."` directives to your server configuration for each subnet clients should reach through the VPN:

```conf
# /etc/openvpn/server/server.conf

# Push a specific corporate subnet to all clients

push "route 192.168.10.0 255.255.255.0"
push "route 172.16.0.0 255.240.0.0"
push "route 10.100.0.0 255.255.0.0"
```

## Pushing a Default Route (Full Tunnel)

To route all IPv4 traffic through the VPN:

```conf
# Redirect all client traffic through the VPN gateway
push "redirect-gateway def1 bypass-dhcp"
```

`def1` adds two routes (`0.0.0.0/1` and `128.0.0.0/1`) that are more specific than the default route, effectively overriding it without removing it.

## Pushing DNS Servers

```conf
# Push primary and secondary DNS servers
push "dhcp-option DNS 10.8.0.1"
push "dhcp-option DNS 8.8.8.8"

# Push the internal DNS search domain
push "dhcp-option DOMAIN corp.example.com"
push "dhcp-option DOMAIN-SEARCH corp.example.com"
push "dhcp-option DOMAIN-SEARCH internal.example.com"
```

## Per-Client Route Configuration with CCD

Use Client Config Directory (CCD) files to push routes to specific clients:

```conf
# In server.conf, specify the CCD directory
client-config-dir /etc/openvpn/ccd
```

Create a file named after the client's certificate Common Name:

```conf
# /etc/openvpn/ccd/client1

# Push an additional route only to client1
push "route 10.200.0.0 255.255.0.0"

# Assign a fixed IPv4 address to client1 (valid net30 pair)
ifconfig-push 10.8.0.9 10.8.0.10
```

## Pushing NTP and WINS Servers

```conf
# Push NTP server
push "dhcp-option NTP 10.8.0.1"

# Push WINS server for Windows NetBIOS name resolution
push "dhcp-option WINS 10.8.0.2"
```

## Verifying Pushed Configuration on Linux Clients

```bash
# View the OpenVPN management log to see pushed options
sudo journalctl -u openvpn -f

# View active routes after connecting
ip route show
# Pushed routes appear as: 192.168.10.0/24 via 10.8.0.1 dev tun0

# View DNS resolver config (if using resolvconf or systemd-resolved)
cat /etc/resolv.conf
```

## Verifying on Windows Clients

```powershell
# View routes added by OpenVPN
route print -4

# View DNS configuration
ipconfig /all
```

Push directives are a powerful way to ensure all clients automatically get the correct routing and DNS configuration without manual setup on each device.
