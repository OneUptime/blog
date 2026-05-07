# How to Add a Harbor Registry to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Harbor, Container Registry, Security, DevOps

Description: Learn how to connect a Harbor container registry to Portainer for secure, enterprise-grade image management.

## What Is Harbor?

Harbor is an open-source, CNCF-graduated container registry that adds security features on top of a standard Docker registry, including vulnerability scanning, role-based access control (RBAC), image signing, and replication. It's widely used in enterprise and air-gapped environments.

## Prerequisites

- A running Harbor instance (e.g., at `https://harbor.mycompany.com`)
- A Harbor user account with project administrator access to the target project, or an existing robot account with `Pull Repository` access

## Creating a Harbor Robot Account for Portainer

Robot accounts are service accounts in Harbor recommended for integrations:

1. In Harbor, go to your **Project > Robot Accounts**.
2. Click **New Robot Account**.
3. Set the name (e.g., `portainer-puller`) and permissions (at minimum `Pull Repository`. If you grant `Push Repository`, Harbor also requires `Pull Repository`).
4. Copy the robot account name and secret.

## Adding Harbor to Portainer

1. Go to **Registries** and click **Add registry**.
2. Select **Custom registry**.
3. Enter:
   - **Name**: `Harbor`
   - **Registry URL**: `harbor.mycompany.com`
   - **Username**: Robot account name exactly as shown in Harbor (e.g., `robot$myproject+portainer-puller` if your instance uses the default prefix)
   - **Password**: Robot account secret
4. Click **Add registry**.

## Verifying Access via CLI

```bash
# Log in to Harbor via Docker CLI

printf '%s\n' '<robot-secret>' | docker login harbor.mycompany.com \
  --username 'robot$myproject+portainer-puller' \
  --password-stdin

# Pull an image from Harbor
docker pull harbor.mycompany.com/myproject/my-app:latest
```

## Using Harbor Images in a Stack

```yaml
version: "3.8"

services:
  app:
    # Portainer will use the stored Harbor credentials
    image: harbor.mycompany.com/myproject/my-app:1.5.0
    deploy:
      replicas: 3
```

## Harbor's Security Features Worth Enabling

- **Vulnerability scanning**: Enable auto-scan on push to detect CVEs before deployment.
- **Content trust**: Enforce signed images using Harbor's content trust policy (Cosign or Notation in current Harbor releases).
- **CVE allowlist**: Define acceptable vulnerabilities per project.
- **Deployment security**: Enable **Prevent vulnerable images from running** and set a severity threshold to block pulls for vulnerable images.

```bash
# Check image scan results via Harbor API
curl -u '<robot-account-name>:<robot-secret>' \
  -H 'X-Accept-Vulnerabilities: application/vnd.security.vulnerability.report; version=1.1' \
  "https://harbor.mycompany.com/api/v2.0/projects/myproject/repositories/my-app/artifacts/latest/additions/vulnerabilities"
```

## Troubleshooting

- If you see `unauthorized: authentication required`, verify you are using the full robot account name exactly as Harbor shows it.
- If Harbor uses a self-signed certificate, add its CA certificate to Docker's trusted certificates. For non-production testing only, you can mark the registry as insecure in the Docker daemon configuration.

## Conclusion

Harbor is an excellent choice for organizations needing a feature-rich, self-hosted registry with security scanning. Integrating it with Portainer via robot accounts provides a clean separation of concerns and easy credential rotation.
