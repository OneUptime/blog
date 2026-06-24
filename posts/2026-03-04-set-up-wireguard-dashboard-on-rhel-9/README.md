# How to Set Up WireGuard Dashboard on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VPN, Linux

Description: Step-by-step guide on set up wireguard dashboard using Red Hat Enterprise Linux 9.

---

Setting up WireGuard VPN on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

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
sudo mkdir -p /etc/wireguard
sudo sh -c 'umask 077; wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key'
sudo chmod 600 /etc/wireguard/private.key

# Create configuration
cat <<EOF | sudo tee /etc/wireguard/wg0.conf
[Interface]
PrivateKey = $(sudo cat /etc/wireguard/private.key)
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <client-public-key>
AllowedIPs = 10.0.0.2/32
EOF

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

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. Because WireGuard in RHEL 9 is provided as a Technology Preview, confirm support requirements before production use, test changes in a staging environment first, and keep your RHEL system updated with the latest security patches.
