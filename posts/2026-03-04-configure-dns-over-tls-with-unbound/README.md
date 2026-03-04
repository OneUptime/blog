# How to Configure DNS-over-TLS with Unbound on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Unbound, TLS, Security, Linux

Description: Learn how to configure DNS-over-TLS with Unbound on RHEL with step-by-step instructions, configuration examples, and best practices.

---

DNS-over-TLS (DoT) encrypts DNS queries between clients and the RHELer, preventing eavesdropping and manipulation of DNS traffic. Unbound on RHEL supports both acting as a DoT client (encrypting upstream queries) and a DoT server (accepting encrypted queries from clients).

## Prerequisites

- RHEL with Unbound installed
- Root or sudo access
- TLS certificates (for server mode)

## Step 1: Configure Unbound as a DoT Client

Forward queries to upstream DoT resolvers:

```bash
sudo vi /etc/unbound/unbound.conf
```

```yaml
server:
    interface: 127.0.0.1
    tls-cert-bundle: /etc/pki/tls/certs/ca-bundle.crt

forward-zone:
    name: "."
    forward-tls-upstream: yes
    forward-addr: 1.1.1.1@853#cloudflare-dns.com
    forward-addr: 1.0.0.1@853#cloudflare-dns.com
    forward-addr: 8.8.8.8@853#dns.google
    forward-addr: 8.8.4.4@853#dns.google
```

The `#` after the address specifies the TLS authentication name used to verify the server certificate.

## Step 2: Configure Unbound as a DoT Server

Generate or obtain TLS certificates:

```bash
sudo openssl req -x509 -newkey rsa:4096 -sha256 -days 365   -nodes -keyout /etc/unbound/server.key   -out /etc/unbound/server.crt   -subj "/CN=dns.example.com"

sudo chown unbound:unbound /etc/unbound/server.key /etc/unbound/server.crt
sudo chmod 600 /etc/unbound/server.key
```

Add DoT server configuration:

```yaml
server:
    interface: 0.0.0.0@853
    tls-service-key: /etc/unbound/server.key
    tls-service-pem: /etc/unbound/server.crt
    tls-port: 853
```

## Step 3: Open Firewall for DoT

```bash
sudo firewall-cmd --permanent --add-port=853/tcp
sudo firewall-cmd --reload
```

## Step 4: Test DoT Resolution

```bash
sudo unbound-checkconf
sudo systemctl restart unbound
```

Test with kdig (from knot-utils):

```bash
sudo dnf install -y knot-utils
kdig @127.0.0.1 +tls example.com
```

## Step 5: Verify Encryption

Use tcpdump to confirm traffic is encrypted:

```bash
sudo tcpdump -i any port 853 -c 10
```

You should see TCP traffic on port 853 but no readable DNS queries.

## Conclusion

DNS-over-TLS with Unbound on RHEL 9 encrypts DNS queries to protect against surveillance and tampering. Configure Unbound as a DoT client to encrypt upstream queries, and as a DoT server to offer encrypted DNS to your network clients.
RHEL