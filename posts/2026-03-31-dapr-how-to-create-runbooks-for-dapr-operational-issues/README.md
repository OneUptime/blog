# How to Create Runbooks for Dapr Operational Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Operation, Runbook, Reliability, SRE

Description: Build operational runbooks for common Dapr issues including sidecar injection failures, state store connectivity, and pub/sub lag.

---

## Overview

Runbooks are step-by-step procedures for diagnosing and resolving operational issues. For Dapr-based systems, runbooks should cover sidecar failures, component connectivity problems, certificate expiry, and pub/sub lag. This guide provides runbook templates for the most common Dapr operational scenarios.

## Runbook Format

Each runbook should include:

```text
# Runbook: [Issue Name]
Severity: [P1/P2/P3]
Owner: [Team]
Last Updated: [Date]

## Symptoms
## Prerequisites
## Diagnosis Steps
## Resolution Steps
## Escalation
## Post-Incident
```

## Runbook 1 - Sidecar Injection Failure

**Symptoms:** Pods are running but Dapr sidecar container is missing.

**Diagnosis:**

```bash
# Check if Dapr annotations are present on the pod
kubectl get pod my-app-pod -o jsonpath='{.metadata.annotations}' | jq .

# Check admission webhook
kubectl get mutatingwebhookconfiguration | grep dapr

# Check sidecar injector logs
kubectl logs -n dapr-system -l app=dapr-sidecar-injector --tail=50

# Check if namespace has Dapr enabled label
kubectl get namespace default --show-labels
```

**Resolution:**

```bash
# If webhook is not registered, reinstall Dapr
dapr uninstall -k
dapr init -k

# If namespace label is missing
kubectl label namespace default dapr.io/enabled=true

# If pod annotations are wrong, patch the deployment
kubectl patch deployment my-app \
  --patch '{"spec":{"template":{"metadata":{"annotations":{"dapr.io/enabled":"true","dapr.io/app-id":"my-app","dapr.io/app-port":"8080"}}}}}'

# Force pod restart
kubectl rollout restart deployment/my-app
```

## Runbook 2 - State Store Connectivity Failure

**Symptoms:** App returns 500 errors on state operations. Sidecar logs show "connection refused" to state store.

**Diagnosis:**

```bash
# Check state store component
kubectl get component statestore -o yaml

# Test connectivity from within the cluster
kubectl run debug-pod --rm -it --image=redis:7-alpine -- \
  redis-cli -h redis-master ping

# Check Dapr sidecar logs
kubectl logs -l app=my-app -c daprd | grep -i "state\|error\|redis"

# Check state store pod health
kubectl get pods -l app=redis
kubectl describe pod -l app=redis
```

**Resolution:**

```bash
# If Redis pod is down, restart it
kubectl rollout restart statefulset/redis-master

# If credentials are wrong, recreate secret
kubectl delete secret redis-secret
kubectl create secret generic redis-secret \
  --from-literal=password=newpassword

# Trigger component reload by restarting the app
kubectl rollout restart deployment/my-app

# Verify state API is accessible (exec into the app container, not daprd which is distroless)
kubectl exec -it my-app-pod -c my-app -- \
  wget -qO- http://localhost:3500/v1.0/healthz
```

## Runbook 3 - Pub/Sub Message Lag

**Symptoms:** Messages are delayed. Consumer lag growing. Alert: `dapr_pubsub_incoming_messages_total` not increasing.

**Diagnosis:**

```bash
# Check subscriber pod status
kubectl get pods -l app=subscriber

# Check subscriber logs for errors
kubectl logs -l app=subscriber -c daprd | \
  grep -i "subscribe\|error\|retry"

# For Redis Streams - check consumer group lag
redis-cli XPENDING pubsub-topic consumer-group - + 100

# Check Dapr sidecar metrics (each sidecar exposes metrics on port 9090)
kubectl port-forward deployment/subscriber 9090:9090
# Query: curl http://localhost:9090/metrics | grep dapr_pubsub_incoming_messages_total

# Check if subscriber is crashing
kubectl describe pod -l app=subscriber | grep -A 10 "Last State"
```

**Resolution:**

```bash
# If subscriber is OOMKilled, increase memory limits
kubectl patch deployment subscriber \
  --patch '{"spec":{"template":{"spec":{"containers":[{"name":"subscriber","resources":{"limits":{"memory":"512Mi"}}}]}}}}'

# If pending messages are stuck, reset consumer group
redis-cli XGROUP SETID pubsub-topic consumer-group 0

# Scale up subscribers for high lag
kubectl scale deployment subscriber --replicas=5

# Verify messages are flowing
watch -n 2 "redis-cli XLEN pubsub-topic"
```

## Runbook 4 - Certificate Expiry

**Symptoms:** mTLS errors between services. Sidecar logs show certificate validation failures.

**Diagnosis:**

```bash
# Check certificate expiry dates
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.ca\.crt}' | base64 -d | \
  openssl x509 -noout -dates

# Check sentry logs
kubectl logs -n dapr-system -l app=dapr-sentry | \
  grep -i "cert\|expir\|renew"

# Verify sentry is running
kubectl get pods -n dapr-system -l app=dapr-sentry
```

**Resolution:**

```bash
# Rotate issuer certificate (keep same root CA)
dapr mtls renew-certificate -k \
  --issuer-private-key ./issuer.key \
  --issuer-public-certificate ./issuer.crt \
  --ca-root-certificate ./ca.crt

# Restart all sidecars to pick up new certs
kubectl rollout restart deployment -n default

# Verify new cert is in effect
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | base64 -d | \
  openssl x509 -noout -dates
```

## Runbook 5 - Service Invocation 503 Errors

**Symptoms:** Service invocation calls returning HTTP 503. Target service appears healthy.

**Diagnosis:**

```bash
# Check target app is registered with Dapr
kubectl logs -l app=target-service -c daprd | \
  grep -i "registered\|app port\|health"

# Verify app health endpoint (exec into the app container, not daprd which is distroless)
kubectl exec -it caller-pod -- \
  wget -qO- http://localhost:3500/v1.0/invoke/target-service/method/health

# Check Dapr name resolution
kubectl logs -n dapr-system -l app=dapr-operator | \
  grep -i "endpoint\|service\|dns"

# Check if target service is in ready state
kubectl get pod -l app=target-service -o wide
```

**Resolution:**

```bash
# If app health check is failing, fix the health endpoint
# Dapr calls /healthz or /health by default

# If name resolution is failing, check DNS
kubectl exec -it caller-pod -- nslookup target-service

# Restart both caller and target sidecars
kubectl rollout restart deployment/target-service
kubectl rollout restart deployment/caller-service
```

## Runbook Template Generator

Generate consistent runbooks with this script:

```bash
#!/bin/bash
# generate-runbook.sh
ISSUE_NAME="$1"
SEVERITY="${2:-P2}"
OWNER="${3:-platform-team}"
DATE=$(date +%Y-%m-%d)

cat > "runbooks/${ISSUE_NAME// /-}.md" << EOF
# Runbook: ${ISSUE_NAME}
Severity: ${SEVERITY}
Owner: ${OWNER}
Last Updated: ${DATE}

## Symptoms
- [ ] Describe observable symptoms

## Prerequisites
- kubectl access to cluster
- Dapr CLI installed

## Diagnosis Steps
1. Check pod status
2. Review sidecar logs
3. Verify component configuration

## Resolution Steps
1. Step 1
2. Step 2

## Escalation
Escalate to SRE team after 30 minutes without resolution.

## Post-Incident
- Update this runbook with new findings
- File issue if Dapr bug confirmed
EOF

echo "Created runbook: runbooks/${ISSUE_NAME// /-}.md"
```

## Summary

Operational runbooks for Dapr should cover the five most common failure categories: sidecar injection failures, state store connectivity, pub/sub message lag, certificate expiry, and service invocation errors. Each runbook combines diagnostic commands specific to Dapr's architecture (checking sidecar logs, component status, and Dapr control plane health) with targeted resolution steps. Maintaining runbooks in Git alongside your component configurations ensures they stay current as your infrastructure evolves.
