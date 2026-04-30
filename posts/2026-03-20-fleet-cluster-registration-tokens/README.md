# How to Configure Fleet Cluster Registration Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Registration

Description: Learn how to create and manage Fleet ClusterRegistrationToken resources to securely onboard new clusters into your Fleet management plane.

## Introduction

Before Fleet can manage a cluster through the agent-initiated registration flow, that cluster must be registered with the Fleet manager. ClusterRegistrationTokens are the mechanism through which clusters authenticate in that flow. Each token causes Fleet to create a Secret containing `values.yaml` content that is passed to the downstream cluster's Helm install to deploy the Fleet agent and establish a connection.

If you register clusters through the Rancher UI, Rancher uses manager-initiated registration and you typically do not create `ClusterRegistrationToken` resources manually.

This guide covers creating registration tokens, managing their lifecycles, and following security best practices.

## Prerequisites

- Fleet manager installed and accessible
- Admin access to Fleet manager
- `kubectl` access to the Fleet workspace namespace
- Target clusters where you want to install Fleet agents

## Understanding ClusterRegistrationTokens

A ClusterRegistrationToken:
1. Is created in a specific Fleet namespace (workspace)
2. Has a configurable time-to-live (TTL)
3. Causes Fleet to create a Secret whose `values` field contains the agent installation values
4. Can be used by multiple clusters until it expires

When a cluster uses a token to register, Fleet either creates a `Cluster` resource in the corresponding namespace or associates the agent with a pre-created `Cluster` that matches the supplied `clientID`.

## Creating a ClusterRegistrationToken

### Basic Token with 24-Hour TTL

```yaml
# registration-token-default.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterRegistrationToken
metadata:
  name: default-token
  namespace: fleet-default
spec:
  # Token expires after 24 hours
  ttl: 24h
```

```bash
# Create the token
kubectl apply -f registration-token-default.yaml

# Check the token status and get the secret name
kubectl get clusterregistrationtoken default-token -n fleet-default -o yaml
```

### Non-Expiring Token for Edge/Bulk Registration

```yaml
# registration-token-permanent.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterRegistrationToken
metadata:
  name: edge-registration
  namespace: fleet-default
  labels:
    purpose: edge-cluster-registration
    managed-by: fleet-admin
spec:
  # Set TTL to 0 for a non-expiring token
  # Use with caution - rotate periodically
  ttl: 0s
```

### Short-Lived Token for One-Time Registration

```yaml
# registration-token-short.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterRegistrationToken
metadata:
  name: onetime-registration
  namespace: fleet-default
spec:
  # 1 hour - use immediately and discard
  ttl: 1h
```

## Retrieving the Registration Values

After creating a token, wait for Fleet to create the generated Secret:

```bash
# Wait until the registration Secret exists
while ! kubectl get secret default-token -n fleet-default >/dev/null 2>&1; do
  sleep 5
done

# Get the Secret name recorded on the token status
kubectl get clusterregistrationtoken default-token \
  -n fleet-default \
  -o jsonpath='{.status.secretName}{"\n"}'
```

### Getting the Helm Values for Agent Installation

```bash
# Write the generated values.yaml locally
kubectl get secret \
  $(kubectl get clusterregistrationtoken default-token -n fleet-default \
    -o jsonpath='{.status.secretName}') \
  -n fleet-default \
  -o jsonpath='{.data.values}' | base64 --decode > values.yaml
```

## Installing Fleet Agent Using the Token

### Using Helm on the Downstream Cluster

```bash
# Step 1: Switch kubectl and Helm context to the downstream cluster
kubectl config use-context my-downstream-cluster

# Step 2: Add the Fleet Helm repo
helm repo add fleet https://rancher.github.io/fleet-helm-charts/
helm repo update

# Step 3: Install Fleet agent using the generated values.yaml
helm install fleet-agent fleet/fleet-agent \
  --namespace cattle-fleet-system \
  --create-namespace \
  --wait \
  --values values.yaml
```

### Using Rancher's Import Command

The `kubectl apply -f https://<rancher>/v3/import/...` command is Rancher's manager-initiated registration flow. It is separate from Fleet `ClusterRegistrationToken` resources, which are used for agent-initiated registration with the `values.yaml` and Helm workflow shown above.

## Managing Token Lifecycle

### Listing All Registration Tokens

```bash
# List all tokens across all namespaces
kubectl get clusterregistrationtokens -A

# Get token expiration info
kubectl get clusterregistrationtokens -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: ttl={.spec.ttl}, expires={.status.expires}{"\n"}{end}'
```

### Rotating Tokens

```bash
# Delete the old token
kubectl delete clusterregistrationtoken old-token -n fleet-default

# Create a new token with a new name
cat <<EOF | kubectl apply -f -
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterRegistrationToken
metadata:
  name: edge-registration-v2
  namespace: fleet-default
spec:
  ttl: 0s
EOF

# Update edge clusters to use the new token
# (Existing registered clusters don't need to re-register)
```

## Creating Workspace-Specific Tokens

Use separate tokens per workspace for isolation:

```bash
# Create tokens for each workspace
for workspace in fleet-team-alpha fleet-team-beta fleet-production; do
  cat <<EOF | kubectl apply -f -
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterRegistrationToken
metadata:
  name: ${workspace}-token
  namespace: ${workspace}
spec:
  ttl: 0s
EOF
  echo "Created token for workspace: ${workspace}"
done
```

## Verifying Cluster Registration

After a cluster uses a token to register:

```bash
# Check that the cluster appears in Fleet
kubectl get clusters.fleet.cattle.io -n fleet-default

# Verify that registered agents are checking in
kubectl get clusters.fleet.cattle.io \
  -n fleet-default \
  -o jsonpath='{range .items[*]}{.metadata.name}: lastSeen={.status.agent.lastSeen}{"\n"}{end}'
```

## Security Best Practices

1. **Use short-lived tokens** for one-time cluster registrations
2. **Use non-expiring tokens** only for automated/edge deployments with proper monitoring
3. **Rotate tokens regularly** even for edge deployments
4. **Store tokens in a secrets manager** (HashiCorp Vault, AWS Secrets Manager)
5. **Monitor token usage** by watching for new Cluster resource creation
6. **Use workspace-specific tokens** to prevent cross-workspace registrations

```bash
# Monitor for new cluster registrations
kubectl get clusters.fleet.cattle.io -n fleet-default -w
```

## Conclusion

ClusterRegistrationTokens are the secure gateway for onboarding Kubernetes clusters into Fleet through the agent-initiated registration flow. By choosing appropriate TTLs for your use case - short-lived for one-time registrations and longer-lived for automated edge deployments - you balance security with operational convenience. Regular token rotation and workspace-level token isolation ensure that your Fleet management plane remains secure even as you scale to hundreds or thousands of managed clusters.
