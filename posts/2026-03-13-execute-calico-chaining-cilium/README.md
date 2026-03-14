# Execute Calico CNI Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, CNI Chaining, Migration, EBPF

Description: Learn how to chain Cilium onto an existing Calico CNI deployment to augment it with eBPF-based observability and L7 policy enforcement as an intermediate migration step before fully replacing Calico.

---

## Introduction

Organizations running Calico as their CNI may want to adopt Cilium's eBPF-based L7 policy enforcement and Hubble observability without a full CNI replacement-especially in production clusters where replacing the CNI requires node restarts. CNI chaining with Calico allows Cilium to run as a secondary plugin, handling policy enforcement while Calico continues to manage IP allocation and routing.

This guide is intended as a transition path: Cilium chains onto Calico, you validate Cilium policies alongside Calico policies, then complete the migration by removing Calico and promoting Cilium to the primary CNI.

## Prerequisites

- Kubernetes cluster with Calico CNI installed and functional
- `kubectl`, `cilium`, and `helm` CLIs installed
- Calico version 3.x with BGP or VXLAN networking

## Step 1: Verify Calico Status

Confirm that Calico is fully operational before adding Cilium.

```bash
# Check Calico node status
kubectl get pods -n calico-system
# or for older installations:
kubectl get pods -n kube-system | grep calico

# Verify network policy enforcement is working
kubectl get networkpolicies -A

# Check Calico node status using calicoctl
calicoctl node status
```

## Step 2: Install Cilium in Generic CNI Chaining Mode

Cilium does not have a dedicated Calico chaining mode; use the generic chaining mode instead.

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium in generic chaining mode on top of Calico
# Cilium will handle policy enforcement; Calico manages networking
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  --set cni.chainingMode=generic-veth \
  --set cni.exclusive=false \
  --set kubeProxyReplacement=false \
  --set hostServices.enabled=false \
  --set externalIPs.enabled=false \
  --set hostPort.enabled=false
```

## Step 3: Verify Cilium is Running

```bash
# Check all Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium

# Verify Cilium status
cilium status --wait

# Confirm both Calico and Cilium appear in the CNI config
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ls /etc/cni/net.d/
```

## Step 4: Apply CiliumNetworkPolicies

With Cilium running in chaining mode, CiliumNetworkPolicies are enforced via eBPF alongside any existing Calico NetworkPolicies.

```yaml
# CiliumNetworkPolicy for L7 HTTP enforcement - not possible with Calico alone
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-api-get-only
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            role: client
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          # L7 rule: only allow GET requests (not possible with standard NetworkPolicy)
          rules:
            http:
              - method: GET
                path: "/api/.*"
```

```bash
# Apply and verify the L7 policy
kubectl apply -f allow-api-get-only.yaml
cilium policy get
```

## Step 5: Run Connectivity Tests

```bash
# Run the Cilium connectivity test suite to verify the chained setup works
cilium connectivity test

# Check for any dropped flows in Hubble
cilium hubble observe --verdict DROPPED
```

## Best Practices

- Test the chained setup in a non-production cluster before applying it to production.
- Use `cni.exclusive=false` so Cilium does not remove the Calico CNI configuration.
- Calico and Cilium NetworkPolicies are enforced independently; a packet must pass both to reach its destination.
- Use this chaining setup as a temporary migration step, not a permanent architecture; maintaining two CNI policy engines adds complexity.
- Plan the full Calico-to-Cilium migration with node draining and rolling restarts; the chaining mode is the validation step.

## Conclusion

Chaining Cilium onto Calico provides an incremental migration path that lets you validate Cilium's L7 policies and Hubble observability without disrupting existing Calico networking. Once validated, complete the migration by replacing Calico entirely and enabling Cilium's full eBPF datapath.
