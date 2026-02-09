# Upgrading Crossplane Providers Safely in Production Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Crossplane, Provider, Upgrades, Kubernetes, Infrastructure as Code

Description: Strategies and best practices for upgrading Crossplane providers in production without disrupting managed cloud infrastructure resources

---

Crossplane providers are the bridge between your Kubernetes cluster and cloud APIs. They contain the CRDs, controllers, and reconciliation logic that translate Kubernetes resources into real cloud infrastructure. Upgrading these providers is necessary to get bug fixes, new resource types, and support for the latest cloud API features. However, a botched provider upgrade can disrupt reconciliation of your managed resources, cause drift in cloud infrastructure, or even trigger unintended resource deletion. This guide covers the strategies and practices for upgrading providers safely in production environments.

## Understanding Provider Architecture

Before diving into upgrade strategies, it is important to understand how providers work internally. A Crossplane provider consists of:

- **CRDs**: Custom Resource Definitions that describe cloud resource types (e.g., `Instance` for RDS, `Bucket` for S3)
- **Controller**: A Kubernetes controller that watches for changes to managed resources and reconciles them against the cloud API
- **Provider package**: An OCI image containing the CRDs and controller image reference

When you upgrade a provider, Crossplane installs the new CRDs and starts the new controller while deactivating the old one. During this transition, there is a brief period where no controller is reconciling your managed resources.

## Pre-Upgrade Checklist

Before upgrading any provider in production, complete these verification steps:

```bash
# 1. Check current provider version and health
kubectl get providers
kubectl get providerrevision

# 2. Verify all managed resources are in a healthy state
kubectl get managed -o custom-columns=\
  NAME:.metadata.name,\
  KIND:.kind,\
  READY:.status.conditions[?(@.type=='Ready')].status,\
  SYNCED:.status.conditions[?(@.type=='Synced')].status | \
  grep -v "True.*True"

# 3. Check for any in-progress operations
kubectl get managed -o json | \
  jq '.items[] | select(.status.conditions[]? | select(.type=="Ready" and .status!="True")) | .metadata.name'

# 4. Review provider release notes for breaking changes
# Always check the provider's changelog before upgrading

# 5. Verify Crossplane core version compatibility
kubectl get deployment crossplane -n crossplane-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Upgrade Strategy: Revision History

Crossplane's revision system is the primary mechanism for safe provider upgrades. Each provider version creates a new ProviderRevision, and Crossplane maintains a configurable history of revisions for rollback:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.2.0
  revisionActivationPolicy: Automatic
  revisionHistoryLimit: 5
```

The `revisionHistoryLimit` determines how many inactive revisions are retained. Setting this to at least 3 ensures you can roll back through multiple versions if needed.

## Manual Activation Strategy

For critical production environments, use manual revision activation to control exactly when the new provider version takes over:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.3.0
  revisionActivationPolicy: Manual
  revisionHistoryLimit: 5
```

With manual activation, updating the package version downloads and installs the new revision but does not activate it. You can inspect the new revision before switching:

```bash
# List revisions - new one will be "Inactive"
kubectl get providerrevision
# NAME                              HEALTHY   REVISION   IMAGE                                                   STATE
# provider-aws-ec2-abc123           True      1          xpkg.upbound.io/upbound/provider-aws-ec2:v1.2.0        Active
# provider-aws-ec2-def456           True      2          xpkg.upbound.io/upbound/provider-aws-ec2:v1.3.0        Inactive

# Verify the new revision installed successfully
kubectl describe providerrevision provider-aws-ec2-def456

# Check that new CRDs are valid
kubectl get crd | grep aws

# Activate the new revision
kubectl patch providerrevision provider-aws-ec2-def456 \
  --type=merge -p '{"spec":{"desiredState":"Active"}}'
```

## Staged Rollout with Multiple ProviderConfigs

For organizations managing many cloud resources, a staged rollout reduces blast radius. Create separate ProviderConfigs and migrate resources gradually:

```yaml
# ProviderConfig for canary resources
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-canary
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-creds
      key: credentials
```

Migrate a small set of managed resources to the canary ProviderConfig:

```bash
# Update a non-critical resource to use the canary config
kubectl patch instance.rds test-database \
  --type=merge -p '{"spec":{"providerConfigRef":{"name":"aws-canary"}}}'
```

Monitor these canary resources closely for 24-48 hours before migrating production resources.

## Handling CRD Schema Changes

Provider upgrades sometimes include CRD schema changes. These can be additive (new fields) or breaking (renamed or removed fields). Check for schema differences before upgrading:

```bash
# Export current CRDs
kubectl get crd instances.rds.aws.upbound.io -o yaml > crd-before.yaml

# After installing the new revision (inactive), compare
kubectl get crd instances.rds.aws.upbound.io -o yaml > crd-after.yaml
diff crd-before.yaml crd-after.yaml
```

If there are breaking schema changes, you may need to update your managed resources before activating the new revision:

```bash
# Find resources that need schema migration
kubectl get instance.rds -o json | \
  jq '.items[] | select(.spec.forProvider.deprecatedField != null) | .metadata.name'

# Update resources to use new field names
kubectl patch instance.rds my-database \
  --type=json -p '[
    {"op": "remove", "path": "/spec/forProvider/deprecatedField"},
    {"op": "add", "path": "/spec/forProvider/newField", "value": "same-value"}
  ]'
```

## Monitoring During Upgrades

Set up enhanced monitoring during the upgrade window:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: crossplane-upgrade-alerts
spec:
  groups:
    - name: crossplane-provider-upgrade
      rules:
        - alert: ManagedResourceNotSynced
          expr: |
            count(crossplane_managed_resource_ready{status!="True"}) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Managed resources not synced after provider upgrade"
        - alert: ProviderRevisionUnhealthy
          expr: |
            crossplane_provider_revision_healthy{status!="True"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Provider revision is unhealthy"
        - alert: ReconciliationErrors
          expr: |
            rate(controller_runtime_reconcile_errors_total{controller=~"managed/.*"}[5m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Reconciliation errors detected after upgrade"
```

Watch provider logs during the upgrade:

```bash
# Stream provider controller logs
kubectl logs -n crossplane-system \
  -l pkg.crossplane.io/revision=provider-aws-ec2-def456 \
  -f --tail=100
```

## Rolling Back

If issues are detected after activation, roll back by reactivating the previous revision:

```bash
# Identify the previous revision
kubectl get providerrevision
# NAME                              HEALTHY   REVISION   IMAGE                                                   STATE
# provider-aws-ec2-abc123           True      1          xpkg.upbound.io/upbound/provider-aws-ec2:v1.2.0        Inactive
# provider-aws-ec2-def456           True      2          xpkg.upbound.io/upbound/provider-aws-ec2:v1.3.0        Active

# Rollback by reverting the package version
kubectl patch provider provider-aws \
  --type=merge -p '{"spec":{"package":"xpkg.upbound.io/upbound/provider-aws-ec2:v1.2.0"}}'

# Or directly activate the old revision
kubectl patch providerrevision provider-aws-ec2-abc123 \
  --type=merge -p '{"spec":{"desiredState":"Active"}}'
```

## Automating Upgrades with Renovate

For non-critical environments, automate provider version tracking with Renovate or Dependabot:

```json
{
  "customManagers": [
    {
      "customType": "regex",
      "fileMatch": ["crossplane/.*\\.yaml$"],
      "matchStrings": [
        "package:\\s*(?<depName>[^:]+):(?<currentValue>v[^\\s]+)"
      ],
      "datasourceTemplate": "docker"
    }
  ]
}
```

This creates pull requests automatically when new provider versions are available, giving you a review step before applying upgrades.

## Version Pinning Strategies

Choose a version pinning strategy appropriate for your environment:

```yaml
# Exact version (most conservative)
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.2.3

# Minor version range (allows patches)
# Not directly supported - use Renovate/Dependabot to manage
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.2.3
```

Always pin to exact versions in production. Use tools like Renovate to propose upgrades through pull requests rather than allowing automatic version ranges.

## Testing Upgrades

Before upgrading production, test in a staging environment that mirrors your production setup:

```bash
# Create a staging cluster
kind create cluster --name crossplane-staging

# Install the same Crossplane version as production
helm install crossplane crossplane-stable/crossplane \
  -n crossplane-system --create-namespace \
  --version=$(kubectl get deployment crossplane -n crossplane-system \
    -o jsonpath='{.metadata.labels.helm\.sh/chart}' | sed 's/crossplane-//')

# Install the new provider version
kubectl apply -f - <<EOF
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-aws-ec2:v1.3.0
EOF

# Apply a subset of your managed resources and verify reconciliation
kubectl apply -f staging-resources/
```

## Conclusion

Upgrading Crossplane providers in production requires a disciplined approach that balances the need for new features and bug fixes against the risk of disrupting cloud infrastructure. The revision system provides the foundation for safe upgrades, enabling manual activation, revision history, and quick rollbacks. By combining staged rollouts, enhanced monitoring, pre-upgrade validation, and testing in staging environments, you can upgrade providers confidently. Always review release notes for breaking changes, monitor reconciliation after activation, and maintain enough revision history to roll back through multiple versions if needed. Treat provider upgrades with the same care you would give to any critical infrastructure change.
