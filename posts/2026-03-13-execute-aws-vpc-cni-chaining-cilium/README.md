# Execute AWS VPC CNI Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, eBPF

Description: Learn how to chain Cilium onto AWS VPC CNI on Amazon EKS to gain Cilium's advanced network policy enforcement and observability features while retaining native VPC networking and pod IP addressing.

---

## Introduction

AWS VPC CNI assigns each Kubernetes pod a real VPC IP address, enabling native routing within the VPC without encapsulation overhead. However, VPC CNI's network policy support is limited compared with Cilium's policy model. By chaining Cilium onto VPC CNI, you retain native VPC networking while gaining Cilium's eBPF-based L3/L4 network policy enforcement and Hubble observability. Some advanced Cilium features, including L7 policy and IPsec transparent encryption, are limited in CNI chaining mode.

CNI chaining means Cilium runs as a chained plugin on top of VPC CNI. VPC CNI handles IP allocation and basic connectivity; Cilium handles policy enforcement and observability via eBPF.

## Prerequisites

- Amazon EKS cluster on a Kubernetes version supported by your Cilium release
- AWS VPC CNI add-on 1.11.2 or newer installed and functional
- `kubectl` and `cilium` CLIs installed
- `helm` installed for Cilium deployment

## Step 1: Verify Existing VPC CNI Setup

Check that VPC CNI is running and pods have VPC-routable IP addresses.

```bash
# Confirm VPC CNI DaemonSet is running on all nodes

kubectl get daemonset aws-node -n kube-system

# Verify pods have VPC CIDR IP addresses (not pod overlay IPs)
kubectl get pods -o wide -n default
```

## Step 2: Install Cilium in Chaining Mode

Install Cilium with `cni.chainingMode: aws-cni` so it chains onto the existing VPC CNI setup.

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with AWS VPC CNI chaining mode
# This does NOT replace VPC CNI; it chains onto it
helm install cilium cilium/cilium \
  --version 1.19.4 \
  --namespace kube-system \
  --set cni.chainingMode=aws-cni \
  --set cni.exclusive=false \
  --set enableIPv4Masquerade=false \
  --set routingMode=native
```

Restart existing non-`hostNetwork` pods after installation. The new CNI chaining configuration is applied when pods are created, so policy enforcement will not apply to pods that were already running before Cilium was installed.

## Step 3: Verify Cilium is Running in Chaining Mode

```bash
# Check Cilium agent status
cilium status --wait

# Confirm all nodes show Cilium as healthy
cilium status

# Verify that the chaining configuration is active
kubectl get configmap cilium-config -n kube-system -o yaml | grep cni-chaining-mode
```

## Step 4: Verify CNI Chain Configuration

Inspect the CNI configuration on a node to confirm the chain.

```bash
# Shell into a node (via a debug pod or SSM) and check the CNI config
cat /etc/cni/net.d/10-aws.conflist

# The conflist should show both aws-cni and cilium plugins:
# {
#   "plugins": [
#     {"type": "aws-cni", ...},
#     {"type": "cilium-cni", ...}
#   ]
# }
```

## Step 5: Test Network Policy Enforcement

Apply a CiliumNetworkPolicy and verify it is enforced at the eBPF layer.

```yaml
# Test CiliumNetworkPolicy - allow only port 80 ingress to the nginx pod
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-http-ingress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: nginx
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: client
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
```

```bash
# Apply the policy
kubectl apply -f allow-http-ingress.yaml

# Confirm the CiliumNetworkPolicy exists
kubectl get cnp allow-http-ingress -n default
```

## Best Practices

- Use `cni.exclusive=false` so Cilium does not delete the VPC CNI configuration during installation.
- Keep kube-proxy running unless you have explicitly planned and tested Cilium kube-proxy replacement for your cluster.
- Test connectivity before and after enabling network policies with `cilium connectivity test`.
- Enable Hubble UI first (`cilium hubble enable --ui`), then use `cilium hubble ui` to observe traffic flows and verify policy enforcement visually.
- Consider migrating to Cilium as the primary CNI (replacing VPC CNI) for full eBPF-based networking benefits on EKS.

## Conclusion

Chaining Cilium onto AWS VPC CNI is an incremental path to advanced network security on EKS. You retain native VPC IP addressing while gaining eBPF-based policy enforcement and Hubble flow observability, without disrupting your existing VPC routing or requiring node replacement.
