# How to Manage Multiple Talos Clusters with Omni

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Sidero Omni, Multi-Cluster, Kubernetes, Fleet Management

Description: Learn how to manage multiple Talos Linux Kubernetes clusters across different environments using Sidero Omni for fleet-wide operations

---

As organizations grow their Kubernetes footprint, managing multiple clusters becomes a significant operational challenge. You might have production clusters in multiple regions, staging and development clusters, edge clusters at remote locations, or dedicated clusters for different teams. Each cluster needs upgrades, monitoring, configuration management, and access control. Without a centralized management tool, this quickly becomes unmanageable.

Sidero Omni is designed specifically for this multi-cluster challenge. It provides a single management plane for all your Talos Linux clusters, regardless of where they run. This guide covers the strategies and practices for effective multi-cluster management with Omni.

## The Multi-Cluster Challenge

Before diving into solutions, let us understand what makes multi-cluster management hard:

- **Configuration drift** - Clusters that start identical gradually diverge as individual changes accumulate
- **Upgrade coordination** - Rolling out updates across dozens of clusters while maintaining availability
- **Access management** - Controlling who can access which cluster with what permissions
- **Resource visibility** - Understanding resource utilization across your entire fleet
- **Consistency** - Ensuring all clusters meet your security and compliance standards

Omni addresses each of these challenges through centralized management with declarative configuration.

## Setting Up the Multi-Cluster Environment

Start by organizing your machines and clusters in Omni:

```bash
# Register all machines with appropriate labels
omnictl machine label $MACHINE_ID \
  --label environment=production \
  --label region=us-east-1 \
  --label tier=compute

omnictl machine label $MACHINE_ID \
  --label environment=staging \
  --label region=eu-west-1 \
  --label tier=compute
```

Create machine classes to categorize your hardware:

```bash
# Control plane machines (high memory, NVMe)
omnictl machineclass create cp-large \
  --match-labels hardware=high-mem,storage=nvme

# General worker machines
omnictl machineclass create worker-general \
  --match-labels hardware=standard

# GPU worker machines
omnictl machineclass create worker-gpu \
  --match-labels hardware=gpu
```

## Creating Clusters Across Environments

Use a consistent naming convention and cluster templates:

```yaml
# production-cluster-template.yaml
kind: Cluster
name: prod-us-east-1
kubernetes:
  version: "1.29.2"
controlPlane:
  machineCount: 3
  machineClass:
    name: cp-large
    matchLabels:
      region: us-east-1
workers:
  machineCount: 10
  machineClass:
    name: worker-general
    matchLabels:
      region: us-east-1
patches:
  - name: production-defaults
    inline:
      machine:
        sysctls:
          net.core.somaxconn: "65535"
          vm.max_map_count: "262144"
        kubelet:
          extraConfig:
            maxPods: 200
      cluster:
        proxy:
          disabled: true
```

```bash
# Create clusters from templates
omnictl cluster template apply -f production-us-east.yaml
omnictl cluster template apply -f production-eu-west.yaml
omnictl cluster template apply -f staging-us-east.yaml
omnictl cluster template apply -f dev-us-east.yaml
```

## Fleet-Wide Configuration Management

One of the biggest advantages of Omni is applying configuration consistently across clusters.

### Shared Configuration Patches

Create patches that apply to all clusters in a category:

```yaml
# production-security-patch.yaml
machine:
  sysctls:
    kernel.kptr_restrict: "2"
    kernel.dmesg_restrict: "1"
    kernel.perf_event_paranoid: "3"
    net.ipv4.conf.all.log_martians: "1"
    net.ipv4.conf.all.send_redirects: "0"
    net.ipv4.conf.all.accept_redirects: "0"
  install:
    extraKernelArgs:
      - random.trust_cpu=on
```

```bash
# Apply security patch to all production clusters
for cluster in prod-us-east-1 prod-eu-west-1 prod-ap-south-1; do
  omnictl machineconfig patch "$cluster" --patch @production-security-patch.yaml
done
```

### Environment-Specific Configurations

```yaml
# staging-config.yaml
machine:
  kubelet:
    extraConfig:
      maxPods: 150
      serializeImagePulls: false
  sysctls:
    vm.max_map_count: "262144"
```

```yaml
# production-config.yaml
machine:
  kubelet:
    extraConfig:
      maxPods: 250
      serializeImagePulls: false
      cpuManagerPolicy: static
      topologyManagerPolicy: best-effort
  sysctls:
    vm.max_map_count: "262144"
    net.core.somaxconn: "65535"
    net.ipv4.tcp_max_syn_backlog: "65535"
```

## Coordinated Upgrades Across Clusters

Upgrading multiple clusters requires a structured rollout strategy. The typical pattern is:

1. Upgrade dev clusters first
2. Test thoroughly
3. Upgrade staging clusters
4. Run integration tests
5. Upgrade production clusters one region at a time

```bash
# Step 1: Upgrade development cluster
omnictl cluster upgrade dev-us-east-1 --talos-version v1.7.0
omnictl cluster kubernetes-upgrade dev-us-east-1 --to 1.30.0

# Step 2: Wait and verify
omnictl cluster status dev-us-east-1
# Run automated tests against dev cluster

# Step 3: Upgrade staging
omnictl cluster upgrade staging-us-east-1 --talos-version v1.7.0
omnictl cluster kubernetes-upgrade staging-us-east-1 --to 1.30.0

# Step 4: Run integration tests
# Wait for staging validation

# Step 5: Upgrade production (one region at a time)
omnictl cluster upgrade prod-us-east-1 --talos-version v1.7.0
# Verify
omnictl cluster upgrade prod-eu-west-1 --talos-version v1.7.0
# Verify
omnictl cluster upgrade prod-ap-south-1 --talos-version v1.7.0
```

### Automating Upgrade Rollouts

```bash
#!/bin/bash
# upgrade-fleet.sh - Automated fleet upgrade script

TALOS_VERSION="v1.7.0"
K8S_VERSION="1.30.0"

# Define upgrade order
DEV_CLUSTERS=("dev-us-east-1")
STAGING_CLUSTERS=("staging-us-east-1")
PROD_CLUSTERS=("prod-us-east-1" "prod-eu-west-1" "prod-ap-south-1")

upgrade_cluster() {
  local cluster=$1
  echo "Upgrading $cluster to Talos $TALOS_VERSION, K8s $K8S_VERSION"

  omnictl cluster upgrade "$cluster" --talos-version "$TALOS_VERSION"

  # Wait for Talos upgrade to complete
  while true; do
    STATUS=$(omnictl cluster status "$cluster" -o json | jq -r '.phase')
    if [ "$STATUS" = "Running" ]; then
      break
    fi
    sleep 30
  done

  omnictl cluster kubernetes-upgrade "$cluster" --to "$K8S_VERSION"

  echo "$cluster upgraded successfully"
}

# Upgrade dev clusters
for cluster in "${DEV_CLUSTERS[@]}"; do
  upgrade_cluster "$cluster"
done

echo "Dev clusters upgraded. Proceed to staging? (y/n)"
read -r confirm
if [ "$confirm" != "y" ]; then exit 1; fi

# Upgrade staging clusters
for cluster in "${STAGING_CLUSTERS[@]}"; do
  upgrade_cluster "$cluster"
done

echo "Staging clusters upgraded. Proceed to production? (y/n)"
read -r confirm
if [ "$confirm" != "y" ]; then exit 1; fi

# Upgrade production clusters (one at a time)
for cluster in "${PROD_CLUSTERS[@]}"; do
  upgrade_cluster "$cluster"
  echo "Cluster $cluster done. Continue? (y/n)"
  read -r confirm
  if [ "$confirm" != "y" ]; then exit 1; fi
done
```

## Multi-Cluster Access Management

Control who can access which clusters:

```bash
# Create roles for different teams
omnictl user invite platform-admin@company.com --role admin
omnictl user invite dev-lead@company.com --role operator
omnictl user invite developer@company.com --role reader

# Get kubeconfig for specific clusters
omnictl kubeconfig --cluster prod-us-east-1 > prod-east.kubeconfig
omnictl kubeconfig --cluster staging-us-east-1 > staging.kubeconfig
```

For teams that need access to multiple clusters, create a merged kubeconfig:

```bash
# Get kubeconfigs for all accessible clusters
for cluster in prod-us-east-1 staging-us-east-1 dev-us-east-1; do
  omnictl kubeconfig --cluster "$cluster" > "/tmp/$cluster.kubeconfig"
done

# Merge kubeconfigs
KUBECONFIG="/tmp/prod-us-east-1.kubeconfig:/tmp/staging-us-east-1.kubeconfig:/tmp/dev-us-east-1.kubeconfig" \
  kubectl config view --flatten > multi-cluster.kubeconfig

# Switch between clusters
kubectl --kubeconfig multi-cluster.kubeconfig config use-context prod-us-east-1
kubectl --kubeconfig multi-cluster.kubeconfig config use-context staging-us-east-1
```

## Monitoring Across Clusters

Get a fleet-wide view of your infrastructure:

```bash
# List all clusters and their status
omnictl get clusters -o table

# Expected output:
# NAME              PHASE     MACHINES   K8S VERSION    TALOS VERSION
# prod-us-east-1    Running   13         v1.29.2        v1.6.7
# prod-eu-west-1    Running   10         v1.29.2        v1.6.7
# staging-us-east   Running   6          v1.30.0        v1.7.0
# dev-us-east-1     Running   4          v1.30.0        v1.7.0

# Check all machines across all clusters
omnictl get machines -o table

# Check specific machine health
omnictl talosctl --nodes $MACHINE_ID -- health
```

For detailed monitoring, deploy Prometheus in each cluster and aggregate with Thanos or Cortex:

```yaml
# Each cluster runs its own Prometheus
# Configure remote-write to a central Thanos instance
prometheus:
  prometheusSpec:
    remoteWrite:
    - url: https://thanos-receive.monitoring.svc:19291/api/v1/receive
      writeRelabelConfigs:
      - sourceLabels: [__name__]
        targetLabel: cluster
        replacement: prod-us-east-1
```

## Disaster Recovery Across Clusters

Having multiple clusters is itself a disaster recovery strategy. If one cluster fails, workloads can be redirected to another:

```bash
# Export cluster configuration for backup
omnictl cluster template export prod-us-east-1 > backup-prod-east.yaml

# If a cluster needs to be recreated
omnictl cluster template apply -f backup-prod-east.yaml

# Migrate workloads between clusters using GitOps
# ArgoCD or Flux managing multiple cluster targets
```

## Best Practices for Multi-Cluster Management

1. **Use templates** for all cluster creation to ensure consistency
2. **Label everything** with environment, region, team, and purpose
3. **Stage upgrades** through dev, staging, then production
4. **Automate** configuration application across clusters
5. **Centralize monitoring** for fleet-wide visibility
6. **Document** your cluster inventory and ownership
7. **Test disaster recovery** by recreating clusters from templates

## Conclusion

Managing multiple Talos Linux clusters with Sidero Omni provides the centralized control needed to operate Kubernetes at scale. By using cluster templates, shared configuration patches, coordinated upgrade strategies, and proper access control, you can maintain consistency and reliability across your entire fleet. The key is treating cluster management like code: use templates, automate everything, and test changes in lower environments before rolling them out to production. Omni provides the platform, and your operational discipline determines the outcome.
