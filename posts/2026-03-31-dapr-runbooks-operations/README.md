# How to Create Dapr Runbooks for Operations Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Runbook, Operation, Incident, Kubernetes

Description: Create practical Dapr operations runbooks covering common failure scenarios, diagnostic commands, and step-by-step remediation procedures for on-call engineers.

---

Operations runbooks give on-call engineers a structured path through common Dapr failure scenarios. A good runbook reduces mean time to resolution (MTTR) by eliminating guesswork during incidents.

## Runbook Structure

Each Dapr runbook should follow this structure:

```text
## Alert: <Alert Name>
**Severity**: Critical / Warning
**Team**: Platform Engineering

### Symptoms
- What the user experiences
- What metrics are abnormal

### Diagnosis
- Commands to confirm the issue

### Remediation
- Step-by-step fix

### Escalation
- Who to contact if steps fail
```

## Runbook: DaprControlPlaneDown

**Symptoms**: Applications cannot communicate with each other; sidecar injection may fail for new pods.

**Diagnosis**:

```bash
# Check operator pod status
kubectl get pods -n dapr-system

# Check operator logs for errors
kubectl logs -n dapr-system -l app=dapr-operator --tail=50

# Verify CRDs are registered
kubectl get crds | grep dapr.io
```

**Remediation**:

```bash
# Restart operator if pods are crash-looping
kubectl rollout restart deployment/dapr-operator -n dapr-system

# If CRDs are missing, reinstall Dapr
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --reuse-values
```

## Runbook: DaprHighErrorRate

**Symptoms**: Services return errors; user-facing requests are failing.

**Diagnosis**:

```bash
# Identify which app_id has high error rate
kubectl exec -it prometheus-0 -n monitoring -- \
  promtool query instant \
  'topk(5, rate(dapr_runtime_service_invocation_req_sent_total{status_code!~"2.."}[5m]))'

# Check sidecar logs for the affected service
kubectl logs -l app=order-service -c daprd --tail=100
```

**Remediation**:

```bash
# Check if the target service is healthy
kubectl get pods -l app=payment-service

# Restart sidecar by rolling the deployment
kubectl rollout restart deployment/payment-service

# Verify resiliency policy is applied
kubectl get resiliency -A
```

## Runbook: Pub/Sub Messages Not Processing

**Diagnosis**:

```bash
# Check subscription configuration
kubectl get subscriptions -A

# Check dead-letter counts (Redis Streams)
kubectl exec redis-0 -- redis-cli XLEN "app-id||topic-name"

# View consumer group lag
kubectl exec redis-0 -- redis-cli XPENDING mystream mygroup - + 10
```

**Remediation**:

```bash
# Restart the consumer deployment
kubectl rollout restart deployment/message-processor

# If messages are stuck, reprocess from dead-letter
# (application-specific logic required)
```

## Runbook: Certificate Rotation Issues

**Diagnosis**:

```bash
# Check Sentry logs for cert issues
kubectl logs -n dapr-system -l app=dapr-sentry --tail=50 | grep -i cert

# Verify cert expiry
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

**Remediation**:

```bash
# Restart Sentry to trigger cert rotation
kubectl rollout restart deployment/dapr-sentry -n dapr-system

# Force sidecar refresh
kubectl rollout restart deployment/<your-app>
```

## Storing Runbooks

Store runbooks in a version-controlled wiki or documentation system with links embedded in alert annotations:

```yaml
annotations:
  summary: "Dapr control plane is down"
  runbook_url: "https://wiki.company.com/runbooks/dapr/control-plane-down"
```

## Summary

Dapr runbooks should cover control plane failures, high error rates, pub/sub processing issues, and certificate problems. Each runbook provides targeted diagnostic commands and remediation steps that on-call engineers can execute without deep Dapr expertise, reducing MTTR and improving incident response consistency.
