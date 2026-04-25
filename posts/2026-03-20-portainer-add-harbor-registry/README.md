# How to Add a Harbor Registry to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Harbor, Registry, Security, DevOps

Description: Learn how to add a Harbor container registry to Portainer for secure, enterprise-grade private image management.

## Introduction

Harbor is an open-source cloud-native registry that provides security, identity, and management features beyond what the basic Docker Registry offers. It includes vulnerability scanning, image signing, RBAC, and replication policies. Portainer can connect to Harbor as a custom registry, and Portainer BE can browse registries that support the Docker Registry HTTP API V2. This guide covers adding Harbor to Portainer.

## Prerequisites

- Portainer CE or BE installed
- Harbor v2.x running and accessible
- Harbor project with images
- A Harbor robot account or user account

## Harbor Registry URL Format

```text
{harbor-domain}/{project}/{repository}:{tag}
# Examples:

harbor.company.com/myproject/myapp:latest
harbor.company.com/team/api:v2.0
```

## Step 1: Create a Harbor Robot Account

Robot accounts are the recommended way to give Portainer access to Harbor - they are dedicated to automation and have controlled scopes. The main flow below uses a system robot account so one Portainer registry entry can access multiple Harbor projects. If you only need a single project, see Step 7.

1. Log in to your Harbor instance as a system administrator
2. Go to **Administration → Robot Accounts**
3. Click **New Robot Account**
4. Configure:
   ```text
   Name:         portainer-pull
   Expiration:   365 (days)
   Description:  Portainer deployment access
   ```
5. Click **Next**
6. Under **Projects and Permissions**, associate the account with the Harbor projects Portainer needs and grant only the required access:
   - `Pull Repository` (required to pull images)
   - `Read Artifact` (read artifact metadata)
   - `List Tag` (if Portainer needs to list tags)
   - `Read Artifact Addition` (if you plan to query vulnerability reports via the Harbor API)
7. Click **Finish**
8. Copy the **Name** (default format: `robot$portainer-pull`) and **Secret**

## Step 2: Add Harbor Registry in Portainer

1. Go to **Registries** in Portainer
2. Click **+ Add registry**
3. Select **Custom registry**

## Step 3: Configure Harbor Connection

```text
Name:     Harbor Registry
URL:      https://harbor.company.com
Authentication: Enabled
Username: robot$portainer-pull
Password: [robot account secret]
```

**Note:** Harbor robot account names use the configured robot prefix. The default prefix is `robot$`, but Harbor administrators can change it.

4. Click **Add registry**

## Step 4: Verify Harbor Connectivity

Portainer validates the connection when saving. If it fails:

```bash
printf '%s\n' 'your-robot-secret' | docker login harbor.company.com \
  --username 'robot$portainer-pull' \
  --password-stdin

docker pull harbor.company.com/myproject/myapp:latest
```

## Step 5: Use Harbor Images in Portainer Stacks

```yaml
version: "3.8"

services:
  app:
    image: harbor.company.com/production/myapp:v2.1.0
    # Portainer uses the stored registry credentials

  database-proxy:
    image: harbor.company.com/infrastructure/pgbouncer:latest
```

## Step 6: Browse Harbor Registry in Portainer BE

Portainer Business Edition allows browsing registry contents directly:

1. Go to **Registries**
2. Click **Browse** next to the Harbor registry
3. Navigate through repositories → tags

This lets you inspect repository names and tags without typing full image paths by hand.

## Step 7: Configure Per-Project Robot Accounts

For fine-grained access control, create a separate robot account per project:

```text
# Project robot account names follow:
<prefix><project_name>+<account_name>
# Example:
robot$production+pull
```

In Harbor:
1. Navigate to **Projects → {project-name} → Robot Accounts**
2. Create a project-specific robot account
3. Use the full generated name when authenticating
4. This account only has access to that project's repositories

## Step 8: Harbor Content Trust (Image Signing)

Current Harbor releases support content trust through Cosign and Notation. Project administrators can enforce signed artifacts at the Harbor project level. For example, you can sign an image with Cosign:

```bash
cosign sign --key cosign.key harbor.company.com/myproject/myapp:latest
```

In Harbor, go to **Projects → {project} → Configuration**, enable **Cosign** or **Notation**, and click **Save**.

## Step 9: Harbor Vulnerability Scanning

Harbor can scan images for vulnerabilities automatically. Configure scan policies in Harbor:

1. **Harbor → Administration → Interrogation Services** - confirm Trivy is enabled or add an additional scanner
2. **Harbor → Projects → {project} → Configuration** - enable **Automatically scan images on push**
3. Optional: enable **Prevent vulnerable images from running** and set a severity threshold

```bash
# Export a vulnerability report via API
curl -u 'robot$portainer-pull:secret' \
  "https://harbor.company.com/api/v2.0/projects/myproject/repositories/myapp/artifacts/latest/additions/vulnerabilities"
```

## Troubleshooting

### Robot Account Access Denied

```text
Error: unauthorized: unauthorized to access repository
```

- Verify that you are using the full generated robot account name
- Check that the robot account has `Pull Repository` permission
- Ensure the account has not expired

### Certificate Error

```text
Error: x509: certificate signed by unknown authority
```

Add Harbor's CA certificate to the Docker host:

```bash
sudo mkdir -p /etc/docker/certs.d/harbor.company.com
sudo cp harbor-ca.crt /etc/docker/certs.d/harbor.company.com/ca.crt
sudo systemctl restart docker
```

## Conclusion

Harbor provides enterprise-grade features on top of the basic Docker registry, and Portainer can connect to it cleanly as a custom registry. Use robot accounts with minimal permissions for deployment access, leverage Harbor's vulnerability scanning to ensure you only deploy secure images, and use Portainer BE's registry browsing feature to navigate Harbor repositories directly from the Portainer interface.
