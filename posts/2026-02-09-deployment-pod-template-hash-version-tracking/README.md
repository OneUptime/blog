# How to Use Deployment Pod Template Hash for Version Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Versioning

Description: Learn how to use Kubernetes pod template hash for precise version tracking, understanding deployment revisions, and debugging rollout issues by identifying exact pod configurations.

---

You have multiple pods running and need to know exactly which configuration each one uses. Image tags tell part of the story, but environment variables, volumes, and other configuration also matter. The pod template hash gives you a unique identifier for the exact configuration.

## Understanding Pod Template Hash

Kubernetes generates a hash of the pod template spec and adds it as a label to pods and ReplicaSets. This hash uniquely identifies the exact configuration:

```bash
# View pod labels
kubectl get pods --show-labels

# Output shows pod-template-hash
NAME                          READY   STATUS    AGE   LABELS
api-server-7d8f9c5b4d-abc123  1/1     Running   10m   app=api-server,pod-template-hash=7d8f9c5b4d
api-server-7d8f9c5b4d-def456  1/1     Running   10m   app=api-server,pod-template-hash=7d8f9c5b4d
```

The `pod-template-hash=7d8f9c5b4d` label means these pods use identical configurations.

## How the Hash is Generated

Kubernetes hashes the entire pod template spec:

```yaml
template:
  metadata:
    labels:
      app: api-server
  spec:
    containers:
    - name: api
      image: myregistry.io/api-server:v2.0.0
      env:
      - name: LOG_LEVEL
        value: info
    resources:
      limits:
        memory: "512Mi"
```

Any change to this template generates a different hash:
- Image change -> different hash
- Environment variable change -> different hash
- Resource limit change -> different hash
- Volume mount change -> different hash

## Finding Pods by Template Hash

Query pods by their template hash:

```bash
# Get all pods with specific hash
kubectl get pods -l pod-template-hash=7d8f9c5b4d

# Count pods per hash
kubectl get pods -o json | \
  jq '.items | group_by(.metadata.labels["pod-template-hash"]) | .[] | {hash: .[0].metadata.labels["pod-template-hash"], count: length}'
```

Output:

```json
{
  "hash": "7d8f9c5b4d",
  "count": 3
}
{
  "hash": "9f6e8d3c2a",
  "count": 2
}
```

This shows you have two different configurations running.

## Mapping Hash to Configuration

Find the ReplicaSet for a given hash to see its configuration:

```bash
# Find ReplicaSet by hash
kubectl get replicaset -l pod-template-hash=7d8f9c5b4d

# Get full configuration
kubectl get replicaset api-server-7d8f9c5b4d -o yaml
```

The ReplicaSet name includes the hash, making it easy to correlate.

## Tracking Rollout Progress

Monitor rollout progress by watching pod template hashes:

```bash
#!/bin/bash
# track-rollout.sh

DEPLOYMENT=$1

echo "Tracking rollout for $DEPLOYMENT"
echo "Current pod template hashes:"

while true; do
  kubectl get pods -l app=$DEPLOYMENT -o json | \
    jq -r '.items | group_by(.metadata.labels["pod-template-hash"]) | .[] | "\(.length) pods with hash \(.[0].metadata.labels["pod-template-hash"])"'

  sleep 5
  echo "---"
done
```

Output during rollout:

```
3 pods with hash 7d8f9c5b4d
2 pods with hash 9f6e8d3c2a
---
2 pods with hash 7d8f9c5b4d
3 pods with hash 9f6e8d3c2a
---
1 pods with hash 7d8f9c5b4d
4 pods with hash 9f6e8d3c2a
---
5 pods with hash 9f6e8d3c2a
```

## Debugging Version Mismatches

Identify pods running unexpected configurations:

```bash
# Get current deployment's template hash
CURRENT_HASH=$(kubectl get deployment api-server -o jsonpath='{.spec.template.metadata.labels.pod-template-hash}')

# Find pods not matching current hash
kubectl get pods -l app=api-server -o json | \
  jq -r --arg hash "$CURRENT_HASH" \
  '.items[] | select(.metadata.labels["pod-template-hash"] != $hash) | .metadata.name'
```

This finds pods that haven't updated to the latest configuration.

## Version Tracking in Metrics

Export pod template hash as a metric label:

```yaml
# ServiceMonitor with pod template hash
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-server
spec:
  selector:
    matchLabels:
      app: api-server
  endpoints:
  - port: metrics
    relabelings:
    # Add pod template hash as label
    - sourceLabels: [__meta_kubernetes_pod_label_pod_template_hash]
      targetLabel: pod_template_hash
    - sourceLabels: [__meta_kubernetes_pod_label_app]
      targetLabel: app
```

Query metrics by hash:

```promql
# Request rate by pod template hash
sum(rate(http_requests_total[5m])) by (pod_template_hash)

# Compare error rates between hashes
rate(http_requests_total{status=~"5.."}[5m])
  /
rate(http_requests_total[5m])
by (pod_template_hash)
```

## Automated Rollback Based on Hash

Roll back to a specific configuration by its hash:

```bash
#!/bin/bash
# rollback-to-hash.sh

DEPLOYMENT=$1
TARGET_HASH=$2

# Find ReplicaSet with target hash
REPLICASET=$(kubectl get replicaset -l app=$DEPLOYMENT,pod-template-hash=$TARGET_HASH -o jsonpath='{.items[0].metadata.name}')

if [ -z "$REPLICASET" ]; then
  echo "No ReplicaSet found with hash $TARGET_HASH"
  exit 1
fi

echo "Rolling back to ReplicaSet $REPLICASET (hash: $TARGET_HASH)"

# Get revision number for this ReplicaSet
REVISION=$(kubectl get replicaset $REPLICASET -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')

echo "This corresponds to revision $REVISION"

# Rollback to that revision
kubectl rollout undo deployment/$DEPLOYMENT --to-revision=$REVISION

echo "Rollback initiated"
```

## Hash in CI/CD Pipelines

Store and compare hashes in deployment pipelines:

```yaml
# GitLab CI example
deploy:
  stage: deploy
  script:
    # Deploy
    - kubectl apply -f deployment.yaml

    # Get new hash
    - NEW_HASH=$(kubectl get deployment api-server -o jsonpath='{.spec.template.metadata.labels.pod-template-hash}')

    # Store hash
    - echo $NEW_HASH > deployment-hash.txt

    # Verify rollout
    - kubectl rollout status deployment/api-server

    # Verify all pods have new hash
    - |
      RUNNING_HASHES=$(kubectl get pods -l app=api-server -o json | \
        jq -r '[.items[].metadata.labels["pod-template-hash"]] | unique | .[]')

      if [ "$RUNNING_HASHES" != "$NEW_HASH" ]; then
        echo "Not all pods updated to new hash!"
        exit 1
      fi

  artifacts:
    paths:
      - deployment-hash.txt
```

## Comparing Configurations

Compare two configurations by their hashes:

```bash
#!/bin/bash
# compare-hashes.sh

HASH1=$1
HASH2=$2

echo "Configuration for hash $HASH1:"
kubectl get replicaset -l pod-template-hash=$HASH1 -o yaml | \
  yq eval '.items[0].spec.template' -

echo ""
echo "Configuration for hash $HASH2:"
kubectl get replicaset -l pod-template-hash=$HASH2 -o yaml | \
  yq eval '.items[0].spec.template' -

echo ""
echo "Diff:"
diff \
  <(kubectl get replicaset -l pod-template-hash=$HASH1 -o yaml | yq eval '.items[0].spec.template' -) \
  <(kubectl get replicaset -l pod-template-hash=$HASH2 -o yaml | yq eval '.items[0].spec.template' -)
```

## Hash-Based Canary Analysis

Analyze metrics for specific hash during canary:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: hash-based-analysis
spec:
  args:
  - name: canary-hash
  - name: stable-hash
  metrics:
  - name: canary-success-rate
    successCondition: result >= 0.95
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(
            http_requests_total{
              pod_template_hash="{{ args.canary-hash }}",
              status!~"5.."
            }[5m]
          ))
          /
          sum(rate(
            http_requests_total{
              pod_template_hash="{{ args.canary-hash }}"
            }[5m]
          ))

  - name: canary-vs-stable-latency
    successCondition: result <= 1.2  # Canary latency no more than 20% higher
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket{
              pod_template_hash="{{ args.canary-hash }}"
            }[5m])
          )
          /
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket{
              pod_template_hash="{{ args.stable-hash }}"
            }[5m])
          )
```

## Labeling Pods with Custom Version Info

Add custom version labels in addition to template hash:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
        version: v2.0.0
        git-commit: abc123def
        build-number: "456"
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
```

Now you have both the template hash (automatic) and custom version labels.

## Finding Configuration for Running Pod

Given a pod, find its exact configuration:

```bash
# Get pod's template hash
POD_HASH=$(kubectl get pod api-server-7d8f9c5b4d-abc123 \
  -o jsonpath='{.metadata.labels.pod-template-hash}')

# Find corresponding ReplicaSet
kubectl get replicaset -l pod-template-hash=$POD_HASH -o yaml
```

## Best Practices

**Use template hash for debugging**. When investigating issues, check if all pods have the same hash.

**Monitor hash distribution**. Alert if multiple hashes persist longer than expected during rollout.

**Store hash in deployment metadata**. Keep a record of which hash corresponds to which release.

**Include hash in logs**. Add pod template hash to application logs for easier correlation.

**Don't rely on hash alone**. Use semantic versioning for human-readable tracking, template hash for exact configuration identification.

**Check hash after deployments**. Verify all pods updated to the new hash.

## Conclusion

Pod template hash provides a precise, automated way to track exact pod configurations. Unlike image tags or version labels that you control, the template hash is automatically generated by Kubernetes and uniquely identifies the complete pod specification.

Use it for debugging rollouts, verifying deployments, analyzing metrics per configuration, and ensuring consistency across your pods. Combined with semantic versioning and custom labels, pod template hash gives you complete visibility into what's actually running in your cluster.
