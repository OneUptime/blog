# How to Handle Dapr Sentry Service Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Failure, Recovery, mTLS

Description: Handle Dapr Sentry service failures by understanding certificate grace periods, setting up HA deployments, and implementing recovery procedures to restore certificate issuance.

---

## Impact of Sentry Failures

When Dapr Sentry is unavailable, sidecars cannot obtain new workload certificates. Services with valid unexpired certificates continue to communicate normally. However, once certificates expire (default 24 hours), mTLS connections will fail across your entire cluster.

## Calculating Time to Certificate Expiry

Understand how long you have before certificates expire after Sentry goes down:

```bash
# Check current certificate expiry for a specific sidecar
kubectl exec -it <pod-name> -c daprd -- \
  sh -c "cat /var/run/secrets/dapr.io/tls/tls.crt | openssl x509 -enddate -noout"
```

If Sentry has been down for 2 hours and certificates expire in 24 hours, you have 22 hours to restore Sentry before services are impacted.

## Preventing Failures with HA Deployment

The best way to handle Sentry failures is to prevent them with HA:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_sentry.replicaCount=3 \
  --set global.ha.enabled=true \
  --reuse-values
```

Add a Pod Disruption Budget:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dapr-sentry-pdb
  namespace: dapr-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: dapr-sentry
```

## Detecting Sentry Failures

Set up monitoring to alert immediately when Sentry is down:

```yaml
groups:
  - name: sentry-failures
    rules:
      - alert: DaprSentryDown
        expr: count(up{job="dapr-sentry"} == 1) < 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "All Dapr Sentry instances are down"
          description: "Certificate issuance is unavailable. Workload certificates expire within 24 hours without renewal."
```

## Recovery Procedure

When Sentry fails, follow this recovery sequence:

```bash
# 1. Check pod status
kubectl get pods -n dapr-system -l app=dapr-sentry

# 2. Check events for failure reason
kubectl describe pods -n dapr-system -l app=dapr-sentry | grep -A 10 Events

# 3. Check logs from crashed pods
kubectl logs -n dapr-system -l app=dapr-sentry --previous

# 4. Restart Sentry deployment
kubectl rollout restart deployment/dapr-sentry -n dapr-system

# 5. Monitor recovery
kubectl rollout status deployment/dapr-sentry -n dapr-system
```

## Force Certificate Renewal After Recovery

After Sentry recovers, sidecars will renew certificates automatically. Force immediate renewal by restarting affected app pods:

```bash
# Restart all apps in a namespace to trigger cert renewal
kubectl rollout restart deployment -n production
```

## Testing Sentry Recovery

Simulate a failure in staging to test your recovery procedure:

```bash
# Scale Sentry to 0 replicas
kubectl scale deployment dapr-sentry -n dapr-system --replicas=0

# Wait and observe
sleep 30

# Restore
kubectl scale deployment dapr-sentry -n dapr-system --replicas=3
```

## Summary

Handle Dapr Sentry failures by deploying 3 replicas with HA, setting up immediate alerts for downtime, and following a structured recovery procedure. After recovery, verify sidecars renew certificates by checking sidecar logs. In large clusters, stage certificate renewals to avoid overwhelming a recovering Sentry service.
