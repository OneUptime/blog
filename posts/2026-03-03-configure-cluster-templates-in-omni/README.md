# How to Configure Cluster Templates in Omni

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Omni, Kubernetes, Cluster Templates, Infrastructure as Code

Description: Learn how to create and manage cluster templates in Sidero Omni for consistent, repeatable Talos Linux cluster deployments.

---

When you need to deploy Talos Linux clusters repeatedly, doing it from scratch each time is wasteful. Cluster templates in Sidero Omni let you define a standard configuration once and use it to spin up new clusters with consistent settings. Whether you are deploying environments for different teams, different regions, or different stages of your development pipeline, templates ensure that every cluster starts from a known good state.

This post covers how to create cluster templates in Omni, what you can configure in them, and how to use them effectively for repeatable deployments.

## What Are Cluster Templates?

A cluster template in Omni is a declarative specification that defines how a cluster should look. It includes the Talos version, Kubernetes version, number and type of nodes, network configuration, and any custom Talos machine configuration patches. When you create a cluster from a template, Omni uses these specifications to configure and bootstrap the cluster automatically.

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
controlPlane:
  machineCount: 1
workers:
  machineCount: 2
```

This template specifies the versions, a custom kubelet argument, and the node counts. When you apply this template, Omni will allocate machines from the available pool and configure them according to these settings.

```bash
# Apply the template to create a new cluster
omnictl cluster template apply -f cluster-template-basic.yaml

# Verify the cluster was created
omnictl cluster status dev-cluster
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
controlPlane:
  machineCount: 3
  patches:
    - name: control-plane-config
      inline:
        machine:
          network:
            hostname: cp-${index}
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
workers:
  machineCount: 5
  patches:
    - name: worker-config
      inline:
        machine:
          network:
            hostname: worker-${index}
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

## Using Machine Selectors in Templates

Instead of letting Omni pick any available machine, you can specify requirements for the machines that should be used. This is done through machine selectors.

```yaml
# cluster-template-with-selectors.yaml
kind: Cluster
name: gpu-cluster
kubernetes:
  version: v1.29.0
talos:
  version: v1.6.0
controlPlane:
  machineCount: 3
  machineSelector:
    matchLabels:
      role: control-plane
      datacenter: us-east-1
workers:
  machineCount: 4
  machineSelector:
    matchLabels:
      role: gpu-worker
      gpu: nvidia-a100
```

Machine selectors use labels that you assign to machines when they register with Omni. This lets you direct specific hardware to specific cluster roles. GPU nodes go to GPU clusters, high-memory machines go to data processing clusters, and so on.

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
          curl -LO https://omni.siderolabs.com/omnictl/latest/omnictl-linux-amd64
          chmod +x omnictl-linux-amd64
          sudo mv omnictl-linux-amd64 /usr/local/bin/omnictl

      - name: Apply production template
        run: |
          omnictl cluster template apply \
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
            path: /var/cri/conf.d/20-customization.toml
            op: create
controlPlane:
  machineCount: 3
workers:
  machineCount: 3
```

## Template Inheritance and Composition

For organizations with many clusters, you can build a layered template system. Start with a base template that defines common settings, then overlay environment-specific customizations.

```bash
# Apply a base template with environment overrides
omnictl cluster template apply \
  -f base-template.yaml \
  -f production-overrides.yaml
```

The override file only needs to contain the settings that differ from the base template. This reduces duplication and makes it easier to keep your clusters consistent.

## Updating Existing Clusters with Templates

Templates are not just for creating new clusters. You can also use them to update existing clusters. When you apply a modified template to an existing cluster, Omni calculates the differences and applies only the necessary changes.

```bash
# Update the Kubernetes version in the template
# Then re-apply it
omnictl cluster template apply -f cluster-template-production.yaml

# Omni will detect that only the Kubernetes version changed
# and trigger a rolling upgrade
```

This makes templates a living document that evolves with your cluster. Change the version in the template, apply it, and Omni handles the rest.

## Conclusion

Cluster templates in Omni bring consistency and repeatability to your Talos Linux deployments. By defining your clusters as YAML specifications, you can version them in Git, review changes through pull requests, and apply them through automation. Whether you are managing a handful of clusters or dozens, templates ensure that every deployment follows the same standards and best practices. Start with a basic template and build up to production-ready configurations as your needs grow.
