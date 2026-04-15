# How to Automate Dapr Component Lifecycle with Operators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Operator, Automation, Lifecycle, Kubernetes

Description: Automate Dapr component lifecycle management using custom Kubernetes operators to provision, update, and decommission components based on higher-level tenant or environment CRDs.

---

## Why Automate Component Lifecycle?

Managing Dapr Component CRDs manually scales poorly. When you onboard a new tenant, you need to create state store, pub/sub, secret store, and configuration resources. A custom Kubernetes operator can watch higher-level CRDs (like a `Tenant` resource) and automatically reconcile the corresponding Dapr components.

## Custom Tenant CRD

Define a higher-level `Tenant` CRD that the operator watches:

```yaml
apiVersion: myplatform.io/v1alpha1
kind: Tenant
metadata:
  name: acme-corp
  namespace: tenant-acme
spec:
  plan: premium
  stateBackend:
    type: redis
    host: "redis.tenant-acme.svc.cluster.local:6379"
  messagingBackend:
    type: kafka
    brokers: "kafka.tenant-acme.svc.cluster.local:9092"
```

## Operator Reconciliation Logic

The operator watches for `Tenant` resources and creates/updates Dapr components:

```go
func (r *TenantReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // Load the Tenant resource
    tenant := &myplatformv1.Tenant{}
    if err := r.Get(ctx, req.NamespacedName, tenant); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Build the Dapr state store component
    stateStore := buildStateStoreComponent(tenant)

    // Create or update the component
    if err := r.createOrUpdate(ctx, stateStore); err != nil {
        return ctrl.Result{}, err
    }

    // Build and apply pub/sub component
    pubsub := buildPubSubComponent(tenant)
    if err := r.createOrUpdate(ctx, pubsub); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

## Building Component Manifests Programmatically

```go
func buildStateStoreComponent(tenant *myplatformv1.Tenant) *daprv1.Component {
    return &daprv1.Component{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "statestore",
            Namespace: tenant.Namespace,
            OwnerReferences: []metav1.OwnerReference{
                *metav1.NewControllerRef(tenant, myplatformv1.GroupVersion.WithKind("Tenant")),
            },
        },
        Spec: daprv1.ComponentSpec{
            Type:    "state.redis",
            Version: "v1",
            Metadata: []common.NameValuePair{
                {Name: "redisHost", Value: common.DynamicValue{JSON: apiextensionsv1.JSON{Raw: []byte(`"` + tenant.Spec.StateBackend.Host + `"`)}}},
            },
        },
    }
}
```

## Handling Deletion with Finalizers

Add a finalizer to clean up Dapr components when a tenant is deleted:

```go
const tenantFinalizer = "myplatform.io/tenant-cleanup"

func (r *TenantReconciler) handleDeletion(ctx context.Context, tenant *myplatformv1.Tenant) error {
    // Delete all Dapr components in the tenant namespace
    componentList := &daprv1.ComponentList{}
    r.List(ctx, componentList, client.InNamespace(tenant.Namespace))
    for _, comp := range componentList.Items {
        r.Delete(ctx, &comp)
    }
    return nil
}
```

## Deploying the Operator

```bash
# Build and push operator image
docker build -t myregistry/tenant-operator:latest .
docker push myregistry/tenant-operator:latest

# Deploy to cluster
kubectl apply -f ./config/crd/
kubectl apply -f ./config/rbac/
kubectl apply -f ./config/manager/
```

## Verifying Operator Behavior

```bash
# Create a tenant resource
kubectl apply -f tenant-acme.yaml

# Verify operator created Dapr components
kubectl get components -n tenant-acme
# NAME         AGE
# statestore   5s
# pubsub       5s
```

## Summary

Custom Kubernetes operators enable automated Dapr component lifecycle management at scale. By defining higher-level CRDs (such as `Tenant`) and writing operators that reconcile them into Dapr Component CRDs, you eliminate manual component management, ensure consistency, and integrate component provisioning with your platform's onboarding and offboarding workflows using owner references for automatic garbage collection.
