# How to Deploy Multus CNI with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Multus, CNI, Flux CD, GitOps, Kubernetes, Networking, Multi-Homed Pods

Description: Learn how to deploy Multus CNI for multiple network interfaces in Kubernetes pods using Flux CD for telco, NFV, and high-performance networking use cases.

---

## Introduction

Multus CNI is a meta-CNI plugin that enables Kubernetes pods to have multiple network interfaces. While standard Kubernetes pods have one network interface (managed by the primary CNI), Multus allows attaching additional secondary networks-essential for telco workloads, network functions (NFV), and high-performance computing that require dedicated network interfaces for data plane traffic separate from management traffic.

Managing Multus and its NetworkAttachmentDefinitions through Flux CD ensures consistent multi-NIC configuration across clusters.

## Prerequisites

- Kubernetes cluster with a primary CNI (Calico, Flannel, Cilium)
- Flux CD bootstrapped
- Nodes with multiple network interfaces (or SR-IOV hardware for hardware offload)
- kubectl and flux CLI

## Step 1: Deploy Multus CNI via Flux

```yaml
# clusters/production/infrastructure/multus.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: multus-cni
  namespace: flux-system
spec:
  interval: 1h
  url: https://github.com/k8snetworkplumbingwg/multus-cni
  ref:
    tag: v4.0.2
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: multus-cni
  namespace: flux-system
spec:
  interval: 1h
  path: ./deployments/multus-daemonset.yml  # Single file in the multus repo
  prune: false  # Don't prune DaemonSets that remove CNI plugins
  sourceRef:
    kind: GitRepository
    name: multus-cni
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: kube-multus-ds
      namespace: kube-system
  timeout: 10m
```

Alternative: Deploy via custom DaemonSet:

```yaml
# infrastructure/multus/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-multus-ds
  namespace: kube-system
  labels:
    tier: node
    app: multus
    name: multus
spec:
  selector:
    matchLabels:
      name: multus
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        tier: node
        app: multus
        name: multus
    spec:
      hostNetwork: true
      tolerations:
        - operator: Exists
          effect: NoSchedule
      serviceAccountName: multus
      containers:
        - name: kube-multus
          image: ghcr.io/k8snetworkplumbingwg/multus-cni:v4.0.2-thick
          command: ["/usr/src/multus-cni/bin/multus-daemon"]
          resources:
            requests:
              cpu: "100m"
              memory: "50Mi"
            limits:
              cpu: "100m"
              memory: "50Mi"
          securityContext:
            privileged: true
          volumeMounts:
            - name: cni
              mountPath: /host/etc/cni/net.d
            - name: cnibin
              mountPath: /host/opt/cni/bin
            - name: host-run
              mountPath: /host/run
            - name: host-var-lib-cni
              mountPath: /var/lib/cni
      volumes:
        - name: cni
          hostPath:
            path: /etc/cni/net.d
        - name: cnibin
          hostPath:
            path: /opt/cni/bin
        - name: host-run
          hostPath:
            path: /run
        - name: host-var-lib-cni
          hostPath:
            path: /var/lib/cni
```

## Step 2: Create NetworkAttachmentDefinitions

```yaml
# infrastructure/multus/network-attachments.yaml

# macvlan network for data plane traffic
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: macvlan-data
  namespace: production
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "macvlan-data",
      "type": "macvlan",
      "master": "eth1",          # Secondary NIC on the node
      "mode": "bridge",
      "ipam": {
        "type": "host-local",
        "subnet": "10.10.0.0/24",
        "rangeStart": "10.10.0.100",
        "rangeEnd": "10.10.0.200",
        "gateway": "10.10.0.1"
      }
    }
---
# IPVLAN network for low-latency use cases
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: ipvlan-storage
  namespace: production
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "ipvlan-storage",
      "type": "ipvlan",
      "master": "eth2",
      "mode": "l2",
      "ipam": {
        "type": "static",
        "addresses": []
      }
    }
```

## Step 3: Attach Multiple Networks to a Pod

```yaml
# apps/nfv-workload/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfv-router
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nfv-router
  template:
    metadata:
      labels:
        app: nfv-router
      annotations:
        # Attach additional networks
        k8s.v1.cni.cncf.io/networks: |
          [
            {
              "name": "macvlan-data",
              "namespace": "production",
              "interface": "net1"  # Interface name inside the pod
            },
            {
              "name": "ipvlan-storage",
              "namespace": "production",
              "interface": "net2",
              "ips": ["10.20.0.100/24"]  # Static IP for this pod
            }
          ]
    spec:
      containers:
        - name: nfv-router
          image: your-org/nfv-router:1.0.0
          securityContext:
            capabilities:
              add: ["NET_ADMIN"]
```

## Step 4: Deploy via Flux Kustomization

```yaml
# clusters/production/infrastructure/multus-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: multus-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/multus
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: multus-cni  # Multus DaemonSet must be running
```

## Step 5: Verify Multi-NIC Pods

```bash
# Verify Multus DaemonSet is running on all nodes
kubectl get daemonset -n kube-system kube-multus-ds

# Check NetworkAttachmentDefinitions
kubectl get network-attachment-definitions -n production

# After deploying a multi-NIC pod, verify interfaces
kubectl exec -n production deployment/nfv-router -- ip addr show
# Should show: lo, eth0 (primary CNI), net1 (macvlan), net2 (ipvlan)

# Verify pod annotations show network status
kubectl get pod -n production -l app=nfv-router \
  -o jsonpath='{.items[0].metadata.annotations.k8s\.v1\.cni\.cncf\.io/network-status}' \
  | python3 -m json.tool
```

## Best Practices

- Never set `prune: true` on the Multus DaemonSet Kustomization; removing CNI plugins from running nodes can disrupt all pod networking.
- Namespace-scope NetworkAttachmentDefinitions to limit which namespaces can use specific networks.
- Test multi-NIC configurations in a staging cluster before production; errors in CNI configuration can make pods unschedulable.
- Use IPAM plugins appropriate for your use case: `host-local` for dynamic assignment, `static` for deterministic addressing.
- Document which node NICs are dedicated to secondary networks to prevent accidental use by the primary CNI.

## Conclusion

Multus CNI deployed via Flux CD enables Kubernetes pods to have multiple network interfaces, which is essential for network function virtualization, storage networking, and high-performance workloads that need data plane separation from management plane traffic. Managing NetworkAttachmentDefinitions through GitOps ensures consistent secondary network configuration across node replacements and cluster recreations.
