# How to Download Kubeconfig from Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, kubectl, kubeconfig, DevOps

Description: Learn how to download a kubeconfig file from Portainer for kubectl CLI access, including how to configure it for multiple environments and set up context switching.

## Introduction

Portainer generates user-specific kubeconfig files that provide scoped kubectl access to Kubernetes clusters managed by Portainer. This guide walks through the full process of downloading and configuring your kubeconfig.

## Prerequisites

- Portainer with Kubernetes environment(s) configured
- Access Portainer over HTTPS
- Kubeconfig download enabled for non-admin users, or an administrator account
- kubectl installed on your local machine
- `jq` installed locally if you plan to use the API examples

## Step 1: Enable Kubeconfig Download (Admin Task)

An administrator may need to confirm kubeconfig download is enabled before users can download kubeconfig files:

1. Log into Portainer as an administrator.
2. Go to **Settings**.
3. Under **Kubernetes settings**, review the **Kubeconfig** section.
4. Make sure kubeconfig download for non-admin users is not disabled.
5. Set a kubeconfig expiry time (optional but recommended).
6. Apply changes.

## Step 2: Download Your Kubeconfig via the UI

As a regular user:

1. Log into Portainer over HTTPS.
2. From the **Home** page, click the **kubeconfig** button.
3. Select the Kubernetes environment or environments you need access to.
4. Click **Download File**.

For the commands below, save the downloaded file as `~/.kube/portainer-kubeconfig.yaml`.

## Step 3: Download Kubeconfig via the Portainer API

You can also download kubeconfig programmatically:

```bash
# Step 1: Authenticate and get JWT token

TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"myuser","password":"mypassword"}' | jq -r '.jwt')

# Step 2: Download kubeconfig for environment ID 1
mkdir -p ~/.kube
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/yaml" \
  "https://portainer.example.com/api/kubernetes/config?ids=1" \
  -o ~/.kube/portainer-kubeconfig.yaml

echo "Kubeconfig downloaded."
```

## Step 4: Install and Use the Kubeconfig

```bash
# Option A: Replace default kubeconfig
cp ~/.kube/portainer-kubeconfig.yaml ~/.kube/config

# Option B: Use as an additional context alongside existing configs
export KUBECONFIG=~/.kube/config:~/.kube/portainer-kubeconfig.yaml

# Option C: Merge into existing kubeconfig
KUBECONFIG=~/.kube/config:~/.kube/portainer-kubeconfig.yaml \
  kubectl config view --flatten > /tmp/merged.yaml
mv /tmp/merged.yaml ~/.kube/config

# Make it permanent in your shell profile
echo 'export KUBECONFIG=~/.kube/config:~/.kube/portainer-kubeconfig.yaml' >> ~/.zshrc
source ~/.zshrc
```

## Step 5: Verify the Kubeconfig Contents

```bash
# View the kubeconfig structure
cat ~/.kube/portainer-kubeconfig.yaml

# Check available contexts
kubectl config get-contexts

# Example output:
# CURRENT   NAME                        CLUSTER             AUTHINFO            NAMESPACE
# *         portainer-production        portainer-cluster   portainer-user      production
#           portainer-staging           portainer-cluster   portainer-user-2    staging
```

## Step 6: Switch Between Contexts

```bash
# Switch to a specific Portainer context
kubectl config use-context portainer-production

# Confirm current context
kubectl config current-context

# Test access
kubectl get namespaces
kubectl get pods -n production

# Use a specific context for a single command (without switching)
kubectl get pods -n staging --context=portainer-staging
```

## Handling Kubeconfig Expiry

When the kubeconfig token expires, or if Portainer restarts, you may see this error:

```text
error: You must be logged in to the server (Unauthorized)
```

To resolve:

```bash
# Re-download fresh kubeconfig from Portainer API
TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"myuser","password":"mypassword"}' | jq -r '.jwt')

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/yaml" \
  "https://portainer.example.com/api/kubernetes/config?ids=1" \
  -o ~/.kube/portainer-kubeconfig.yaml

# Re-merge with your kubeconfig
KUBECONFIG=~/.kube/config:~/.kube/portainer-kubeconfig.yaml \
  kubectl config view --flatten > /tmp/merged.yaml && mv /tmp/merged.yaml ~/.kube/config

echo "Kubeconfig refreshed."
```

## Automating Kubeconfig Refresh

```bash
#!/bin/bash
# refresh-kubeconfig.sh - Run as a cron job to keep kubeconfig fresh

PORTAINER_URL="https://portainer.example.com"
PORTAINER_USER="myuser"
PORTAINER_PASS="mypassword"
ENDPOINT_ID=1

TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${PORTAINER_USER}\",\"password\":\"${PORTAINER_PASS}\"}" | jq -r '.jwt')

mkdir -p ~/.kube
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/yaml" \
  "${PORTAINER_URL}/api/kubernetes/config?ids=${ENDPOINT_ID}" \
  -o ~/.kube/portainer-kubeconfig.yaml

echo "Kubeconfig refreshed at $(date)"
```

```bash
# Add to crontab to refresh every 6 hours
# crontab -e
0 */6 * * * /home/user/refresh-kubeconfig.sh >> /var/log/kubeconfig-refresh.log 2>&1
```

## Conclusion

Downloading kubeconfig from Portainer gives developers convenient CLI access to Kubernetes clusters with appropriate access controls enforced by Portainer's RBAC system. Use the UI for one-time downloads and the API approach for automated, scheduled refreshes. Always set a kubeconfig expiry in Portainer to maintain a strong security posture.
