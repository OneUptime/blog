# How to Secure Your Portainer Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Docker, Hardening, DevOps

Description: Learn how to harden your Portainer installation with essential security controls including HTTPS, strong authentication, network restrictions, and access policies.

## Introduction

A default Portainer installation is functional but not hardened for production. This guide covers the essential security measures to protect your Portainer instance against unauthorized access, privilege escalation, and data exposure. Apply these measures before exposing Portainer to any network beyond localhost.

## Prerequisites

- Portainer CE or BE installed (some access control and logging features below require BE)
- Admin access to the Portainer instance
- Access to the host system for network configuration
- A domain name and TLS certificate for HTTPS

## Security Checklist

- [ ] Enable HTTPS (TLS)
- [ ] Use a non-default admin username
- [ ] Set a strong admin password
- [ ] Restrict access by IP/VPN
- [ ] Force HTTPS only
- [ ] Configure session timeout
- [ ] Restrict Docker socket access
- [ ] Use least-privilege access controls for all users
- [ ] Restrict registry access
- [ ] Disable unused features

## Step 1: Enable HTTPS

Do not expose Portainer over HTTP in production. Portainer serves HTTPS on port `9443` by default with a self-signed certificate; in production, replace it with a valid TLS certificate:

```bash
# Option A: Use Portainer with TLS certificates directly

docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/portainer/certs:/certs \
  portainer/portainer-ce:latest \
  --sslcert /certs/cert.pem \
  --sslkey /certs/key.pem

# Option B: Put Portainer behind a reverse proxy (Nginx/Traefik) that handles TLS
# See dedicated guides for Nginx and Traefik setups
```

## Step 2: Use a Non-Default Admin Username

During initial setup, choose a username other than `admin`:

```bash
# On a fresh install, initialize the first admin account with a custom username
PASSWORD="$(openssl rand -base64 32)"

curl -s -X POST https://portainer.example.com/api/users/admin/init \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"portainer-ops\",\"Password\":\"${PASSWORD}\"}"
```

This is safer than relying on the default `admin` username.

## Step 3: Set a Strong Password

```bash
# Generate a cryptographically strong password
openssl rand -base64 32
# Example output: K8mP2xQzN9vR5tY3wE7jH1cL4uF6nD0a

# Or use Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Strong password guidance for the Portainer admin:
- At least 12 characters
- Mix of upper/lowercase, numbers, and symbols
- Stored in a password manager or secrets vault
- Never shared via email or chat

## Step 4: Restrict Network Access

```bash
# Bind Portainer to a specific internal IP instead of all interfaces
docker run -d \
  --name portainer \
  -p 192.168.1.100:9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Add firewall rules:

```bash
# UFW - Allow only specific source IPs
sudo ufw allow from 10.0.0.0/8 to any port 9443 comment "Portainer - VPN only"
sudo ufw deny 9443

# iptables
iptables -A INPUT -p tcp --dport 9443 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 9443 -j DROP
```

## Step 5: Configure Portainer Security Settings

In Portainer UI:

1. **Settings** → **Authentication**: Set **Session lifetime** to `30m` or `1h` (the default is 8 hours)
2. **Settings** → **Authentication**: Increase the minimum password length if your policy requires it
3. **Settings** → **General**: Enable **Force HTTPS only** after confirming HTTPS works correctly end to end

## Step 6: Enable RBAC for All Users

Role-Based Access Control beyond the standard administrator/user model is a Portainer Business Edition feature. In CE, use environment access and resource access control to keep permissions tight.

Never give users more access than they need:

1. Create teams aligned with job functions
2. Assign teams to specific environments or environment groups with the minimum required role
3. Use **Read-Only User** or **Helpdesk** for users who only need visibility
4. Use **Operator** or **Standard User** for day-to-day deployment work
5. Use **Administrator** access only for the ops/infra team

## Step 7: Restrict Docker Dangerous Settings

In Portainer UI → **Host/Swarm** → **Setup** → **Docker Security Settings** (or via a Docker security policy in BE):

- **Hide bind mounts** for non-admin users
- **Hide privileged mode** for non-admin users
- **Hide host PID 1** for non-admin users
- **Hide device mappings** for non-admin users
- **Hide container capabilities** for non-admin users
- **Hide sysctl settings** for non-admin users

## Step 8: Harden the Docker Socket

The Docker socket gives root-equivalent access. Restrict it:

Portainer's direct Docker socket connection is a legacy option, and Portainer recommends the Edge Agent for most use cases. If you use the local socket, mount it only into Portainer and do not expose the Docker API over plain TCP. For remote Docker access, use SSH or TLS.

## Step 9: Restrict Registry Access

Use approved registries and limit who can deploy from them:

- Add only the registries you want Portainer users to access
- In Docker/Swarm environments, use **Host/Swarm** → **Registries** → **Manage access** to grant registry access to specific users or teams
- In Portainer BE, use registry policies to apply registry access consistently across environment groups

## Step 10: Monitor and Audit

- Review **Authentication logs** (BE) regularly
- Set up log forwarding to a SIEM system
- Monitor for failed login attempts

```bash
# Check Portainer logs for suspicious activity
docker logs portainer 2>&1 | grep -E "(failed|unauthorized|error|blocked)" | tail -50
```

## Conclusion

Securing Portainer requires a layered approach: HTTPS for transport security, strong authentication for access control, network restrictions to limit exposure, and RBAC to minimize blast radius. Apply all steps before production deployment, and review the security settings periodically as your infrastructure grows. Portainer Business Edition provides additional security features including activity logs, SSO, and granular RBAC that further strengthen your security posture.
