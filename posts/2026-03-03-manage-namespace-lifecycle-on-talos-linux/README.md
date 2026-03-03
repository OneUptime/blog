# How to Manage Namespace Lifecycle on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Namespace Management, Lifecycle, Operations

Description: A comprehensive guide to managing the full lifecycle of Kubernetes namespaces on Talos Linux, from creation through maintenance to decommissioning.

---

Namespaces on a Talos Linux cluster are not static. They are created when teams start new projects, grow as workloads expand, need maintenance as policies evolve, and eventually get decommissioned when projects end. Managing this lifecycle well prevents namespace sprawl, ensures security policies stay current, and keeps your cluster clean.

This post covers the complete namespace lifecycle on Talos Linux, from initial creation through ongoing maintenance to proper decommissioning, with practical processes and tooling for each stage.

## The Namespace Lifecycle Stages

A namespace goes through several stages during its life.

**Creation** is when the namespace is first provisioned with all its supporting resources (RBAC, quotas, network policies, limit ranges).

**Active use** is the main phase where teams deploy and run workloads. During this phase, the namespace needs monitoring, quota adjustments, and policy updates.

**Maintenance** involves regular audits, policy updates, and cleanup of unused resources.

**Decommissioning** is the orderly shutdown and removal of a namespace when it is no longer needed.

Each stage has its own challenges and best practices.

## Stage 1: Namespace Creation

We covered automated provisioning in detail in a separate post, but here is a summary of what a properly created namespace needs.

```bash
#!/bin/bash
# create-namespace.sh
NAMESPACE=$1
TEAM=$2
PURPOSE=$3

# Create namespace with metadata
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: $NAMESPACE
  labels:
    team: $TEAM
    purpose: $PURPOSE
    managed-by: platform-team
    created-date: "$(date +%Y-%m-%d)"
    pod-security.kubernetes.io/enforce: restricted
  annotations:
    owner: "${TEAM}@company.com"
    description: "Namespace for $PURPOSE"
    expiry-date: "$(date -v+1y +%Y-%m-%d)"
EOF

# Apply standard policies
kubectl -n "$NAMESPACE" apply -f standard-policies/

echo "Namespace $NAMESPACE created for team $TEAM"
```

Notice the labels and annotations. These are important for lifecycle management. The `created-date` label helps you find old namespaces. The `expiry-date` annotation signals when a namespace should be reviewed for decommissioning. The `owner` annotation identifies who is responsible.

## Stage 2: Active Use and Monitoring

During active use, you need to monitor namespace health and resource consumption.

### Tracking Resource Usage

```bash
# Check resource quota usage for a namespace
kubectl -n team-backend describe resourcequota

# Get a summary across all namespaces
kubectl get resourcequota --all-namespaces \
  -o custom-columns=\
NAMESPACE:.metadata.namespace,\
CPU_USED:.status.used.requests\\.cpu,\
CPU_HARD:.status.hard.requests\\.cpu,\
MEM_USED:.status.used.requests\\.memory,\
MEM_HARD:.status.hard.requests\\.memory,\
PODS_USED:.status.used.pods,\
PODS_HARD:.status.hard.pods
```

### Quota Adjustment

As workloads grow, teams will need quota increases. Build a process for this.

```bash
# Script to increase quota for a namespace
# increase-quota.sh <namespace> <resource> <new-value>
NAMESPACE=$1
RESOURCE=$2
NEW_VALUE=$3

kubectl -n "$NAMESPACE" patch resourcequota compute-quota \
  --type='json' \
  -p="[{\"op\": \"replace\", \"path\": \"/spec/hard/${RESOURCE}\", \"value\": \"${NEW_VALUE}\"}]"

echo "Updated $RESOURCE quota for $NAMESPACE to $NEW_VALUE"
```

### Monitoring Namespace Health

Set up alerts for namespace-level issues.

```yaml
# namespace-health-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: namespace-health
  namespace: monitoring
spec:
  groups:
    - name: namespace.rules
      rules:
        # Alert when quota usage exceeds 85%
        - alert: NamespaceQuotaHigh
          expr: |
            kube_resourcequota{type="used"} /
            kube_resourcequota{type="hard"} > 0.85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.namespace }} quota {{ $labels.resource }} at {{ $value | humanizePercentage }}"

        # Alert when a namespace has no running pods for 7 days
        - alert: NamespaceInactive
          expr: |
            count by (namespace) (kube_pod_status_phase{phase="Running"}) == 0
          for: 7d
          labels:
            severity: info
          annotations:
            summary: "Namespace {{ $labels.namespace }} has no running pods for 7 days"
```

## Stage 3: Regular Maintenance

Namespaces need periodic maintenance to stay healthy and secure.

### Security Policy Audit

Verify that security controls are still in place. Policies can be accidentally deleted or modified.

```bash
#!/bin/bash
# audit-namespace-policies.sh
# Run this weekly to verify all namespaces have required policies

REQUIRED_POLICIES=("default-deny-all" "allow-dns" "allow-intra-namespace")

for ns in $(kubectl get namespaces -l managed-by=platform-team -o jsonpath='{.items[*].metadata.name}'); do
  echo "Auditing namespace: $ns"

  # Check network policies
  for policy in "${REQUIRED_POLICIES[@]}"; do
    if kubectl -n "$ns" get networkpolicy "$policy" > /dev/null 2>&1; then
      echo "  [OK] $policy"
    else
      echo "  [MISSING] $policy - needs remediation"
    fi
  done

  # Check resource quota
  if kubectl -n "$ns" get resourcequota > /dev/null 2>&1; then
    echo "  [OK] Resource quota"
  else
    echo "  [MISSING] Resource quota"
  fi

  # Check limit range
  if kubectl -n "$ns" get limitrange > /dev/null 2>&1; then
    echo "  [OK] Limit range"
  else
    echo "  [MISSING] Limit range"
  fi

  echo ""
done
```

### Cleaning Up Unused Resources

Over time, namespaces accumulate unused resources: completed jobs, orphaned configmaps, unused secrets, and failed pods.

```bash
#!/bin/bash
# cleanup-namespace.sh <namespace>
NAMESPACE=$1

echo "Cleaning up namespace: $NAMESPACE"

# Delete completed jobs older than 7 days
echo "Removing old completed jobs..."
kubectl -n "$NAMESPACE" get jobs \
  -o jsonpath='{range .items[?(@.status.succeeded==1)]}{.metadata.name}{"\n"}{end}' | \
  while read -r job; do
    AGE=$(kubectl -n "$NAMESPACE" get job "$job" -o jsonpath='{.metadata.creationTimestamp}')
    echo "  Deleting completed job: $job (created: $AGE)"
    kubectl -n "$NAMESPACE" delete job "$job"
  done

# Delete failed pods
echo "Removing failed pods..."
kubectl -n "$NAMESPACE" delete pods --field-selector=status.phase=Failed

# Delete evicted pods
echo "Removing evicted pods..."
kubectl -n "$NAMESPACE" get pods -o json | \
  jq -r '.items[] | select(.status.reason=="Evicted") | .metadata.name' | \
  xargs -r kubectl -n "$NAMESPACE" delete pod

echo "Cleanup complete."
```

### Rotating Secrets

If your namespace contains secrets with credentials, rotate them regularly.

```bash
# List secrets in a namespace with their age
kubectl -n team-backend get secrets \
  -o custom-columns=\
NAME:.metadata.name,\
TYPE:.type,\
CREATED:.metadata.creationTimestamp

# Identify secrets older than 90 days that might need rotation
kubectl -n team-backend get secrets -o json | \
  jq -r '.items[] |
    select(.type != "kubernetes.io/service-account-token") |
    select((.metadata.creationTimestamp | fromdateiso8601) < (now - 7776000)) |
    "\(.metadata.name) - created \(.metadata.creationTimestamp)"'
```

## Stage 4: Decommissioning

When a project ends or a team reorganizes, namespaces need to be properly decommissioned. Do not just delete them without following a process.

### Pre-Decommission Checklist

```bash
#!/bin/bash
# pre-decommission-check.sh <namespace>
NAMESPACE=$1

echo "Pre-decommission check for: $NAMESPACE"
echo "================================"

# Check for running workloads
PODS=$(kubectl -n "$NAMESPACE" get pods --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "Running pods: $PODS"

# Check for PVCs (data that might need backup)
PVCS=$(kubectl -n "$NAMESPACE" get pvc --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "Persistent Volume Claims: $PVCS"
if [ "$PVCS" -gt 0 ]; then
  echo "  WARNING: Back up any important data before deletion"
  kubectl -n "$NAMESPACE" get pvc
fi

# Check for services with external IPs or load balancers
LBS=$(kubectl -n "$NAMESPACE" get svc --no-headers 2>/dev/null | grep LoadBalancer | wc -l | tr -d ' ')
echo "Load Balancer services: $LBS"
if [ "$LBS" -gt 0 ]; then
  echo "  WARNING: External DNS records may need updating"
  kubectl -n "$NAMESPACE" get svc -o wide | grep LoadBalancer
fi

# Check if other namespaces reference this one
echo ""
echo "Checking for cross-namespace references..."
kubectl get networkpolicies --all-namespaces -o json | \
  jq -r ".items[] | select(.spec.ingress[]?.from[]?.namespaceSelector?.matchLabels?.\"kubernetes.io/metadata.name\" == \"$NAMESPACE\") | .metadata.namespace + \"/\" + .metadata.name" 2>/dev/null

echo ""
echo "Review the above before proceeding with decommission."
```

### Graceful Decommission

```bash
#!/bin/bash
# decommission-namespace.sh <namespace>
NAMESPACE=$1

echo "Starting graceful decommission of: $NAMESPACE"

# Step 1: Scale down all workloads
echo "Scaling down deployments..."
kubectl -n "$NAMESPACE" scale --all deployment --replicas=0

echo "Scaling down statefulsets..."
kubectl -n "$NAMESPACE" scale --all statefulset --replicas=0

# Step 2: Wait for pods to terminate
echo "Waiting for pods to terminate..."
kubectl -n "$NAMESPACE" wait --for=delete pod --all --timeout=120s 2>/dev/null

# Step 3: Backup any PVC data if needed
for pvc in $(kubectl -n "$NAMESPACE" get pvc -o jsonpath='{.items[*].metadata.name}'); do
  echo "PVC $pvc should be backed up before deletion"
done

# Step 4: Delete the namespace
echo "Deleting namespace $NAMESPACE..."
kubectl delete namespace "$NAMESPACE"

echo "Namespace $NAMESPACE has been decommissioned."
```

## Detecting Stale Namespaces

Build automation to identify namespaces that might be candidates for decommissioning.

```bash
#!/bin/bash
# find-stale-namespaces.sh
# Find namespaces that have been inactive or are past their expiry date

echo "Stale Namespace Report"
echo "====================="
echo ""

# Find namespaces past their expiry date
echo "Namespaces past expiry date:"
kubectl get namespaces -o json | \
  jq -r '.items[] |
    select(.metadata.annotations["expiry-date"] != null) |
    select((.metadata.annotations["expiry-date"] | strptime("%Y-%m-%d") | mktime) < now) |
    "  \(.metadata.name) - expired \(.metadata.annotations["expiry-date"]) - owner: \(.metadata.annotations["owner"] // "unknown")"'

echo ""

# Find namespaces with no recent pod activity
echo "Namespaces with no running pods:"
for ns in $(kubectl get namespaces -l managed-by=platform-team -o jsonpath='{.items[*].metadata.name}'); do
  POD_COUNT=$(kubectl -n "$ns" get pods --no-headers 2>/dev/null | wc -l | tr -d ' ')
  if [ "$POD_COUNT" -eq 0 ]; then
    CREATED=$(kubectl get namespace "$ns" -o jsonpath='{.metadata.creationTimestamp}')
    OWNER=$(kubectl get namespace "$ns" -o jsonpath='{.metadata.annotations.owner}')
    echo "  $ns - created $CREATED - owner: ${OWNER:-unknown}"
  fi
done
```

## Namespace Lifecycle Dashboard

Track namespace lifecycle metrics in Grafana.

```yaml
# Useful queries for a namespace lifecycle dashboard

# Total namespace count over time
# count(kube_namespace_created)

# Namespace age distribution
# time() - kube_namespace_created

# Resource utilization per namespace
# sum by (namespace) (container_cpu_usage_seconds_total)
# sum by (namespace) (container_memory_working_set_bytes)

# Quota utilization percentage
# kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}
```

## Conclusion

Managing the full lifecycle of namespaces on Talos Linux requires processes and automation at every stage. Automate creation to ensure consistency. Monitor and maintain namespaces during active use. Run regular audits to catch policy drift and clean up unused resources. And when it is time, decommission namespaces gracefully with proper checks for data backup, cross-references, and external resources. Use labels and annotations to track ownership, creation dates, and expiry dates. The effort you put into namespace lifecycle management pays off in a cleaner, more secure, and more manageable cluster.
