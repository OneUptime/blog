# How to Use OpenShift Operators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Operators, Kubernetes, Automation, DevOps

Description: Learn how OpenShift Operators work, how to install them from OperatorHub, configure them safely, and manage upgrades in production.

---

Operators package Kubernetes expertise into reusable controllers. In OpenShift, Operators power core platform services and simplify app and database management. This guide covers how to find, install, and operate them safely.

## What Is an Operator

An Operator is a controller that extends Kubernetes with domain-specific automation. It typically ships with:

- Custom Resource Definitions (CRDs)
- A controller that reconciles desired state
- Optional UI integrations in OpenShift

If you can install a CRD and then apply a custom resource to deploy and manage a product, you are using an Operator.

## Where Operators Live in OpenShift

OpenShift provides OperatorHub, which aggregates operators from multiple catalogs:

- Red Hat certified operators
- Community operators
- Custom or internal catalogs

Most production environments prefer certified operators for security and support.

## Step 1: Find an Operator

In the OpenShift web console:

1. Go to **Operators → OperatorHub**
2. Search for the operator you want
3. Review its documentation, channels, and supported versions

## Step 2: Choose an Installation Mode

Operators can be installed in two common modes:

- **All namespaces**: One operator manages resources across the cluster.
- **Single namespace**: The operator only watches one namespace.

Single-namespace is safer for multi-tenant environments.

## Step 3: Install the Operator

You can install via the UI or with YAML. Example `Subscription` resource:

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: postgresql-operator
  namespace: openshift-operators
spec:
  channel: stable
  name: postgresql
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  installPlanApproval: Automatic
```

## Step 4: Create a Custom Resource

Once installed, create the CR that the operator manages. Example:

```yaml
apiVersion: postgresql.example.com/v1
kind: PostgresCluster
metadata:
  name: orders-db
spec:
  instances: 3
  storage:
    size: 100Gi
  backup:
    enabled: true
```

The operator will reconcile this resource and create the required pods, services, and storage.

## Managing Upgrades

Operators update via channels. You can choose:

- **Automatic upgrades**: Easy but less controlled.
- **Manual approval**: You approve each upgrade via `InstallPlan`.

For production, manual approval is safer so you can test upgrades first.

## Monitoring Operator Health

Watch the operator status:

- `Subscription` status for channel and install progress
- `ClusterServiceVersion` for phase and readiness
- `OperatorGroup` scope issues

Useful commands:

```bash
oc get subscription -n openshift-operators
oc get csv -n openshift-operators
oc describe csv <operator-csv-name> -n openshift-operators
```

## Common Pitfalls

- **Wrong namespace scope**: Operator cannot see your CRs.
- **Channel mismatch**: You are on a deprecated or unsupported channel.
- **RBAC issues**: The operator lacks permissions to create resources.

## Best Practices

- Use single-namespace operators in shared clusters.
- Pin to a stable channel and review upgrade notes.
- Store custom resources in Git to keep deployments reproducible.

## Conclusion

OpenShift Operators are a powerful way to run complex software with less manual work. Install them from trusted catalogs, choose the right scope, and treat upgrades like any other production change.
