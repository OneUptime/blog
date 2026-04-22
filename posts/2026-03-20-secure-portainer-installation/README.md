# How to Secure Your Portainer Installation - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Hardening, Best Practice, DevOps

Description: Learn a comprehensive set of security best practices to harden your Portainer installation against unauthorized access and attacks.

## Portainer Security Checklist

Security for Portainer involves multiple layers: network, authentication, authorization, and container security.

## 1. Use HTTPS

Never run Portainer over HTTP in production. Use Let's Encrypt via Traefik/Nginx or provide your own certificate:

```bash
# Run Portainer with your own TLS certificate

docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /path/to/your/certs:/certs:ro \
  portainer/portainer-ce:sts \
  --http-disabled \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

## 2. Use a Strong Admin Password

Portainer requires a minimum 12-character password by default. Use a password manager to generate a strong random password.

## 3. Set a Non-Default Admin Username

During initial setup, the username defaults to `admin` but can be changed. Using a non-default admin username prevents automated attacks that target the default `admin` account.

## 4. Use External Authentication for MFA/2FA

Portainer's internal authentication does not provide native 2FA. If MFA/2FA is required, configure an external identity provider such as OAuth, LDAP, or Active Directory.

## 5. Restrict Network Access

Only expose Portainer to trusted networks:

```bash
# Bind Portainer to a specific IP (internal network only)
docker run -d \
  -p 192.168.1.10:9443:9443 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --http-disabled
```

```nginx
# Nginx: Restrict Portainer access by IP
location / {
    allow 203.0.113.0/24;   # Office IP range
    allow 10.0.0.0/8;       # Internal network
    deny all;
    proxy_pass https://portainer:9443;
}
```

## 6. Disable Unused Features

```bash
# Disable Edge agent features if not using Edge
# In Portainer Settings > Edge Compute, turn off "Enable Edge Compute features"
```

## 7. Configure Security Policies

In **Settings > Authentication**:

- Use external authentication for production or internet-facing deployments, especially when MFA/2FA is required.
- Keep the minimum password length at 12 characters or higher.
- Set session lifetime to 4 hours or less.

## 8. Apply Container Security Policies

For each Docker/Swarm environment:

```text
Host/Swarm > Setup > Docker Security Settings:
- Enable: Hide privileged mode for non-administrators
- Enable: Hide bind mounts for non-administrators
- Enable: Hide the use of host PID 1 for non-administrators
- Enable: Hide device mappings for non-administrators
- Enable: Hide container capabilities for non-administrators
- Enable: Hide sysctl settings for non-administrators
- Enable: Hide security-opt for non-administrators
```

## 9. Keep Portainer Updated

```bash
# Update Portainer to the latest version
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:sts
docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --http-disabled
```

## 10. Monitor Access Logs

```text
# Portainer Business Edition: Logs > Authentication
# For Community Edition, monitor your reverse proxy or firewall access logs for requests to Portainer.
```

## 11. Backup Portainer Data

```bash
# Stop Portainer before a raw volume backup to avoid copying a changing database
docker stop portainer
docker run --rm \
  -v portainer_data:/data:ro \
  -v /backup:/backup \
  busybox \
  tar czf /backup/portainer-backup-$(date +%Y%m%d).tar.gz -C /data .
docker start portainer
```

## Conclusion

Securing Portainer requires a layered approach: HTTPS, strong authentication, network restrictions, and container security policies. Implement all items in this checklist before exposing Portainer in any environment that handles sensitive workloads.
