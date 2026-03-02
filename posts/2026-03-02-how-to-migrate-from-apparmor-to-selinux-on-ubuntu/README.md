# How to Migrate from AppArmor to SELinux on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, SELinux, Security, Migration

Description: A step-by-step guide to migrating from AppArmor to SELinux on Ubuntu, covering the transition process, testing in permissive mode, policy tuning, and cutover to enforcing mode.

---

Migrating from AppArmor to SELinux on Ubuntu is a significant undertaking. This is not a five-minute task - done properly, it involves disabling AppArmor, installing and configuring SELinux, running in permissive mode long enough to build a working policy for your applications, then carefully switching to enforcing mode. Plan for a testing period measured in days or weeks, not hours.

This guide assumes you have a specific reason for migrating (compliance requirement, organizational standardization, MLS needs) rather than doing it for its own sake.

## Pre-Migration Assessment

Before touching anything, document your current AppArmor setup:

```bash
# List all loaded AppArmor profiles and their modes
sudo apparmor_status

# Export all current profiles for reference
sudo cat /etc/apparmor.d/* > /root/apparmor_profiles_backup.txt

# List which services have active profiles
sudo aa-status --profiled | sort > /root/apparmor_profiled_services.txt

# Document current firewall and security rules
sudo ufw status verbose > /root/ufw_status_before.txt
sudo iptables -L -n -v > /root/iptables_before.txt
```

## Create a Test Environment

Never migrate production directly. Test on an identical non-production system first:

```bash
# Clone the system for testing (if possible)
# VM snapshots work well here

# Document the test environment
cat /etc/os-release
uname -r
dpkg -l | grep -E "apparmor|selinux"
```

Run the entire migration on the test system, validate all services work correctly, then plan the production cutover.

## Step 1: Disable AppArmor

AppArmor and SELinux should not run simultaneously. Disable AppArmor first.

```bash
# Stop AppArmor service
sudo systemctl stop apparmor

# Disable it from auto-starting
sudo systemctl disable apparmor

# Unload all profiles from the kernel
sudo aa-teardown

# Verify no profiles are loaded
sudo aa-status
# Should show 0 profiles loaded

# Remove AppArmor from startup sequence
echo "apparmor=0" | sudo tee -a /etc/default/grub
# Or edit GRUB_CMDLINE_LINUX to include apparmor=0
sudo update-grub
```

## Step 2: Install SELinux

```bash
# Update package index
sudo apt update

# Install SELinux core packages
sudo apt install -y \
    selinux-basics \
    selinux-policy-default \
    selinux-utils \
    policycoreutils \
    auditd

# Install additional management tools
sudo apt install -y \
    policycoreutils-python-utils \
    setools

# Run the activation script
# This modifies the bootloader and creates /.autorelabel
sudo selinux-activate
```

What `selinux-activate` does:
- Adds `security=selinux selinux=1` to the kernel command line
- Creates `/.autorelabel` to trigger filesystem relabeling on next boot
- Does NOT switch to enforcing mode (starts in permissive)

## Step 3: Initial Reboot and Relabeling

The first reboot triggers the filesystem relabeling. This assigns SELinux contexts to every file on the system:

```bash
# Reboot to start relabeling
sudo reboot

# Watch progress via serial console or IPMI if needed
# Relabeling can take 5-30 minutes depending on disk size
# System reboots automatically after relabeling completes
```

## Step 4: Verify SELinux is Active

After the second reboot:

```bash
# Check SELinux status
sestatus

# Should show:
# SELinux status:       enabled
# Current mode:         permissive
# Mode from config:     permissive

# Confirm permissive mode
getenforce
# Returns: Permissive
```

## Step 5: Audit Period in Permissive Mode

Permissive mode is critical. Run all your applications and workloads while SELinux is in permissive mode. It will log everything that would have been denied in enforcing mode, giving you the data needed to tune the policy.

### Start Capturing Denials

```bash
# Enable and start auditd
sudo systemctl enable --now auditd

# Monitor SELinux denials in real time
sudo tail -f /var/log/audit/audit.log | grep AVC

# Or use ausearch
sudo ausearch -m avc -ts recent
```

### Run Your Applications

Trigger all code paths that your applications use:
- Start all services that normally run
- Exercise application functionality through normal usage
- Run deployment scripts, backup jobs, monitoring agents
- Test login workflows, file transfers, web requests

The more coverage you get in permissive mode, the fewer surprises in enforcing mode.

## Step 6: Analyze and Resolve Denials

```bash
# View all AVC denials since SELinux was enabled
sudo ausearch -m avc | audit2why | less

# Group denials by process
sudo ausearch -m avc | grep 'type=AVC' | awk '{for(i=1;i<=NF;i++){if($i~/comm=/){print $i}}}' | \
    sort | uniq -c | sort -rn | head -20
```

### For Each Application, Review Denials

```bash
# Filter denials for a specific process
sudo ausearch -m avc -c nginx | audit2why

# Generate a policy module to allow the denials
sudo ausearch -m avc -c nginx | audit2allow -M nginx-policy
sudo semodule -i nginx-policy.pp

# View what the policy module allows
cat nginx-policy.te
```

### Common Fixes

```bash
# File context issues (wrong label on files)
sudo restorecon -Rv /var/www/html/
sudo restorecon -Rv /etc/nginx/

# Custom port used by a service
# Example: your app runs on port 8080
sudo semanage port -a -t http_port_t -p tcp 8080

# Boolean settings (enable commonly needed behaviors)
# Allow httpd to make network connections
sudo setsebool -P httpd_can_network_connect on

# Allow httpd to connect to databases
sudo setsebool -P httpd_can_network_connect_db on

# Allow httpd to read user home directories
sudo setsebool -P httpd_read_user_content on

# List all available booleans
getsebool -a | grep httpd
```

## Step 7: Fix File Contexts

Files created outside normal package installation paths may have wrong contexts:

```bash
# Check context of important directories
ls -Zd /var/www/html
ls -Zd /etc/nginx
ls -Z /etc/nginx/nginx.conf

# If context is wrong (shows default_t or unlabeled_t), restore it
sudo restorecon -Rv /var/www/html

# For custom application directories
# First, create a custom file context rule
sudo semanage fcontext -a -t httpd_sys_content_t "/opt/myapp/public(/.*)?"

# Apply the rule
sudo restorecon -Rv /opt/myapp/public
```

## Step 8: Create Custom Policy Modules

For denials that are not covered by standard booleans or file context fixes:

```bash
# Collect denials for a specific application over time
sudo ausearch -m avc -c myapp -ts today > myapp_denials.txt

# Generate a policy module
cat myapp_denials.txt | audit2allow -M myapp-custom

# Review the policy before loading it
cat myapp-custom.te

# Load the policy module
sudo semodule -i myapp-custom.pp

# List loaded custom modules
sudo semodule -l | grep myapp
```

## Step 9: Switch to Enforcing Mode

After running in permissive mode long enough (suggest minimum two weeks for production applications):

```bash
# Switch to enforcing mode at runtime (no reboot)
sudo setenforce 1

# Check mode
getenforce
# Returns: Enforcing

# Monitor for new denials that were not seen in permissive mode
sudo tail -f /var/log/audit/audit.log | grep AVC

# If critical services break immediately, switch back to permissive
sudo setenforce 0
# Investigate the denials and fix them before trying enforcing again
```

When enforcing mode is stable, persist it:

```bash
sudo sed -i 's/SELINUX=permissive/SELINUX=enforcing/' /etc/selinux/config

# Verify
grep SELINUX /etc/selinux/config
```

## Rollback Plan

If SELinux causes unresolvable problems:

```bash
# Switch to permissive immediately (no reboot)
sudo setenforce 0

# To disable SELinux completely (requires reboot)
sudo sed -i 's/SELINUX=.*/SELINUX=disabled/' /etc/selinux/config
sudo reboot

# After reboot, reinstall AppArmor if needed
sudo apt install -y apparmor
sudo systemctl enable --now apparmor
```

## Verification Checklist

After migrating:

```bash
# Confirm SELinux is in enforcing mode
sestatus

# Confirm no unexpected denials in the last hour
sudo ausearch -m avc -ts "1 hour ago" | wc -l

# All services running as expected
sudo systemctl list-units --state=failed

# Network connectivity intact
curl -s localhost/health || echo "Check application health endpoint"
```

Migration from AppArmor to SELinux on Ubuntu is supported but not trivial. Budget time for the permissive audit period and expect to write several custom policy modules for any non-standard software configurations. The security model itself is sound - the challenge is the operational work of tuning policy for your specific environment.
