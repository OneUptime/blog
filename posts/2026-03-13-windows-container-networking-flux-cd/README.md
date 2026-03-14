# How to Configure Windows Container Networking with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, Networking, CNI, GitOps, Services, Ingress

Description: Manage Windows container networking configuration using Flux CD, covering CNI plugins, service types, and network policy considerations specific to Windows nodes.

---

## Introduction

Windows container networking in Kubernetes has historically been more complex than Linux networking. Windows nodes use the Host Network Service (HNS) for container networking, which has different capabilities and limitations compared to Linux's network namespaces. Windows CNI plugins, network policy support, and service type availability have improved significantly in recent Kubernetes releases, but important differences remain.

Managing Windows networking configuration through Flux CD ensures that NetworkPolicy, Service, and Ingress resources are consistently deployed alongside the workloads they support. This guide covers the Windows-specific networking constraints, how to configure Flux-managed services for Windows workloads, and how to use network policies where Windows networking supports them.

## Prerequisites

- Kubernetes cluster with Windows Server 2022 nodes
- CNI plugin with Windows support (Calico on Windows, Antrea, or Azure CNI for AKS)
- Flux CD managing the cluster
- `kubectl` and `flux` CLI tools

## Step 1: Understand Windows Networking Limitations

Before configuring networking, understand what Windows nodes support.

```bash
# Check which CNI plugin is in use
kubectl get pods -n kube-system | grep -E "calico|antrea|azure-cni|flannel"

# Windows network mode affects what is supported:
# overlay mode: l2bridge (limited), vxlan (preferred)
# Host networking: supported but limited use cases
# Network Policies: supported with Calico/Antrea on Windows

# Check Windows node network configuration
kubectl describe node windows-worker-1 | grep -A 10 "Node Info"
```

Key Windows container networking constraints:
- `hostNetwork: true` has limitations on Windows (some networking features differ)
- IPv6 dual-stack has limited support on Windows containers
- NodePort services work differently on Windows (uses `winproxy` for load balancing)
- Network policies require a Windows-compatible CNI (Calico or Antrea)

## Step 2: Configure ClusterIP Services for Windows Workloads

```yaml
# apps/base/windows-workloads/iis-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: iis-app
  namespace: windows-workloads
  labels:
    app: iis-app
    os: windows
spec:
  selector:
    app: iis-app
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
    - name: https
      port: 443
      targetPort: 443
      protocol: TCP
  type: ClusterIP
```

For AKS Windows workloads, use a LoadBalancer service for external access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: iis-app-lb
  namespace: windows-workloads
  annotations:
    # AKS-specific: use Azure Load Balancer
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "aks-subnet"
spec:
  selector:
    app: iis-app
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

## Step 3: Configure NetworkPolicy for Windows Workloads

Windows network policies require Calico or Antrea with Windows support enabled.

```yaml
# apps/base/windows-workloads/network-policies/iis-app-policy.yaml
# Restrict IIS app traffic - only allow from ingress controller and monitoring
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: iis-app-network-policy
  namespace: windows-workloads
spec:
  podSelector:
    matchLabels:
      app: iis-app
  policyTypes:
    - Ingress
    - Egress

  ingress:
    # Allow from NGINX ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 80

    # Allow from monitoring namespace (Prometheus scraping)
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - protocol: TCP
          port: 8080

  egress:
    # Allow DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53

    # Allow outbound to SQL Server
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: databases
      ports:
        - protocol: TCP
          port: 1433
```

## Step 4: Configure Ingress for Windows Workloads

Use an NGINX ingress controller running on Linux nodes to terminate TLS and forward to Windows backends.

```yaml
# apps/base/windows-workloads/iis-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: iis-app-ingress
  namespace: windows-workloads
  annotations:
    kubernetes.io/ingress.class: nginx
    # Increase timeout for Windows apps with slower response times
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "120"
    # Important: don't upgrade to HTTPS on the backend (IIS handles HTTP)
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    # Enable session affinity if using in-memory session state
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "INGRESSCOOKIE"
    nginx.ingress.kubernetes.io/session-cookie-expires: "172800"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - my-app.example.com
      secretName: iis-app-tls
  rules:
    - host: my-app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: iis-app
                port:
                  number: 80
```

## Step 5: Handle Windows DNS Resolution

Windows containers use the Windows DNS client which may behave differently from Linux.

```yaml
# Configure DNS settings in Windows pod spec
spec:
  template:
    spec:
      # Explicit DNS configuration for Windows containers
      dnsConfig:
        searches:
          - windows-workloads.svc.cluster.local
          - svc.cluster.local
          - cluster.local
        options:
          - name: ndots
            value: "5"
      dnsPolicy: ClusterFirst
```

## Step 6: Deploy Networking Configuration via Flux

```yaml
# Separate Kustomization for network configuration
# Deploy network policies after workloads to avoid ordering issues
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: windows-network-policies
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/base/windows-workloads/network-policies
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: windows-workloads    # Ensure workloads exist before policies
    - name: calico-windows       # Ensure Windows CNI is ready
```

## Best Practices

- Use NGINX ingress (on Linux nodes) to terminate TLS rather than configuring TLS directly on Windows containers.
- Test NetworkPolicy on Windows in a staging environment first — Windows CNI policy support has subtle differences from Linux.
- Use session cookie affinity in the ingress for Web Forms applications that rely on in-memory session state.
- Configure generous proxy timeouts in the ingress for Windows backends — startup time and GC pauses can cause response delays.
- Document which CNI features are supported on your Windows nodes — check the Windows-specific CNI documentation.
- Use `type: ClusterIP` for internal Windows services and let the NGINX ingress handle external access.

## Conclusion

Windows container networking in Kubernetes requires careful configuration, but all the necessary resources — Services, Ingress, NetworkPolicy — can be managed through Flux CD's GitOps workflow. The key is understanding Windows CNI limitations, using an NGINX ingress on Linux nodes for TLS termination, and configuring appropriate timeouts for the slower response characteristics of Windows workloads. With these configurations committed to Git, Flux ensures consistent networking across all Windows workload deployments.
