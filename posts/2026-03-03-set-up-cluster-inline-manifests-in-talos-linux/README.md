# How to Set Up Cluster Inline Manifests in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Inline Manifests, Kubernetes, Cluster Configuration, Bootstrap

Description: Learn how to use cluster inline manifests in Talos Linux to automatically deploy Kubernetes resources during cluster bootstrap.

---

Cluster inline manifests are one of the most useful features in Talos Linux for ensuring that essential Kubernetes resources exist from the moment your cluster comes online. They let you embed Kubernetes YAML manifests directly in the Talos machine configuration, and Talos automatically applies them during the cluster bootstrap process. This means your CNI plugin, storage drivers, namespaces, RBAC policies, and other foundational resources are deployed without any manual kubectl commands.

This guide shows you how to use inline manifests effectively, from basic setup to advanced patterns.

## What Are Inline Manifests?

Inline manifests are Kubernetes resource definitions embedded in the Talos cluster configuration. When the cluster bootstraps, Talos applies these manifests to the Kubernetes API server before you even have a chance to run `kubectl`. They live under `cluster.inlineManifests` in the machine configuration:

```yaml
# Basic inline manifest example
cluster:
  inlineManifests:
    - name: my-namespace
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: production
```

Each inline manifest has a `name` (used as an identifier, not the Kubernetes resource name) and `contents` (the actual YAML manifest). You can include any valid Kubernetes resource definition.

## Deploying a CNI Plugin

One of the most important uses of inline manifests is deploying the CNI (Container Network Interface) plugin. Without a CNI, pods cannot communicate and the cluster is not functional:

```yaml
# Deploy Cilium as the CNI using an inline manifest
cluster:
  inlineManifests:
    - name: cilium
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: kube-system
        ---
        apiVersion: helm.cattle.io/v1
        kind: HelmChart
        metadata:
          name: cilium
          namespace: kube-system
        spec:
          chart: cilium
          repo: https://helm.cilium.io/
          targetNamespace: kube-system
          valuesContent: |-
            ipam:
              mode: kubernetes
            kubeProxyReplacement: true
            k8sServiceHost: localhost
            k8sServicePort: 7445
```

Note that this particular example uses HelmChart resources which require a Helm controller. For plain Cilium, you would include the full rendered YAML manifest instead.

## Creating Namespaces

A simpler and very common use case is pre-creating namespaces:

```yaml
# Create namespaces during bootstrap
cluster:
  inlineManifests:
    - name: namespaces
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: production
          labels:
            environment: production
        ---
        apiVersion: v1
        kind: Namespace
        metadata:
          name: staging
          labels:
            environment: staging
        ---
        apiVersion: v1
        kind: Namespace
        metadata:
          name: monitoring
          labels:
            purpose: observability
```

Multiple resources can be included in a single inline manifest, separated by `---`.

## Deploying RBAC Policies

Setting up RBAC during bootstrap ensures security policies are in place before any workloads run:

```yaml
# Bootstrap RBAC policies
cluster:
  inlineManifests:
    - name: rbac-policies
      contents: |
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRole
        metadata:
          name: namespace-reader
        rules:
          - apiGroups: [""]
            resources: ["namespaces", "pods", "services"]
            verbs: ["get", "list", "watch"]
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: developers-namespace-reader
        subjects:
          - kind: Group
            name: developers
            apiGroup: rbac.authorization.k8s.io
        roleRef:
          kind: ClusterRole
          name: namespace-reader
          apiGroup: rbac.authorization.k8s.io
```

## Deploying Network Policies

Inline manifests are perfect for deploying default network policies that restrict traffic from the start:

```yaml
# Default deny network policies
cluster:
  inlineManifests:
    - name: default-network-policies
      contents: |
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: default-deny-ingress
          namespace: production
        spec:
          podSelector: {}
          policyTypes:
            - Ingress
        ---
        apiVersion: networking.k8s.io/v1
        kind: NetworkPolicy
        metadata:
          name: default-deny-ingress
          namespace: staging
        spec:
          podSelector: {}
          policyTypes:
            - Ingress
```

## Deploying Storage Classes

If you use a specific storage backend, you can define StorageClasses during bootstrap:

```yaml
# StorageClass definitions
cluster:
  inlineManifests:
    - name: storage-classes
      contents: |
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: fast-ssd
          annotations:
            storageclass.kubernetes.io/is-default-class: "true"
        provisioner: kubernetes.io/no-provisioner
        volumeBindingMode: WaitForFirstConsumer
        ---
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: bulk-hdd
        provisioner: kubernetes.io/no-provisioner
        volumeBindingMode: WaitForFirstConsumer
```

## Multiple Inline Manifests

You can have multiple inline manifest entries, each with a descriptive name:

```yaml
# Organized inline manifests
cluster:
  inlineManifests:
    - name: namespaces
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: production
        ---
        apiVersion: v1
        kind: Namespace
        metadata:
          name: monitoring

    - name: rbac
      contents: |
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRole
        metadata:
          name: pod-reader
        rules:
          - apiGroups: [""]
            resources: ["pods"]
            verbs: ["get", "list"]

    - name: resource-quotas
      contents: |
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: default-quota
          namespace: production
        spec:
          hard:
            requests.cpu: "10"
            requests.memory: 20Gi
            limits.cpu: "20"
            limits.memory: 40Gi
```

Keeping manifests in separate entries with descriptive names makes the configuration easier to read and maintain.

## Inline Manifests vs External Manifests

Talos also supports `cluster.extraManifests` which pulls manifests from URLs:

```yaml
# External manifests pulled from URLs
cluster:
  extraManifests:
    - https://raw.githubusercontent.com/cilium/cilium/v1.14.0/install/kubernetes/quick-install.yaml
```

The difference is that inline manifests are embedded in the config (no external dependencies), while extraManifests require network access to download the resources. For air-gapped environments or when you want full control over exactly what gets deployed, inline manifests are the better choice.

## Applying and Updating Inline Manifests

Inline manifests are applied during cluster bootstrap. If you update them after the cluster is running, you need to reapply the configuration:

```bash
# Apply updated configuration
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

However, be aware that inline manifests are applied only on control plane nodes and only processed by the bootstrap controller. Changes to existing inline manifests might not be automatically reapplied. For resources that need ongoing management, consider using a GitOps tool like Flux or ArgoCD after the initial bootstrap.

## Verifying Inline Manifest Deployment

After bootstrap, verify that the resources were created:

```bash
# Check if namespaces were created
kubectl get namespaces

# Check if RBAC policies exist
kubectl get clusterroles,clusterrolebindings

# Check if network policies are in place
kubectl get networkpolicies -A
```

If a manifest failed to apply, check the Talos logs on the control plane node:

```bash
# Check for manifest application errors
talosctl dmesg --nodes 192.168.1.100 | grep -i manifest
talosctl logs controller-runtime --nodes 192.168.1.100 | grep -i manifest
```

## Size Limitations

The machine configuration has an overall size limit. If you embed large manifests (like a full CNI deployment with CRDs), you might hit this limit. For very large manifests, consider using `cluster.extraManifests` with a local HTTP server, or apply them post-bootstrap using kubectl or a GitOps tool.

## Best Practices

Use inline manifests for resources that absolutely must exist before any workloads start - namespaces, RBAC, network policies, and your CNI plugin. Keep them focused and minimal. For application deployments and more complex infrastructure, use a GitOps tool that runs after the cluster is up. Give each inline manifest a clear, descriptive name so you can quickly identify what it deploys. Test your manifests with `kubectl apply --dry-run=server` on a running cluster before embedding them in the Talos config.

Inline manifests bridge the gap between Talos cluster bootstrap and your regular deployment pipeline, ensuring your cluster starts in a known-good state every time.
