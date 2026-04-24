# How to Set Up Portainer for Healthcare Container Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Healthcare, HIPAA, Docker, Compliance, Security

Description: Configure Portainer for healthcare container workloads with HIPAA-aligned security controls, audit logging, encrypted storage, and access management for PHI-handling services.

---

Healthcare organizations deploying containerized workloads must address HIPAA Security Rule technical safeguards such as access control, audit controls, and transmission security, and should apply least-privilege access to systems that handle ePHI. Portainer provides several controls that directly support these requirements when properly configured, though some of the logging and access-control features below require Portainer Business Edition.

## HIPAA-Relevant Portainer Controls

| Requirement | Portainer Feature |
|---|---|
| Access Control | Teams and per-environment permissions; finer-grained RBAC in Portainer Business Edition |
| Audit Logging | Portainer Business Edition authentication/activity logs plus Docker daemon and container logs |
| Encryption in Transit | TLS for the Portainer UI/API; application traffic must be encrypted separately |
| Least Privilege | Scoped environment access and standard/read-only roles in Portainer Business Edition |
| Isolation | Separate environments for separate Docker hosts or clusters, plus environment groups and access policies |

## Step 1: Enable Portainer TLS and Authentication

Deploy Portainer with TLS certificates from your PKI. For audit logs, RBAC, and Active Directory authentication, use Portainer Business Edition:

```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -v /etc/tls/portainer.crt:/certs/portainer.crt:ro \
  -v /etc/tls/portainer.key:/certs/portainer.key:ro \
  -v portainer_data:/data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  portainer/portainer-ee:sts \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

Portainer expects PEM certificates, and the certificate passed to `--sslcert` should include the full chain. For production deployments, Portainer recommends the current LTS release stream.

Disable HTTP access at the firewall level - all traffic must use HTTPS.

## Step 2: Configure LDAP/AD Authentication

For healthcare organizations using LDAP or Active Directory:

1. Go to **Settings > Authentication**
2. Select **Microsoft Active Directory** if you are using AD (Business Edition), or **LDAP** for a general LDAP directory
3. Configure the controller/server address, service account, TLS or StartTLS, and user/group search settings
4. For LDAP group search, identically named LDAP groups can auto-populate matching Portainer teams

## Step 3: Set Up Isolated Environments per System

Create separate Portainer environments for each clinical system only when those systems run on separate Docker hosts or clusters:

```text
Environment: ehr-production       (EHR application containers)
Environment: imaging-pacs         (DICOM/PACS workloads)
Environment: lab-lis              (Laboratory Information System)
Environment: hl7-integration      (HL7/FHIR integration layer)
```

If multiple systems share the same Docker host or cluster, use environment groups and access controls instead of creating pseudo-environments. Assign each environment or environment group only to the team responsible for that system.

## Step 4: Deploy PHI Services with Secrets and Encrypted Storage

For services handling Protected Health Information, use secrets for sensitive runtime data and place persistent volumes on encrypted host or cloud storage:

```yaml
# ehr-stack.yml

services:
  ehr-api:
    image: internal-registry.hospital.org/ehr-api:1.4.2
    environment:
      - DATABASE_URL=postgresql://ehr-db:5432/ehr_production
      - ENCRYPTION_KEY_FILE=/run/secrets/db_encryption_key
    secrets:
      - db_encryption_key
    read_only: true         # Immutable filesystem
    security_opt:
      - no-new-privileges=true
    networks:
      - ehr-internal

secrets:
  db_encryption_key:
    file: ./secrets/db_encryption_key.txt

networks:
  ehr-internal: {}
```

## Step 5: Configure Docker Logging and Audit Collection

On the host, configure default container log rotation and daemon settings in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "10"
  },
  "userns-remap": "default"
}
```

Collect Docker daemon logs from `journalctl -xu docker.service` (or your system log on distributions that do not use `systemd`) and forward them to your SIEM. If you use Portainer Business Edition, you can also export authentication and activity logs or stream them directly to Syslog with the `--syslog-*` CLI flags.

## Step 6: Digest Pinning and Private Registry

All PHI-related containers must use images from your internal registry with digest pinning:

```yaml
# Replace the digest below with the exact digest published by your registry
image: internal-registry.hospital.org/ehr-api@sha256:94a00394bc5a8ef503fb59db0a7d0ae9e1110866e8aee8ba40cd864cea69ea1a
```

Enable registry access controls in Portainer and restrict which users or teams can access each registry for a given environment.

## Summary

Portainer can support healthcare container deployments through TLS for the UI/API, external authentication, scoped environment access, and centralized logging. For audit logs, Active Directory integration, and granular RBAC, use Portainer Business Edition. While Portainer alone does not make a deployment HIPAA-compliant, it provides operational controls that can contribute to a broader compliance program. Always engage your compliance officer and document your container management procedures in your Security Risk Analysis.
