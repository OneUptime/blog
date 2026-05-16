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

Start by organizing your machines and clusters in Omni. Initial machine labels are applied when you generate boot media, so machines arrive in Omni already grouped by environment, region, and role:

```bash
# Production machines in us-east-1
omnictl download iso --arch amd64 \
  --initial-labels environment=production,region=us-east-1,tier=compute \
  --output prod-us-east-1.iso

# Staging machines in eu-west-1
omnictl download iso --arch amd64 \
  --initial-labels environment=staging,region=eu-west-1,tier=compute \
  --output staging-eu-west-1.iso
```

Any additional labels can be edited later from the Omni dashboard or by patching the `Machines.omni.sidero.dev` resource through `omnictl apply`.

Create machine classes to categorize your hardware. Machine classes are declarative resources, so define them in YAML and apply them with `omnictl apply`:

```yaml
# machineclass-cp-large.yaml
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: cp-large
spec:
  matchlabels:
    - hardware=high-mem,storage=nvme
```

```yaml
# machineclass-worker-general.yaml
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: worker-general
spec:
  matchlabels:
    - hardware=standard
```

```yaml
# machineclass-worker-gpu.yaml
metadata:
  namespace: default
  type: MachineClasses.omni.sidero.dev
  id: worker-gpu
spec:
  matchlabels:
    - hardware=gpu
```

```bash
omnictl apply -f machineclass-cp-large.yaml
omnictl apply -f machineclass-worker-general.yaml
omnictl apply -f machineclass-worker-gpu.yaml
```

## Creating Clusters Across Environments

Use a consistent naming convention and cluster templates. An Omni cluster template is a multi-document YAML file: one `Cluster` document, one `ControlPlane`, and one or more `Workers` sets. Machines are selected through the machine classes you created above by name and size:

```yaml
# production-us-east.yaml
kind: Cluster
name: prod-us-east-1
kubernetes:
  version: v1.29.2
talos:
  version: v1.6.7
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
---
kind: ControlPlane
machineClass:
  name: cp-large
  size: 3
---
kind: Workers
name: workers
machineClass:
  name: worker-general
  size: 10
```

```bash
# Validate, preview, then sync the template to Omni
omnictl cluster template validate --file production-us-east.yaml
omnictl cluster template diff --file production-us-east.yaml
omnictl cluster template sync --file production-us-east.yaml

# Repeat for the other environments
omnictl cluster template sync --file production-eu-west.yaml
omnictl cluster template sync --file staging-us-east.yaml
omnictl cluster template sync --file dev-us-east.yaml
```

## Fleet-Wide Configuration Management

One of the biggest advantages of Omni is applying configuration consistently across clusters.

### Shared Configuration Patches

Create patches that apply to all clusters in a category. Reference the file from each cluster template so the patch is versioned with the rest of the template:

```yaml
# patches/production-security.yaml
machine:
  sysctls:
    kernel.kptr_restrict: "2"
    kernel.dmesg_restrict: "1"
    kernel.perf_event_paranoid: "3"
    net.ipv4.conf.all.log_martians: "1"
    net.ipv4.conf.all.send_redirects: "0"
    net.ipv4.conf.all.accept_redirects: "0"
```

```yaml
# Add to the Cluster document of each production template
patches:
  - file: patches/production-security.yaml
```

```bash
# Re-sync each production cluster template to roll out the patch
for cluster in production-us-east production-eu-west production-ap-south; do
  omnictl cluster template diff --file "${cluster}.yaml"
  omnictl cluster template sync --file "${cluster}.yaml"
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

Omni performs Talos and Kubernetes upgrades by reconciling the cluster to its declared template. To upgrade, bump `talos.version` and `kubernetes.version` in the `Cluster` document and re-sync:

```bash
# Step 1: Upgrade development cluster
# Edit dev-us-east-1.yaml so the Cluster document has:
#   talos:
#     version: v1.7.0
#   kubernetes:
#     version: v1.30.0
omnictl cluster kubernetes upgrade-pre-checks dev-us-east-1 --to v1.30.0
omnictl cluster template diff --file dev-us-east-1.yaml
omnictl cluster template sync --file dev-us-east-1.yaml

# Step 2: Wait and verify
omnictl cluster template status --file dev-us-east-1.yaml
# Run automated tests against dev cluster

# Step 3: Upgrade staging
omnictl cluster kubernetes upgrade-pre-checks staging-us-east-1 --to v1.30.0
omnictl cluster template diff --file staging-us-east-1.yaml
omnictl cluster template sync --file staging-us-east-1.yaml

# Step 4: Run integration tests
# Wait for staging validation

# Step 5: Upgrade production (one region at a time)
omnictl cluster template sync --file prod-us-east-1.yaml
# Verify
omnictl cluster template sync --file prod-eu-west-1.yaml
# Verify
omnictl cluster template sync --file prod-ap-south-1.yaml
```

### Automating Upgrade Rollouts

The automation script edits each cluster template in place with the new versions, then runs `omnictl cluster template sync` and waits for the cluster to reach `Ready`.

```bash
#!/bin/bash
# upgrade-fleet.sh - Automated fleet upgrade script
set -euo pipefail

TALOS_VERSION="v1.7.0"
K8S_VERSION="v1.30.0"

# Define upgrade order: NAME:TEMPLATE pairs
DEV_CLUSTERS=("dev-us-east-1:dev-us-east-1.yaml")
STAGING_CLUSTERS=("staging-us-east-1:staging-us-east-1.yaml")
PROD_CLUSTERS=(
  "prod-us-east-1:prod-us-east-1.yaml"
  "prod-eu-west-1:prod-eu-west-1.yaml"
  "prod-ap-south-1:prod-ap-south-1.yaml"
)

upgrade_cluster() {
  local cluster="${1%%:*}"
  local template="${1##*:}"
  echo "Upgrading $cluster to Talos $TALOS_VERSION, K8s $K8S_VERSION"

  # Update versions in the Cluster document of the template
  yq -i "(select(.kind == \"Cluster\") | .talos.version) = \"$TALOS_VERSION\"" "$template"
  yq -i "(select(.kind == \"Cluster\") | .kubernetes.version) = \"$K8S_VERSION\"" "$template"

  omnictl cluster kubernetes upgrade-pre-checks "$cluster" --to "$K8S_VERSION"
  omnictl cluster template sync --file "$template"

  # Wait for the cluster to converge to the new template
  omnictl cluster template status --file "$template"

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
  echo "Cluster ${cluster%%:*} done. Continue? (y/n)"
  read -r confirm
  if [ "$confirm" != "y" ]; then exit 1; fi
done
```

## Multi-Cluster Access Management

Control who can access which clusters. Omni roles are `Admin`, `Operator`, `Reader`, and `None`, and per-cluster restrictions are expressed through Access Control Lists (ACLs):

```bash
# Create users with the desired role
omnictl user create platform-admin@company.com --role Admin
omnictl user create dev-lead@company.com --role Operator
omnictl user create developer@company.com --role Reader

# Get kubeconfig for specific clusters and write it to a file
omnictl kubeconfig --cluster prod-us-east-1 --force prod-east.kubeconfig
omnictl kubeconfig --cluster staging-us-east-1 --force staging.kubeconfig
```

For teams that need access to multiple clusters, merge the per-cluster kubeconfigs into one file:

```bash
# Download kubeconfigs for all accessible clusters
for cluster in prod-us-east-1 staging-us-east-1 dev-us-east-1; do
  omnictl kubeconfig --cluster "$cluster" --force "/tmp/$cluster.kubeconfig"
done

# Merge kubeconfigs
KUBECONFIG="/tmp/prod-us-east-1.kubeconfig:/tmp/staging-us-east-1.kubeconfig:/tmp/dev-us-east-1.kubeconfig" \
  kubectl config view --flatten > multi-cluster.kubeconfig

# Switch between clusters (Omni names contexts admin@<cluster>)
kubectl --kubeconfig multi-cluster.kubeconfig config use-context admin@prod-us-east-1
kubectl --kubeconfig multi-cluster.kubeconfig config use-context admin@staging-us-east-1
```

## Monitoring Across Clusters

Get a fleet-wide view of your infrastructure:

```bash
# List all clusters
omnictl get clusters

# List all machines across the Omni instance
omnictl get machines

# Get the per-cluster status of a specific cluster
omnictl cluster status prod-us-east-1

# Discover other available resource types
omnictl get resourcedefinitions
```

For node-level Talos diagnostics, download a talosconfig from Omni and use the standard `talosctl` binary against it:

```bash
# Download a talosconfig scoped to the cluster
omnictl talosconfig --cluster prod-us-east-1 --force prod-east.talosconfig

# Check the health of a specific node
talosctl --talosconfig prod-east.talosconfig --nodes 10.0.0.10 health
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
# Export cluster template for backup
omnictl cluster template export --cluster prod-us-east-1 \
  --output backup-prod-east.yaml

# If a cluster needs to be recreated, sync the saved template
omnictl cluster template sync --file backup-prod-east.yaml

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
