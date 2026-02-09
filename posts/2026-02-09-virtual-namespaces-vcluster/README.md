# How to Use Virtual Namespaces with vcluster for Strong Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Namespaces, Multi-tenancy

Description: Learn how to implement virtual Kubernetes clusters using vcluster to achieve strong namespace isolation, improved multi-tenancy, and cost-effective cluster management.

---

Standard Kubernetes namespaces provide logical isolation, but they share the same control plane and have limited separation between resources. For strong multi-tenancy requirements, you need deeper isolation without the cost and complexity of running separate physical clusters. Virtual clusters solve this by creating isolated Kubernetes environments within a host cluster.

vcluster creates fully functional virtual Kubernetes clusters that run inside namespaces of a host cluster. Each virtual cluster has its own API server, controller manager, and data store, providing API-level isolation while sharing the underlying infrastructure.

## Understanding Virtual Clusters vs Regular Namespaces

Regular namespaces share the API server, which means namespace administrators can list all namespaces, see cluster-wide resources, and potentially access data from other tenants through misconfigured RBAC. Virtual clusters provide complete API isolation. Each tenant gets their own API endpoint and cannot see resources from other virtual clusters or the host cluster.

This makes vcluster ideal for development environments where developers need cluster-admin privileges, multi-tenant SaaS platforms, CI/CD pipeline isolation, and testing cluster upgrades or different Kubernetes versions.

## Installing vcluster

Install the vcluster CLI:

```bash
# Install vcluster CLI
curl -s -L "https://github.com/loft-sh/vcluster/releases/latest" | \
  sed -nE 's!.*"([^"]*vcluster-linux-amd64)".*!https://github.com\1!p' | \
  xargs -n 1 curl -L -o vcluster && \
  chmod +x vcluster && \
  sudo mv vcluster /usr/local/bin

# Verify installation
vcluster --version
```

## Creating Virtual Clusters

Create a basic virtual cluster:

```bash
# Create virtual cluster in a namespace
vcluster create dev-team-1 --namespace team-1

# This creates:
# - Namespace: team-1
# - Virtual cluster named dev-team-1
# - Connects your kubeconfig to the virtual cluster
```

The command automatically updates your kubeconfig and switches context to the virtual cluster.

## Custom vcluster Configuration

Create a virtual cluster with custom configuration:

```yaml
# vcluster-values.yaml
syncer:
  # Resources to sync from virtual to host cluster
  extraArgs:
  - --out-kube-config-server=https://vcluster-dev-team-1.example.com
  - --tls-san=vcluster-dev-team-1.example.com

# Enable pod security standards
  env:
  - name: ENFORCE_POD_SECURITY_STANDARD
    value: "restricted"

# Resource limits for the virtual cluster
vcluster:
  resources:
    limits:
      cpu: "2"
      memory: "4Gi"
    requests:
      cpu: "200m"
      memory: "512Mi"

  # Persistent storage for etcd
  storage:
    persistence: true
    size: 10Gi

# Enable CoreDNS
coredns:
  enabled: true
  replicas: 2

# Isolate workloads
isolation:
  enabled: true
  podSecurityStandard: restricted
  resourceQuota:
    enabled: true
    quota:
      requests.cpu: "10"
      requests.memory: "20Gi"
      pods: "50"
  limitRange:
    enabled: true
    default:
      cpu: "1"
      memory: "1Gi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"

# Network policies
networkPolicies:
  enabled: true

# Enable service sync
sync:
  services:
    enabled: true
  ingresses:
    enabled: true
  persistentvolumeclaims:
    enabled: true
```

Deploy with custom values:

```bash
vcluster create dev-team-1 \
  --namespace team-1 \
  --values vcluster-values.yaml \
  --expose \
  --connect=false
```

## Managing Multiple Virtual Clusters

Create multiple isolated virtual clusters for different teams:

```bash
# Team 1 - Development
vcluster create team1-dev --namespace team1-dev \
  --values team1-dev-values.yaml

# Team 2 - Development
vcluster create team2-dev --namespace team2-dev \
  --values team2-dev-values.yaml

# Staging environment
vcluster create staging --namespace staging \
  --values staging-values.yaml

# List all virtual clusters
vcluster list
```

## Connecting to Virtual Clusters

Switch between virtual clusters:

```bash
# Connect to a virtual cluster
vcluster connect team1-dev --namespace team1-dev

# Your kubectl commands now target the virtual cluster
kubectl get nodes
kubectl get namespaces

# Disconnect and return to host cluster
vcluster disconnect
```

## Advanced Isolation with Network Policies

Apply network policies to isolate virtual cluster workloads:

```yaml
# Apply on host cluster
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-vcluster-team1
  namespace: team1-dev
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from same namespace
  - from:
    - podSelector: {}
  # Allow from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  # Allow to same namespace
  - to:
    - podSelector: {}
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow to external services
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
```

## Implementing Resource Quotas per Virtual Cluster

Set resource limits for each virtual cluster:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: vcluster-quota
  namespace: team1-dev
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    persistentvolumeclaims: "20"
    services.loadbalancers: "3"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: vcluster-limits
  namespace: team1-dev
spec:
  limits:
  - max:
      cpu: "8"
      memory: "16Gi"
    min:
      cpu: "10m"
      memory: "64Mi"
    type: Container
  - max:
      cpu: "16"
      memory: "32Gi"
    min:
      cpu: "10m"
      memory: "64Mi"
    type: Pod
```

## Automating vcluster Provisioning

Create a controller to provision virtual clusters on demand:

```go
package main

import (
    "context"
    "fmt"
    "os/exec"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type VClusterProvisioner struct {
    clientset *kubernetes.Clientset
}

func NewVClusterProvisioner() (*VClusterProvisioner, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return &VClusterProvisioner{
        clientset: clientset,
    }, nil
}

func (vcp *VClusterProvisioner) ProvisionVCluster(
    ctx context.Context,
    name string,
    namespace string,
    team string,
) error {
    // Create namespace for vcluster
    ns := &corev1.Namespace{
        ObjectMeta: metav1.ObjectMeta{
            Name: namespace,
            Labels: map[string]string{
                "team":         team,
                "vcluster":     "true",
                "managed-by":   "vcluster-provisioner",
            },
        },
    }

    _, err := vcp.clientset.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
    if err != nil {
        return fmt.Errorf("failed to create namespace: %w", err)
    }

    // Create vcluster using CLI
    cmd := exec.Command(
        "vcluster",
        "create",
        name,
        "--namespace", namespace,
        "--values", fmt.Sprintf("/config/%s-values.yaml", team),
        "--connect=false",
    )

    output, err := cmd.CombinedOutput()
    if err != nil {
        return fmt.Errorf("failed to create vcluster: %w, output: %s", err, output)
    }

    fmt.Printf("Created vcluster %s in namespace %s\n", name, namespace)
    return nil
}

func (vcp *VClusterProvisioner) DeleteVCluster(
    ctx context.Context,
    name string,
    namespace string,
) error {
    cmd := exec.Command(
        "vcluster",
        "delete",
        name,
        "--namespace", namespace,
    )

    output, err := cmd.CombinedOutput()
    if err != nil {
        return fmt.Errorf("failed to delete vcluster: %w, output: %s", err, output)
    }

    // Delete namespace
    err = vcp.clientset.CoreV1().Namespaces().Delete(
        ctx,
        namespace,
        metav1.DeleteOptions{},
    )
    if err != nil {
        return fmt.Errorf("failed to delete namespace: %w", err)
    }

    fmt.Printf("Deleted vcluster %s and namespace %s\n", name, namespace)
    return nil
}

func main() {
    provisioner, err := NewVClusterProvisioner()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()

    // Example: Provision vcluster for team
    err = provisioner.ProvisionVCluster(
        ctx,
        "team-alpha-dev",
        "vcluster-team-alpha",
        "alpha",
    )
    if err != nil {
        panic(err)
    }
}
```

## Exposing Virtual Clusters

Expose virtual clusters with Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vcluster-team1-dev
  namespace: team1-dev
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - team1-dev.vclusters.example.com
    secretName: vcluster-team1-tls
  rules:
  - host: team1-dev.vclusters.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: team1-dev
            port:
              number: 443
```

## Monitoring Virtual Clusters

Deploy Prometheus monitoring for virtual clusters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-vcluster-config
  namespace: monitoring
data:
  vclusters.yaml: |
    - job_name: 'vcluster-metrics'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - team1-dev
          - team2-dev
          - staging
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: vcluster
        action: keep
      - source_labels: [__meta_kubernetes_namespace]
        target_label: vcluster_namespace
```

## Best Practices

Use virtual clusters for development and testing environments where teams need cluster-admin access. Apply resource quotas to prevent any single virtual cluster from consuming excessive resources. Implement network policies for additional isolation between virtual clusters. Use persistent storage for virtual cluster etcd to prevent data loss. Regular backup virtual cluster configurations and data. Monitor resource usage per virtual cluster and set up alerts. Consider using vcluster for temporary environments that can be quickly created and destroyed.

Virtual clusters with vcluster provide strong isolation while maintaining cost efficiency by sharing the underlying infrastructure, making them ideal for multi-tenant Kubernetes environments.
