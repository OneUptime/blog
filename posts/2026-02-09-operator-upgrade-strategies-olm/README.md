# How to Implement Operator Upgrade Strategies with OLM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operator, OLM

Description: Learn how to implement operator upgrade strategies using Operator Lifecycle Manager, including seamless upgrades, rollback procedures, and version compatibility management.

---

Operator Lifecycle Manager (OLM) automates the deployment and upgrade of Kubernetes operators. It handles version management, dependency resolution, and upgrade strategies, making it easier to distribute and maintain operators across clusters. Understanding OLM upgrade strategies ensures smooth operator updates without disrupting workloads.

OLM provides structured upgrade paths and automated dependency management that manual operator deployment cannot match.

## Installing OLM

Install OLM on your cluster:

```bash
# Install OLM

curl -sL https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v0.27.0/install.sh | bash -s v0.27.0

# Verify installation
kubectl get pods -n olm

NAME                                READY   STATUS    RESTARTS   AGE
catalog-operator-xxx                1/1     Running   0          1m
olm-operator-xxx                    1/1     Running   0          1m
packageserver-xxx                   1/1     Running   0          1m
```

## Creating a ClusterServiceVersion

The ClusterServiceVersion (CSV) describes your operator version:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: ClusterServiceVersion
metadata:
  name: myoperator.v1.0.0
  namespace: operators
spec:
  displayName: My Operator
  version: 1.0.0
  description: |
    My operator manages custom applications in Kubernetes.

  # Maturity level
  maturity: stable

  # Maintainer information
  maintainers:
  - name: Platform Team
    email: platform@example.com

  # Provider
  provider:
    name: Example Inc

  # Operator installation
  install:
    strategy: deployment
    spec:
      permissions:
      - serviceAccountName: myoperator
        rules:
        - apiGroups: ["example.com"]
          resources: ["applications"]
          verbs: ["*"]
      deployments:
      - name: myoperator-controller
        spec:
          replicas: 1
          selector:
            matchLabels:
              name: myoperator
          template:
            metadata:
              labels:
                name: myoperator
            spec:
              serviceAccountName: myoperator
              containers:
              - name: operator
                image: myregistry/myoperator:v1.0.0
                env:
                - name: WATCH_NAMESPACE
                  valueFrom:
                    fieldRef:
                      fieldPath: metadata.namespace

  # Custom Resource Definitions owned by this operator
  customresourcedefinitions:
    owned:
    - name: applications.example.com
      version: v1
      kind: Application
      displayName: Application
      description: Represents an application deployment
```

## Defining Upgrade Paths

Specify which versions can upgrade to this version in your file-based catalog channel:

```yaml
schema: olm.channel
package: myoperator
name: stable
entries:
- name: myoperator.v2.0.0
  replaces: myoperator.v1.0.0  # Replaces this version

  # Or specify multiple previous versions to skip
  # skips:
  # - myoperator.v1.5.0
  # - myoperator.v1.6.0
```

The `replaces` field defines the direct upgrade path. Users on v1.0.0 can upgrade to v2.0.0.

## Update Channels

Organize versions into channels for different update cadences:

```yaml
schema: olm.package
name: myoperator
defaultChannel: stable
---
schema: olm.channel
package: myoperator
name: stable
entries:
- name: myoperator.v2.0.0
---
schema: olm.channel
package: myoperator
name: beta
entries:
- name: myoperator.v2.1.0-beta
---
schema: olm.channel
package: myoperator
name: alpha
entries:
- name: myoperator.v3.0.0-alpha
```

Users subscribe to a channel and receive updates within that channel:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: myoperator-subscription
  namespace: operators
spec:
  channel: stable
  name: myoperator
  source: my-catalog
  sourceNamespace: olm
  installPlanApproval: Automatic  # or Manual
```

## Automatic vs Manual Upgrades

Configure upgrade approval:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: myoperator-subscription
spec:
  channel: stable
  name: myoperator
  source: my-catalog
  sourceNamespace: olm
  # Automatic: Upgrades happen automatically
  installPlanApproval: Automatic
```

Or require manual approval:

```yaml
spec:
  installPlanApproval: Manual
```

With manual approval, review and approve upgrades:

```bash
# List pending install plans
kubectl get installplan -n operators

# Describe to see what will be upgraded
kubectl describe installplan install-xxx -n operators

# Approve the upgrade
kubectl patch installplan install-xxx -n operators \
  --type merge \
  --patch '{"spec":{"approved":true}}'
```

## Implementing Upgrade Hooks

Add logic to handle upgrades in your operator:

```go
package controllers

import (
    "context"
    "time"

    examplev1 "github.com/myorg/myoperator/api/v1"
    "github.com/blang/semver/v4"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

type UpgradeReconciler struct {
    client.Client
}

func (r *UpgradeReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // Get all custom resources
    apps := &examplev1.ApplicationList{}
    if err := r.List(ctx, apps); err != nil {
        return ctrl.Result{}, err
    }

    // Check if resources need migration
    for _, app := range apps.Items {
        if needsMigration(&app) {
            if err := r.migrateResource(ctx, &app); err != nil {
                return ctrl.Result{}, err
            }
        }
    }

    return ctrl.Result{}, nil
}

func needsMigration(app *examplev1.Application) bool {
    // Check if resource was created by older operator version
    // Look for version annotation
    version := app.Annotations["operator-version"]
    parsed, err := semver.ParseTolerant(version)
    if err != nil {
        return false
    }

    return parsed.LT(semver.MustParse("2.0.0"))
}

func (r *UpgradeReconciler) migrateResource(ctx context.Context, app *examplev1.Application) error {
    // Perform migration logic
    // e.g., update spec format, fix labels, etc.

    if app.Annotations == nil {
        app.Annotations = make(map[string]string)
    }
    app.Annotations["operator-version"] = "2.0.0"
    app.Annotations["migrated-at"] = time.Now().Format(time.RFC3339)

    return r.Update(ctx, app)
}
```

## Version Compatibility Matrix

Document compatibility in your CSV:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: ClusterServiceVersion
metadata:
  name: myoperator.v2.0.0
  annotations:
    # Minimum Kubernetes version
    operatorframework.io/suggested-namespace: operators
    operatorframework.io/cluster-monitoring: "true"
spec:
  minKubeVersion: 1.22.0

  # API versioning
  customresourcedefinitions:
    owned:
    - name: applications.example.com
      version: v1
      kind: Application
      # Indicate this version is deprecated
      # deprecated: true
      # Conversion webhook for v1alpha1 -> v1 migration
```

## Handling Breaking Changes

For breaking changes, use separate channels or explicit version skipping:

```yaml
schema: olm.channel
package: myoperator
name: stable-v3
entries:
- name: myoperator.v3.0.0
  replaces: myoperator.v2.5.0

  # Users on older versions must upgrade to v2.5.0 first
  # Document this in description
```

## Testing Upgrades

Test the upgrade process:

```bash
# Install old bundle
operator-sdk run bundle myregistry/myoperator-bundle:v1.0.0 -n operators

# Wait for operator to be ready
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded csv/myoperator.v1.0.0 -n operators

# Create test resources with old operator
kubectl apply -f test-app.yaml

# Upgrade to the new bundle
operator-sdk run bundle-upgrade myregistry/myoperator-bundle:v2.0.0 -n operators

# Monitor upgrade
kubectl get csv -n operators -w

# Verify operator upgraded
kubectl get csv -n operators

NAME                  DISPLAY        VERSION   REPLACES              PHASE
myoperator.v2.0.0     My Operator    2.0.0     myoperator.v1.0.0     Succeeded

# Verify resources still work
kubectl get applications
```

## Rollback Strategies

OLM doesn't support automatic rollback, but you can manually revert:

```bash
# Delete new CSV
kubectl delete csv myoperator.v2.0.0 -n operators

# Reinstall old CSV
kubectl apply -f myoperator.v1.0.0.csv.yaml

# Verify rollback
kubectl get csv -n operators
```

Implement rollback safety in your operator:

```go
func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    app := &examplev1.Application{}
    if err := r.Get(ctx, req.NamespacedName, app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Check operator version compatibility
    requiredVersion := app.Annotations["minimum-operator-version"]
    required, err := semver.ParseTolerant(requiredVersion)
    if requiredVersion != "" && err != nil {
        return ctrl.Result{}, err
    }
    current := semver.MustParse(currentOperatorVersion())
    if requiredVersion != "" && current.LT(required) {
        // Don't process resources that require newer operator
        log.Info("Skipping resource requiring newer operator version",
            "resource", app.Name,
            "required", requiredVersion,
            "current", currentOperatorVersion())
        return ctrl.Result{}, nil
    }

    // Normal reconciliation
    return r.reconcile(ctx, app)
}
```

## Multi-Tenant Upgrades

Control upgrades per namespace:

```yaml
# Namespace 1: Auto-upgrade
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: myoperator
  namespace: team-a
spec:
  channel: stable
  name: myoperator
  source: my-catalog
  sourceNamespace: olm
  installPlanApproval: Automatic
---
# Namespace 2: Manual approval
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: myoperator
  namespace: team-b
spec:
  channel: stable
  name: myoperator
  source: my-catalog
  sourceNamespace: olm
  installPlanApproval: Manual
```

## Monitoring Operator Health

Check operator status during upgrades:

```bash
# Watch CSV status
kubectl get csv -n operators -w

# Check operator pod
kubectl get pods -n operators -l name=myoperator

# View operator logs during upgrade
kubectl logs -n operators deployment/myoperator-controller -f

# Check install plan status
kubectl get installplan -n operators
```

## Publishing to OperatorHub

Package your operator for OperatorHub.io:

```bash
# Generate bundle manifests
operator-sdk generate bundle \
  --version 2.0.0 \
  --channels stable,beta \
  --default-channel stable

# Validate bundle
operator-sdk bundle validate ./bundle

# Build bundle image
docker build -f bundle.Dockerfile -t myregistry/myoperator-bundle:v2.0.0 .

# Push bundle
docker push myregistry/myoperator-bundle:v2.0.0

# Create and validate a file-based catalog
mkdir -p catalog
opm generate dockerfile catalog
opm init myoperator --default-channel=stable --output yaml > catalog/myoperator.yaml
opm render myregistry/myoperator-bundle:v2.0.0 --output=yaml >> catalog/myoperator.yaml
cat <<EOF >> catalog/myoperator.yaml
---
schema: olm.channel
package: myoperator
name: stable
entries:
- name: myoperator.v2.0.0
EOF
opm validate catalog

# Build and push catalog image
docker build -f catalog.Dockerfile -t myregistry/myoperator-catalog:latest .
docker push myregistry/myoperator-catalog:latest

# Create catalog source
kubectl apply -f - <<EOF
apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: my-catalog
  namespace: olm
spec:
  sourceType: grpc
  image: myregistry/myoperator-catalog:latest
EOF
```

OLM provides structured upgrade management for operators, making it easier to distribute updates, manage dependencies, and ensure smooth transitions between operator versions.
