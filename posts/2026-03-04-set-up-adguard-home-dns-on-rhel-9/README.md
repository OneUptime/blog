# How to Set Up AdGuard Home DNS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on set up adguard home dns using Red Hat Enterprise Linux 9.

---

Setting up AdGuard Home DNS on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- `curl`, `tar`, and `firewalld`

## Step 1: Install AdGuard Home

Install the required tools if they are not already present:

```bash
sudo dnf install -y curl tar firewalld bind-utils
```

Install AdGuard Home with the official install script:

```bash
curl -s -S -L https://raw.githubusercontent.com/AdguardTeam/AdGuardHome/master/scripts/install.sh | sudo sh -s -- -v
```

## Step 2: Configure the Service

Allow DNS traffic through the RHEL firewall:

```bash
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --reload
```

For the initial web setup wizard, open the setup port temporarily:

```bash
sudo firewall-cmd --add-port=3000/tcp
```

Open `http://<server-ip>:3000` in your browser and complete the AdGuard Home setup wizard. After the wizard writes the configuration, you can edit it directly if you need to change listening addresses, upstream DNS servers, authentication settings, or logging options:

```bash
# Open the configuration file
sudo vi /opt/AdGuardHome/AdGuardHome.yaml
```

Restart AdGuard Home to apply changes:

```bash
# Restart the service to apply changes
sudo /opt/AdGuardHome/AdGuardHome -s restart
```

## Step 3: Enable and Start the Service

The official installer registers AdGuard Home as a system service. Use the bundled service commands to manage it:

```bash
# Start the service
sudo /opt/AdGuardHome/AdGuardHome -s start

# Check the status
sudo /opt/AdGuardHome/AdGuardHome -s status
```


## Verification

Confirm everything is working by checking the status, logs, and DNS response:

```bash
# Check the service status
sudo /opt/AdGuardHome/AdGuardHome -s status

# Review recent logs
sudo journalctl -u AdGuardHome --no-pager -n 20

# Query through AdGuard Home
dig @127.0.0.1 example.com
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u AdGuardHome -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep -E 'curl|tar|firewalld|bind-utils'`.
- Test network connectivity with `ss -tlnp` to verify listening ports and `curl http://127.0.0.1:3000` to test the setup endpoint.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
