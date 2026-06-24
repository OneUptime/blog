# How to Deploy WireGuard VPN with Web UI on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VPN, Linux

Description: Step-by-step guide on deploy wireguard vpn with web ui using Red Hat Enterprise Linux 9.

---

Deploying WireGuard VPN on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Configure WireGuard VPN:

```bash
# Install WireGuard

sudo dnf install -y wireguard-tools

# Generate keys
sudo install -d -m 700 /etc/wireguard
sudo sh -c 'umask 077 && wg genkey > /etc/wireguard/private.key && wg pubkey < /etc/wireguard/private.key > /etc/wireguard/public.key'

# Create configuration
PRIVATE_KEY=$(sudo cat /etc/wireguard/private.key)
cat <<EOF | sudo tee /etc/wireguard/wg0.conf > /dev/null
[Interface]
PrivateKey = ${PRIVATE_KEY}
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <client-public-key>
AllowedIPs = 10.0.0.2/32
EOF
sudo chmod 600 /etc/wireguard/wg0.conf

# Start WireGuard
sudo systemctl enable --now wg-quick@wg0
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable wg-quick@wg0

# Start the service
sudo systemctl start wg-quick@wg0

# Check the status
sudo systemctl status wg-quick@wg0
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check WireGuard interface
sudo wg show

# Verify the interface is up
ip addr show wg0
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u wg-quick@wg0 -e --no-pager`.
- Ensure all required packages are installed: `rpm -q wireguard-tools`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
