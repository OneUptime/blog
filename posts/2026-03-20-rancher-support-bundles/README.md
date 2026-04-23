# How to Collect Rancher Support Bundles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Support

Description: Learn how to collect comprehensive Rancher support bundles for cluster diagnostics, including logs, configurations, and cluster state using the Rancher UI and CLI tools.

## Introduction

When troubleshooting a complex Rancher issue or opening a support ticket with SUSE, you typically collect diagnostics either through Rancher's `supportconfig` integration or with Rancher's official support collection scripts and `kubectl`. This guide covers both approaches.

## What's in a Rancher Support Bundle?

A support bundle or diagnostic archive typically contains:
- Logs from Rancher server pods and agents
- Kubernetes resource manifests (Deployments, DaemonSets, ConfigMaps)
- Cluster events
- Node information (CPU, memory, OS version)
- RKE/RKE2/K3s configuration and service logs when collected from nodes
- Rancher custom resources such as `clusters.management.cattle.io` and `settings.management.cattle.io`

## Method 1: Collect via the Rancher UI (`supportconfig`)

1. Log in to Rancher as **admin**.
2. Navigate to **☰ → Get Support**.
3. Click **Generate Support Config**.
4. Wait for the `supportconfig` tar file to be generated and save it locally.

If the option is not present, install the CSP adapter first.

## Method 2: Collect Using Rancher's Official Logs Collector

Rancher's `support-tools` repository includes a `rancher2_logs_collector.sh` script for collecting non-mutating diagnostics. The repository recommends running these scripts with Rancher Support guidance.

```bash
# Download the official Rancher 2.x logs collector

curl -Lo rancher2_logs_collector.sh \
  https://raw.githubusercontent.com/rancherlabs/support-tools/master/collection/rancher/v2.x/logs-collector/rancher2_logs_collector.sh
chmod +x rancher2_logs_collector.sh

# Run it as root and write the archive under /tmp
sudo ./rancher2_logs_collector.sh -d /tmp

# Optionally override the Kubernetes distribution or adjust the log window
sudo ./rancher2_logs_collector.sh -d /tmp -r rke2 -s 7
```

## Method 3: Collect Manually with kubectl

For environments where the above tools aren't available:

```bash
#!/usr/bin/env bash
# manual-support-bundle.sh - Collect Rancher diagnostics manually

BUNDLE_DIR="/tmp/rancher-bundle-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BUNDLE_DIR}"/{logs,manifests,events}

echo "Collecting Rancher support bundle to ${BUNDLE_DIR}"

# 1. Collect pod logs from key namespaces
for ns in cattle-system cattle-provisioning-capi-system cattle-fleet-system; do
  kubectl get namespace "${ns}" >/dev/null 2>&1 || continue
  echo "Collecting logs from namespace: ${ns}"
  mkdir -p "${BUNDLE_DIR}/logs/${ns}"
  for pod in $(kubectl get pods -n "${ns}" -o name); do
    pod_name=$(basename "${pod}")
    kubectl logs -n "${ns}" "${pod_name}" --all-containers \
      > "${BUNDLE_DIR}/logs/${ns}/${pod_name}.log" 2>&1 || true
    kubectl logs -n "${ns}" "${pod_name}" --all-containers --previous \
      > "${BUNDLE_DIR}/logs/${ns}/${pod_name}.previous.log" 2>&1 || true
  done
done

# 2. Collect resource manifests
kubectl get all,configmaps -n cattle-system -o yaml \
  > "${BUNDLE_DIR}/manifests/cattle-system.yaml"
kubectl get nodes -o yaml \
  > "${BUNDLE_DIR}/manifests/nodes.yaml"
kubectl get events -A --sort-by='.metadata.creationTimestamp' \
  > "${BUNDLE_DIR}/events/all-events.txt"

# 3. Collect Rancher-specific resources
kubectl get clusters.management.cattle.io -o yaml \
  > "${BUNDLE_DIR}/manifests/clusters.yaml"
kubectl get settings.management.cattle.io -o yaml \
  > "${BUNDLE_DIR}/manifests/settings.yaml"

# 4. Collect node diagnostics
# metrics-server is required for `kubectl top`
kubectl top nodes > "${BUNDLE_DIR}/node-resources.txt" 2>&1 || true
kubectl describe nodes > "${BUNDLE_DIR}/nodes-describe.txt"

# 5. Bundle everything
tar -czf "${BUNDLE_DIR}.tar.gz" -C "$(dirname "${BUNDLE_DIR}")" "$(basename "${BUNDLE_DIR}")"
echo "Bundle created: ${BUNDLE_DIR}.tar.gz"
```

```bash
chmod +x manual-support-bundle.sh
./manual-support-bundle.sh
```

## Method 4: Collect Cluster Agent Bundles

For downstream cluster issues, collect agent-specific diagnostics. `cattle-node-agent` pods are only present on Rancher-created RKE clusters.

```bash
# Save to a directory
mkdir -p /tmp/agent-bundle

# Collect cattle-system resources from the DOWNSTREAM cluster
kubectl --kubeconfig /path/to/downstream/kubeconfig \
  get all,configmaps,events -n cattle-system -o yaml \
  > /tmp/agent-bundle/cattle-system.yaml

# Get agent logs
kubectl --kubeconfig /path/to/downstream/kubeconfig \
  logs -n cattle-system -l app=cattle-cluster-agent \
  > /tmp/agent-bundle/cattle-cluster-agent.log

kubectl --kubeconfig /path/to/downstream/kubeconfig \
  logs -n cattle-system -l app=cattle-agent \
  > /tmp/agent-bundle/cattle-node-agents.log 2>&1 || true
```

## What to Include When Opening a Support Ticket

When submitting to SUSE support or a GitHub issue, include:

1. The support bundle tar or tar.gz file.
2. Steps to reproduce the issue.
3. The Rancher version (`kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'`).
4. The Kubernetes distribution and version (RKE2, K3s, EKS, etc.).
5. Any recent changes (upgrades, cert rotations, node additions).

## Conclusion

Collecting a comprehensive support bundle is the first step toward resolving complex Rancher issues. The Rancher UI provides the easiest path when the CSP adapter is installed, while the official `support-tools` collector and manual `kubectl` scripts offer flexibility in restricted environments. A well-collected support bundle dramatically reduces the time needed to diagnose and resolve issues, whether you're working with SUSE support or debugging independently.
