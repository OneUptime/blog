# How to Configure RHEL as a Router with IP Forwarding and NAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on configure RHEL as a router with ip forwarding and nat using Red Hat Enterprise Linux 9.

---

Configuring RHEL as a Router with IP Forwarding and NAT on RHEL involves several steps to ensure proper operation and security. This guide covers the essential configuration options and best practices.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Two configured network interfaces, for example `enp1s0` for the external network and `enp7s0` for the internal LAN

## Step 2: Configure IP Forwarding

Enable IPv4 packet forwarding so the host can route packets between interfaces:

```bash
# Enable IPv4 forwarding persistently
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/95-IPv4-forwarding.conf

# Apply the setting immediately
sudo sysctl -p /etc/sysctl.d/95-IPv4-forwarding.conf
```

Replace the example interface names with the names on your system. You can list them with `ip link`.

## Step 3: Enable NAT and Forwarding in firewalld

```bash
# Enable and start firewalld
sudo systemctl enable --now firewalld

# Check active zones and interfaces
sudo firewall-cmd --get-active-zones

# Assign interfaces to zones
sudo firewall-cmd --permanent --zone=external --change-interface=enp1s0
sudo firewall-cmd --permanent --zone=internal --change-interface=enp7s0

# Enable masquerading on the external zone for NAT
sudo firewall-cmd --permanent --zone=external --add-masquerade

# Allow forwarded traffic from the internal zone to the external zone
sudo firewall-cmd --permanent --new-policy internal-to-external
sudo firewall-cmd --permanent --policy internal-to-external --add-ingress-zone internal
sudo firewall-cmd --permanent --policy internal-to-external --add-egress-zone external
sudo firewall-cmd --permanent --policy internal-to-external --set-target ACCEPT

# Reload firewalld to apply permanent changes
sudo firewall-cmd --reload
```

## Verification

Confirm forwarding, masquerading, and the firewall policy are active:

```bash
# Check the kernel forwarding setting
sysctl net.ipv4.ip_forward

# Confirm masquerading is enabled on the external zone
sudo firewall-cmd --zone=external --query-masquerade

# Review the forwarding policy
sudo firewall-cmd --info-policy internal-to-external

# Check the generated nftables rules
sudo nft list table inet firewalld
```

## Troubleshooting

- If `firewall-cmd` fails, check that firewalld is running with `sudo systemctl status firewalld`.
- If forwarding does not work, verify that the internal hosts use the RHEL router as their default gateway.
- Ensure the required packages are installed: `rpm -q firewalld nftables`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
