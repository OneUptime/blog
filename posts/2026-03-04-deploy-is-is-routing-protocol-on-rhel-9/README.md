# How to Deploy IS-IS Routing Protocol on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on deploy is-is routing protocol using Red Hat Enterprise Linux 9.

---

Deploying IS-IS Routing Protocol on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- At least one network interface connected to another IS-IS router

## Step 2: Configure the Service

Install FRRouting and enable the daemons required for IS-IS:

```bash
# Install FRRouting
sudo dnf install frr

# Enable zebra and the IS-IS daemon
sudo sed -i 's/^zebra=no/zebra=yes/' /etc/frr/daemons
sudo sed -i 's/^isisd=no/isisd=yes/' /etc/frr/daemons

# Start FRR so vtysh can connect to the daemons
sudo systemctl enable --now frr
```

Configure IS-IS with `vtysh`. Replace `ens192`, the NET value, and the authentication settings to match your environment:

```bash
sudo vtysh
```

```text
configure terminal
interface ens192
 ip router isis CORE
 isis network point-to-point
exit
router isis CORE
 net 49.0001.1921.6800.1001.00
 metric-style wide
 log-adjacency-changes
 area-password md5 ReplaceWithStrongPassword
exit
write memory
exit
```

Adjust the settings according to your requirements. Key parameters to configure include the IS-IS process name, NET, participating interfaces, authentication settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart frr
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable frr

# Restart the service
sudo systemctl restart frr

# Check the status
sudo systemctl status frr
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status frr

# Check IS-IS status and adjacencies
sudo vtysh -c "show isis summary"
sudo vtysh -c "show isis neighbor"
sudo vtysh -c "show isis route"

# Review recent logs
journalctl -u frr --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u frr -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep frr`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
