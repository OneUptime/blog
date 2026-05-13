# How to Deploy kube-vip for Virtual IP with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Kube-vip, Flux-cd, GitOps, Virtual-ip, High-Availability

Description: Learn how to deploy kube-vip for Kubernetes control plane high availability and LoadBalancer service virtual IP management using Flux CD.

---

## Introduction

kube-vip provides virtual IP addresses for both Kubernetes control plane high availability and LoadBalancer Services on bare metal clusters. Unlike MetalLB, kube-vip handles both the control plane VIP (used during cluster bootstrapping) and the data plane VIPs (for LoadBalancer services). Managing the kube-vip cloud provider component through Flux CD keeps your LoadBalancer VIP configuration in Git.

## Prerequisites

- Kubernetes cluster (kube-vip for control plane is set up at bootstrap time, not via Flux)
- Flux CD bootstrapped
- Nodes on the same Layer 2 network
- kubectl and flux CLI

## Step 1: Understand kube-vip Components

kube-vip has two components for this setup:
1. **kube-vip manager** (control plane VIP and Service VIP advertisement): Usually deployed as a static pod for the control plane VIP during cluster initialization-NOT managed by Flux. For LoadBalancer Services, it can also run as a DaemonSet with service mode enabled.
2. **kube-vip Cloud Provider**: Allocates LoadBalancer Service VIPs from a ConfigMap-CAN be managed by Flux.

This guide focuses on the cloud provider component for LoadBalancer services.

## Step 2: Deploy kube-vip Cloud Provider via Flux

```yaml
# clusters/production/infrastructure/kube-vip.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kube-vip
  namespace: flux-system
spec:
  interval: 1h
  url: https://kube-vip.io/helm-charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-vip-cloud-provider
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: kube-vip-cloud-provider
      version: "0.2.x"
      sourceRef:
        kind: HelmRepository
        name: kube-vip
        namespace: flux-system
  values:
    # Use the ConfigMap created in Step 3 for LoadBalancer service IP pools
    configMapName: kubevip
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 100m
        memory: 128Mi
```

## Step 3: Configure the IP Address Pool

```yaml
# infrastructure/kube-vip/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubevip
  namespace: kube-system
data:
  # Range for LoadBalancer services
  range-global: "192.168.10.100-192.168.10.200"
  # Or use CIDR notation:
  # cidr-global: "192.168.10.0/24"
```

## Step 4: Deploy kube-vip DaemonSet for LoadBalancer Advertisement

The cloud provider allocates LoadBalancer IPs, and kube-vip advertises those IPs. Make sure the kube-vip RBAC resources are included, then use the kube-vip DaemonSet in service mode:

```yaml
# infrastructure/kube-vip/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-vip-ds
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: kube-vip-ds
  template:
    metadata:
      labels:
        name: kube-vip-ds
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-role.kubernetes.io/master
                    operator: Exists
              - matchExpressions:
                  - key: node-role.kubernetes.io/control-plane
                    operator: Exists
      containers:
        - name: kube-vip
          image: ghcr.io/kube-vip/kube-vip:v1.1.2
          imagePullPolicy: Always
          args:
            - manager
          env:
            - name: vip_arp
              value: "true"
            - name: port
              value: "6443"
            - name: vip_interface
              value: "eth0"
            - name: vip_subnet
              value: "32"
            - name: cp_enable
              value: "false"  # Disable control plane VIP (handled by static pod)
            - name: cp_namespace
              value: "kube-system"
            - name: svc_enable
              value: "true"   # Enable service LoadBalancer VIPs
            - name: vip_leaderelection
              value: "true"
          securityContext:
            capabilities:
              add:
                - NET_ADMIN
                - NET_RAW
                - SYS_TIME
      hostNetwork: true
      serviceAccountName: kube-vip
      tolerations:
        - effect: NoSchedule
          operator: Exists
        - effect: NoExecute
          operator: Exists
```

## Step 5: Deploy via Flux Kustomization

```yaml
# clusters/production/infrastructure/kube-vip-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kube-vip
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/kube-vip
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: kube-vip-ds
      namespace: kube-system
  timeout: 5m
```

## Step 6: Test LoadBalancer Service

```bash
# Deploy a test workload and service
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-vip
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
        - name: nginx
          image: nginx:stable-alpine
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: test-vip
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: test
  ports:
    - port: 80
      targetPort: 80
EOF

# Check IP assignment from kube-vip range
kubectl get service test-vip
# EXTERNAL-IP should show an IP from 192.168.10.100-200
EXTERNAL_IP=$(kubectl get service test-vip -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Verify ARP is working (from a host on the same network)
# ping "$EXTERNAL_IP"

# Check kube-vip logs
kubectl logs -n kube-system -l name=kube-vip-ds --tail=30 | grep -i "service"

# Verify the VIP is responding
curl -sf "http://$EXTERNAL_IP/"
```

## Best Practices

- Use kube-vip when you need both control plane HA and LoadBalancer services from a single component.
- Use MetalLB when you only need LoadBalancer services and prefer BGP-based load balancing.
- kube-vip's ARP mode has the same single-node leader bottleneck as MetalLB L2 mode; for high-throughput services, consider BGP.
- Do not manage the control plane kube-vip static pod via Flux; it must be in place before the cluster is fully operational.
- Reserve the IP range in your network's DHCP server to prevent conflicts.

## Conclusion

kube-vip provides an elegant solution for bare metal Kubernetes that handles both control plane HA and LoadBalancer services. Managing the kube-vip cloud provider via Flux CD ensures that your LoadBalancer VIP configuration is version-controlled. For teams starting fresh on bare metal, kube-vip's unified approach simplifies the networking stack compared to running separate control plane HA and load balancer solutions.
