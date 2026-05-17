# How to Configure Cluster Templates in Omni

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Omni, Kubernetes, Cluster Templates, Infrastructure as Code

Description: Learn how to create and manage cluster templates in Sidero Omni for consistent, repeatable Talos Linux cluster deployments.

---

When you need to deploy Talos Linux clusters repeatedly, doing it from scratch each time is wasteful. Cluster templates in Sidero Omni let you define a standard configuration once and use it to spin up new clusters with consistent settings. Whether you are deploying environments for different teams, different regions, or different stages of your development pipeline, templates ensure that every cluster starts from a known good state.

This post covers how to create cluster templates in Omni, what you can configure in them, and how to use them effectively for repeatable deployments.

## What Are Cluster Templates?

A cluster template in Omni is a declarative specification that defines how a cluster should look. It is a multi-document YAML file in which each document has a `kind` field. Together, the documents describe the Talos version, the Kubernetes version, the number and type of nodes, the machine selection rules, and any custom Talos machine configuration patches. When you create a cluster from a template, Omni uses these specifications to configure and bootstrap the cluster automatically.

Templates are stored as YAML files, which means they can be versioned in Git, reviewed through pull requests, and applied through CI/CD pipelines. This brings infrastructure-as-code practices to your Talos cluster management.

## Creating a Basic Cluster Template

Let us start with a simple template that defines a three-node cluster with one control plane and two workers.

```yaml
# cluster-template-basic.yaml

# A basic Talos cluster template for development environments
kind: Cluster
name: dev-cluster
kubernetes:
  version: v1.29.0
talos:
  version: v1.6.0
patches:
  - name: custom-kubelet-args
    inline:
      machine:
        kubelet:
          extraArgs:
            rotate-server-certificates: "true"
---
kind: ControlPlane
machineClass:
  name: dev-control-plane
  size: 1
---
kind: Workers
machineClass:
  name: dev-workers
  size: 2
```

This template specifies the versions, a custom kubelet argument, and the node counts. The `ControlPlane` and `Workers` documents reference machine classes (`dev-control-plane` and `dev-workers`) that you create separately in Omni; Omni then allocates matching machines from the pool and configures them according to these settings.

```bash
# Apply the template to create a new cluster
omnictl cluster template sync -f cluster-template-basic.yaml

# Verify the cluster was created
omnictl cluster template status -f cluster-template-basic.yaml
```

## Production-Ready Templates

For production, you need more detail in your templates. Here is a more complete example that includes network configuration, disk setup, and additional Talos patches.

```yaml
# cluster-template-production.yaml
# Production Talos cluster template with HA control plane
kind: Cluster
name: production-cluster
kubernetes:
  version: v1.29.0
talos:
  version: v1.6.0
---
kind: ControlPlane
machineClass:
  name: prod-control-plane
  size: 3
patches:
  - name: control-plane-config
    inline:
      machine:
        kubelet:
          extraArgs:
            rotate-server-certificates: "true"
        install:
          disk: /dev/nvme0n1
          # Wipe the disk before installing
          wipe: false
      cluster:
        etcd:
          extraArgs:
            # Increase etcd snapshot count for better history
            snapshot-count: "10000"
            # Set quota to 8GB
            quota-backend-bytes: "8589934592"
        apiServer:
          extraArgs:
            # Enable audit logging
            audit-log-path: /var/log/audit.log
            audit-log-maxage: "30"
            audit-log-maxbackup: "10"
---
kind: Workers
machineClass:
  name: prod-workers
  size: 5
patches:
  - name: worker-config
    inline:
      machine:
        install:
          disk: /dev/nvme0n1
        kubelet:
          extraArgs:
            rotate-server-certificates: "true"
            # Reserve resources for system daemons
            system-reserved: cpu=500m,memory=1Gi
            kube-reserved: cpu=500m,memory=1Gi
```

This template creates a three-node HA control plane with five workers. It customizes etcd settings, enables audit logging on the API server, and reserves system resources on worker nodes.

## Using Machine Classes in Templates

Instead of letting any available machine be picked, you can specify requirements for the machines that should be used. In Omni, this is done by defining `MachineClass` resources whose selectors match labels on your machines, and then referencing those classes from `ControlPlane` and `Workers`.

You first create the machine classes (these are top-level Omni resources, not cluster-template documents) with `omnictl apply`:

```yaml
# machine-classes.yaml
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: gpu-control-plane
spec:
  matchLabels:
    - role=control-plane,datacenter=us-east-1
---
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: gpu-worker
spec:
  matchLabels:
    - role=gpu-worker,gpu=nvidia-a100
```

Then reference them from the cluster template:

```yaml
# cluster-template-with-selectors.yaml
kind: Cluster
name: gpu-cluster
kubernetes:
  version: v1.29.0
talos:
  version: v1.6.0
---
kind: ControlPlane
machineClass:
  name: gpu-control-plane
  size: 3
---
kind: Workers
machineClass:
  name: gpu-worker
  size: 4
```

Machine classes use labels that you assign to machines when they register with Omni. This lets you direct specific hardware to specific cluster roles. GPU nodes go to GPU clusters, high-memory machines go to data processing clusters, and so on. The `size` field also accepts the keywords `unlimited` or `infinity`, which makes the machine set pick up every available machine in the class.

## Template Versioning and Git Integration

Since templates are YAML files, they fit naturally into a Git workflow. Store your templates in a repository and use pull requests to review changes before they are applied.

```bash
# Directory structure for cluster templates
cluster-templates/
  base/
    common-patches.yaml
  dev/
    cluster-template.yaml
  staging/
    cluster-template.yaml
  production/
    cluster-template.yaml
```

A CI/CD pipeline can automatically apply template changes when they are merged.

```yaml
# Example CI/CD step for applying template changes
# .github/workflows/apply-templates.yaml
name: Apply Cluster Templates
on:
  push:
    branches: [main]
    paths:
      - 'cluster-templates/**'

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install omnictl
        run: |
          curl -LO https://github.com/siderolabs/omni/releases/latest/download/omnictl-linux-amd64
          chmod +x omnictl-linux-amd64
          sudo mv omnictl-linux-amd64 /usr/local/bin/omnictl

      - name: Apply production template
        run: |
          omnictl cluster template sync \
            -f cluster-templates/production/cluster-template.yaml
```

## Customizing Templates with Patches

Omni supports Talos machine configuration patches in templates. Patches let you modify the default Talos configuration without replacing the entire thing. This is useful for adding custom CNI settings, configuring time servers, or enabling specific kernel modules.

```yaml
# Template with custom patches
kind: Cluster
name: custom-cluster
kubernetes:
  version: v1.29.0
talos:
  version: v1.6.0
patches:
  - name: ntp-config
    inline:
      machine:
        time:
          servers:
            - time.cloudflare.com
            - time.google.com
  - name: sysctls
    inline:
      machine:
        sysctls:
          # Increase connection tracking table size
          net.netfilter.nf_conntrack_max: "262144"
          # Increase max file descriptors
          fs.file-max: "1048576"
  - name: containerd-config
    inline:
      machine:
        files:
          - content: |
              [plugins."io.containerd.grpc.v1.cri"]
                enable_unprivileged_ports = true
                enable_unprivileged_icmp = true
            path: /etc/cri/conf.d/20-customization.part
            op: create
---
kind: ControlPlane
machineClass:
  name: custom-control-plane
  size: 3
---
kind: Workers
machineClass:
  name: custom-workers
  size: 3
```

## Sharing Configuration Across Templates

For organizations with many clusters, the recommended way to share configuration is through file-based patches. Patches in a template can be loaded from a separate YAML file using the `file` field, so a set of common machine-config patches can live in one repository directory and be referenced from each cluster template.

```yaml
# cluster-template-with-shared-patches.yaml
kind: Cluster
name: production-cluster
kubernetes:
  version: v1.29.0
talos:
  version: v1.6.0
patches:
  # Reuse shared patches kept in a common directory
  - file: ../base/patches/ntp.yaml
  - file: ../base/patches/sysctls.yaml
---
kind: ControlPlane
machineClass:
  name: prod-control-plane
  size: 3
---
kind: Workers
machineClass:
  name: prod-workers
  size: 5
```

The shared patch files only contain the Talos machine configuration that differs from the defaults. This reduces duplication and makes it easier to keep your clusters consistent.

## Updating Existing Clusters with Templates

Templates are not just for creating new clusters. You can also use them to update existing clusters. When you apply a modified template to an existing cluster, Omni calculates the differences and applies only the necessary changes.

```bash
# Update the Kubernetes version in the template
# Then re-sync it
omnictl cluster template sync -f cluster-template-production.yaml

# Omni will detect that only the Kubernetes version changed
# and trigger a rolling upgrade
```

This makes templates a living document that evolves with your cluster. Change the version in the template, apply it, and Omni handles the rest.

## Conclusion

Cluster templates in Omni bring consistency and repeatability to your Talos Linux deployments. By defining your clusters as YAML specifications, you can version them in Git, review changes through pull requests, and apply them through automation. Whether you are managing a handful of clusters or dozens, templates ensure that every deployment follows the same standards and best practices. Start with a basic template and build up to production-ready configurations as your needs grow.
