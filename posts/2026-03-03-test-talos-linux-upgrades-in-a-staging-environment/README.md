# How to Test Talos Linux Upgrades in a Staging Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Staging Environment, Upgrade Testing, DevOps

Description: Learn how to set up a staging environment for testing Talos Linux upgrades before rolling them out to production clusters.

---

Running a Talos Linux upgrade directly in production without testing it first is a gamble. Even with Talos being an immutable and well-structured operating system, there are enough moving parts in a Kubernetes cluster that surprises can and do happen. A staging environment gives you a safe place to catch those surprises before they affect real users.

## Why Staging Matters for Talos Upgrades

Talos Linux upgrades touch the OS layer, the Kubernetes components, and potentially system extensions. Each of these layers can introduce subtle changes that interact with your workloads in unexpected ways. A new kernel version might change networking behavior. An updated kubelet might handle resource limits differently. An extension update might change how storage drivers work.

Testing in staging lets you validate all of these interactions without risk.

## Setting Up a Staging Cluster

Your staging cluster should mirror production as closely as possible. The closer the match, the more useful your testing will be.

### Match the Architecture

Start by replicating the node topology:

```bash
# If production has 3 control plane + 5 worker nodes,
# staging should have at least 3 control plane + 2-3 worker nodes

# Generate staging machine configs
talosctl gen config staging-cluster https://staging-endpoint:6443 \
  --output-dir staging-configs
```

The key elements to match are:

- Number of control plane nodes (always use 3 for quorum testing)
- Talos version (same as current production)
- Kubernetes version
- System extensions
- Machine configuration patches
- Network configuration (CNI, load balancers, DNS)

### Mirror Machine Configurations

Pull the machine configurations from your production cluster and adapt them for staging:

```bash
# Export production configs
talosctl get machineconfig --nodes <prod-cp-ip> -o yaml > prod-cp-config.yaml
talosctl get machineconfig --nodes <prod-worker-ip> -o yaml > prod-worker-config.yaml

# Compare with staging configs to find differences
diff prod-cp-config.yaml staging-configs/controlplane.yaml
```

Adjust only the things that must change - endpoint IPs, cluster names, certificates. Keep everything else identical.

### Install the Same Workloads

Deploy the same applications and infrastructure components that run in production. This includes:

- CNI plugin (Cilium, Calico, Flannel)
- Ingress controllers
- Storage provisioners
- Monitoring stack (Prometheus, Grafana)
- Key application deployments

```bash
# Use the same Helm charts or manifests as production
helm install cilium cilium/cilium --namespace kube-system \
  --values production-cilium-values.yaml

# Deploy application workloads
kubectl apply -f production-manifests/
```

You do not need production-scale data, but you do need representative workloads that exercise the same features and APIs.

## Running the Upgrade Test

With your staging cluster ready, follow the same upgrade procedure you would use in production.

### Pre-Upgrade Checks

```bash
# Document current state
talosctl version --nodes <staging-cp-1>,<staging-cp-2>,<staging-cp-3>
talosctl etcd status --nodes <staging-cp-1>

# Check all nodes are healthy
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

Save these outputs. You will compare them against post-upgrade state.

### Execute the Upgrade

Upgrade control plane nodes one at a time, just as you would in production:

```bash
# Upgrade first control plane node
talosctl upgrade --nodes <staging-cp-1> \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node to come back and verify
talosctl health --nodes <staging-cp-1> --wait-timeout 5m

# Check etcd health after each control plane upgrade
talosctl etcd status --nodes <staging-cp-2>

# Continue with remaining control plane nodes
talosctl upgrade --nodes <staging-cp-2> \
  --image ghcr.io/siderolabs/installer:v1.7.0

talosctl upgrade --nodes <staging-cp-3> \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

Then upgrade workers:

```bash
# Upgrade worker nodes
talosctl upgrade --nodes <staging-worker-1> \
  --image ghcr.io/siderolabs/installer:v1.7.0

talosctl upgrade --nodes <staging-worker-2> \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

## What to Validate After the Upgrade

This is where the real value of staging comes in. Run through a comprehensive validation checklist.

### System-Level Checks

```bash
# Verify all nodes are on the new version
talosctl version --nodes <all-staging-nodes>

# Confirm all system services are running
talosctl services --nodes <staging-cp-1>

# Check etcd cluster health
talosctl etcd status --nodes <staging-cp-1>
talosctl etcd members --nodes <staging-cp-1>

# Review system logs for errors
talosctl logs controller-runtime --nodes <staging-cp-1> | grep -i error
```

### Kubernetes-Level Checks

```bash
# All nodes should be Ready
kubectl get nodes -o wide

# No unexpected pod failures
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# API server responding normally
kubectl cluster-info

# Check component health
kubectl get componentstatuses
```

### Application-Level Checks

This is where most problems surface. Run your application test suite against the staging cluster:

- Hit your API endpoints and verify responses
- Check that background jobs are processing
- Verify database connections are stable
- Test any features that depend on specific kernel modules or system capabilities

```bash
# Run integration tests
./run-integration-tests.sh --target staging

# Check application logs for errors
kubectl logs -l app=your-app --tail=100 --all-containers
```

### Performance Comparison

Compare key metrics before and after the upgrade:

- API server response latency
- Pod startup times
- Network throughput between nodes
- Storage I/O performance
- etcd operation latency

If you have Prometheus running in staging, query the relevant metrics:

```bash
# Check etcd latency
kubectl exec -n monitoring prometheus-0 -- \
  promtool query instant http://localhost:9090 \
  'histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))'
```

## Handling Failures in Staging

If something goes wrong during the staging upgrade, that is actually a success. You found the problem before it hit production.

Document what failed and why. Common issues include:

- System extensions that are not available for the new version
- Machine config fields that changed or were deprecated
- CNI plugin incompatibility with the new kernel
- Storage driver changes that affect PV provisioning

For each issue, figure out the fix and test it again in staging before moving to production.

## Automating Staging Tests

For teams that upgrade regularly, automating the staging test pipeline pays off quickly:

```yaml
# Example CI pipeline structure
stages:
  - create-staging-cluster
  - deploy-workloads
  - run-pre-upgrade-checks
  - upgrade-control-plane
  - upgrade-workers
  - run-post-upgrade-checks
  - run-application-tests
  - generate-report
  - teardown-staging-cluster
```

You can trigger this pipeline whenever a new Talos version is released, giving you an early signal about upgrade readiness.

## How Long to Run Staging

Do not just upgrade and immediately tear down the staging cluster. Run it for at least a few hours, ideally a day or two, to catch issues that only appear under sustained operation. Memory leaks, certificate rotation problems, and garbage collection issues all take time to surface.

If you have synthetic load generators, point them at the staging cluster during this period.

## Summary

Testing Talos Linux upgrades in a staging environment is the single most effective thing you can do to prevent production incidents during upgrades. Set up a cluster that mirrors production, run the full upgrade procedure, validate at every level, and give it time to surface delayed issues. The effort you invest in staging testing will pay for itself the first time it catches a problem that would have caused a production outage.
