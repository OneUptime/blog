# Configuring Masquerade Traffic to Remote Nodes in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking

Description: Learn how to configure masquerading behavior for traffic destined to remote nodes in a Cilium cluster in your Kubernetes cluster for optimal performance and security.

---

## Introduction

Proper configuration of masquerade traffic to remote nodes in cilium is essential for a production-ready Cilium deployment. When pods communicate with pods on remote nodes, Cilium can be configured to masquerade or not masquerade this inter-node traffic. The behavior depends on whether the pod CIDR is natively routable between nodes. In overlay (VXLAN/Geneve) mode, masquerading for inter-node traffic is typically not needed because the overlay handles encapsulation.

Misconfiguration at this level can lead to connectivity failures, performance degradation, or security gaps. This guide provides tested configuration settings with explanations for each option so you can make informed decisions for your environment.

Understanding the configuration options and their implications before deploying to production prevents costly troubleshooting later. Each setting in this guide includes context about when and why you would use it.

## Prerequisites

- A Kubernetes cluster with Cilium installed via Helm
- Helm v3 installed
- `kubectl` with cluster-admin access
- The Cilium CLI installed
- Basic understanding of Kubernetes networking concepts

## Core Configuration

Apply the following Helm values to configure masquerade traffic to remote nodes in cilium:

```yaml
# cilium-remote-masquerade-values.yaml
# Controls masquerading for traffic between nodes
# In overlay mode, inter-node traffic is encapsulated, no masquerade needed
tunnel: vxlan

# Enable masquerade only for traffic leaving the cluster
enableIPv4Masquerade: true

# Do not masquerade traffic within the cluster pod CIDR
ipv4NativeRoutingCIDR: "10.42.0.0/16"

# BPF masquerade for performance
bpf:
  masquerade: true
```

Apply the configuration:

```bash
# Apply the configuration via Helm upgrade
helm upgrade cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  -f cilium-values.yaml

# Wait for the rollout to complete
kubectl rollout status daemonset/cilium -n kube-system --timeout=300s
kubectl rollout status deployment/cilium-operator -n kube-system --timeout=120s
```

## Validating the Configuration

Verify the configuration was applied correctly:

```bash
# Check the active configuration
cilium config view | grep -E "masq|routing-cidr|tunnel"

# Verify Cilium status after configuration change
cilium status

# Check Cilium agent logs for configuration-related messages
kubectl logs -n kube-system -l k8s-app=cilium --tail=30 | grep -i "config\|setting\|enable"
```

## Testing the Configuration

Deploy test workloads to verify the configuration works as expected:

```yaml
# test-deployment.yaml
# Test workload to verify masquerade traffic to remote nodes in cilium configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: config-test
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: config-test
  template:
    metadata:
      labels:
        app: config-test
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: config-test-svc
  namespace: default
spec:
  selector:
    app: config-test
  ports:
    - port: 80
      targetPort: 80
```

```bash
# Deploy test workload
kubectl apply -f test-deployment.yaml
kubectl rollout status deployment/config-test --timeout=60s

# Test connectivity
kubectl run test-client --image=busybox --restart=Never -- sleep 300
kubectl wait --for=condition=Ready pod/test-client --timeout=30s
kubectl exec test-client -- wget -qO- --timeout=5 http://config-test-svc
kubectl delete pod test-client
kubectl delete -f test-deployment.yaml
```

## Advanced Configuration Options

For production environments, consider these additional settings:

```bash
# View all available configuration options
cilium config view

# Check which features are enabled
cilium status --verbose | head -40

# Review the effective BPF configuration
kubectl exec -n kube-system ds/cilium -- cilium bpf config list 2>/dev/null || echo "Use cilium config view instead"
```

## Verification

Final verification that configuration is complete and correct:

```bash
# Run Cilium connectivity test
cilium connectivity test --test pod-to-pod,pod-to-service

# Verify no configuration warnings
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep -i "warn\|error" | tail -10

# Check endpoint health
cilium endpoint list | head -20
```

## Troubleshooting

- **Configuration change not taking effect**: Helm upgrade may require a pod restart. Check with `kubectl rollout status daemonset/cilium -n kube-system`. If pods did not restart, trigger a rollout with `kubectl rollout restart daemonset/cilium -n kube-system`.
- **Cilium agent CrashLoopBackOff after config change**: An invalid configuration may prevent the agent from starting. Check logs with `kubectl logs -n kube-system -l k8s-app=cilium --previous`. Rollback with `helm rollback cilium -n kube-system`.
- **Connectivity broken after config change**: Verify the new configuration is compatible with your cluster topology. For example, switching from overlay to native routing requires network infrastructure changes.
- **Performance degradation after config change**: Check BPF map sizes and conntrack table limits. Undersized maps cause increased miss rates and slower forwarding.

## Conclusion

Configuring masquerade traffic to remote nodes in cilium requires understanding the available options and their impact on networking behavior, performance, and security. Apply configuration changes through Helm for reproducibility, validate with connectivity tests, and monitor for any degradation after changes. Always have a rollback plan before modifying production Cilium configuration.
