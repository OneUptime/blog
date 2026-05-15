# How to Deploy RHEL Image Builder via Cockpit Web Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Linux

Description: Step-by-step guide on deploy rhel image builder via cockpit web console using Red Hat Enterprise Linux 9.

---

Deploying RHEL Image Builder via Cockpit Web Console on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, access, and operational considerations.

## Prerequisites

- RHEL 9 with a valid Red Hat Subscription Manager or Red Hat Satellite subscription
- BaseOS and AppStream repositories enabled
- Root or sudo access
- A terminal session

## Step 1: Install RHEL Image Builder

Install the packages required for RHEL Image Builder and the Cockpit web console integration:

```bash
# Install RHEL Image Builder and the Cockpit integration
sudo dnf install osbuild-composer composer-cli cockpit-composer
```

## Step 2: Enable and Start the Services

Enable the Image Builder and Cockpit sockets. The services start automatically on first access.

```bash
# Enable RHEL Image Builder
sudo systemctl enable --now osbuild-composer.socket

# Enable the Cockpit web console
sudo systemctl enable --now cockpit.socket
```

If the system firewall is running, allow access to the Cockpit web console:

```bash
# Allow Cockpit for the current runtime and persistently
sudo firewall-cmd --add-service=cockpit
sudo firewall-cmd --add-service=cockpit --permanent
```

## Step 3: Access Image Builder in Cockpit

Open the Cockpit web console at `https://localhost:9090/` from the RHEL system, or use the system hostname or IP address for remote access.

Log in with an administrative user account, then select **Apps** and open **Image Builder**.

## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check Image Builder status
sudo composer-cli status show

# Check the sockets
sudo systemctl status osbuild-composer.socket cockpit.socket

# Review recent Image Builder logs
journalctl -u osbuild-composer.service --no-pager -n 20
```

## Troubleshooting

- If Image Builder fails to start, check the logs with `journalctl -u osbuild-composer.service -e --no-pager`.
- If Cockpit is not reachable remotely, verify that `cockpit.socket` is enabled and that the firewall allows the `cockpit` service.
- Ensure all required packages are installed: `rpm -q osbuild-composer composer-cli cockpit-composer`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
