# How to Use Operator Pattern for Scheduling-Related Custom Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operators, Custom Resources

Description: Learn how to build Kubernetes operators that manage scheduling-related custom resources, automating complex scheduling decisions and creating higher-level abstractions for workload placement.

---

While Kubernetes provides powerful scheduling primitives, sometimes you need custom logic to automate scheduling decisions. The Operator pattern allows you to create custom controllers that watch custom resources and make intelligent scheduling decisions based on your specific requirements.

Operators can manage complex scheduling scenarios like automatic node pool selection, workload-aware placement, cost optimization, and multi-cluster scheduling that would be tedious to configure manually.

## Understanding the Operator Pattern for Scheduling

An operator consists of:

- **Custom Resource Definition (CRD)**: Defines your custom scheduling resource
- **Controller**: Watches the CRD and reconciles desired state
- **Scheduler Integration**: Interacts with Kubernetes scheduler or creates scheduler plugins
- **Reconciliation Loop**: Continuously ensures scheduling matches desired configuration

## Creating a Workload Placement CRD

Define a custom resource for workload placement policies:

```yaml
# workloadplacement-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: workloadplacements.scheduling.example.com
spec:
  group: scheduling.example.com
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              workloadType:
                type: string
                enum: ["compute", "memory", "storage", "gpu"]
              priority:
                type: string
                enum: ["critical", "high", "medium", "low"]
              costOptimization:
                type: boolean
              multiZone:
                type: boolean
              nodePoolPreferences:
                type: array
                items:
                  type: string
          status:
            type: object
            properties:
              phase:
                type: string
              selectedNodePool:
                type: string
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    reason:
                      type: string
  scope: Namespaced
  names:
    plural: workloadplacements
    singular: workloadplacement
    kind: WorkloadPlacement
    shortNames:
    - wp
```

Apply the CRD:

```bash
kubectl apply -f workloadplacement-crd.yaml
kubectl get crd workloadplacements.scheduling.example.com
```

## Using the WorkloadPlacement Resource

Create workload placement policies:

```yaml
# gpu-workload-placement.yaml
apiVersion: scheduling.example.com/v1alpha1
kind: WorkloadPlacement
metadata:
  name: ml-training-placement
  namespace: ml-workloads
spec:
  workloadType: gpu
  priority: high
  costOptimization: false
  multiZone: true
  nodePoolPreferences:
  - gpu-a100-pool
  - gpu-v100-pool
---
# deployment-with-placement.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
  namespace: ml-workloads
  labels:
    workload-placement: ml-training-placement
spec:
  replicas: 4
  selector:
    matchLabels:
      app: ml-training
  template:
    metadata:
      labels:
        app: ml-training
    spec:
      containers:
      - name: trainer
        image: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
        resources:
          limits:
            nvidia.com/gpu: 2
```

## Building the Operator Controller

Here's a simplified controller in Go using the controller-runtime library:

```go
// workloadplacement_controller.go
package controller

import (
    "context"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"

    schedulingv1alpha1 "example.com/api/v1alpha1"
)

type WorkloadPlacementReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *WorkloadPlacementReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var placement schedulingv1alpha1.WorkloadPlacement
    if err := r.Get(ctx, req.NamespacedName, &placement); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Select appropriate node pool based on workload type
    nodePool := r.selectNodePool(&placement)

    // Find deployments with matching label
    var deployments appsv1.DeploymentList
    err := r.List(ctx, &deployments,
        client.InNamespace(placement.Namespace),
        client.MatchingLabels{"workload-placement": placement.Name})

    if err != nil {
        return ctrl.Result{}, err
    }

    // Update deployment with node selector and tolerations
    for _, deploy := range deployments.Items {
        updated := r.applyPlacementPolicy(&deploy, &placement, nodePool)
        if err := r.Update(ctx, &updated); err != nil {
            return ctrl.Result{}, err
        }
    }

    // Update placement status
    placement.Status.Phase = "Active"
    placement.Status.SelectedNodePool = nodePool
    if err := r.Status().Update(ctx, &placement); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}

func (r *WorkloadPlacementReconciler) selectNodePool(placement *schedulingv1alpha1.WorkloadPlacement) string {
    // Logic to select node pool based on workload type, priority, and cost optimization
    if placement.Spec.CostOptimization {
        return r.selectCostOptimizedPool(placement)
    }

    // Select first preferred pool that has capacity
    for _, pool := range placement.Spec.NodePoolPreferences {
        if r.hasCapacity(pool, placement.Spec.WorkloadType) {
            return pool
        }
    }

    return placement.Spec.NodePoolPreferences[0]
}

func (r *WorkloadPlacementReconciler) applyPlacementPolicy(
    deploy *appsv1.Deployment,
    placement *schedulingv1alpha1.WorkloadPlacement,
    nodePool string) appsv1.Deployment {

    // Add node selector for selected pool
    if deploy.Spec.Template.Spec.NodeSelector == nil {
        deploy.Spec.Template.Spec.NodeSelector = make(map[string]string)
    }
    deploy.Spec.Template.Spec.NodeSelector["node-pool"] = nodePool

    // Add tolerations based on workload type
    if placement.Spec.WorkloadType == "gpu" {
        deploy.Spec.Template.Spec.Tolerations = append(
            deploy.Spec.Template.Spec.Tolerations,
            corev1.Toleration{
                Key:      "workload",
                Operator: "Equal",
                Value:    "gpu",
                Effect:   "NoSchedule",
            })
    }

    // Add topology spread constraints for multi-zone
    if placement.Spec.MultiZone {
        deploy.Spec.Template.Spec.TopologySpreadConstraints = []corev1.TopologySpreadConstraint{
            {
                MaxSkew:           1,
                TopologyKey:       "topology.kubernetes.io/zone",
                WhenUnsatisfiable: "DoNotSchedule",
                LabelSelector: &metav1.LabelSelector{
                    MatchLabels: deploy.Spec.Selector.MatchLabels,
                },
            },
        }
    }

    return *deploy
}

func (r *WorkloadPlacementReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&schedulingv1alpha1.WorkloadPlacement{}).
        Complete(r)
}
```

## Cost-Optimized Scheduling Operator

Create an operator that optimizes for cost by choosing spot instances when possible:

```yaml
# costoptimization-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: costoptimizations.scheduling.example.com
spec:
  group: scheduling.example.com
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              maxSpotPercentage:
                type: integer
                minimum: 0
                maximum: 100
              fallbackToOnDemand:
                type: boolean
              costTarget:
                type: string
                enum: ["minimize", "balance", "performance"]
  scope: Namespaced
  names:
    plural: costoptimizations
    singular: costoptimization
    kind: CostOptimization
---
apiVersion: scheduling.example.com/v1alpha1
kind: CostOptimization
metadata:
  name: batch-jobs-cost-opt
  namespace: batch
spec:
  maxSpotPercentage: 80
  fallbackToOnDemand: true
  costTarget: minimize
```

## Node Pool Manager Operator

Automatically manage node pool assignments:

```yaml
# nodepoolassignment-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: nodepoolassignments.scheduling.example.com
spec:
  group: scheduling.example.com
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              namespaceSelector:
                type: object
                properties:
                  matchLabels:
                    type: object
                    additionalProperties:
                      type: string
              targetNodePool:
                type: string
              autoScale:
                type: boolean
              minNodes:
                type: integer
              maxNodes:
                type: integer
  scope: Cluster
  names:
    plural: nodepoolassignments
    singular: nodepoolassignment
    kind: NodePoolAssignment
---
apiVersion: scheduling.example.com/v1alpha1
kind: NodePoolAssignment
metadata:
  name: ml-namespace-assignment
spec:
  namespaceSelector:
    matchLabels:
      team: ml-engineering
  targetNodePool: gpu-pool
  autoScale: true
  minNodes: 2
  maxNodes: 20
```

## Scheduling Policy Operator

Enforce organization-wide scheduling policies:

```yaml
# schedulingpolicy-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: schedulingpolicies.scheduling.example.com
spec:
  group: scheduling.example.com
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              rules:
                type: array
                items:
                  type: object
                  properties:
                    name:
                      type: string
                    condition:
                      type: string
                    action:
                      type: string
                    parameters:
                      type: object
                      additionalProperties:
                        type: string
  scope: Cluster
  names:
    plural: schedulingpolicies
    singular: schedulingpolicy
    kind: SchedulingPolicy
---
apiVersion: scheduling.example.com/v1alpha1
kind: SchedulingPolicy
metadata:
  name: org-wide-policy
spec:
  rules:
  - name: production-isolation
    condition: "namespace.labels.environment == 'production'"
    action: add-node-selector
    parameters:
      environment: production
  - name: gpu-workload-taints
    condition: "pod.resources.nvidia.com/gpu > 0"
    action: add-toleration
    parameters:
      key: dedicated
      value: gpu
      effect: NoSchedule
  - name: multi-zone-ha
    condition: "deployment.replicas >= 3"
    action: add-topology-spread
    parameters:
      maxSkew: "1"
      topologyKey: topology.kubernetes.io/zone
```

## Deploying the Operator

Create the operator deployment:

```yaml
# operator-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: scheduling-operator
  namespace: scheduling-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: scheduling-operator
rules:
- apiGroups: ["scheduling.example.com"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "watch", "update", "patch"]
- apiGroups: [""]
  resources: ["pods", "nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: scheduling-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: scheduling-operator
subjects:
- kind: ServiceAccount
  name: scheduling-operator
  namespace: scheduling-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scheduling-operator
  namespace: scheduling-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: scheduling-operator
  template:
    metadata:
      labels:
        app: scheduling-operator
    spec:
      serviceAccountName: scheduling-operator
      containers:
      - name: operator
        image: scheduling-operator:v1.0
        command:
        - /manager
        resources:
          limits:
            cpu: 500m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi
```

## Monitoring Operator Operations

Track operator activity:

```bash
# View operator logs
kubectl logs -n scheduling-system deployment/scheduling-operator --tail=100 -f

# Check custom resource status
kubectl get workloadplacement -A
kubectl describe workloadplacement ml-training-placement -n ml-workloads

# View reconciliation events
kubectl get events -n ml-workloads --sort-by='.lastTimestamp' | grep WorkloadPlacement
```

## Best Practices

1. **Idempotent Reconciliation**: Ensure controller can be run multiple times safely
2. **Status Subresource**: Use status to report current state
3. **Finalizers**: Clean up resources when CR is deleted
4. **Validation**: Add OpenAPI validation to CRD
5. **Webhooks**: Use admission webhooks for complex validation
6. **Rate Limiting**: Implement backoff for failed reconciliations
7. **Metrics**: Export Prometheus metrics for operator health
8. **Testing**: Write comprehensive unit and integration tests

## Troubleshooting

If operator isn't working:

```bash
# Check operator is running
kubectl get pods -n scheduling-system

# View operator logs
kubectl logs -n scheduling-system -l app=scheduling-operator

# Verify CRD exists
kubectl get crd | grep scheduling.example.com

# Check RBAC permissions
kubectl auth can-i update deployments --as=system:serviceaccount:scheduling-system:scheduling-operator

# Validate custom resource
kubectl get workloadplacement ml-training-placement -o yaml
```

Operators enable you to build powerful scheduling automation tailored to your organization's needs. By creating custom resources and controllers, you can abstract complex scheduling requirements into simple declarative configurations that your teams can easily use.

