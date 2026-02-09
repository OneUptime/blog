# How to Upgrade Kubernetes Operators and CRDs Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operators, CRD

Description: Master safe Kubernetes operator and CRD upgrades with proper versioning strategies, backup procedures, and validation techniques to prevent data loss and maintain custom resource availability.

---

Kubernetes operators manage complex applications through Custom Resource Definitions. Upgrading operators and their CRDs requires extra care because they often manage stateful workloads and critical infrastructure. A failed operator upgrade can render your custom resources inaccessible or cause data corruption.

## Understanding Operator Upgrade Risks

Operators consist of custom controllers that watch CRDs and reconcile desired state. When you upgrade an operator, you're changing the control logic that manages your workloads. CRD upgrades can change resource schemas, requiring data migration or conversion. Version mismatches between operators and CRDs can cause reconciliation failures.

Common risks include CRD schema changes breaking existing resources, operator version incompatibilities, data loss from improper migration, and temporary unavailability during the upgrade. Proper planning and testing mitigate these risks.

## Pre-Upgrade Preparation

Before upgrading any operator, back up CRDs and custom resources.

```bash
#!/bin/bash
# backup-operator-resources.sh

OPERATOR_NAME="cert-manager"
BACKUP_DIR="/backups/operators/$(date +%Y%m%d-%H%M%S)"

mkdir -p $BACKUP_DIR

echo "Backing up $OPERATOR_NAME resources..."

# Backup CRDs
kubectl get crd -l app.kubernetes.io/name=$OPERATOR_NAME -o yaml > $BACKUP_DIR/crds.yaml

# Backup operator deployment
kubectl get deployment -n $OPERATOR_NAME $OPERATOR_NAME -o yaml > $BACKUP_DIR/deployment.yaml

# Backup all custom resources
kubectl get crd -l app.kubernetes.io/name=$OPERATOR_NAME -o jsonpath='{.items[*].metadata.name}' | \
  tr ' ' '\n' | while read crd; do
    kubectl get $crd -A -o yaml > $BACKUP_DIR/$crd.yaml
  done

# Backup operator configuration
kubectl get cm,secret -n $OPERATOR_NAME -o yaml > $BACKUP_DIR/config.yaml

echo "Backup complete: $BACKUP_DIR"
tar czf $BACKUP_DIR.tar.gz $BACKUP_DIR
```

## Checking Operator Version Compatibility

Verify the target operator version is compatible with your Kubernetes version and existing custom resources.

```bash
#!/bin/bash
# check-operator-compatibility.sh

OPERATOR="prometheus-operator"
CURRENT_VERSION="0.68.0"
TARGET_VERSION="0.70.0"

echo "Checking compatibility for $OPERATOR upgrade..."

# Check Kubernetes version requirements
echo "Current cluster version:"
kubectl version --short

# Check CRD versions
echo "Current CRD versions:"
kubectl get crd -l app.kubernetes.io/name=$OPERATOR -o custom-columns=NAME:.metadata.name,VERSION:.spec.versions[*].name

# Check for deprecated CRD versions
kubectl get crd -l app.kubernetes.io/name=$OPERATOR -o json | \
  jq -r '.items[] | select(.spec.versions[] | .deprecated == true) | .metadata.name'

# Read release notes for breaking changes
echo "Review release notes: https://github.com/prometheus-operator/prometheus-operator/releases/tag/v$TARGET_VERSION"
```

## Upgrading Operators with Helm

Most modern operators are deployed via Helm, making upgrades straightforward.

```bash
#!/bin/bash
# upgrade-operator-helm.sh

OPERATOR="cert-manager"
NAMESPACE="cert-manager"
CURRENT_VERSION="1.13.0"
TARGET_VERSION="1.14.0"

echo "Upgrading $OPERATOR from $CURRENT_VERSION to $TARGET_VERSION..."

# Add/update Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Check current deployment
helm list -n $NAMESPACE

# Review upgrade changes
helm diff upgrade $OPERATOR jetstack/$OPERATOR \
  --namespace $NAMESPACE \
  --version $TARGET_VERSION \
  --reuse-values

# Perform upgrade
helm upgrade $OPERATOR jetstack/$OPERATOR \
  --namespace $NAMESPACE \
  --version $TARGET_VERSION \
  --reuse-values \
  --wait \
  --timeout=10m

# Verify upgrade
kubectl get deployment -n $NAMESPACE
kubectl get pods -n $NAMESPACE

# Check operator logs
kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=$OPERATOR --tail=50

echo "Operator upgrade complete"
```

## Upgrading CRDs Separately

CRDs often need separate upgrade steps because Helm doesn't always update them automatically.

```bash
#!/bin/bash
# upgrade-crds.sh

OPERATOR="cert-manager"
TARGET_VERSION="1.14.0"

echo "Upgrading CRDs for $OPERATOR..."

# Download CRD manifests
curl -L https://github.com/cert-manager/cert-manager/releases/download/v$TARGET_VERSION/cert-manager.crds.yaml \
  -o cert-manager-crds-$TARGET_VERSION.yaml

# Review CRD changes
diff <(kubectl get crd certificates.cert-manager.io -o yaml) \
     <(grep -A 100 "name: certificates.cert-manager.io" cert-manager-crds-$TARGET_VERSION.yaml)

# Apply new CRDs
kubectl apply -f cert-manager-crds-$TARGET_VERSION.yaml

# Verify CRDs are updated
kubectl get crd -l app.kubernetes.io/name=$OPERATOR -o custom-columns=NAME:.metadata.name,VERSION:.spec.versions[*].name

echo "CRD upgrade complete"
```

## Handling CRD Version Migrations

When CRD versions change, existing resources may need conversion.

```bash
#!/bin/bash
# migrate-crd-versions.sh

CRD_NAME="certificates.cert-manager.io"
OLD_VERSION="v1alpha2"
NEW_VERSION="v1"

echo "Migrating $CRD_NAME from $OLD_VERSION to $NEW_VERSION..."

# Get all resources using old version
kubectl get certificates -A -o json | \
  jq -r --arg old "$OLD_VERSION" \
  '.items[] | select(.apiVersion | contains($old)) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    echo "Migrating certificate: $ns/$name"

    # Get resource in old version
    kubectl get certificate $name -n $ns -o yaml > /tmp/cert-old.yaml

    # Convert to new version (if conversion webhook exists)
    # Otherwise, manually update the YAML
    sed "s/apiVersion:.*$OLD_VERSION/apiVersion: cert-manager.io\/$NEW_VERSION/" \
      /tmp/cert-old.yaml | kubectl apply -f -
  done

echo "Migration complete"
```

## Testing Operator Upgrades in Staging

Always test operator upgrades in a staging environment first.

```bash
#!/bin/bash
# test-operator-upgrade-staging.sh

OPERATOR="postgres-operator"
STAGING_CONTEXT="staging"
TARGET_VERSION="1.11.0"

echo "Testing $OPERATOR upgrade in staging..."

# Switch to staging context
kubectl config use-context $STAGING_CONTEXT

# Backup staging resources
./backup-operator-resources.sh

# Perform upgrade
helm upgrade $OPERATOR postgres-operator-charts/$OPERATOR \
  --namespace $OPERATOR \
  --version $TARGET_VERSION \
  --wait

# Wait for operator to be ready
kubectl wait --for=condition=available \
  deployment/$OPERATOR \
  -n $OPERATOR \
  --timeout=5m

# Run validation tests
./validate-operator.sh

# Test creating a new custom resource
cat <<EOF | kubectl apply -f -
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: test-cluster
  namespace: default
spec:
  teamId: "test"
  volume:
    size: 1Gi
  numberOfInstances: 2
  users:
    testuser: []
  databases:
    testdb: testuser
  postgresql:
    version: "15"
EOF

# Wait for PostgreSQL cluster to be ready
kubectl wait --for=condition=Running \
  postgresql/test-cluster \
  --timeout=10m

# Cleanup test resource
kubectl delete postgresql test-cluster

echo "Staging test complete"
```

## Monitoring Operator Health

Monitor operator health during and after upgrades.

```bash
#!/bin/bash
# monitor-operator-health.sh

OPERATOR="prometheus-operator"
NAMESPACE="monitoring"

echo "Monitoring $OPERATOR health..."

# Watch operator pods
watch -n 5 "kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=$OPERATOR"

# Monitor operator logs for errors
kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=$OPERATOR --tail=50 -f

# Check custom resource status
kubectl get prometheus,servicemonitor,alertmanager -A

# Monitor metrics
kubectl port-forward -n $NAMESPACE svc/$OPERATOR-metrics 8080:8080 &
curl http://localhost:8080/metrics | grep -E "operator_reconcile|operator_error"
```

## Rolling Back Failed Operator Upgrades

If an operator upgrade fails, roll back quickly.

```bash
#!/bin/bash
# rollback-operator.sh

OPERATOR="cert-manager"
NAMESPACE="cert-manager"

echo "Rolling back $OPERATOR upgrade..."

# Roll back using Helm
helm rollback $OPERATOR -n $NAMESPACE

# Wait for rollback to complete
kubectl wait --for=condition=available \
  deployment/$OPERATOR \
  -n $NAMESPACE \
  --timeout=5m

# Verify rollback
helm list -n $NAMESPACE
kubectl get pods -n $NAMESPACE

# Check operator logs
kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=$OPERATOR --tail=50

# Verify custom resources still work
kubectl get certificates -A

echo "Rollback complete"
```

## Validating Custom Resources After Upgrade

After upgrading, validate that existing custom resources still function correctly.

```bash
#!/bin/bash
# validate-custom-resources.sh

OPERATOR="cert-manager"

echo "Validating custom resources after $OPERATOR upgrade..."

# Get all custom resource types
crds=$(kubectl get crd -l app.kubernetes.io/name=$OPERATOR -o jsonpath='{.items[*].metadata.name}')

for crd in $crds; do
  echo "Checking $crd..."

  # Count resources
  count=$(kubectl get $crd -A --no-headers 2>/dev/null | wc -l)
  echo "  Found $count resources"

  # Check for resources in error state
  kubectl get $crd -A -o json | \
    jq -r '.items[] | select(.status.conditions[]? | select(.type=="Ready" and .status!="True")) | "\(.metadata.namespace)/\(.metadata.name)"'
done

# Test creating a new resource
echo "Testing new resource creation..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: test-cert
  namespace: default
spec:
  secretName: test-cert-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - test.example.com
EOF

sleep 30

# Check certificate status
kubectl get certificate test-cert -n default -o jsonpath='{.status.conditions}'

# Cleanup
kubectl delete certificate test-cert -n default

echo "Validation complete"
```

## Best Practices for Operator Upgrades

Follow these practices to ensure safe operator upgrades. Always back up CRDs and custom resources before upgrading. Test upgrades in staging environments that mirror production. Review release notes for breaking changes and migration requirements. Upgrade CRDs separately from operator deployments when necessary. Monitor operator logs and metrics during upgrades. Have rollback procedures documented and tested. Validate custom resource functionality after upgrades.

For critical operators managing production databases or infrastructure, consider blue-green deployment strategies where you run both old and new operator versions temporarily, gradually migrating resources between them.

Upgrading Kubernetes operators and CRDs safely requires thorough preparation, testing, and validation. By following systematic upgrade procedures, maintaining backups, monitoring health throughout the process, and having tested rollback plans, you can upgrade operators with confidence while minimizing risk to your custom resources and the applications they manage.
