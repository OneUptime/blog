# How to Fix 'SSSD: Authentication Failure' with Active Directory on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSSD, Active Directory, Authentication, Troubleshooting

Description: Troubleshoot and fix SSSD authentication failures when RHEL is joined to an Active Directory domain, covering DNS, Kerberos, and configuration issues.

---

SSSD authentication failures with Active Directory can be caused by DNS issues, expired computer accounts, Kerberos problems, or SSSD misconfiguration. This guide covers the systematic troubleshooting approach.

## Step 1: Verify Domain Membership

```bash
# Check if the system is joined to the domain
realm list

# If not joined, rejoin
sudo realm join AD.EXAMPLE.COM -U admin

# Verify the Kerberos keytab
sudo klist -kt /etc/krb5.keytab
```

## Step 2: Check DNS Resolution

DNS is critical for Active Directory. SSSD relies on SRV records to find domain controllers.

```bash
# Test SRV record lookup
dig _ldap._tcp.ad.example.com SRV
dig _kerberos._tcp.ad.example.com SRV

# If DNS fails, check /etc/resolv.conf
cat /etc/resolv.conf
# The nameserver should be an AD DNS server

# Fix DNS via NetworkManager
sudo nmcli connection modify ens192 ipv4.dns "10.0.0.1 10.0.0.2"
sudo nmcli connection up ens192
```

## Step 3: Test Kerberos Authentication

```bash
# Try to get a Kerberos ticket manually
kinit aduser@AD.EXAMPLE.COM
# Enter password when prompted

# If kinit fails, check:
# - Clock synchronization (must be within 5 minutes of the DC)
sudo chronyc tracking

# - Kerberos configuration
cat /etc/krb5.conf
```

## Step 4: Enable SSSD Debug Logging

```bash
# Enable debug logging
sudo sssctl debug-level 6

# Attempt authentication
su - aduser@ad.example.com

# Check the logs
sudo tail -100 /var/log/sssd/sssd_ad.example.com.log
sudo tail -100 /var/log/sssd/sssd_pam.log
```

## Step 5: Check Common Issues

**Expired computer account:**

```bash
# Renew the machine password
sudo adcli update --domain=ad.example.com --verbose
```

**SSSD cache corruption:**

```bash
# Clear the SSSD cache
sudo systemctl stop sssd
sudo rm -rf /var/lib/sss/db/*
sudo systemctl start sssd
```

**Incorrect access controls:**

```bash
# Check if access control is limiting logins
grep "access_provider" /etc/sssd/sssd.conf

# If using simple access control, check the allow list
grep "simple_allow" /etc/sssd/sssd.conf

# To allow all domain users temporarily for testing
# access_provider = permit
```

## Step 6: Verify User Lookup

```bash
# Test if the user exists in SSSD
id aduser@ad.example.com

# If id fails, SSSD cannot resolve the user
# Check the NSS logs
sudo tail -50 /var/log/sssd/sssd_nss.log
```

Start with DNS verification, as it is the most common cause of SSSD/AD authentication failures. If DNS is correct, check Kerberos and then SSSD debug logs for specific error messages.
