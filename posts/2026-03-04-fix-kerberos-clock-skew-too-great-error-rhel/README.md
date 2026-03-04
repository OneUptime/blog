# How to Fix Kerberos 'Clock Skew Too Great' Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kerberos, Active Directory, NTP, Time Synchronization

Description: Fix the Kerberos 'Clock skew too great' error on RHEL by synchronizing the system clock with the domain controller using chronyd.

---

Kerberos requires that the clocks on the client and server (Key Distribution Center) be synchronized within 5 minutes. The "Clock skew too great" error means the time difference exceeds this tolerance.

## Diagnosing the Problem

```bash
# Check the current system time
date

# Compare with the domain controller
# Replace dc.ad.example.com with your domain controller
net time -S dc.ad.example.com

# Try getting a Kerberos ticket
kinit user@AD.EXAMPLE.COM
# kinit: Clock skew too great while getting initial credentials
```

## Fix: Synchronize Time with chronyd

RHEL uses chronyd as the default NTP client.

```bash
# Check the current chrony status
sudo chronyc tracking

# Check configured NTP sources
sudo chronyc sources -v

# If chrony is not using the domain controller as a source,
# add it to the configuration
sudo vi /etc/chrony.conf
```

Add the AD domain controller as an NTP source:

```bash
# Use the domain controller as NTP server
server dc1.ad.example.com iburst
server dc2.ad.example.com iburst

# Or use a pool
pool ad.example.com iburst
```

```bash
# Restart chronyd
sudo systemctl restart chronyd

# Force an immediate synchronization
sudo chronyc makestep

# Verify the time is now synchronized
sudo chronyc tracking
# Look for "System time" - should be close to 0
```

## Manual Time Fix (Emergency)

If chrony cannot reach the NTP server:

```bash
# Manually set the time (use this only as a temporary fix)
sudo date -s "2026-03-04 14:30:00"

# Or use timedatectl
sudo timedatectl set-time "2026-03-04 14:30:00"
```

## Verify the Fix

```bash
# Check the time difference
sudo chronyc tracking | grep "System time"

# Retry Kerberos authentication
kinit user@AD.EXAMPLE.COM
klist
```

## Ensuring Time Stays Synchronized

```bash
# Enable and start chronyd
sudo systemctl enable chronyd
sudo systemctl start chronyd

# Verify chrony is synchronizing
sudo chronyc sources

# Check if the timezone is correct
timedatectl

# Set the timezone if needed
sudo timedatectl set-timezone America/New_York
```

## Check NTP Firewall Rules

```bash
# NTP uses UDP port 123
# Ensure it is not blocked
sudo firewall-cmd --list-services | grep ntp

# If NTP is blocked, allow it
sudo firewall-cmd --add-service=ntp --permanent
sudo firewall-cmd --reload
```

In Active Directory environments, always configure chronyd to sync from the domain controllers. This prevents clock drift from causing Kerberos failures.
