# How to Use Dapr Component Auth Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Authentication, Secret, Security

Description: Learn how to use Dapr component auth profiles to configure authentication methods like IAM, SAS tokens, and connection strings for your components.

---

## What Are Dapr Component Auth Profiles?

Auth profiles are structured groupings of metadata fields that correspond to a specific authentication method for a component. Rather than scattering auth config across arbitrary metadata keys, profiles give you a documented, validated contract for how your component authenticates.

## Auth Profile in a Redis Component

The simplest auth profile uses a password:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-state
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis.cache.windows.net:6380"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
    - name: enableTLS
      value: "true"
auth:
  secretStore: kubernetes
```

## Azure Entra ID (Managed Identity) Auth Profile

For Azure components, use managed identity to avoid storing credentials:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-servicebus-pubsub
  namespace: production
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
    - name: namespaceName
      value: "mycompany-events.servicebus.windows.net"
    - name: azureClientId
      value: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

The `azureClientId` activates the workload identity / managed identity profile - no secret needed.

## AWS IAM Auth Profile

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-sns-pubsub
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-credentials
        key: access-key-id
    - name: secretKey
      secretKeyRef:
        name: aws-credentials
        key: secret-access-key
auth:
  secretStore: kubernetes
```

Or use IRSA (IAM Roles for Service Accounts) by omitting the access key fields entirely and letting the SDK pick up the pod's IAM role.

## GCP Service Account Auth Profile

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
    - name: projectId
      value: "my-gcp-project"
    - name: privateKeyId
      secretKeyRef:
        name: gcp-sa-secret
        key: private_key_id
    - name: privateKey
      secretKeyRef:
        name: gcp-sa-secret
        key: private_key
    - name: clientEmail
      secretKeyRef:
        name: gcp-sa-secret
        key: client_email
auth:
  secretStore: kubernetes
```

## Creating Secrets for Auth Profiles

```bash
# AWS credentials
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG \
  -n production

# GCP service account (extract individual fields from the SA key JSON)
kubectl create secret generic gcp-sa-secret \
  --from-literal=private_key_id="$(jq -r .private_key_id sa-key.json)" \
  --from-literal=private_key="$(jq -r .private_key sa-key.json)" \
  --from-literal=client_email="$(jq -r .client_email sa-key.json)" \
  -n production
```

## Summary

Dapr auth profiles map component authentication requirements to Kubernetes secrets or cloud-native identity mechanisms. Using managed identity profiles where available eliminates long-lived credentials and reduces your secret rotation burden significantly.
