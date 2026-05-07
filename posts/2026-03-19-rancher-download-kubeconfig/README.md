# How to Download kubeconfig from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, kubeconfig, kubectl, CLI

Description: Step-by-step guide to downloading and managing kubeconfig files from Rancher for accessing your Kubernetes clusters.

A kubeconfig file is your credential and connection configuration for accessing a Kubernetes cluster. Rancher generates kubeconfig files that include cluster endpoints and, by default, authentication tokens. This guide covers every method for downloading kubeconfig files from Rancher and managing them effectively.

## Method 1: Download from the Rancher UI

### Step 1: Navigate to the Cluster

Log into your Rancher instance, open **☰ > Cluster Management**, and find the cluster you want to access.

### Step 2: Open the Cluster Dashboard

Open the cluster's kebab menu (three dots), then select **Download KubeConfig** or **Copy KubeConfig to Clipboard**.

### Step 3: Save the Configuration

Paste the copied content into a file:

```bash
# Create the .kube directory if it doesn't exist

mkdir -p ~/.kube

# Paste the kubeconfig content (or save from the UI download)
# Save as the default config or a named file
vim ~/.kube/my-cluster.yaml
```

### Step 4: Set the KUBECONFIG Environment Variable

```bash
export KUBECONFIG=~/.kube/my-cluster.yaml
kubectl get nodes
```

## Method 2: Download via the Rancher API

This legacy v3 API method works well for automation and scripting.

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"
export CLUSTER_ID="c-m-abc12345"

mkdir -p ~/.kube

curl -s -k -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters/${CLUSTER_ID}?action=generateKubeconfig" | jq -r '.config' > ~/.kube/my-cluster.yaml

echo "Kubeconfig saved to ~/.kube/my-cluster.yaml"
```

Verify it works:

```bash
export KUBECONFIG=~/.kube/my-cluster.yaml
kubectl cluster-info
```

## Method 3: Download via the Rancher CLI

```bash
mkdir -p ~/.kube

rancher login https://rancher.example.com --token ${RANCHER_TOKEN}

# List clusters to find the name
rancher clusters ls

# Download kubeconfig for a specific cluster
rancher clusters kubeconfig production > ~/.kube/production.yaml
```

## Understanding the kubeconfig Structure

A Rancher-generated kubeconfig looks like this:

```yaml
apiVersion: v1
kind: Config
clusters:
- name: my-cluster
  cluster:
    server: https://rancher.example.com/k8s/clusters/c-m-abc12345
    certificate-authority-data: LS0tLS1...
contexts:
- name: my-cluster
  context:
    cluster: my-cluster
    user: user-46tmn
current-context: my-cluster
users:
- name: user-46tmn
  user:
    token: token-xxxxx:yyyyyyyy
```

Key points:

- The **server** URL routes through the Rancher proxy by default
- If kubeconfig token generation is enabled, the **token** is a Rancher-issued kubeconfig token (different from your API key)
- The **certificate-authority-data** contains the CA data for the selected endpoint
- If admins set `kubeconfig-generate-token=false`, Rancher generates a kubeconfig that uses the Rancher CLI to fetch a short-lived token instead of embedding one

## Downloading kubeconfig with Direct Endpoint

If you have an RKE2 or K3s cluster with the Authorized Cluster Endpoint (ACE) enabled, Rancher adds extra contexts for direct access to the cluster API server:

```yaml
contexts:
- name: my-cluster
  context:
    cluster: my-cluster
    user: user-46tmn
- name: my-cluster-fqdn
  context:
    cluster: my-cluster-fqdn
    user: user-46tmn
```

If no FQDN is configured, Rancher creates direct-access contexts named `<CLUSTER_NAME>-<NODE_NAME>` instead.

You can choose which endpoint to use by switching contexts:

```bash
kubectl config use-context my-cluster      # Through Rancher proxy
kubectl config use-context my-cluster-fqdn # Direct access via ACE
```

## Downloading kubeconfig for All Clusters

Automate downloading kubeconfig for every cluster:

```bash
#!/bin/bash

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

mkdir -p ~/.kube/rancher

# Get all cluster IDs and names
clusters=$(curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" | jq -r '.data[] | "\(.id)|\(.name)"')

while IFS='|' read -r id name; do
  echo "Downloading kubeconfig for ${name} (${id})..."
  curl -s -k -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusters/${id}?action=generateKubeconfig" | \
    jq -r '.config' > ~/.kube/rancher/${name}.yaml
done <<< "$clusters"

echo "All kubeconfigs saved to ~/.kube/rancher/"
ls -la ~/.kube/rancher/
```

## Merging Multiple kubeconfig Files

### Temporary Merge with KUBECONFIG Variable

```bash
export KUBECONFIG=~/.kube/rancher/production.yaml:~/.kube/rancher/staging.yaml:~/.kube/rancher/dev.yaml

# Now kubectl can see all clusters
kubectl config get-contexts
```

### Permanent Merge into a Single File

```bash
# Back up existing config
cp ~/.kube/config ~/.kube/config.backup

# Merge all rancher kubeconfigs
export KUBECONFIG=$(find ~/.kube/rancher -name "*.yaml" | tr '\n' ':')
kubectl config view --flatten > ~/.kube/config.merged

# Replace the default config
mv ~/.kube/config.merged ~/.kube/config
unset KUBECONFIG

# Verify
kubectl config get-contexts
```

### Rename Merged Contexts

After merging, rename contexts for clarity:

```bash
kubectl config rename-context my-cluster production
kubectl config rename-context staging-cluster staging
kubectl config rename-context development-cluster development

kubectl config get-contexts
```

## Automating kubeconfig Refresh

Rancher kubeconfig tokens expire after a configurable period. Set up automatic refresh:

```bash
#!/bin/bash
# refresh-kubeconfigs.sh

RANCHER_URL="https://rancher.example.com"
RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

mkdir -p ~/.kube/rancher

clusters=$(curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/clusters" | jq -r '.data[] | "\(.id)|\(.name)"')

while IFS='|' read -r id name; do
  curl -s -k -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    "${RANCHER_URL}/v3/clusters/${id}?action=generateKubeconfig" | \
    jq -r '.config' > ~/.kube/rancher/${name}.yaml
done <<< "$clusters"

# Rebuild merged config
export KUBECONFIG=$(find ~/.kube/rancher -name "*.yaml" | tr '\n' ':')
kubectl config view --flatten > ~/.kube/config

echo "$(date): Kubeconfigs refreshed" >> "${HOME}/.kube/kubeconfig-refresh.log"
```

Add a cron job to run daily:

```bash
0 6 * * * /opt/scripts/refresh-kubeconfigs.sh
```

## Security Considerations

### Token Expiration

Rancher kubeconfig tokens have a default TTL set in the Rancher settings. Check your setting:

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/settings/kubeconfig-default-token-ttl-minutes" | jq '.value'
```

### File Permissions

Always restrict kubeconfig file permissions:

```bash
chmod 600 ~/.kube/config
chmod 600 ~/.kube/rancher/*.yaml
```

### Avoid Committing kubeconfig to Git

Add kubeconfig patterns to your `.gitignore`:

```plaintext
**/kubeconfig*
**/*.kubeconfig
.kube/
```

### Revoking kubeconfig Tokens

If a kubeconfig is compromised, revoke the associated token:

```bash
# For a token-based kubeconfig, extract the Rancher token ID
TOKEN_ID=$(kubectl config view --raw --minify -o jsonpath='{.users[0].user.token}' | cut -d: -f1)

# Delete the specific token
curl -s -k -X DELETE \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v3/tokens/${TOKEN_ID}"
```

## Troubleshooting

### "Unable to connect to the server"

Verify the server URL in your kubeconfig:

```bash
kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}'
```

Test connectivity:

```bash
kubectl get --raw='/readyz'
```

### "Unauthorized" After Token Expiry

Regenerate the kubeconfig using any of the methods described above.

### "x509: certificate signed by unknown authority"

Either add the CA certificate to your kubeconfig or skip verification:

```bash
kubectl config set-cluster my-cluster --insecure-skip-tls-verify=true
```

## Summary

Downloading kubeconfig from Rancher can be done through the UI, the API, or the CLI. For production workflows, automate kubeconfig generation and refresh through Rancher APIs. Merge multiple kubeconfigs into a single file for easy context switching, set proper file permissions, and configure automatic token refresh to avoid authentication failures.
