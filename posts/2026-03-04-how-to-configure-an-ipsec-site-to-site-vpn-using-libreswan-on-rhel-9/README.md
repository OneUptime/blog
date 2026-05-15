# How to Configure an IPsec Site-to-Site VPN Using Libreswan on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, VPN

Description: Step-by-step guide on configure an ipsec site-to-site vpn using libreswan on rhel 9 with practical examples and commands.

---

Libreswan provides IPsec VPN connectivity on RHEL 9. This guide covers setting up a site-to-site VPN tunnel.

## Install Libreswan

```bash
sudo dnf install -y libreswan
```

## Initialize the NSS Database

```bash
sudo ipsec initnss
```

## Start and Enable Libreswan

```bash
sudo systemctl enable --now ipsec
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=ipsec
sudo firewall-cmd --reload
```

## Site-to-Site VPN Configuration

On Site A (left side), create the connection configuration:

```bash
sudo tee /etc/ipsec.d/site-to-site.conf <<EOF
conn site-to-site
    type=tunnel
    authby=secret
    left=203.0.113.10
    leftsubnet=10.0.1.0/24
    right=198.51.100.20
    rightsubnet=10.0.2.0/24
    auto=start
    ike=aes256-sha2_256-modp2048
    esp=aes256-sha2_256
    ikelifetime=8h
    salifetime=1h
EOF
```

## Configure Pre-Shared Key

```bash
sudo tee /etc/ipsec.d/site-to-site.secrets <<EOF
203.0.113.10 198.51.100.20 : PSK "YourStrongPreSharedKeyHere123!"
EOF
sudo chmod 600 /etc/ipsec.d/site-to-site.secrets
```

## Enable IP Forwarding

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-ipforward.conf
```

## Start the VPN

```bash
sudo systemctl restart ipsec
```

## Verify the Tunnel

```bash
sudo ipsec status
sudo ipsec trafficstatus
ping 10.0.2.1  # Remote subnet
```

## Using Certificate Authentication

For stronger security, use certificates instead of PSK:

```bash
sudo ipsec import ~/siteA.p12
sudo certutil -L -d /var/lib/ipsec/nss/

# Use the certificate nickname from the NSS database in the connection configuration
```

## Troubleshoot

```bash
sudo journalctl -u ipsec -f
sudo ipsec verify
sudo ipsec status
```

## Conclusion

Libreswan on RHEL 9 provides enterprise-grade IPsec VPN connectivity. Use certificate authentication for production environments and monitor tunnel status to ensure reliable site-to-site connectivity.
