# How to Manage Labels and Annotations for Namespaces in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Namespace, Project

Description: Learn how to use labels and annotations on namespaces in Rancher for organization, policy enforcement, and workload management.

Labels and annotations on Kubernetes namespaces serve different purposes but are equally important. Labels are used for selecting and filtering namespaces (for network policies, resource queries, and scheduling), while annotations store metadata (for documentation, tooling integration, and Rancher-specific configuration). This guide covers how to manage both effectively in Rancher.

## Prerequisites

- Rancher v2.7+ with project owner or cluster owner access
- At least one cluster with namespaces
- Understanding of Kubernetes label and annotation conventions

## Understanding Labels vs Annotations

**Labels** are key-value pairs used for:
- Selecting namespaces in NetworkPolicy rules
- Filtering namespaces with kubectl
- Pod Security Admission enforcement
- Grouping namespaces in monitoring dashboards

**Annotations** are key-value pairs used for:
- Storing metadata about the namespace
- Configuring Rancher-specific features (project assignment)
- Integrating with external tools (GitOps, CI/CD)
- Documentation (contact info, purpose, SLA tier)

## Step 1: View Existing Labels and Annotations

**Via the Rancher UI:**

1. Navigate to your cluster.
2. Go to **Cluster > Projects/Namespaces**.
3. Click on a namespace name.
4. View the **Labels** and **Annotations** sections.

**Via kubectl:**

```bash
# View labels for a namespace

kubectl get namespace <name> --show-labels

# View all labels and annotations
kubectl get namespace <name> -o json | jq '{labels: .metadata.labels, annotations: .metadata.annotations}'

# View labels across all namespaces
kubectl get namespaces --show-labels
```

## Step 2: Add Labels via the Rancher UI

1. Navigate to **Cluster > Projects/Namespaces**.
2. Find the namespace and click the three-dot menu.
3. Select **Edit Config** or **Edit YAML**.
4. Under **Labels**, click **Add Label**.
5. Enter the key and value:
   - Key: `environment`
   - Value: `production`
6. Click **Save**.

## Step 3: Add Labels via kubectl

```bash
# Add a single label
kubectl label namespace api-production environment=production

# Add multiple labels
kubectl label namespace api-production \
  environment=production \
  team=backend \
  tier=critical \
  cost-center=engineering

# Overwrite an existing label
kubectl label namespace api-production environment=staging --overwrite

# Remove a label
kubectl label namespace api-production tier-
```

## Step 4: Add Annotations via kubectl

```bash
# Add annotations
kubectl annotate namespace api-production \
  description="Production API services" \
  owner="backend-team@example.com" \
  sla-tier="gold" \
  oncall-slack="#backend-oncall"

# Overwrite an existing annotation
kubectl annotate namespace api-production description="Updated description" --overwrite

# Remove an annotation
kubectl annotate namespace api-production sla-tier-
```

## Step 5: Establish a Labeling Convention

Define a standard labeling scheme for your organization:

```yaml
# Standard namespace labels
metadata:
  labels:
    # Required labels
    environment: production          # production, staging, development
    team: backend                    # owning team
    project: api-platform            # Rancher project name

    # Optional labels
    tier: critical                   # critical, standard, development
    cost-center: engineering         # for chargeback
    compliance: pci                  # regulatory compliance scope
    managed-by: terraform            # management tool

  annotations:
    # Required annotations
    description: "Production API microservices"
    owner: "backend-team@example.com"

    # Optional annotations
    oncall-slack: "#backend-oncall"
    documentation: "https://wiki.example.com/api-platform"
    created-date: "2026-03-19"
    review-date: "2026-06-19"

    # Rancher project assignment annotation
    # Used when assigning a namespace to a Rancher project
    field.cattle.io/projectId: "c-m-xxxxx:p-xxxxx"
```

## Step 6: Apply Labels in Bulk

Use a script to apply standard labels across namespaces:

```bash
#!/bin/bash
# apply-namespace-labels.sh

# Define namespace label mappings
declare -A NS_LABELS
NS_LABELS["api-production"]="environment=production team=backend tier=critical"
NS_LABELS["api-staging"]="environment=staging team=backend tier=standard"
NS_LABELS["web-production"]="environment=production team=frontend tier=critical"
NS_LABELS["web-staging"]="environment=staging team=frontend tier=standard"
NS_LABELS["data-production"]="environment=production team=data tier=critical"
NS_LABELS["batch-processing"]="environment=production team=data tier=standard"

for ns in "${!NS_LABELS[@]}"; do
  if kubectl get namespace $ns &>/dev/null; then
    echo "Labeling namespace: $ns"
    kubectl label namespace $ns ${NS_LABELS[$ns]} --overwrite
  else
    echo "Namespace not found: $ns (skipping)"
  fi
done
```

## Step 7: Use Labels for NetworkPolicy

Labels are essential for network policy selectors:

```yaml
# Only allow traffic from production namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: production-only-ingress
  namespace: api-production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              environment: production
```

```yaml
# Allow traffic from namespaces whose environment label is not development
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-non-development
  namespace: api-production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchExpressions:
              - key: environment
                operator: NotIn
                values:
                  - development
```

## Step 8: Use Labels for Pod Security Admission

PSA uses specific labels on namespaces:

```bash
# Apply PSA labels based on environment
kubectl get namespaces -l environment=production -o name | while read ns; do
  kubectl label $ns \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite
done

kubectl get namespaces -l environment=staging -o name | while read ns; do
  kubectl label $ns \
    pod-security.kubernetes.io/enforce=baseline \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite
done

kubectl get namespaces -l environment=development -o name | while read ns; do
  kubectl label $ns \
    pod-security.kubernetes.io/enforce=baseline \
    pod-security.kubernetes.io/audit=baseline \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite
done
```

## Step 9: Use Annotations for Documentation

Create informational annotations that help operators:

```bash
kubectl annotate namespace api-production \
  "contact/team=Backend Platform Team" \
  "contact/email=backend@example.com" \
  "contact/slack=#backend-support" \
  "service/tier=Tier 1 - Business Critical" \
  "service/sla=99.99%" \
  "service/rto=15m" \
  "service/rpo=1m" \
  "compliance/pci=true" \
  "compliance/audit-date=2026-03-01"
```

Query annotations for operational purposes:

```bash
# Find all PCI-compliant namespaces
kubectl get namespaces -o json | \
  jq -r '.items[] | select(.metadata.annotations["compliance/pci"] == "true") | .metadata.name'

# Generate a namespace ownership report
kubectl get namespaces -o json | \
  jq -r '.items[] | select(.metadata.annotations["contact/team"] != null) |
  "\(.metadata.name)\t\(.metadata.annotations["contact/team"])\t\(.metadata.annotations["service/tier"] // "N/A")"' | \
  column -t -s $'\t'
```

## Step 10: Manage Labels with Terraform

```hcl
resource "rancher2_namespace" "api_production" {
  name        = "api-production"
  project_id  = rancher2_project.backend.id
  description = "Production API microservices"

  labels = {
    "environment"  = "production"
    "team"         = "backend"
    "tier"         = "critical"
    "cost-center"  = "engineering"
    "managed-by"   = "terraform"
  }

  annotations = {
    "contact/email"      = "backend@example.com"
    "contact/slack"      = "#backend-oncall"
    "service/sla"        = "99.99%"
    "compliance/pci"     = "true"
  }
}
```

## Step 11: Audit Namespace Labels

Check for missing or inconsistent labels:

```bash
#!/bin/bash
# audit-namespace-labels.sh

REQUIRED_LABELS=("environment" "team")
RECOMMENDED_LABELS=("tier" "cost-center")

echo "=== Namespace Label Audit ==="

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  # Skip system namespaces
  [[ $ns == kube-* || $ns == cattle-* ]] && continue

  labels=$(kubectl get namespace $ns -o json | jq -r '.metadata.labels // {} | keys[]')

  for label in "${REQUIRED_LABELS[@]}"; do
    if ! echo "$labels" | grep -q "^${label}$"; then
      echo "MISSING REQUIRED: $ns is missing label '$label'"
    fi
  done

  for label in "${RECOMMENDED_LABELS[@]}"; do
    if ! echo "$labels" | grep -q "^${label}$"; then
      echo "MISSING RECOMMENDED: $ns is missing label '$label'"
    fi
  done
done
```

## Best Practices

- **Establish conventions early**: Define your labeling scheme before creating namespaces. Retrofitting labels is harder.
- **Use consistent keys**: Standardize on key names across the organization (for example, always `environment`, never `env`).
- **Keep labels short**: Label values should be concise. Use annotations for longer text.
- **Handle Rancher metadata carefully**: Rancher uses `field.cattle.io/projectId` for project assignment. Only change Rancher-managed metadata intentionally and according to Rancher documentation.
- **Automate labeling**: Use scripts, Terraform, or admission webhooks to enforce label standards.
- **Audit regularly**: Check for missing or inconsistent labels as part of your operational review.
- **Use labels for policy**: Leverage labels in NetworkPolicy and PSA rules.

## Conclusion

Labels and annotations on namespaces in Rancher are foundational for organizing, securing, and managing your Kubernetes resources. By establishing a consistent labeling convention, automating label application, and using labels for policy enforcement, you create a well-organized cluster that is easy to manage at scale. Start with a small set of required labels and expand as your needs grow.
