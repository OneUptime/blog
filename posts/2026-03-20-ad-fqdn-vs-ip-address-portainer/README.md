# How to Set Up AD with FQDN vs IP Address in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Active Directory, LDAP, DNS, Networking

Description: Understand when to use FQDN versus IP address for Active Directory connections in Portainer and how DNS affects LDAP over TLS.

---

When configuring Active Directory authentication in Portainer Business Edition, you must decide whether to connect using a domain controller's FQDN or its IP address. In Portainer's LDAP/AD settings, the controller is stored as `LDAPSettings.URL` in `host:port` format. This choice has significant implications for TLS validation and name resolution.

## Why FQDN is Strongly Recommended

Using the FQDN of the domain controller (`dc01.corp.example.com`) rather than an IP address is strongly recommended when:
- Using LDAPS (LDAP over TLS) with valid certificates
- The AD LDAPS certificate contains the exact hostname Portainer connects to in its Subject Alternative Name
- You want to avoid hard-coding a controller IP and keep the option to repoint a stable hostname later

```json
{
  "LDAPSettings": {
    "URL": "dc01.corp.example.com:636",
    "TLSConfig": { "TLS": true, "TLSSkipVerify": false },
    "StartTLS": false
  }
}
```

Using `192.168.1.10:636` for LDAPS is problematic unless the certificate also contains that IP address in its Subject Alternative Name.

## When IP Addresses Work

IP addresses are acceptable only when:
- Using plain LDAP without TLS (typically port 389) - not recommended for production
- The SSL certificate includes the IP address as a Subject Alternative Name
- You've set `TLSSkipVerify: true` - only appropriate for testing

```json
{
  "LDAPSettings": {
    "URL": "192.168.1.10:636",
    "TLSConfig": { "TLS": true, "TLSSkipVerify": true },
    "StartTLS": false
  }
}
```

If you use StartTLS on port `389` instead of LDAPS on port `636`, the same hostname-versus-IP certificate matching rules still apply.

## DNS Resolution inside the Container

Portainer runs inside Docker. The Portainer container, or a helper container using the same Docker DNS settings, must be able to resolve the FQDN:

```bash
# Test resolution using the same DNS settings you plan to give Portainer
docker run --rm \
  --dns 192.168.1.5 \
  --dns-search corp.example.com \
  alpine:3.21 \
  nslookup dc01.corp.example.com

# If DNS fails, recreate Portainer with explicit DNS settings
docker stop portainer
docker container rm portainer

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --dns 192.168.1.5 \
  --dns-search corp.example.com \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:sts
```

## Using a DNS Alias (CNAME) for Resilience

Point Portainer at a CNAME only if the certificate presented by the domain controller is also valid for that exact alias:

```json
{
  "LDAPSettings": {
    "URL": "ldap.corp.example.com:636"
  }
}
```

If the certificate only contains `dc01.corp.example.com`, connecting to `ldap.corp.example.com` will still fail TLS validation.

## Multi-DC Configuration

For AD environments with multiple domain controllers:

```json
{
  "LDAPSettings": {
    "URL": "dc01.corp.example.com:636"
  }
}
```

When automating via Portainer's settings API, the AD controller value is stored as a single `LDAPSettings.URL`. If you need to move to another domain controller, update that value or repoint a stable DNS name that is also covered by the certificate.

## Verify Hostname Resolution

```bash
# From the Docker host, verify DNS works
host dc01.corp.example.com

# From a helper container using the same DNS settings
docker run --rm \
  --dns 192.168.1.5 \
  --dns-search corp.example.com \
  alpine:3.21 \
  nslookup dc01.corp.example.com

# Check the certificate SAN for the IP (if needed)
openssl s_client -connect dc01.corp.example.com:636 </dev/null 2>/dev/null | \
  openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
```

---

*Monitor your Active Directory and Portainer services with [OneUptime](https://oneuptime.com).*
