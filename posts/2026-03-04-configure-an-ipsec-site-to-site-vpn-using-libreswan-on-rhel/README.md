# How to Configure an IPsec Site-to-Site VPN Using Libreswan on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IPsec, VPN, Libreswan, Networking, Security

Description: Set up a site-to-site IPsec VPN between two RHEL servers using Libreswan to securely connect remote networks over the internet.

---

Libreswan is the default IPsec VPN implementation on RHEL. It provides IKEv1 and IKEv2 for negotiating secure tunnels between sites.

## Install Libreswan

On both VPN gateway servers:

```bash
# Install Libreswan
sudo dnf install -y libreswan

# Initialize the NSS database (first time only)
sudo ipsec initnss

# Enable and start the IPsec service
sudo systemctl enable --now ipsec
```

## Enable IP Forwarding

```bash
# Enable IP forwarding on both gateways
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-vpn.conf
sudo sysctl -p /etc/sysctl.d/99-vpn.conf
```

## Configure the VPN Connection

Assume this topology:
- Site A: Public IP 203.0.113.10, Private network 10.0.1.0/24
- Site B: Public IP 198.51.100.20, Private network 10.0.2.0/24

On Site A (`/etc/ipsec.d/site-to-site.conf`):

```bash
sudo tee /etc/ipsec.d/site-to-site.conf << 'CONF'
conn site-to-site
    # IKEv2 with PSK authentication
    ikev2=insist
    authby=secret

    # Left side (this server - Site A)
    left=203.0.113.10
    leftsubnet=10.0.1.0/24
    leftid=@siteA

    # Right side (remote server - Site B)
    right=198.51.100.20
    rightsubnet=10.0.2.0/24
    rightid=@siteB

    # Start automatically
    auto=start
CONF
```

On Site B, swap the left and right values.

## Configure the Pre-Shared Key

On both servers:

```bash
# Create the shared secret
sudo tee /etc/ipsec.d/site-to-site.secrets << 'SECRETS'
@siteA @siteB : PSK "YourStrongPreSharedKeyHere123!"
SECRETS

sudo chmod 600 /etc/ipsec.d/site-to-site.secrets
```

## Open Firewall Ports

```bash
# Allow IPsec traffic
sudo firewall-cmd --permanent --add-service=ipsec
sudo firewall-cmd --reload
```

## Start the Tunnel

```bash
# Restart IPsec to load the new config
sudo systemctl restart ipsec

# Check the tunnel status
sudo ipsec status
sudo ipsec trafficstatus

# Test connectivity from Site A to Site B's private network
ping 10.0.2.1
```

## Troubleshooting

```bash
# View detailed IPsec logs
sudo journalctl -u ipsec -f

# Verify the connection is established
sudo ipsec whack --status | grep "IPsec SA established"
```

For production, consider using certificates instead of pre-shared keys for stronger security.
