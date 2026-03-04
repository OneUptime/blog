# How to Set Up a Cross-Forest Trust Between IdM and Active Directory on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, Active Directory, Trust, FreeIPA, Kerberos, Linux

Description: Learn how to establish a cross-forest trust between Red Hat Identity Management (IdM) and Microsoft Active Directory on RHEL, enabling AD users to access Linux resources.

---

A cross-forest trust between IdM and Active Directory (AD) lets AD users access Linux resources managed by IdM without needing separate Linux accounts. IdM acts as a separate Kerberos realm that trusts the AD forest. This is a one-way or two-way trust.

## Prerequisites

```bash
# IdM server must have:
# - Integrated DNS or proper DNS delegation
# - Samba packages installed for trust support

# Install trust-related packages on the IdM server
sudo dnf install -y ipa-server-trust-ad

# Verify DNS resolution between domains
dig ad.example.com
dig _ldap._tcp.ad.example.com SRV

# Ensure the IdM server can resolve AD domain controllers
dig dc1.ad.example.com
```

## Configuring DNS

Both domains must be able to resolve each other:

```bash
# On IdM server, add a DNS forward zone for the AD domain
kinit admin
ipa dnsforwardzone-add ad.example.com \
  --forwarder=10.0.0.1 \
  --forward-policy=only

# On the AD side, create a conditional forwarder for example.com
# pointing to the IdM DNS server IP
```

## Preparing IdM for Trust

```bash
# Run the trust preparation on the IdM server
sudo ipa-adtrust-install \
  --netbios-name=IDM \
  --add-sids

# This configures Samba and generates SIDs for existing IdM users
# Restart IdM services
sudo ipactl restart
```

## Establishing the Trust

```bash
# Create a one-way trust (AD users can access IdM resources)
ipa trust-add ad.example.com \
  --type=ad \
  --admin=Administrator \
  --password

# For a two-way trust (both directions)
ipa trust-add ad.example.com \
  --type=ad \
  --two-way=true \
  --admin=Administrator \
  --password
```

## Verifying the Trust

```bash
# List established trusts
ipa trust-find

# Show trust details
ipa trust-show ad.example.com

# Verify AD users can be resolved
id aduser@ad.example.com

# Test Kerberos ticket for an AD user
kinit aduser@AD.EXAMPLE.COM
klist
```

## Configuring ID Ranges

```bash
# View the ID range assigned to the AD domain
ipa idrange-find

# AD users get UIDs/GIDs from this range
# Verify an AD user's mapped UID
id aduser@ad.example.com
```

## Granting AD Users Access

```bash
# Add AD users or groups to IdM HBAC rules
ipa hbacrule-add ad-user-access
ipa hbacrule-add-user ad-user-access --groups="ad-linux-users@ad.example.com"
ipa hbacrule-add-host ad-user-access --hostgroups=linux-servers
ipa hbacrule-add-service ad-user-access --hbacsvcs=sshd
```

The cross-forest trust eliminates the need to maintain duplicate accounts. AD users authenticate against AD, and IdM handles authorization through HBAC rules and sudo policies.
