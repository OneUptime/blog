# How to Implement Rollback Strategies for Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rollback, Deployment, Kubernetes, DevOps

Description: Learn how to implement rollback strategies for Dapr applications using kubectl rollout undo, Helm rollback, and automated rollback triggers based on error rate metrics.

---

Rollback strategies ensure that a bad deployment can be quickly reverted to a known-good state. For Dapr applications, rollbacks need to consider both the application container and the Dapr component configuration, which may need to be rolled back independently.

## Quick Rollback with kubectl

```bash
# View rollout history
kubectl rollout history deployment/order-service -n production

# Rollback to the previous version immediately
kubectl rollout undo deployment/order-service -n production

# Rollback to a specific revision
kubectl rollout undo deployment/order-service -n production --to-revision=3

# Confirm rollback completed
kubectl rollout status deployment/order-service -n production
kubectl get pods -n production -l app=order-service
```

## Rollback with Helm

```bash
# View Helm release history
helm history order-service -n production

# Rollback to the previous release
helm rollback order-service -n production

# Rollback to a specific release number
helm rollback order-service 4 -n production --wait

# Verify rollback
helm status order-service -n production
```

## Automated Rollback Based on Error Rate

Implement an automated rollback controller that monitors metrics:

```python
import time
import subprocess
import requests

PROMETHEUS_URL = "http://prometheus:9090"
DEPLOYMENT = "order-service"
NAMESPACE = "production"
ERROR_RATE_THRESHOLD = 0.05  # 5% error rate triggers rollback
OBSERVATION_WINDOW = 120     # seconds to observe after deployment

def get_error_rate(app_id: str, window: str = "2m") -> float:
    query = f'sum(rate(dapr_http_server_request_count{{app_id="{app_id}",status=~"5.."}}[{window}])) / sum(rate(dapr_http_server_request_count{{app_id="{app_id}"}}[{window}]))'
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    result = resp.json()["data"]["result"]
    if not result:
        return 0.0
    return float(result[0]["value"][1])

def rollback_deployment(deployment: str, namespace: str):
    print(f"ERROR RATE EXCEEDED THRESHOLD - Rolling back {deployment}")
    subprocess.run([
        "kubectl", "rollout", "undo", f"deployment/{deployment}",
        "-n", namespace
    ], check=True)

def monitor_and_rollback():
    print(f"Monitoring {DEPLOYMENT} for {OBSERVATION_WINDOW}s...")
    start_time = time.time()

    while time.time() - start_time < OBSERVATION_WINDOW:
        error_rate = get_error_rate(DEPLOYMENT)
        print(f"Error rate: {error_rate:.2%}")

        if error_rate > ERROR_RATE_THRESHOLD:
            rollback_deployment(DEPLOYMENT, NAMESPACE)
            return False

        time.sleep(15)

    print("Deployment looks healthy - rollback not triggered")
    return True

if __name__ == "__main__":
    success = monitor_and_rollback()
    exit(0 if success else 1)
```

## Rollback Dapr Components

Component rollbacks require restoring the previous version from Git:

```bash
# Find the last known good component version in Git
git log --oneline -- k8s/components/pubsub.yaml

# Restore the previous component version
git show HEAD~1:k8s/components/pubsub.yaml | kubectl apply -f -

# Or use GitOps - revert the commit in Git
git revert HEAD --no-edit
git push origin main
# ArgoCD/Flux will automatically sync the revert
```

## Pre-deployment Checkpoints

Before deploying, capture the current state for easy rollback:

```bash
#!/bin/bash
# capture-state.sh
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Save current deployment image
kubectl get deployment/order-service -n production \
  -o jsonpath='{.spec.template.spec.containers[0].image}' > "$BACKUP_DIR/image.txt"

# Save current Dapr components
kubectl get components -n production -o yaml > "$BACKUP_DIR/components.yaml"

echo "State captured at $BACKUP_DIR"
echo "To rollback: kubectl apply -f $BACKUP_DIR/components.yaml && kubectl set image deployment/order-service order-service=$(cat $BACKUP_DIR/image.txt) -n production"
```

## Summary

Rollback strategies for Dapr applications combine kubectl's built-in rollout undo, Helm rollback for chart-managed deployments, and automated rollback triggered by error rate metrics from Prometheus. Always capture the current state before major deployments and keep Dapr component changes in Git so they can be reverted alongside application rollbacks.
