# How to Set Up Extra Manifests in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Manifests, Cluster Bootstrap, GitOps

Description: Learn how to use extra manifests in Talos Linux to automatically deploy Kubernetes resources during cluster bootstrap and configuration.

---

When you set up a Kubernetes cluster with Talos Linux, you often need certain resources to be deployed automatically as part of the cluster bootstrap process. Things like CNI plugins, storage drivers, monitoring agents, and custom namespaces should be ready from the moment the cluster comes up. Talos Linux supports this through the extra manifests feature, which lets you specify Kubernetes manifests or URLs to manifests that get applied automatically.

This guide covers how to configure extra manifests in Talos Linux and explores practical patterns for using them effectively.

## What Are Extra Manifests

Extra manifests are Kubernetes YAML files or URLs pointing to YAML files that Talos applies to the cluster during the bootstrap process. They are defined in the cluster section of the Talos machine configuration and are applied by the bootstrap node after the API server becomes available.

Think of extra manifests as the initial set of resources your cluster needs to be functional. They run once during bootstrap and are applied in order.

## Basic Configuration

Extra manifests are configured under `cluster.extraManifests` in the control plane machine configuration:

```yaml
cluster:
  extraManifests:
    - https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
    - https://raw.githubusercontent.com/metallb/metallb/v0.14.3/config/manifests/metallb-native.yaml
```

You can specify URLs or inline content. URLs are fetched during bootstrap, and the resulting YAML is applied to the cluster.

## Using Inline Manifests

For smaller resources or when you do not want to depend on external URLs, use inline manifests through `cluster.inlineManifests`:

```yaml
cluster:
  inlineManifests:
    - name: namespace-monitoring
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: monitoring
          labels:
            purpose: monitoring
    - name: namespace-apps
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: apps
          labels:
            purpose: applications
```

Inline manifests have a `name` field for identification and a `contents` field with the actual YAML. The name is used for tracking which manifests have been applied.

## Deploying a CNI Plugin

One of the most common uses of extra manifests is deploying a CNI plugin. Without a CNI plugin, pods cannot communicate, so it needs to be deployed as early as possible:

```yaml
cluster:
  network:
    cni:
      name: custom
  extraManifests:
    # Deploy Cilium as the CNI
    - https://raw.githubusercontent.com/cilium/cilium/v1.15.0/install/kubernetes/quick-install.yaml
```

When using a custom CNI, set the CNI name to `custom` in the network configuration so Talos does not deploy its default CNI.

## Deploying Storage Drivers

Storage drivers like local-path-provisioner or OpenEBS are another great fit for extra manifests:

```yaml
cluster:
  extraManifests:
    # Local path provisioner for development clusters
    - https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml
```

For production, you might use a more sophisticated storage solution:

```yaml
cluster:
  inlineManifests:
    - name: storage-class
      contents: |
        apiVersion: storage.k8s.io/v1
        kind: StorageClass
        metadata:
          name: fast-ssd
          annotations:
            storageclass.kubernetes.io/is-default-class: "true"
        provisioner: kubernetes.io/no-provisioner
        volumeBindingMode: WaitForFirstConsumer
```

## Deploying RBAC Resources

Extra manifests are perfect for setting up RBAC from the start:

```yaml
cluster:
  inlineManifests:
    - name: cluster-admin-binding
      contents: |
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: ops-team-admin
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: cluster-admin
        subjects:
          - kind: Group
            name: ops-team
            apiGroup: rbac.authorization.k8s.io
    - name: dev-namespace-role
      contents: |
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: developer
          namespace: apps
        rules:
          - apiGroups: ["", "apps", "batch"]
            resources: ["pods", "deployments", "jobs", "services"]
            verbs: ["get", "list", "watch", "create", "update", "delete"]
```

## Multi-Document Manifests

You can include multiple Kubernetes resources in a single inline manifest using YAML document separators:

```yaml
cluster:
  inlineManifests:
    - name: monitoring-setup
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: monitoring
        ---
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: prometheus
          namespace: monitoring
        ---
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: prometheus
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: cluster-admin
        subjects:
          - kind: ServiceAccount
            name: prometheus
            namespace: monitoring
```

## Extra Manifest Headers

When fetching manifests from URLs that require authentication, you can specify custom headers:

```yaml
cluster:
  extraManifestHeaders:
    Authorization: "Bearer my-token-here"
    Accept: "application/yaml"
  extraManifests:
    - https://private-repo.example.com/manifests/my-app.yaml
```

These headers are applied to all URL-based extra manifest fetches.

## Ordering and Dependencies

Extra manifests and inline manifests are applied in order. Inline manifests are applied first, then URL-based extra manifests. Within each group, they are applied in the order they appear in the configuration.

Use this to your advantage by putting dependencies first:

```yaml
cluster:
  inlineManifests:
    # 1. Create namespaces first
    - name: namespaces
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: infra
    # 2. Then create resources in those namespaces
    - name: infra-config
      contents: |
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: cluster-info
          namespace: infra
        data:
          cluster-name: "production"
          region: "us-east-1"
  extraManifests:
    # 3. Then deploy applications that depend on the above
    - https://example.com/manifests/app.yaml
```

## Applying Changes After Bootstrap

Extra manifests are primarily designed for bootstrap. If you need to update them after the cluster is running, you have two options:

First, you can modify the machine configuration and reapply it:

```bash
talosctl apply-config --nodes 10.0.0.2 --file updated-controlplane.yaml
```

Second, and more commonly, you manage ongoing resource changes through kubectl, Helm, or a GitOps tool like Flux or ArgoCD. Extra manifests get your cluster to a baseline state, and GitOps takes over from there.

## Practical Bootstrap Pattern

Here is a complete example of a well-structured extra manifests setup:

```yaml
cluster:
  inlineManifests:
    # Core namespaces
    - name: core-namespaces
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: monitoring
        ---
        apiVersion: v1
        kind: Namespace
        metadata:
          name: ingress
        ---
        apiVersion: v1
        kind: Namespace
        metadata:
          name: apps
    # Default resource quotas
    - name: resource-quotas
      contents: |
        apiVersion: v1
        kind: ResourceQuota
        metadata:
          name: default-quota
          namespace: apps
        spec:
          hard:
            requests.cpu: "20"
            requests.memory: 40Gi
            limits.cpu: "40"
            limits.memory: 80Gi
  extraManifests:
    # CNI plugin
    - https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
    # Metrics server
    - https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Conclusion

Extra manifests in Talos Linux let you define the baseline state of your cluster as part of the cluster configuration itself. They are ideal for CNI plugins, namespaces, RBAC rules, storage classes, and other foundational resources. Use inline manifests for small, stable resources and URL-based manifests for larger third-party components. After bootstrap, transition to a GitOps workflow for ongoing management. This combination gives you a repeatable, fully automated cluster setup process.
