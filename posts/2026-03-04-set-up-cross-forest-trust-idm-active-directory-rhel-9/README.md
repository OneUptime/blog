# How to Set Up a Cross-Forest Trust Between IdM and Active Directory on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Active Directory, Trust, Kerberos, Identity Management, Linux

Description: Learn how to establish a cross-forest trust between Red Hat Identity Management and Microsoft Active Directory on RHEL 9 for unified authentication.

---

A cross-forest trust between IdM and Active Directory allows AD users to access resources managed by IdM. This is the recommended approach for organizations running both Windows and RHEL environments, enabling a unified identity solution without migrating users between directories.

## Prerequisites

- IdM server on RHEL 9 with integrated DNS
- Active Directory domain controller (Windows Server 2012 or later; Windows Server 2022 requires RHEL 9.1 or later)
- DNS resolution working between both domains
- Non-overlapping DNS namespaces (e.g., idm.example.com and ad.example.com)
- Non-overlapping ID ranges

## DNS Configuration

Both environments must be able to resolve each other's DNS names.

### On IdM: Add DNS Forwarder for AD Domain

```bash
kinit admin
ipa dnsforwardzone-add ad.example.com --forwarder=10.0.0.1 --forward-policy=only
```

Verify:

```bash
dig +short _ldap._tcp.ad.example.com SRV
```

### On AD: Add Conditional Forwarder for IdM Domain

In AD DNS Manager, add a conditional forwarder:
- DNS domain: `idm.example.com`
- IP address of IdM DNS server

Verify from a Windows machine:

```powershell
nslookup idm1.idm.example.com
```

## Installing Trust Packages

On the IdM server:

```bash
sudo dnf install ipa-server-trust-ad samba-client
```

## Preparing IdM for the Trust

Configure the IdM server for trust:

```bash
sudo ipa-adtrust-install
```

The installer prompts for:

```text
NetBIOS domain name [IDM]: IDM
Do you want to enable support for trusted domains? [yes]: yes
```

For non-interactive:

```bash
sudo ipa-adtrust-install \
    --netbios-name=IDM \
    --add-sids \
    --unattended
```

Restart IdM services after the trust components are installed:

```bash
sudo ipactl restart
```

## Opening Firewall Ports

Additional ports are needed for AD trust:

```bash
sudo firewall-cmd --add-service=freeipa-trust --permanent
sudo firewall-cmd --reload
```

This opens:

- TCP/UDP 135 - Microsoft RPC
- TCP/UDP 445 - SMB
- TCP 49152-65535 - Dynamic RPC

The installer might also mention NetBIOS ports 138 and 139, but they are not required for a RHEL 9 IdM-AD trust.

## Establishing the Trust

### One-Way Trust (AD users can access IdM resources)

```bash
ipa trust-add --type=ad ad.example.com --admin=Administrator --password --range-type=ipa-ad-trust
```

Enter the AD Administrator password when prompted.

### Two-Way Trust (for S4U Cross-Realm Scenarios)

```bash
ipa trust-add --type=ad ad.example.com --two-way=true --admin=Administrator --password --range-type=ipa-ad-trust
```

Two-way trust in IdM is mainly for applications that need Microsoft `S4U2Self` or `S4U2Proxy` Kerberos extensions across the trust boundary. It does not allow IdM users to log in to Windows systems or grant extra AD-side rights compared with one-way trust.

## Verifying the Trust

```bash
ipa trust-show ad.example.com
```

List trusted domains:

```bash
ipa trust-find
```

Verify AD user resolution:

```bash
id aduser@ad.example.com
```

Test Kerberos authentication:

```bash
kinit aduser@AD.EXAMPLE.COM
```

## Configuring ID Ranges

IdM creates an ID range for the trusted AD domain. With the `ipa-ad-trust` range type, SSSD maps POSIX IDs from AD SIDs. Check the ID range:

```bash
ipa idrange-find
```

If you need a specific mapped ID range, define it when creating the trust:

```bash
ipa trust-add --type=ad ad.example.com --admin=Administrator --password --range-type=ipa-ad-trust --base-id=200000 --range-size=200000
```

## Allowing AD Users to Access IdM Resources

### Create HBAC Rules for AD Users

```bash
# Create a non-POSIX external group for AD users
ipa group-add ad-users-external --desc="Active Directory users external map" --external

# Create a POSIX group for HBAC and sudo policies
ipa group-add ad-users --desc="Active Directory users"

# Add an AD global or universal security group as an external member
ipa group-add-member ad-users-external --external="AD\\Linux Users"

# Nest the external group in the POSIX group
ipa group-add-member ad-users --groups=ad-users-external

# Create HBAC rule
ipa hbacrule-add allow_ad_users_devservers
ipa hbacrule-add-user allow_ad_users_devservers --groups=ad-users
ipa hbacrule-add-host allow_ad_users_devservers --hostgroups=devservers
ipa hbacrule-add-service allow_ad_users_devservers --hbacsvcs=sshd
```

### Configure sudo for AD Users

```bash
ipa sudocmd-add /usr/bin/systemctl
ipa sudorule-add ad-sudo-rule
ipa sudorule-add-user ad-sudo-rule --groups=ad-users
ipa sudorule-add-host ad-sudo-rule --hostgroups=devservers
ipa sudorule-add-runasuser ad-sudo-rule --users=root
ipa sudorule-add-allow-command ad-sudo-rule --sudocmds="/usr/bin/systemctl"
```

## Troubleshooting

### Trust Establishment Fails

Check network connectivity:

```bash
# Test SMB connectivity
smbclient -L ad-dc.ad.example.com -U Administrator
```

Check DNS:

```bash
dig +short _kerberos._tcp.ad.example.com SRV
dig +short _ldap._tcp.ad.example.com SRV
```

### AD User Resolution Fails

```bash
# Clear SSSD cache
sudo sss_cache -E
sudo systemctl restart sssd

# Check SSSD logs
sudo journalctl -u sssd -f
```

### Kerberos Issues

```bash
# Check for clock skew
chronyc tracking

# Test Kerberos
kinit aduser@AD.EXAMPLE.COM
```

## Removing a Trust

```bash
ipa trust-del ad.example.com
```

## Summary

A cross-forest trust between IdM and Active Directory on RHEL 9 enables unified authentication across Linux and Windows environments. Configure DNS forwarding in both directions, prepare IdM with `ipa-adtrust-install`, and establish the trust with `ipa trust-add`. Once established, AD users can be granted access to Linux resources through HBAC rules and sudo policies, providing a seamless experience across platforms.
