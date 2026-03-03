# How to Set Up Operator Lifecycle Manager on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, OLM, Operator Lifecycle Manager, Operator, Automation

Description: A step-by-step guide to installing and using the Operator Lifecycle Manager on Talos Linux for discovering, installing, and managing Kubernetes Operators.

---

The Operator Lifecycle Manager (OLM) is a tool that helps you manage Kubernetes Operators as a whole. Rather than manually applying YAML manifests for each Operator you want to run, OLM provides a framework for discovering, installing, updating, and managing the lifecycle of Operators in your cluster. On Talos Linux, OLM is valuable because it brings a package-manager-like experience to Operator management, complete with dependency resolution and automatic updates.

This guide covers installing OLM on Talos Linux and using it to manage Operators.

## What Does OLM Do?

OLM handles several aspects of Operator management:

- **Discovery**: Browse a catalog of available Operators
- **Installation**: Install Operators with a single resource creation
- **Dependency Resolution**: Automatically install Operators that your chosen Operator depends on
- **Updates**: Manage Operator upgrades with configurable approval policies
- **RBAC Management**: Automatically create the necessary ServiceAccounts, Roles, and RoleBindings
- **Multi-tenancy**: Control which namespaces can use which Operators

## Installing OLM

OLM is installed using the `operator-sdk` CLI tool or by applying manifests directly:

### Method 1: Using operator-sdk

```bash
# Install the operator-sdk CLI (on macOS)
brew install operator-sdk

# Or download the binary directly
export ARCH=$(case $(uname -m) in x86_64) echo -n amd64 ;; aarch64) echo -n arm64 ;; *) echo -n $(uname -m) ;; esac)
export OS=$(uname | awk '{print tolower($0)}')
export OPERATOR_SDK_DL_URL=https://github.com/operator-framework/operator-sdk/releases/download/v1.33.0
curl -LO ${OPERATOR_SDK_DL_URL}/operator-sdk_${OS}_${ARCH}
chmod +x operator-sdk_${OS}_${ARCH}
sudo mv operator-sdk_${OS}_${ARCH} /usr/local/bin/operator-sdk

# Install OLM
operator-sdk olm install
```

### Method 2: Using kubectl

```bash
# Download and apply the OLM release manifests
export OLM_VERSION=v0.27.0
kubectl apply -f https://github.com/operator-framework/operator-lifecycle-manager/releases/download/${OLM_VERSION}/crds.yaml
kubectl apply -f https://github.com/operator-framework/operator-lifecycle-manager/releases/download/${OLM_VERSION}/olm.yaml
```

Verify the installation:

```bash
# Check OLM pods
kubectl get pods -n olm

# You should see:
# olm-operator-xxxx       Running
# catalog-operator-xxxx   Running
# packageserver-xxxx      Running

# Verify OLM status
operator-sdk olm status

# Check available CRDs
kubectl get crds | grep operators.coreos.com
```

The key CRDs installed by OLM are:

- `CatalogSource` - Defines a source of Operators (a repository)
- `Subscription` - Subscribes to an Operator from a catalog
- `ClusterServiceVersion` (CSV) - Describes an Operator version and its requirements
- `InstallPlan` - Defines the resources needed to install an Operator
- `OperatorGroup` - Controls which namespaces an Operator watches

## Browsing Available Operators

OLM comes with a default catalog of community Operators:

```bash
# List available catalog sources
kubectl get catalogsources -n olm

# List available operators from the catalog
kubectl get packagemanifests

# Get details about a specific operator
kubectl describe packagemanifest prometheus

# See available channels and versions
kubectl get packagemanifest prometheus -o jsonpath='{.status.channels[*].name}'
```

## Installing an Operator with OLM

To install an Operator, create a Subscription resource. Let us install the Prometheus Operator:

### Step 1: Create an OperatorGroup

The OperatorGroup defines where the Operator can watch for resources:

```yaml
# operator-group.yaml
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: default-og
  namespace: operators
spec:
  targetNamespaces:
  - default
  - monitoring
```

```bash
kubectl apply -f operator-group.yaml
```

### Step 2: Create a Subscription

```yaml
# prometheus-subscription.yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: prometheus
  namespace: operators
spec:
  channel: beta
  name: prometheus
  source: operatorhubio-catalog
  sourceNamespace: olm
  installPlanApproval: Automatic
```

```bash
kubectl apply -f prometheus-subscription.yaml

# Watch the installation progress
kubectl get subscription prometheus -n operators -w
kubectl get installplan -n operators
kubectl get csv -n operators
```

The OLM will:
1. Find the Prometheus Operator in the catalog
2. Create an InstallPlan with all required resources
3. Apply the InstallPlan (since we set `installPlanApproval: Automatic`)
4. Deploy the Operator pod
5. Create the necessary RBAC resources

## Managing Operator Updates

OLM can automatically update Operators when new versions are available:

### Automatic Updates

```yaml
# With installPlanApproval: Automatic, updates happen automatically
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: my-operator
  namespace: operators
spec:
  channel: stable
  name: my-operator
  source: operatorhubio-catalog
  sourceNamespace: olm
  installPlanApproval: Automatic
```

### Manual Approval

For production environments, you might want to review updates before applying them:

```yaml
# manual-approval.yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: my-operator
  namespace: operators
spec:
  channel: stable
  name: my-operator
  source: operatorhubio-catalog
  sourceNamespace: olm
  installPlanApproval: Manual
```

When a new version is available, OLM creates an InstallPlan that requires approval:

```bash
# List pending install plans
kubectl get installplan -n operators

# Approve an install plan
kubectl patch installplan <install-plan-name> -n operators \
  --type merge -p '{"spec":{"approved":true}}'
```

## Adding Custom Catalog Sources

You can add your own catalog of Operators, which is useful for private or organization-specific Operators:

```yaml
# custom-catalog.yaml
apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: my-company-operators
  namespace: olm
spec:
  sourceType: grpc
  image: registry.example.com/my-operator-catalog:latest
  displayName: My Company Operators
  publisher: My Company
  updateStrategy:
    registryPoll:
      interval: 30m
```

```bash
kubectl apply -f custom-catalog.yaml

# Verify the catalog is available
kubectl get catalogsource -n olm
kubectl get packagemanifests --field-selector metadata.name=my-operator
```

## Controlling Operator Scope

OperatorGroups control which namespaces an Operator can manage:

### Cluster-Wide Operator

```yaml
# cluster-wide-og.yaml
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: global-operators
  namespace: operators
spec: {}  # Empty spec means all namespaces
```

### Namespace-Scoped Operator

```yaml
# namespace-scoped-og.yaml
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: team-a-operators
  namespace: team-a
spec:
  targetNamespaces:
  - team-a
  - team-a-staging
```

### Single-Namespace Operator

```yaml
# single-namespace-og.yaml
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: monitoring-operators
  namespace: monitoring
spec:
  targetNamespaces:
  - monitoring
```

## Monitoring OLM

```bash
# Check overall OLM health
kubectl get pods -n olm
kubectl get pods -n operators

# View all installed operators
kubectl get csv --all-namespaces

# Check subscription status
kubectl get subscriptions --all-namespaces

# View install plans
kubectl get installplans --all-namespaces

# Check for failed installations
kubectl get csv --all-namespaces -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
PHASE:.status.phase | grep -v Succeeded

# View OLM logs
kubectl logs -n olm -l app=olm-operator --tail=50
kubectl logs -n olm -l app=catalog-operator --tail=50
```

## Uninstalling Operators via OLM

To remove an Operator installed through OLM:

```bash
# Delete the subscription
kubectl delete subscription prometheus -n operators

# Delete the CSV (this removes the operator deployment)
kubectl delete csv prometheusoperator.v0.65.1 -n operators

# Optionally remove CRDs (WARNING: this deletes all custom resources!)
kubectl delete crd prometheuses.monitoring.coreos.com
kubectl delete crd alertmanagers.monitoring.coreos.com
```

## OLM Best Practices on Talos Linux

1. **Use Manual approval in production.** Automatic updates are convenient for development, but in production you want to review and test updates before applying them.

2. **Pin to specific channels.** Operator catalogs often have multiple channels (alpha, beta, stable). Use stable channels for production workloads.

3. **Monitor catalog health.** If a CatalogSource goes offline, OLM cannot install or update Operators. Set up monitoring for catalog pod health.

4. **Limit OperatorGroup scope.** Follow the principle of least privilege. Do not give Operators cluster-wide access unless they genuinely need it.

5. **Back up CRDs before upgrades.** Some Operator upgrades modify CRDs. Having backups makes rollback possible if something goes wrong.

6. **Review resource requirements.** OLM itself and the Operators it manages consume cluster resources. On smaller Talos Linux clusters, be mindful of the overhead.

```bash
# Check resource usage of OLM components
kubectl top pods -n olm
kubectl top pods -n operators
```

## Wrapping Up

The Operator Lifecycle Manager brings structure and automation to managing Operators on Talos Linux. Instead of manually tracking Operator versions and applying updates, OLM handles discovery, installation, dependency resolution, and upgrades through a declarative interface. Install OLM, browse the available catalogs, subscribe to the Operators you need, and let OLM handle the rest. For production clusters, use manual approval for updates and keep OperatorGroup scopes as narrow as possible.
