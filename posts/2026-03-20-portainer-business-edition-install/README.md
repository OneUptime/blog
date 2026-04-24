# How to Install Portainer Business Edition - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Portainer-business, Installation, Enterprise, License

Description: A guide to installing Portainer Business Edition with license activation, covering Docker, Docker Swarm, and Kubernetes deployments.

## Overview

Portainer Business Edition (BE) adds enterprise features on top of Portainer CE including advanced RBAC with teams and roles, Active Directory integration, audit logging, advanced GitOps features for stacks, and automated backups. This guide covers installing Portainer BE and activating your license.

## Obtaining a Portainer Business License

1. Visit https://www.portainer.io/pricing
2. Choose an option that fits your deployment (3 Nodes Free, Extended Free Trial, Starter, Scale, or Enterprise)
3. Purchase a license, request 3 Nodes Free, or start an extended free trial
4. You'll receive a license key via email

## Installation on Docker Standalone

```bash
# Create data volume

docker volume create portainer_data

# Install Portainer Business Edition
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:lts    # Note: portainer-ee for Business Edition

# Verify
docker ps | grep portainer
```

## Installation on Docker Swarm

```bash
# Deploy Portainer BE and the Portainer Agent on Docker Swarm
curl -L https://downloads.portainer.io/ee-lts/portainer-agent-stack.yml -o portainer-agent-stack.yml
docker stack deploy -c portainer-agent-stack.yml portainer
```

## Installation on Kubernetes

```bash
# Install Portainer BE on Kubernetes using the default NodePort manifest
kubectl apply -n portainer -f https://downloads.portainer.io/ee-lts/portainer.yaml

# Or via Helm with a LoadBalancer service
helm repo add portainer https://portainer.github.io/k8s/
helm repo update

helm upgrade --install --create-namespace -n portainer portainer portainer/portainer \
  --set service.type=LoadBalancer \
  --set enterpriseEdition.enabled=true \
  --set enterpriseEdition.image.tag=lts \
  --set tls.force=true
```

## Activating Your License

### Via the Web UI

1. Access Portainer BE at the URL exposed by your deployment (for example `https://your-server:9443` for Docker or Swarm, or `https://<node-ip>:30779` for the default Kubernetes NodePort manifest)
2. Create the initial admin account
3. Enter your license key when prompted
4. Click "Submit"

### Via a Docker Environment Variable

```bash
# Pre-activate license during deployment
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -e PORTAINER_LICENSE_KEY="YOUR-LICENSE-KEY-HERE" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:lts
```

## Portainer BE vs CE Feature Comparison

All current Business Edition plans include the same BE feature set. Pricing, node options, and support levels differ by plan.

| Feature | CE | BE Starter | BE Scale | BE Enterprise |
|---|---|---|---|---|
| Price | Free | From $99/month or $995/year | From $199/month or $1995/year | Contact sales |
| Node options | Unlimited | 5, 10, or 15 | 5, 10, 15, 20, or 25 | Custom |
| Advanced RBAC roles | No | Yes | Yes | Yes |
| Active Directory authentication | No | Yes | Yes | Yes |
| Authentication and activity logs | No | Yes | Yes | Yes |
| Registry browsing and management | No | Yes | Yes | Yes |
| S3 backups and scheduled backups | No | Yes | Yes | Yes |
| Support | Community | Community | 9x5 next business day | Prioritized 9x5, with a 24/7 option |

## Setting Up LDAP/AD Integration

```text
Portainer UI → Settings → Authentication

For LDAP:
- Authentication method: LDAP Authentication
- Server type: Custom or OpenLDAP template
- Server URL: ldap://ldap.company.com:389
- Reader DN: cn=portainer-svc,dc=company,dc=com
- BaseDN: dc=company,dc=com
- Username attribute: uid
- Group Membership Attribute: member

For Active Directory:
- Authentication method: Microsoft Active Directory
- AD Controller: dc.company.com
- Service Account: portainer-svc@company.com
- User Search Path: OU=Users,DC=company,DC=com
- Allowed Groups: CN=PortainerUsers,OU=Groups,DC=company,DC=com
```

## Setting Up Team-Based Access

```text
Portainer UI → User-related → Teams → Add Team

Create teams:
- "DevOps"
- "Developers"
- "Read Only"

Then assign teams to environments or environment groups with appropriate roles.
```

## Configuring Automated Backups (BE Feature)

```text
Portainer UI → Settings → Back up Portainer

Options:
- Destination: Download backup file or Store in S3
- Schedule automatic backups: Available when storing to S3
- Cron rule: For example, 41 3 * * 2 for 3:41 AM every Tuesday
- S3 compatible host: Optional for providers such as MinIO
- Password protect: Optional
```

## Conclusion

Portainer Business Edition extends Portainer CE with enterprise features that are essential for team environments: RBAC with teams, Active Directory integration, audit logging, and automated backups. The installation process is nearly identical to Portainer CE, with the key difference being the `portainer-ee` image or Business Edition manifests plus license activation. The Business Edition transforms Portainer from a personal management tool into an enterprise-ready container management platform.
