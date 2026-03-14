# Troubleshoot Cilium Installed via External Installers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: A guide to diagnosing and resolving issues when Cilium has been installed via external cluster provisioning tools such as kops, Kubespray, Talos, or other third-party installers.

---

## Introduction

Cilium can be installed through various external tools and cluster provisioners beyond the official `cilium` CLI and Helm chart. Tools like kops, Kubespray, Talos Linux, Cluster API, and cloud-specific provisioners all include Cilium as a networking option. However, these installers may use specific Cilium versions, configurations, or deployment patterns that differ from the official installation, creating unique troubleshooting scenarios.

When Cilium is installed via an external tool, the configuration is often managed by the tool's lifecycle, meaning manual changes can be overwritten. Understanding how the installer manages Cilium and how to apply supported customizations is key to effective troubleshooting.

## Prerequisites

- Kubernetes cluster with Cilium installed via an external tool
- `kubectl` with cluster admin access
- `cilium` CLI installed for diagnostics
- Access to the external tool's configuration (kops cluster spec, Kubespray vars, etc.)

## Step 1: Identify How Cilium Was Installed

Determine the installation method to understand the management model.

```bash
# Check the Cilium version and installation signature
cilium version
kubectl get pods -n kube-system -l k8s-app=cilium -o yaml | grep image

# Look for annotations indicating the installer
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "installer|provisioner|managed-by"

# Check if Cilium is managed by Helm
helm list --all-namespaces | grep cilium

# Check if Cilium is deployed as a kops addon
# (Look for kops-specific labels)
kubectl get daemonset -n kube-system cilium -o yaml | grep -E "kops|kubespray|talos"
```

## Step 2: Check Cilium Health and Status

Assess the current state of the Cilium installation.

```bash
# Run comprehensive Cilium status check
cilium status --wait

# Check all Cilium component pods
kubectl get pods -n kube-system | grep -E "cilium|hubble"

# Identify pods that are not running
kubectl get pods -n kube-system -l k8s-app=cilium | grep -v Running

# Check events for issues
kubectl get events -n kube-system | grep -i cilium | tail -20
```

## Step 3: Diagnose Configuration Drift

Identify if manual configuration changes were overwritten by the external installer.

```bash
# Check the current Cilium configuration
kubectl get configmap cilium-config -n kube-system -o yaml

# Compare against the installer's expected configuration
# For kops: kops get cluster <cluster> -o yaml | grep cilium
# For Kubespray: check group_vars/k8s_cluster/k8s-net-cilium.yml

# Look for recent updates to the configmap
kubectl get configmap cilium-config -n kube-system -o yaml | grep -E "annotations:|last-applied"

# Check if the installer has reconciled away your changes
kubectl logs -n kube-system <installer-controller-pod> | grep -i cilium | tail -20
```

## Step 4: Apply Supported Configuration Changes

Make changes through the installer's supported mechanism to avoid drift.

```bash
# For kops-managed Cilium, edit the cluster spec
# kops edit cluster <cluster-name>
# Then update the networking.cilium section

# For Kubespray, modify Cilium variables
# Edit: inventory/mycluster/group_vars/k8s_cluster/k8s-net-cilium.yml
# Then run: ansible-playbook -i inventory/mycluster upgrade-cluster.yml

# For Talos Linux, modify the machine config
# talosctl gen config with cilium configuration in extraArgs

# Verify the change was applied without drift
kubectl get configmap cilium-config -n kube-system -o yaml | grep <your-setting>
```

## Step 5: Run Connectivity Tests Post-Configuration

Validate Cilium is functioning correctly after configuration changes.

```bash
# Run the Cilium connectivity test suite
cilium connectivity test

# Check for specific test failures
cilium connectivity test 2>&1 | grep -E "FAIL|ERROR"

# Validate DNS works through Cilium
kubectl run dns-test --rm -it --image=busybox -- nslookup kubernetes.default

# Test network policy enforcement
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      test: policy
  policyTypes: [Ingress]
EOF
```

## Best Practices

- Always check your installer's documentation for supported Cilium configuration methods
- Never manually edit Cilium resources that are managed by an external installer-changes will be overwritten
- Pin the Cilium version in your installer configuration to prevent unexpected upgrades
- Test Cilium after every cluster upgrade performed by the external installer
- Use the official `cilium` CLI for diagnostics even if Cilium was not installed with it

## Conclusion

Cilium installed via external tools requires understanding the tool's lifecycle management before troubleshooting. By identifying the installer, checking for configuration drift, and making changes through supported mechanisms, you can maintain a healthy Cilium installation while preserving the benefits of automated cluster management.
