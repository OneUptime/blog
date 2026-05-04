# How to Configure NTP Authentication over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NTP, Authentication, IPv6, Security, Chrony, NTS, Time Synchronization

Description: Secure your NTP communications over IPv6 by configuring symmetric key authentication and the modern Network Time Security (NTS) protocol to prevent time spoofing attacks.

---

Unauthenticated NTP is vulnerable to spoofing and man-in-the-middle attacks. Configuring NTP authentication over IPv6 prevents malicious actors from manipulating your server's clock, which could compromise security certificates, Kerberos tickets, and audit logs.

## Authentication Methods

Two main methods exist:
1. **Symmetric Key Authentication** - Pre-shared keys using MD5 or SHA (legacy, but widely supported).
2. **Network Time Security (NTS)** - Modern TLS-based authentication (RFC 8915, recommended).

## Method 1: Symmetric Key Authentication with chrony

Generate a shared key for NTP authentication:

```bash
# Generate a random NTP key

openssl rand -hex 20
# Example output: a4f2e8c1d9b3f7a2e5c8d1f4

# Create the chrony keys file
sudo tee /etc/chrony.keys > /dev/null << 'EOF'
# Key ID  Algorithm  Key Value
1         SHA256     a4f2e8c1d9b3f7a2e5c8d1f4a7b2e5c8
2         SHA512     b7c3f9e2d4a6f1b8e3c7d2f9a4e1c6b2d5f8a1e4
EOF

sudo chmod 640 /etc/chrony.keys
sudo chown root:chrony /etc/chrony.keys
```

Configure chrony server with authentication:

```bash
# /etc/chrony.conf (NTP server side)

# Specify the keys file
keyfile /etc/chrony.keys

# Require authentication from IPv6 clients
# allow clients but require key 1
allow 2001:db8::/32
# Clients must use key ID 1

# Trust key 1 for time from upstream servers
server 2001:db8::100 iburst key 1

logdir /var/log/chrony
```

Configure chrony client with the same key:

```bash
# /etc/chrony.conf (NTP client side)

keyfile /etc/chrony.keys

# Connect to IPv6 NTP server with authentication
# 'require' refuses to use the source unless it authenticates
server 2001:db8::1 iburst key 1 require
```

## Method 2: NTS (Network Time Security) - Modern Approach

NTS uses TLS to authenticate NTP over IPv6. chrony 4.0+ and NTPsec support NTS (the reference ntp.org `ntpd` does not):

```bash
# /etc/chrony.conf (NTS client)

# Use NTS with a public NTS-capable NTP server
# These servers support IPv6 and NTS:
server time.cloudflare.com iburst nts
server sth1.nts.netnod.se iburst nts
server gbg1.nts.netnod.se iburst nts

# NTS key database location
ntsdumpdir /var/lib/chrony/nts

# Logging
logdir /var/log/chrony
```

Verify NTS authentication:

```bash
# Restart chronyd
sudo systemctl restart chronyd

# Check if NTS is working
chronyc sources -v
# Lines marked with '*' and 'NTS' indicate NTS-authenticated sources

chronyc ntpdata
# Shows NTS KE (Key Exchange) status for each source
```

## Setting Up an NTS-Capable NTP Server

To run your own NTS NTP server over IPv6:

```bash
# /etc/chrony.conf (NTS server)

# Upstream time sources
# The 2.pool.ntp.org zone includes IPv6-capable servers
pool 2.pool.ntp.org iburst maxsources 4

# NTS configuration
# Requires a valid TLS certificate for your server hostname
ntsservercert /etc/letsencrypt/live/ntp.example.com/fullchain.pem
ntsserverkey  /etc/letsencrypt/live/ntp.example.com/privkey.pem

# Listen on IPv6
bindaddress 2001:db8::1

# Allow clients (NTS automatically authenticates)
allow ::/0

# NTS key storage
ntsdumpdir /var/lib/chrony/nts

# The NTS-KE port (default 4460)
# ntskefile /var/lib/chrony/nts/nts.keys
```

Clients connect using:

```bash
# /etc/chrony.conf (client connecting to your NTS server)
server ntp.example.com iburst nts
```

## Configuring ntpd Symmetric Key Authentication

```bash
# /etc/ntp.keys
# Format: key_id hash_type key_value
1 SHA1 a4f2e8c1d9b3f7a2e5c8d1f4

# /etc/ntp.conf
keys /etc/ntp.keys
trustedkey 1
requestkey 1
controlkey 1

# Use key 1 when synchronizing with the IPv6 server
server 2001:db8::1 iburst key 1
```

## Verifying Authenticated NTP

```bash
# Check chrony authentication status
chronyc authdata

# Verify NTS keys are working
chronyc ntpdata

# Check peer authentication with ntpq
ntpq -p
# For per-association authentication status, use:
ntpq -c associations
# and inspect the 'auth' column (ok / bad / none)

# Monitor authentication in logs
sudo journalctl -u chronyd | grep -i "nts\|auth\|key"
```

Configuring NTP authentication - using either symmetric keys for legacy compatibility or NTS for modern security - ensures your IPv6 time synchronization infrastructure is protected against clock manipulation attacks.
