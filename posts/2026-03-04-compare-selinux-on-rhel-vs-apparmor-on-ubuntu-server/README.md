# How to Compare SELinux on RHEL vs AppArmor on Ubuntu Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Comparison, Security, Linux

Description: Step-by-step guide on compare selinux on rhel vs apparmor on ubuntu server using Red Hat Enterprise Linux 9.

---

SELinux (used by RHEL) and AppArmor (used by Ubuntu) are both mandatory access control systems, but they take fundamentally different approaches. SELinux uses labels and type enforcement, while AppArmor uses path-based profiles.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Ubuntu Server for AppArmor comparison
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

### Key Comparison Areas

| Feature | SELinux (RHEL) | AppArmor (Ubuntu) |
|---------|---------------|-------------------|
| Approach | Label-based | Path-based |
| Default Mode | Enforcing | Loaded by default; profiles can enforce or complain |
| Complexity | Higher | Lower |
| Granularity | Very fine | Moderate |
| Profile Creation | More involved | Simpler |

## Step 3: Enable and Start the Service

```bash
# SELinux is a kernel security module, not a regular systemd service.
# Check SELinux mode and status on RHEL:
getenforce
sestatus

# AppArmor is managed through profiles and the apparmor service on Ubuntu.
# Check AppArmor status on Ubuntu Server:
sudo aa-status

# Check whether the AppArmor service is active
sudo systemctl status apparmor
```

## Step 4: Configure the Firewall

```bash
# Comparing SELinux and AppArmor does not require opening firewall ports.
# If you later configure a network service on RHEL, open only the required port:
sudo firewall-cmd --permanent --add-port=<PORT>/tcp

# Reload firewalld to apply the permanent change to the runtime configuration
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check SELinux status on RHEL
getenforce
sestatus

# Check AppArmor status and logs on Ubuntu Server
sudo aa-status
journalctl -u apparmor --no-pager -n 20
```

## Troubleshooting

- If AppArmor fails to start, check the logs with `journalctl -u apparmor -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow traffic on the required ports only if you are testing a network service: `firewall-cmd --list-all`.
- Ensure all required packages are installed, such as `policycoreutils` on RHEL or `apparmor-utils` on Ubuntu.

## Conclusion

You have successfully completed the setup described in this guide. Both options have their strengths, and the right choice depends on your specific requirements, budget, and team expertise. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
