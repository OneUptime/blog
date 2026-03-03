# How to Create Disaster Recovery Plan for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Disaster Recovery, Planning, Kubernetes, High Availability

Description: A comprehensive guide to creating and testing a disaster recovery plan for Istio service mesh deployments covering backup strategies, recovery procedures, and testing approaches.

---

Having Istio in your infrastructure means having another critical system that needs a disaster recovery plan. If Istio goes down or gets corrupted, it can affect every service in your mesh. A good DR plan covers everything from minor issues like a single bad configuration push to complete cluster loss.

The goal isn't to plan for every possible failure. It's to have documented, tested procedures that let your team respond quickly and methodically when things go wrong.

## Defining Your Recovery Objectives

Start by establishing two key metrics:

**Recovery Time Objective (RTO)**: How quickly you need to recover Istio functionality. For most organizations, this breaks down as:
- Control plane recovery: 15-30 minutes
- Full mesh recovery (including all workload restarts): 1-2 hours
- Complete cluster rebuild with Istio: 2-4 hours

**Recovery Point Objective (RPO)**: How much configuration change you can afford to lose.
- With GitOps: essentially zero (everything is in Git)
- With periodic backups: whatever your backup interval is
- Without backups: you might lose everything since last documented state

## The DR Plan Components

A complete Istio DR plan has these sections:

### 1. Backup Strategy

**What to back up:**

```bash
#!/bin/bash
# istio-backup-checklist.sh

echo "=== Istio Backup Checklist ==="

# IstioOperator or Helm values
echo "1. Installation configuration:"
kubectl get istiooperators -n istio-system -o yaml > backup/istiooperator.yaml
echo "   Saved istiooperator.yaml"

# All CRD instances
echo "2. Istio resources:"
RESOURCES="virtualservices destinationrules gateways serviceentries sidecars envoyfilters workloadentries peerauthentications requestauthentications authorizationpolicies telemetries proxyconfigs"
for r in $RESOURCES; do
  kubectl get "$r" --all-namespaces -o yaml > "backup/$r.yaml" 2>/dev/null
  count=$(kubectl get "$r" --all-namespaces --no-headers 2>/dev/null | wc -l)
  echo "   $r: $count resources"
done

# Certificates
echo "3. Certificates:"
kubectl get secret cacerts -n istio-system -o yaml > backup/cacerts.yaml 2>/dev/null
kubectl get secret istio-ca-secret -n istio-system -o yaml > backup/istio-ca-secret.yaml 2>/dev/null

# ConfigMaps
echo "4. ConfigMaps:"
kubectl get configmap -n istio-system -o yaml > backup/configmaps.yaml

# Namespace labels
echo "5. Namespace labels:"
kubectl get namespaces -l istio-injection=enabled -o yaml > backup/namespaces.yaml

echo "=== Backup Complete ==="
```

**Backup schedule:**
- Configuration: Every time a change is made (GitOps handles this automatically)
- Certificates: Weekly, or immediately after rotation
- Full cluster state: Daily

**Backup storage:**
- Primary: Git repository for configuration
- Secondary: Cloud object storage (S3, GCS) for encrypted certificate backups
- Tertiary: Offline storage for root CA keys

### 2. Recovery Procedures

Document specific runbooks for each scenario:

**Scenario A: Single Resource Corruption**

```bash
# Severity: Low
# RTO: 5 minutes
# Steps:
# 1. Identify the corrupted resource
istioctl analyze --all-namespaces

# 2. Restore from Git
git show HEAD:namespaces/production/virtualservices/my-vs.yaml | kubectl apply -f -

# 3. Verify
istioctl proxy-status
```

**Scenario B: Control Plane Failure**

```bash
# Severity: High
# RTO: 15 minutes
# Steps:
# 1. Check Istiod status
kubectl get pods -n istio-system -l app=istiod

# 2. Check logs
kubectl logs -n istio-system deploy/istiod --tail=50

# 3. Restart Istiod
kubectl rollout restart deployment/istiod -n istio-system

# 4. If restart doesn't work, reinstall
istioctl install -f backup/istiooperator.yaml

# 5. Verify
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=300s
istioctl proxy-status
```

**Scenario C: Certificate Expiration**

```bash
# Severity: Critical
# RTO: 30 minutes
# Steps:
# 1. Check certificate status
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -enddate -noout

# 2. If expired, restore from backup
kubectl delete secret cacerts -n istio-system
kubectl create secret generic cacerts -n istio-system \
  --from-file=backup/certs/ca-cert.pem \
  --from-file=backup/certs/ca-key.pem \
  --from-file=backup/certs/root-cert.pem \
  --from-file=backup/certs/cert-chain.pem

# 3. Restart control plane
kubectl rollout restart deployment/istiod -n istio-system

# 4. Restart all workloads to get new certificates
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n "$ns"
done
```

**Scenario D: Complete Cluster Loss**

```bash
# Severity: Critical
# RTO: 2-4 hours
# Steps:
# 1. Provision new cluster
# 2. Restore certificates
# 3. Install Istio
# 4. Restore namespace labels
# 5. Restore all Istio configuration
# 6. Deploy applications
# 7. Update DNS/load balancer
# 8. Verify end-to-end
```

### 3. Communication Plan

Document who needs to know what:

```text
Severity: Low (single resource issue)
  - Notify: On-call engineer
  - Channel: #istio-ops Slack

Severity: High (control plane failure)
  - Notify: On-call engineer, team lead
  - Channel: #istio-ops Slack, incident management tool
  - Escalation: If not resolved in 30 minutes, page platform team lead

Severity: Critical (complete mesh failure or cluster loss)
  - Notify: All platform engineers, engineering leadership
  - Channel: War room, incident management tool
  - External: Customer communication if user-facing impact
```

### 4. Testing the Plan

A DR plan that hasn't been tested is just a document. Schedule regular tests:

**Monthly: Configuration restore test**

```bash
# Create a test namespace
kubectl create namespace dr-test

# Apply a subset of configs
kubectl apply -f backup/virtualservices.yaml -n dr-test --dry-run=server

# Clean up
kubectl delete namespace dr-test
```

**Quarterly: Control plane recovery test**

```bash
# In a test cluster:
# 1. Delete Istiod
kubectl delete deployment istiod -n istio-system

# 2. Time how long recovery takes
time istioctl install -f backup/istiooperator.yaml

# 3. Verify everything works
istioctl proxy-status
```

**Annually: Full DR test**

Do a complete cluster rebuild from backups in a test environment. Document how long each step takes and update your RTO estimates.

### 5. Monitoring and Alerting

Set up monitoring that catches problems before they become disasters:

```yaml
# Prometheus alerting rules
groups:
  - name: istio-dr-alerts
    rules:
      - alert: IstiodUnavailable
        expr: absent(up{job="istiod"} == 1)
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Istiod is unavailable"

      - alert: IstioCertExpiringIn7Days
        expr: (istio_build_tag != "unknown") and (certmanager_certificate_expiration_timestamp_seconds - time() < 604800)
        labels:
          severity: warning

      - alert: IstioConfigSyncFailure
        expr: rate(pilot_total_xds_rejects[5m]) > 0
        for: 5m
        labels:
          severity: warning

      - alert: IstioBackupStale
        expr: (time() - istio_backup_last_success_timestamp) > 172800
        labels:
          severity: warning
          summary: "Istio backup hasn't succeeded in 48 hours"
```

### 6. Maintaining the Plan

The DR plan is a living document. Update it when:
- Istio version changes
- Cluster architecture changes
- New Istio features are adopted
- After any actual incident (incorporate lessons learned)
- After DR tests reveal gaps

```bash
# Add to your team's recurring calendar:
# - Monthly: Review and update DR plan
# - Monthly: Run configuration restore test
# - Quarterly: Run control plane recovery test
# - Annually: Run full DR simulation
```

## DR Plan Template

Keep a one-page summary that's easy to find during an incident:

```text
ISTIO DR QUICK REFERENCE

Backup locations:
  - Git: github.com/myorg/istio-config
  - Certs: s3://myorg-dr/istio/certs/
  - IstioOperator: s3://myorg-dr/istio/operator/

Recovery order:
  1. Certificates (if needed)
  2. Istio installation
  3. Security resources (PeerAuth, RequestAuth)
  4. ServiceEntries
  5. DestinationRules
  6. Gateways
  7. VirtualServices
  8. AuthorizationPolicies
  9. Other (Sidecars, EnvoyFilters, Telemetry)
  10. Workload restarts

Contacts:
  - Platform team: #platform-oncall
  - Istio SME: @jane-smith
  - Escalation: @platform-lead
```

A disaster recovery plan is one of those things you never want to need but can't afford not to have. The time you invest in creating, testing, and maintaining it pays off enormously when the unexpected happens.
