# How to Configure Chaos Mesh IO Chaos Experiments for Kubernetes Storage Failure Simulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Chaos Mesh, Storage, IO Testing, Resilience

Description: Learn how to use Chaos Mesh IOChaos to inject storage failures including IO delays, errors, and corruption to test application resilience to storage issues.

---

Applications often assume reliable storage, but disk failures, slow IO, and data corruption happen in production. Chaos Mesh IOChaos simulates storage problems to test application behavior when persistence layers fail or degrade.

In this guide, we'll configure IOChaos experiments that inject storage delays, errors, and failures to validate application resilience to storage issues on Kubernetes.

## Creating IO Delay Experiment

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-delay-example
  namespace: default
spec:
  action: latency
  mode: one
  selector:
    labelSelectors:
      app: database
  volumePath: /var/lib/postgresql
  path: "/var/lib/postgresql/**/*"
  delay: "1s"
  percent: 50
  duration: "5m"
```

## Simulating IO Errors

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-error-example
  namespace: default
spec:
  action: fault
  mode: one
  selector:
    labelSelectors:
      app: database
  volumePath: /var/lib/postgresql
  path: "/var/lib/postgresql/data/**/*"
  errno: 5  # EIO - Input/output error
  percent: 10
  duration: "3m"
```

## Testing Read/Write Failures

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-mixed-chaos
  namespace: default
spec:
  action: mixed
  mode: all
  selector:
    labelSelectors:
      app: statefulapp
  volumePath: /data
  path: "/data/**/*"
  delay: "500ms"
  errno: 28  # ENOSPC - No space left on device
  percent: 20
  duration: "10m"
```

## Monitoring Storage Impact

```bash
# Watch pod logs during IO chaos
kubectl logs -f -l app=database

# Check IO metrics
kubectl exec database-pod -- iostat -x 1

# Verify application behavior
kubectl exec app-pod -- cat /data/test-file
```

## Conclusion

IOChaos experiments validate application resilience to storage failures by injecting realistic disk problems. Testing storage layer resilience ensures applications handle IO errors gracefully, maintain data integrity, and fail safely when persistence degrades.

Regular storage chaos testing identifies assumptions about storage reliability and validates that applications implement proper error handling for IO failures.
