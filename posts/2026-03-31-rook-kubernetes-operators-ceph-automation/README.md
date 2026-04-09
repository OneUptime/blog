# How to Create Kubernetes Operators for Ceph Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes Operator, Automation, Go

Description: Learn how to build a custom Kubernetes operator to automate Ceph management tasks like pool creation, quota enforcement, and health-based remediation.

---

While Rook provides a comprehensive Ceph operator, you may need custom automation that goes beyond its scope - such as enforcing organizational policies, automating multi-tenant pool provisioning, or implementing custom health remediation. Building a custom operator extends Rook's capabilities.

## When to Build a Custom Operator

Consider a custom operator when you need:
- Automatic pool creation when new namespaces are provisioned
- Quota enforcement based on team size or subscription tier
- Custom backup scheduling beyond what Rook provides
- Integration with internal CMDB or ticketing systems

## Setting Up the Operator SDK

```bash
# Install operator-sdk
curl -LO https://github.com/operator-framework/operator-sdk/releases/latest/download/operator-sdk_linux_amd64
chmod +x operator-sdk_linux_amd64
sudo mv operator-sdk_linux_amd64 /usr/local/bin/operator-sdk

# Initialize new operator project
mkdir ceph-pool-operator && cd ceph-pool-operator
operator-sdk init --domain example.com --repo github.com/example/ceph-pool-operator

# Create API
operator-sdk create api \
  --group storage \
  --version v1alpha1 \
  --kind TenantPool \
  --resource --controller
```

## Defining the CRD

```go
// api/v1alpha1/tenantpool_types.go
type TenantPoolSpec struct {
    TenantName  string `json:"tenantName"`
    SizeGB      int    `json:"sizeGB"`
    Replicas    int    `json:"replicas"`
    Compression bool   `json:"compression,omitempty"`
}

type TenantPoolStatus struct {
    Phase   string `json:"phase,omitempty"`
    PoolName string `json:"poolName,omitempty"`
}
```

## Writing the Controller Logic

```go
// internal/controller/tenantpool_controller.go
func (r *TenantPoolReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    var tenantPool storagev1alpha1.TenantPool
    if err := r.Get(ctx, req.NamespacedName, &tenantPool); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    poolName := fmt.Sprintf("tenant-%s-pool", tenantPool.Spec.TenantName)

    // Create CephBlockPool via Rook CRD
    cephPool := &rookv1.CephBlockPool{
        ObjectMeta: metav1.ObjectMeta{
            Name:      poolName,
            Namespace: "rook-ceph",
        },
        Spec: rookv1.NamedBlockPoolSpec{
            PoolSpec: rookv1.PoolSpec{
                Replicated: rookv1.ReplicatedSpec{
                    Size: uint(tenantPool.Spec.Replicas),
                },
            },
        },
    }

    if err := r.Create(ctx, cephPool); err != nil && !errors.IsAlreadyExists(err) {
        log.Error(err, "Failed to create CephBlockPool")
        return ctrl.Result{}, err
    }

    tenantPool.Status.Phase = "Ready"
    tenantPool.Status.PoolName = poolName
    r.Status().Update(ctx, &tenantPool)

    return ctrl.Result{RequeueAfter: 5 * time.Minute}, nil
}
```

## Deploying the Operator

```bash
# Build and push image
make docker-build docker-push IMG=myregistry/ceph-pool-operator:v0.1.0

# Deploy to cluster
make deploy IMG=myregistry/ceph-pool-operator:v0.1.0
```

## Using the Custom Resource

```yaml
apiVersion: storage.example.com/v1alpha1
kind: TenantPool
metadata:
  name: team-alpha-pool
spec:
  tenantName: team-alpha
  sizeGB: 500
  replicas: 3
  compression: true
```

```bash
kubectl apply -f tenant-pool.yaml
kubectl get tenantpool team-alpha-pool -o yaml
```

## Summary

Building a custom Kubernetes operator for Ceph automation extends Rook's capabilities with organization-specific logic. The Operator SDK simplifies project setup, and the reconciliation loop pattern ensures the actual cluster state converges to the desired state. Custom operators are most valuable for automating multi-tenant provisioning workflows and enforcing policies that need to respond to cluster events programmatically.
