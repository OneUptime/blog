# How to Manage Istio CRDs with Kubernetes Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Operator, CRDs, Automation

Description: Build and use Kubernetes operators to manage Istio custom resource definitions for automated mesh configuration and lifecycle management.

---

Kubernetes operators extend the cluster with custom controllers that watch for changes and reconcile desired state. For Istio, an operator can automate common tasks like creating VirtualServices when new services appear, enforcing security policies across namespaces, or managing canary rollouts based on metrics.

The Istio project itself ships an operator (the IstioOperator), but you can also build your own operators that manage Istio CRDs to implement your organization's specific patterns. This guide covers both approaches.

## The Istio Operator

Istio includes a built-in operator that manages the installation and configuration of Istio itself. Install it:

```bash
istioctl operator init
```

This deploys the operator controller into the `istio-operator` namespace. Now you can manage Istio through an IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    enableAutoMtls: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
          service:
            type: LoadBalancer
```

Apply it:

```bash
kubectl apply -f istio-operator.yaml
```

The operator watches for changes to this resource and reconciles the Istio installation automatically. Change a value and the operator handles the upgrade.

## Why Build Custom Operators for Istio CRDs

The built-in operator manages Istio installation. But what about managing the day-to-day Istio resources your services use? That is where custom operators come in.

Common use cases:
- Automatically create VirtualService and DestinationRule when a new Service is deployed
- Enforce AuthorizationPolicy based on namespace labels
- Implement canary deployment logic that adjusts traffic weights based on error rates
- Sync Istio configuration across multiple clusters

## Building a Custom Operator with Kubebuilder

Initialize a new operator project:

```bash
kubebuilder init --domain example.com --repo github.com/example/istio-config-operator
kubebuilder create api --group mesh --version v1alpha1 --kind ServiceMesh
```

Define your custom resource spec:

```go
// api/v1alpha1/servicemesh_types.go
package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ServiceMeshSpec struct {
	ServiceName    string   `json:"serviceName"`
	Port           int32    `json:"port"`
	ExternalHost   string   `json:"externalHost,omitempty"`
	Gateway        string   `json:"gateway,omitempty"`
	Timeout        string   `json:"timeout,omitempty"`
	RetryAttempts  int32    `json:"retryAttempts,omitempty"`
	MaxConnections int32    `json:"maxConnections,omitempty"`
	AllowedCallers []string `json:"allowedCallers,omitempty"`
}

type ServiceMeshStatus struct {
	VirtualServiceReady    bool   `json:"virtualServiceReady"`
	DestinationRuleReady   bool   `json:"destinationRuleReady"`
	AuthPolicyReady        bool   `json:"authPolicyReady"`
	LastReconciled         string `json:"lastReconciled,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

type ServiceMesh struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ServiceMeshSpec   `json:"spec,omitempty"`
	Status ServiceMeshStatus `json:"status,omitempty"`
}
```

## Implementing the Reconciler

The reconciler watches ServiceMesh resources and creates/updates the corresponding Istio CRDs:

```go
// controllers/servicemesh_controller.go
package controllers

import (
	"context"
	"fmt"
	"time"

	meshv1alpha1 "github.com/example/istio-config-operator/api/v1alpha1"
	networkingv1 "istio.io/client-go/pkg/apis/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

type ServiceMeshReconciler struct {
	client.Client
}

func (r *ServiceMeshReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Fetch the ServiceMesh resource
	var serviceMesh meshv1alpha1.ServiceMesh
	if err := r.Get(ctx, req.NamespacedName, &serviceMesh); err != nil {
		if errors.IsNotFound(err) {
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, err
	}

	logger.Info("Reconciling ServiceMesh", "name", serviceMesh.Name)

	// Reconcile VirtualService
	if err := r.reconcileVirtualService(ctx, &serviceMesh); err != nil {
		logger.Error(err, "Failed to reconcile VirtualService")
		return ctrl.Result{RequeueAfter: 30 * time.Second}, err
	}

	// Reconcile DestinationRule
	if err := r.reconcileDestinationRule(ctx, &serviceMesh); err != nil {
		logger.Error(err, "Failed to reconcile DestinationRule")
		return ctrl.Result{RequeueAfter: 30 * time.Second}, err
	}

	// Update status
	serviceMesh.Status.VirtualServiceReady = true
	serviceMesh.Status.DestinationRuleReady = true
	serviceMesh.Status.LastReconciled = time.Now().Format(time.RFC3339)

	if err := r.Status().Update(ctx, &serviceMesh); err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

func (r *ServiceMeshReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&meshv1alpha1.ServiceMesh{}).
		Complete(r)
}
```

## Building a Namespace Watcher Operator

A simpler but very useful operator pattern: watch for namespaces with specific labels and automatically apply Istio policies:

```go
func (r *NamespaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	var ns corev1.Namespace
	if err := r.Get(ctx, req.NamespacedName, &ns); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Only process namespaces with the mesh label
	if ns.Labels["istio-managed"] != "true" {
		return ctrl.Result{}, nil
	}

	logger.Info("Applying Istio policies to namespace", "namespace", ns.Name)

	// Apply default PeerAuthentication (strict mTLS)
	pa := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "security.istio.io/v1",
			"kind":       "PeerAuthentication",
			"metadata": map[string]interface{}{
				"name":      "default",
				"namespace": ns.Name,
			},
			"spec": map[string]interface{}{
				"mtls": map[string]interface{}{
					"mode": "STRICT",
				},
			},
		},
	}

	if err := r.applyResource(ctx, pa); err != nil {
		return ctrl.Result{}, err
	}

	// Apply deny-all AuthorizationPolicy
	authz := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "security.istio.io/v1",
			"kind":       "AuthorizationPolicy",
			"metadata": map[string]interface{}{
				"name":      "deny-all",
				"namespace": ns.Name,
			},
			"spec": map[string]interface{}{},
		},
	}

	if err := r.applyResource(ctx, authz); err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}
```

This operator ensures every managed namespace gets strict mTLS and a deny-all authorization policy. Individual services then opt in to specific callers through their own AuthorizationPolicy resources.

## Deploying the Operator

Build and push the operator image:

```bash
make docker-build docker-push IMG=registry.example.com/istio-config-operator:v1.0.0
```

Deploy to the cluster:

```bash
make deploy IMG=registry.example.com/istio-config-operator:v1.0.0
```

## Using Your Custom Operator

Now teams can create ServiceMesh resources instead of dealing with raw Istio CRDs:

```yaml
apiVersion: mesh.example.com/v1alpha1
kind: ServiceMesh
metadata:
  name: order-service
  namespace: production
spec:
  serviceName: order-service
  port: 8080
  timeout: "15s"
  retryAttempts: 3
  maxConnections: 150
  allowedCallers:
    - api-gateway
```

The operator creates and manages the VirtualService, DestinationRule, and AuthorizationPolicy automatically. If someone manually edits or deletes one of the generated resources, the operator reconciles it back to the desired state.

## Monitoring Operator Health

Add metrics to your operator for observability:

```bash
kubectl get servicemesh -A
kubectl describe servicemesh order-service -n production
```

Check the operator logs for reconciliation events:

```bash
kubectl logs -n istio-config-operator-system \
  deployment/istio-config-operator-controller-manager \
  -f
```

Building a Kubernetes operator for Istio CRDs is the most powerful way to codify your organization's service mesh practices. It turns tribal knowledge about "how we configure Istio here" into automated, self-healing infrastructure. The operator pattern ensures consistency, reduces human error, and gives teams a simple API to work with while the complexity stays hidden behind the controller logic.
