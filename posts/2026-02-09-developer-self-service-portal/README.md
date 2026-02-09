# How to Build a Developer Self-Service Portal for Kubernetes Namespace Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps, Self-Service, Automation, Platform

Description: Build a developer self-service portal that automates Kubernetes namespace provisioning with proper RBAC, resource quotas, and network policies to accelerate development workflows.

---

Waiting for infrastructure teams to provision development environments slows down engineering velocity. A self-service portal that lets developers create their own Kubernetes namespaces with appropriate guardrails removes this bottleneck while maintaining security and resource governance.

This guide walks through building a complete self-service portal that provisions namespaces with proper RBAC, resource quotas, network policies, and monitoring integration. The result is faster developer onboarding and reduced operational overhead.

## Architecture Overview

The portal consists of several components:

- Web frontend for namespace requests
- Backend API for orchestration
- Kubernetes operator for resource provisioning
- Authentication integration with your identity provider
- Notification system for status updates

We'll build this using Go for the backend, React for the frontend, and the Kubernetes operator pattern for reliable provisioning.

## Setting Up the Backend API

Create a Go service that handles namespace provisioning requests:

```go
// main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"

    "github.com/gorilla/mux"
    corev1 "k8s.io/api/core/v1"
    rbacv1 "k8s.io/api/rbac/v1"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type NamespaceRequest struct {
    Name        string `json:"name"`
    Owner       string `json:"owner"`
    Team        string `json:"team"`
    Environment string `json:"environment"`
    CPUQuota    string `json:"cpuQuota"`
    MemoryQuota string `json:"memoryQuota"`
}

type NamespaceProvisioner struct {
    clientset *kubernetes.Clientset
}

func NewNamespaceProvisioner() (*NamespaceProvisioner, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &NamespaceProvisioner{clientset: clientset}, nil
}

func (np *NamespaceProvisioner) ProvisionNamespace(req NamespaceRequest) error {
    ctx := context.Background()

    // Generate namespace name with prefix
    nsName := fmt.Sprintf("dev-%s-%s", req.Team, req.Name)

    // Create namespace
    if err := np.createNamespace(ctx, nsName, req); err != nil {
        return fmt.Errorf("failed to create namespace: %w", err)
    }

    // Create resource quota
    if err := np.createResourceQuota(ctx, nsName, req); err != nil {
        return fmt.Errorf("failed to create resource quota: %w", err)
    }

    // Create network policy
    if err := np.createNetworkPolicy(ctx, nsName); err != nil {
        return fmt.Errorf("failed to create network policy: %w", err)
    }

    // Create RBAC role and binding
    if err := np.createRBAC(ctx, nsName, req.Owner); err != nil {
        return fmt.Errorf("failed to create RBAC: %w", err)
    }

    // Create limit range
    if err := np.createLimitRange(ctx, nsName); err != nil {
        return fmt.Errorf("failed to create limit range: %w", err)
    }

    return nil
}

func (np *NamespaceProvisioner) createNamespace(ctx context.Context, name string, req NamespaceRequest) error {
    namespace := &corev1.Namespace{
        ObjectMeta: metav1.ObjectMeta{
            Name: name,
            Labels: map[string]string{
                "team":        req.Team,
                "owner":       req.Owner,
                "environment": req.Environment,
                "managed-by":  "self-service-portal",
            },
            Annotations: map[string]string{
                "portal.company.com/owner":       req.Owner,
                "portal.company.com/created-at":  metav1.Now().String(),
                "portal.company.com/team":        req.Team,
            },
        },
    }

    _, err := np.clientset.CoreV1().Namespaces().Create(ctx, namespace, metav1.CreateOptions{})
    return err
}

func (np *NamespaceProvisioner) createResourceQuota(ctx context.Context, namespace string, req NamespaceRequest) error {
    quota := &corev1.ResourceQuota{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "default-quota",
            Namespace: namespace,
        },
        Spec: corev1.ResourceQuotaSpec{
            Hard: corev1.ResourceList{
                corev1.ResourceRequestsCPU:    resource.MustParse(req.CPUQuota),
                corev1.ResourceRequestsMemory: resource.MustParse(req.MemoryQuota),
                corev1.ResourceLimitsCPU:      resource.MustParse(req.CPUQuota),
                corev1.ResourceLimitsMemory:   resource.MustParse(req.MemoryQuota),
                corev1.ResourcePods:           resource.MustParse("50"),
                corev1.ResourceServices:       resource.MustParse("10"),
            },
        },
    }

    _, err := np.clientset.CoreV1().ResourceQuotas(namespace).Create(ctx, quota, metav1.CreateOptions{})
    return err
}

func (np *NamespaceProvisioner) createNetworkPolicy(ctx context.Context, namespace string) error {
    // Default deny all ingress
    networkPolicy := &networkingv1.NetworkPolicy{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "default-deny-ingress",
            Namespace: namespace,
        },
        Spec: networkingv1.NetworkPolicySpec{
            PodSelector: metav1.LabelSelector{},
            PolicyTypes: []networkingv1.PolicyType{
                networkingv1.PolicyTypeIngress,
            },
        },
    }

    _, err := np.clientset.NetworkingV1().NetworkPolicies(namespace).Create(ctx, networkPolicy, metav1.CreateOptions{})
    if err != nil {
        return err
    }

    // Allow traffic within namespace
    allowInternalPolicy := &networkingv1.NetworkPolicy{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "allow-same-namespace",
            Namespace: namespace,
        },
        Spec: networkingv1.NetworkPolicySpec{
            PodSelector: metav1.LabelSelector{},
            Ingress: []networkingv1.NetworkPolicyIngressRule{
                {
                    From: []networkingv1.NetworkPolicyPeer{
                        {
                            PodSelector: &metav1.LabelSelector{},
                        },
                    },
                },
            },
        },
    }

    _, err = np.clientset.NetworkingV1().NetworkPolicies(namespace).Create(ctx, allowInternalPolicy, metav1.CreateOptions{})
    return err
}

func (np *NamespaceProvisioner) createRBAC(ctx context.Context, namespace, owner string) error {
    // Create role with full permissions in namespace
    role := &rbacv1.Role{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "namespace-admin",
            Namespace: namespace,
        },
        Rules: []rbacv1.PolicyRule{
            {
                APIGroups: []string{"*"},
                Resources: []string{"*"},
                Verbs:     []string{"*"},
            },
        },
    }

    _, err := np.clientset.RbacV1().Roles(namespace).Create(ctx, role, metav1.CreateOptions{})
    if err != nil {
        return err
    }

    // Create role binding for owner
    roleBinding := &rbacv1.RoleBinding{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "namespace-admin-binding",
            Namespace: namespace,
        },
        RoleRef: rbacv1.RoleRef{
            APIGroup: "rbac.authorization.k8s.io",
            Kind:     "Role",
            Name:     "namespace-admin",
        },
        Subjects: []rbacv1.Subject{
            {
                Kind: "User",
                Name: owner,
            },
        },
    }

    _, err = np.clientset.RbacV1().RoleBindings(namespace).Create(ctx, roleBinding, metav1.CreateOptions{})
    return err
}

func (np *NamespaceProvisioner) createLimitRange(ctx context.Context, namespace string) error {
    limitRange := &corev1.LimitRange{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "default-limits",
            Namespace: namespace,
        },
        Spec: corev1.LimitRangeSpec{
            Limits: []corev1.LimitRangeItem{
                {
                    Type: corev1.LimitTypeContainer,
                    Default: corev1.ResourceList{
                        corev1.ResourceCPU:    resource.MustParse("500m"),
                        corev1.ResourceMemory: resource.MustParse("512Mi"),
                    },
                    DefaultRequest: corev1.ResourceList{
                        corev1.ResourceCPU:    resource.MustParse("100m"),
                        corev1.ResourceMemory: resource.MustParse("128Mi"),
                    },
                },
            },
        },
    }

    _, err := np.clientset.CoreV1().LimitRanges(namespace).Create(ctx, limitRange, metav1.CreateOptions{})
    return err
}

// HTTP handlers
func (np *NamespaceProvisioner) handleProvisionRequest(w http.ResponseWriter, r *http.Request) {
    var req NamespaceRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Validate request
    if err := validateRequest(req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Provision namespace
    if err := np.ProvisionNamespace(req); err != nil {
        log.Printf("Failed to provision namespace: %v", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{
        "status":    "success",
        "namespace": fmt.Sprintf("dev-%s-%s", req.Team, req.Name),
    })
}

func validateRequest(req NamespaceRequest) error {
    if req.Name == "" || req.Owner == "" || req.Team == "" {
        return fmt.Errorf("name, owner, and team are required")
    }

    // Validate resource quotas
    if _, err := resource.ParseQuantity(req.CPUQuota); err != nil {
        return fmt.Errorf("invalid CPU quota: %w", err)
    }

    if _, err := resource.ParseQuantity(req.MemoryQuota); err != nil {
        return fmt.Errorf("invalid memory quota: %w", err)
    }

    return nil
}

func main() {
    provisioner, err := NewNamespaceProvisioner()
    if err != nil {
        log.Fatalf("Failed to create provisioner: %v", err)
    }

    r := mux.NewRouter()
    r.HandleFunc("/api/namespaces", provisioner.handleProvisionRequest).Methods("POST")
    r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    }).Methods("GET")

    log.Println("Starting self-service portal on :8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}
```

## Building the Frontend Interface

Create a React form for namespace requests:

```jsx
// NamespaceRequestForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

function NamespaceRequestForm() {
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    team: '',
    environment: 'development',
    cpuQuota: '4',
    memoryQuota: '8Gi',
  });

  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Provisioning namespace...' });

    try {
      const response = await axios.post('/api/namespaces', formData);
      setStatus({
        type: 'success',
        message: `Namespace ${response.data.namespace} created successfully!`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data || 'Failed to create namespace',
      });
    }
  };

  return (
    <div className="namespace-form">
      <h2>Request Development Namespace</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Namespace Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            pattern="[a-z0-9-]+"
            required
          />
          <small>Lowercase letters, numbers, and hyphens only</small>
        </div>

        <div className="form-group">
          <label>Owner Email:</label>
          <input
            type="email"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Team:</label>
          <select
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            required
          >
            <option value="">Select team...</option>
            <option value="platform">Platform</option>
            <option value="api">API</option>
            <option value="frontend">Frontend</option>
            <option value="data">Data</option>
          </select>
        </div>

        <div className="form-group">
          <label>Environment:</label>
          <select
            value={formData.environment}
            onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
          >
            <option value="development">Development</option>
            <option value="staging">Staging</option>
          </select>
        </div>

        <div className="form-group">
          <label>CPU Quota (cores):</label>
          <input
            type="number"
            value={formData.cpuQuota}
            onChange={(e) => setFormData({ ...formData, cpuQuota: e.target.value })}
            min="1"
            max="16"
            required
          />
        </div>

        <div className="form-group">
          <label>Memory Quota:</label>
          <select
            value={formData.memoryQuota}
            onChange={(e) => setFormData({ ...formData, memoryQuota: e.target.value })}
          >
            <option value="4Gi">4 GiB</option>
            <option value="8Gi">8 GiB</option>
            <option value="16Gi">16 GiB</option>
            <option value="32Gi">32 GiB</option>
          </select>
        </div>

        <button type="submit">Create Namespace</button>
      </form>

      {status && (
        <div className={`status status-${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default NamespaceRequestForm;
```

## Deploying the Portal to Kubernetes

Create a deployment manifest:

```yaml
# deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: namespace-provisioner
  namespace: self-service
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-provisioner
rules:
- apiGroups: [""]
  resources: ["namespaces", "resourcequotas", "limitranges"]
  verbs: ["create", "get", "list", "watch"]
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "rolebindings"]
  verbs: ["create", "get", "list"]
- apiGroups: ["networking.k8s.io"]
  resources: ["networkpolicies"]
  verbs: ["create", "get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: namespace-provisioner
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: namespace-provisioner
subjects:
- kind: ServiceAccount
  name: namespace-provisioner
  namespace: self-service
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: namespace-provisioner
  namespace: self-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: namespace-provisioner
  template:
    metadata:
      labels:
        app: namespace-provisioner
    spec:
      serviceAccountName: namespace-provisioner
      containers:
      - name: api
        image: myregistry/namespace-provisioner:latest
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: namespace-provisioner
  namespace: self-service
spec:
  selector:
    app: namespace-provisioner
  ports:
  - port: 80
    targetPort: 8080
```

Deploy the portal:

```bash
kubectl create namespace self-service
kubectl apply -f deployment.yaml
```

## Adding Approval Workflow

Implement an approval process for production namespaces:

```go
type NamespaceRequest struct {
    Name        string `json:"name"`
    Owner       string `json:"owner"`
    Team        string `json:"team"`
    Environment string `json:"environment"`
    CPUQuota    string `json:"cpuQuota"`
    MemoryQuota string `json:"memoryQuota"`
    Status      string `json:"status"` // pending, approved, rejected
    ApprovedBy  string `json:"approvedBy"`
}

func (np *NamespaceProvisioner) handleProvisionRequest(w http.ResponseWriter, r *http.Request) {
    var req NamespaceRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Production environments require approval
    if req.Environment == "production" {
        req.Status = "pending"
        // Store request in database for approval
        if err := np.storeRequest(req); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        // Send notification to approvers
        np.notifyApprovers(req)

        w.WriteHeader(http.StatusAccepted)
        json.NewEncoder(w).Encode(map[string]string{
            "status":  "pending_approval",
            "message": "Request submitted for approval",
        })
        return
    }

    // Auto-approve development namespaces
    if err := np.ProvisionNamespace(req); err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{
        "status":    "success",
        "namespace": fmt.Sprintf("dev-%s-%s", req.Team, req.Name),
    })
}
```

Building a self-service portal for namespace provisioning removes manual bottlenecks while maintaining governance. Developers get environments faster, and platform teams gain consistent, auditable provisioning with appropriate guardrails.
