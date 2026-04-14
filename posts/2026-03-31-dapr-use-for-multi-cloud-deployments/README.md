# How to Use Dapr for Multi-Cloud Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Multi-Cloud, Portability, AWS, Azure

Description: Learn how Dapr's component portability enables you to deploy the same application across AWS, Azure, and GCP by swapping cloud-native component configurations without code changes.

---

Multi-cloud strategies reduce vendor lock-in and improve resilience. Dapr's component abstraction is purpose-built for this: the same application code runs on any cloud by changing only the component YAML files.

## Multi-Cloud Component Strategy

The application never imports cloud-specific SDKs. All cloud interactions go through Dapr building blocks:

```text
Your App Code
   uses: dapr.SaveState("statestore", ...)
         dapr.PublishEvent("pubsub", ...)
         dapr.GetSecret("secretstore", ...)

Cloud A (AWS):           Cloud B (Azure):        Cloud C (GCP):
state.aws.dynamodb       state.azure.cosmosdb    state.gcp.firestore
pubsub.aws.snssqs        pubsub.azure.servicebus.topics pubsub.gcp.pubsub
secretstores.aws.parameterstore secretstores.azure.keyvault secretstores.gcp.secretmanager
```

## AWS Component Configuration

```yaml
# AWS state store - DynamoDB
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
    - name: table
      value: "dapr-state"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-credentials
        key: accessKeyId
    - name: secretKey
      secretKeyRef:
        name: aws-credentials
        key: secretAccessKey
```

## Azure Component Configuration

```yaml
# Azure state store - CosmosDB
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
    - name: url
      value: "https://myaccount.documents.azure.com:443/"
    - name: database
      value: "statedb"
    - name: collection
      value: "state"
    - name: masterKey
      secretKeyRef:
        name: cosmosdb-secret
        key: masterKey
```

## GCP Component Configuration

```yaml
# GCP state store - Firestore
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.gcp.firestore
  version: v1
  metadata:
    - name: type
      value: "service_account"
    - name: project_id
      value: "my-gcp-project"
    - name: private_key
      secretKeyRef:
        name: gcp-credentials
        key: private_key
```

## GitOps with Cloud-Specific Overlays

Manage multi-cloud component configs with Kustomize:

```text
base/
  deployment.yaml
  subscription.yaml
overlays/
  aws/
    statestore.yaml
    pubsub.yaml
    secretstore.yaml
    kustomization.yaml
  azure/
    statestore.yaml
    pubsub.yaml
    secretstore.yaml
    kustomization.yaml
  gcp/
    statestore.yaml
    pubsub.yaml
    secretstore.yaml
    kustomization.yaml
```

Deploy to each cloud:

```bash
# AWS EKS
kubectl apply -k overlays/aws/ -n production --context=aws-eks

# Azure AKS
kubectl apply -k overlays/azure/ -n production --context=azure-aks

# GCP GKE
kubectl apply -k overlays/gcp/ -n production --context=gcp-gke
```

## Cross-Cloud Pub/Sub

For event-driven communication across clouds, use a cloud-neutral broker like Confluent Cloud (managed Kafka) as the shared backbone:

```yaml
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "pkc-xxxx.us-east-1.aws.confluent.cloud:9092"
    - name: authType
      value: "password"
    - name: saslUsername
      value: "<confluent-api-key>"
    - name: saslPassword
      secretKeyRef:
        name: kafka-credentials
        key: saslPassword
    - name: saslMechanism
      value: "PLAINTEXT"
```

Deploy this identical component YAML to all three clouds to enable cross-cloud pub/sub.

## Validating Portability

Run a portability test to verify your app behaves identically across clouds:

```bash
#!/bin/bash
for CLOUD in aws azure gcp; do
  echo "Testing on $CLOUD..."
  kubectl config use-context $CLOUD-cluster
  kubectl delete pod portability-test --ignore-not-found
  kubectl run portability-test \
    --image=myrepo/test-runner:latest \
    --env="TARGET_URL=http://order-service:8080" \
    --restart=Never
  kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/portability-test --timeout=60s
  kubectl logs portability-test
done
```

## Summary

Dapr enables true multi-cloud portability by routing all cloud interactions through building block APIs backed by cloud-specific component YAML files. Use Kustomize overlays to manage per-cloud component configurations, GitOps pipelines to deploy them, and a shared broker like Confluent Cloud for cross-cloud pub/sub. Application code never imports cloud-specific SDKs.
