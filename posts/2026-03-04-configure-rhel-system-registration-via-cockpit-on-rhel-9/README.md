# How to Configure RHEL System Registration via Cockpit on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Linux

Description: Step-by-step guide on configure rhel system registration via cockpit using Red Hat Enterprise Linux 9.

---

Configuring RHEL System Registration via Cockpit on RHEL involves several steps to ensure the web console is available and the system can access Red Hat repositories. This guide covers the essential configuration options and best practices.

## Prerequisites

- RHEL 9 with a valid Red Hat subscription, Red Hat Customer Portal account, or activation key
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Install Cockpit if it is not already installed, then enable the web console socket:

```bash
# Install the web console package if needed
sudo dnf install cockpit

# Enable and start the Cockpit socket
sudo systemctl enable --now cockpit.socket
```

If you are connecting from another machine and your firewall does not already allow Cockpit, open the Cockpit service in firewalld:

```bash
sudo firewall-cmd --add-service=cockpit --permanent
sudo firewall-cmd --reload
```

## Step 3: Enable and Start the Service

Open the RHEL web console in a browser:

```bash
https://<hostname-or-ip-address>:9090
```

Log in with a local system account. On the Overview page, click the **Not registered** warning in the Health field, or open **Subscriptions** from the main menu.

In the Overview field, click **Register**, select the registration method, and provide the required Red Hat account credentials or activation key and organization ID. If you do not want to connect the system to Red Hat Lightspeed, clear the Insights checkbox before clicking **Register**.

You can confirm the Cockpit socket is running from the terminal:

```bash
sudo systemctl status cockpit.socket
```


## Verification

Confirm registration by checking the subscription details in the web console or from the terminal:

```bash
# Check the registration and subscription status
sudo subscription-manager status

# Review recent Cockpit logs
sudo journalctl -u cockpit.service -u cockpit.socket --no-pager -n 20
```

## Troubleshooting

- If the web console is not reachable, check the socket with `sudo systemctl status cockpit.socket`.
- Ensure the required package is installed: `rpm -q cockpit`.
- If you connect from another machine, ensure port 9090 is open in the firewall.
- If registration fails, verify the Red Hat account, activation key, and organization ID you entered in the web console.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
