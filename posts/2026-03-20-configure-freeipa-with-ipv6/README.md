# How to Configure FreeIPA with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FreeIPA, IPv6, Identity Management, Kerberos, LDAP, DNS, Linux

Description: Install and configure FreeIPA identity management with IPv6 support, enabling centralized authentication, DNS, and certificate management on IPv6 networks.

---

FreeIPA is a comprehensive identity management solution integrating LDAP, Kerberos, DNS, and CA. It has IPv6 support, but requires careful attention during installation and configuration to ensure all services bind to IPv6 interfaces.

## Prerequisites for FreeIPA IPv6

```bash
# Verify IPv6 is functional

ip -6 addr show
ping6 -c 3 2001:4860:4860::8888

# Set a fully qualified hostname (required by FreeIPA)
sudo hostnamectl set-hostname ipa.example.com

# Ensure the hostname resolves to an IPv6 address
echo "2001:db8::10 ipa.example.com ipa" | sudo tee -a /etc/hosts

# Verify forward and reverse name resolution (or set up /etc/hosts for testing)
getent ahostsv6 ipa.example.com
getent hosts 2001:db8::10
hostname -f
```

## Installing FreeIPA Server with IPv6

```bash
# Install FreeIPA server packages
# RHEL/CentOS/AlmaLinux
sudo dnf install ipa-server ipa-server-dns -y

# Run the FreeIPA installer
# The --ip-address flag accepts IPv6 addresses
sudo ipa-server-install \
  --realm=EXAMPLE.COM \
  --domain=example.com \
  --ds-password=DirectoryPassword \
  --admin-password=AdminPassword \
  --ip-address=2001:db8::10 \
  --no-ntp \
  --mkhomedir \
  --setup-dns \
  --forwarder=2001:4860:4860::8888 \
  --auto-reverse \
  --unattended
```

## Configuring FreeIPA for Dual-Stack

After installation, verify all services listen on IPv6:

```bash
# Check LDAP (389 Directory Server) is listening on IPv6
ss -6 -tlnp | grep :389
ss -6 -tlnp | grep :636  # LDAPS

# Check Kerberos KDC is listening on IPv6
ss -6 -tlnp | grep :88
ss -6 -ulnp | grep :88

# Check DNS (if installed)
ss -6 -ulnp | grep :53
ss -6 -tlnp | grep :53

# Check FreeIPA web UI (Apache)
ss -6 -tlnp | grep :443
```

## Adding IPv6 DNS Records to FreeIPA

```bash
# Authenticate as admin
kinit admin

# Verify the installer created the AAAA record for the IPA server itself
ipa dnsrecord-show example.com ipa

# Add AAAA records for other services
ipa dnsrecord-add example.com ns1 \
  --aaaa-rec 2001:db8::10

# Add PTR record for reverse DNS
ipa dnsrecord-add 0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. \
  0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0 \
  --ptr-rec ipa.example.com.

# Verify the record
ipa dnsrecord-show example.com ns1
```

## Enrolling an IPv6 Client in FreeIPA

```bash
# Install IPA client packages
sudo dnf install ipa-client -y

# Enroll the client; ensure ipa.example.com resolves on the client
# --ip-address adds the client's AAAA record in IPA DNS
sudo ipa-client-install \
  --server=ipa.example.com \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --principal=admin \
  --password=AdminPassword \
  --ip-address=2001:db8::20 \
  --mkhomedir \
  --unattended

# Verify enrollment
id admin
```

## Configuring Kerberos for IPv6

FreeIPA's Kerberos (MIT KRB5) uses DNS to find KDCs. Ensure AAAA records exist:

```bash
# Check Kerberos KDC SRV records
dig SRV _kerberos._tcp.example.com
dig SRV _kerberos._udp.example.com

# Test Kerberos authentication
kinit admin@EXAMPLE.COM

# Verify ticket
klist

# Check KDC is reachable over IPv6
nc -6 -z 2001:db8::10 88 && echo "Kerberos KDC reachable over IPv6"
```

## Managing Users and Groups over IPv6

```bash
# Use IPA commands (they connect over IPv6 automatically if configured)
ipa user-add testuser \
  --first=Test \
  --last=User \
  --password

# Verify user was created
ipa user-show testuser

# Test LDAP query over IPv6
ldapsearch -H ldap://[2001:db8::10] \
  -Y GSSAPI \
  -b "cn=users,cn=accounts,dc=example,dc=com" \
  "(uid=testuser)"
```

## Firewall Rules for FreeIPA IPv6

```bash
# Open all required ports for FreeIPA
sudo firewall-cmd --permanent --add-service=freeipa-4
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --reload

# Verify rules
sudo firewall-cmd --list-all
```

FreeIPA's integrated IPv6 support - covering LDAP, Kerberos, and DNS - makes it an excellent choice for identity management in modern dual-stack and IPv6-only enterprise environments.
