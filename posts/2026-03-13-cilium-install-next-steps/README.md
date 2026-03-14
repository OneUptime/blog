# Cilium Installation Next Steps: What to Do After Installing Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A guide to the essential next steps after a successful Cilium installation, covering connectivity validation, Hubble setup, network policy deployment, and monitoring integration.

---

## Introduction

Installing Cilium is the beginning, not the end, of the journey. A successful `cilium install` that passes `cilium status` is a foundation, but realizing Cilium's full value requires several post-installation steps: validating end-to-end connectivity, enabling Hubble observability, deploying network policies for your workloads, integrating with your monitoring stack, and configuring production-specific settings like encryption and IPAM customization.

This guide presents the next steps in priority order, from the must-do immediate steps (connectivity test, Hubble enablement) to the important-but-deferrable steps (encryption, advanced IPAM), to the optional enhancements (Tetragon, BGP). Each step includes the commands needed to complete it and the expected outputs.

## Prerequisites

- Cilium successfully installed and showing `cilium status` as OK
- `kubectl` access to the cluster
- Cilium CLI installed

## Step 1: Run the Connectivity Test (Immediate)

```bash
# Run comprehensive connectivity test
cilium connectivity test

# If all tests pass, your network plane is healthy
# Expected: all x tests passed, 0 failures
```

## Step 2: Enable Hubble Observability (Immediate)

```bash
# Enable Hubble on existing installation
cilium hubble enable

# Enable with Hubble UI (optional)
cilium hubble enable --ui

# Verify Hubble is running
cilium status | grep Hubble

# Port-forward and test
cilium hubble port-forward &
hubble status
```

## Step 3: Apply Default-Deny Network Policies (High Priority)

```bash
# Create a default-deny policy for a namespace
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  endpointSelector: {}
  ingress:
  - {}
  egress:
  - {}
EOF

# Verify policy is active
kubectl get CiliumNetworkPolicy -n production
```

## Step 4: Deploy Application-Specific Policies

```bash
# Apply policies for each of your services
# Use the Star Wars demo as a template

# Allow your services to communicate
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
EOF
```

## Step 5: Configure Monitoring Integration

```bash
# Expose Cilium metrics for Prometheus
kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/kubernetes/addons/prometheus/monitoring-example.yaml

# Add Hubble to Grafana
# Import dashboard ID 15513 (Hubble) from grafana.com

# Verify metrics endpoint
kubectl port-forward -n kube-system ds/cilium 9962:9962 &
curl http://localhost:9962/metrics | grep cilium_
```

## Step 6: (Optional) Enable Encryption

```bash
# Enable WireGuard encryption (kernel 5.6+)
cilium encrypt enable --type wireguard

# Or IPsec
cilium encrypt enable --type ipsec

# Verify encryption is active
kubectl exec -n kube-system ds/cilium -- cilium status | grep Encryption
```

## Step 7: Review and Adjust IPAM

```bash
# Check current IPAM allocation
kubectl get CiliumNode -o wide

# Review pod CIDR allocation
kubectl exec -n kube-system ds/cilium -- cilium ip list
```

## Post-Installation Checklist

- [ ] Connectivity test passes: `cilium connectivity test`
- [ ] Hubble enabled: `cilium hubble enable`
- [ ] Default-deny policies for sensitive namespaces
- [ ] Service-specific allow policies deployed
- [ ] Metrics integrated with Prometheus/Grafana
- [ ] Encryption enabled (production requirement)

## Conclusion

The steps after a Cilium installation define how much security and visibility value you extract from the platform. Running the connectivity test first ensures your network baseline is correct. Enabling Hubble unlocks observability. Deploying policies moves you from permissive to secure. Each step builds on the previous one, transforming a basic CNI installation into a complete, production-grade network security platform.
