# How to Use kubectl with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, kubectl, kubeconfig, CLI

Description: Learn how to configure and use kubectl with Rancher-managed Kubernetes clusters, including authentication, context management, and common workflows.

kubectl is the standard command-line tool for interacting with Kubernetes clusters. When your clusters are managed by Rancher, there are several ways to connect kubectl to them. This guide covers all the methods and practical workflows for using kubectl with Rancher.

## Method 1: Using the Rancher CLI as a kubectl Proxy

The simplest approach is using the Rancher CLI to proxy kubectl commands:

```bash
# Log in to Rancher

rancher login https://rancher.example.com --token ${RANCHER_TOKEN}

# Switch to the target project context
rancher context switch

# Run kubectl commands through Rancher
rancher kubectl get nodes
rancher kubectl get pods -A
rancher kubectl apply -f deployment.yaml
```

This method routes all requests through the Rancher server, so you do not need a direct network connection to the cluster API server.

## Method 2: Downloading kubeconfig from the Rancher UI

1. Log into Rancher and go to **Cluster Management**
2. Find the cluster you want to access and open the **⋮** menu at the end of the row
3. Click **Download KubeConfig**
4. Save the file to `~/.kube/config` or a custom location

Then use kubectl normally:

```bash
export KUBECONFIG=~/Downloads/my-cluster.yaml
kubectl get nodes
```

If your Rancher admins have disabled automatic token generation in downloaded kubeconfigs, the Rancher CLI must be installed and available in your `PATH` when you run `kubectl`.

## Method 3: Generating kubeconfig via the API

```bash
CLUSTER_ID="c-m-abc12345"

cat <<EOF | curl -sS -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "${RANCHER_URL}/apis/ext.cattle.io/v1/kubeconfigs" | jq -r '.status.value' > ~/.kube/rancher-cluster.yaml
{
  "apiVersion": "ext.cattle.io/v1",
  "kind": "Kubeconfig",
  "spec": {
    "clusters": ["${CLUSTER_ID}"],
    "currentContext": "${CLUSTER_ID}"
  }
}
EOF

export KUBECONFIG=~/.kube/rancher-cluster.yaml
kubectl get nodes
```

## Method 4: Direct API Server Access

If your cluster has an Authorized Cluster Endpoint (ACE) and you have network access to the cluster API server, you can bypass the Rancher server entirely:

1. Enable or configure the ACE for the cluster. On Rancher-launched RKE clusters it is enabled by default, while RKE2 and K3s clusters require ACE to be enabled manually.
2. Download a fresh kubeconfig with the ACE contexts included
3. Switch to the direct ACE context. If you configured an FQDN, Rancher creates a `<CLUSTER_NAME>-fqdn` context. Otherwise it creates `<CLUSTER_NAME>-<NODE_NAME>` contexts.

```bash
kubectl config get-contexts
kubectl config use-context my-cluster-fqdn
kubectl get nodes
```

This is useful when the Rancher server is down but the cluster is still running.

## Managing Multiple Cluster Contexts

When working with several Rancher-managed clusters, organize your kubeconfig files.

### Merge Multiple kubeconfigs

```bash
# Generate kubeconfigs for each cluster
for cluster_id in c-m-abc12345 c-m-def67890 c-m-ghi11111; do
  cat <<EOF | curl -sS -X POST \
    -H "Authorization: Bearer ${RANCHER_TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary @- \
    "${RANCHER_URL}/apis/ext.cattle.io/v1/kubeconfigs" | jq -r '.status.value' \
    > ~/.kube/rancher-${cluster_id}.yaml
{
  "apiVersion": "ext.cattle.io/v1",
  "kind": "Kubeconfig",
  "spec": {
    "clusters": ["${cluster_id}"],
    "currentContext": "${cluster_id}"
  }
}
EOF
done

# Merge all kubeconfigs
export KUBECONFIG=$(ls ~/.kube/rancher-*.yaml | tr '\n' ':')
kubectl config view --flatten > ~/.kube/config
```

### Switch Between Clusters

```bash
# List available contexts
kubectl config get-contexts

# Switch to a specific context
kubectl config use-context production

# Run a command against a specific context without switching
kubectl --context staging get pods
```

### Rename Contexts for Clarity

```bash
kubectl config rename-context <CURRENT_CONTEXT_NAME> production
kubectl config rename-context <ANOTHER_CONTEXT_NAME> staging
kubectl config rename-context <THIRD_CONTEXT_NAME> development
```

## Using kubectl with Rancher Projects

Rancher organizes namespaces into projects. While kubectl does not natively understand projects, you can work with project-associated namespaces:

```bash
# List all namespaces with their project annotations
kubectl get namespaces -o custom-columns=\
NAME:.metadata.name,\
PROJECT:.metadata.annotations.field\\.cattle\\.io/projectId,\
STATUS:.status.phase
```

To operate only on namespaces in a specific project:

```bash
# Get all namespaces in project p-xyz789
PROJECT="c-m-abc12345:p-xyz789"
kubectl get namespaces -o json | jq -r \
  '.items[] | select(.metadata.annotations["field.cattle.io/projectId"] == "'"${PROJECT}"'") | .metadata.name'
```

## Common kubectl Workflows with Rancher

### Deploying Applications

```bash
# Create a deployment
kubectl create deployment nginx --image=nginx:latest --replicas=3

# Expose as a service
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# Check the rollout status
kubectl rollout status deployment/nginx

# Scale the deployment
kubectl scale deployment nginx --replicas=5
```

### Debugging Pods

```bash
# Get pod logs
kubectl logs -f deployment/nginx

# Exec into a pod
kubectl exec -it $(kubectl get pod -l app=nginx -o jsonpath='{.items[0].metadata.name}') -- /bin/bash

# Describe a pod for events and conditions
kubectl describe pod $(kubectl get pod -l app=nginx -o jsonpath='{.items[0].metadata.name}')

# Check pod and node resource usage (requires Metrics Server)
kubectl top pods
kubectl top nodes
```

### Managing Secrets and ConfigMaps

```bash
# Create a secret
kubectl create secret generic db-creds \
  --from-literal=username=admin \
  --from-literal=password=s3cret

# Create a configmap from a file
kubectl create configmap app-config --from-file=config.yaml

# View a secret (base64 decoded)
kubectl get secret db-creds -o jsonpath='{.data.password}' | base64 -d
```

### Rolling Updates

```bash
# Update the image
kubectl set image deployment/nginx nginx=nginx:1.25

# Watch the rollout
kubectl rollout status deployment/nginx

# Roll back if something goes wrong
kubectl rollout undo deployment/nginx

# View rollout history
kubectl rollout history deployment/nginx
```

## Setting Up kubectl Aliases and Shortcuts

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Short aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgn='kubectl get nodes'
alias kgd='kubectl get deployments'
alias kga='kubectl get all'
alias kaf='kubectl apply -f'
alias kdel='kubectl delete'
alias klog='kubectl logs -f'

# Context switching
alias kctx='kubectl config use-context'
alias kns='kubectl config set-context --current --namespace'

# Get all resources in a namespace
alias kall='kubectl api-resources --verbs=list --namespaced -o name | xargs -n1 kubectl get --show-kind --ignore-not-found'
```

## Troubleshooting kubectl with Rancher

### "Unable to connect to the server"

Check if the kubeconfig is pointing to the Rancher server or the cluster directly:

```bash
kubectl config view --minify | grep server
```

If it points to the Rancher server, make sure Rancher is reachable. If it points to the cluster API server, make sure you have direct network access.

### "Unauthorized" Errors

Your kubeconfig token may have expired. Download a fresh kubeconfig from the UI or regenerate one through the API:

```bash
cat <<EOF | curl -sS -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @- \
  "${RANCHER_URL}/apis/ext.cattle.io/v1/kubeconfigs" | jq -r '.status.value' > ~/.kube/config
{
  "apiVersion": "ext.cattle.io/v1",
  "kind": "Kubeconfig",
  "spec": {
    "clusters": ["${CLUSTER_ID}"],
    "currentContext": "${CLUSTER_ID}"
  }
}
EOF
```

### Certificate Errors

If you see x509 certificate errors, add the CA certificate or skip verification:

```bash
# Add the CA certificate
kubectl --certificate-authority=/path/to/ca.crt get nodes

# Or in the kubeconfig, set insecure-skip-tls-verify
kubectl config set-cluster my-cluster --insecure-skip-tls-verify=true
```

### Slow kubectl Responses

If kubectl is slow, the requests may be routing through Rancher. Use the Authorized Cluster Endpoint for direct access, which eliminates the Rancher proxy hop.

## Summary

There are multiple ways to use kubectl with Rancher-managed clusters: through the Rancher CLI proxy, with downloaded kubeconfigs, via API-generated configs, or through direct API server access. For day-to-day work, use merged kubeconfig files with named contexts. For automation, generate kubeconfigs through the API. Set up aliases to speed up your workflow, and use the Authorized Cluster Endpoint when you need the fastest possible connection.
