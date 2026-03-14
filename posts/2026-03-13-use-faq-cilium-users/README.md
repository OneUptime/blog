# Use the Cilium User FAQ

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, faq, kubernetes, networking, community, troubleshooting

Description: A practical guide to applying the Cilium FAQ to real operational scenarios, with actionable steps for resolving the most frequently encountered Cilium issues in production environments.

---

## Introduction

The Cilium FAQ is most valuable when you know how to apply its answers to your specific situation. Many operators read FAQ entries but struggle to map generic answers to their particular environment, Kubernetes distribution, or use case. This guide bridges that gap by taking the most impactful FAQ topics and showing exactly how to apply them in practice.

Production Cilium operators encounter a predictable set of recurring questions: connectivity failures after policy application, performance regressions after kernel updates, unexpected pod-to-pod communication failures, and issues with Hubble observability. Each has a clear diagnostic path and resolution — but that path requires knowing which commands to run and how to interpret their output.

This guide provides practical, step-by-step application of Cilium FAQ answers to real operational scenarios.

## Prerequisites

- Cilium installed on a Kubernetes cluster
- `cilium` CLI and `kubectl` configured
- Hubble installed (recommended)
- Basic familiarity with Cilium architecture

## FAQ Topic 1: Pods Can't Communicate After Policy Applied

This is the most common Cilium question in production environments.

```bash
# Step 1: Identify which policy is selecting the affected pod
kubectl get ciliumnetworkpolicies -A -o yaml | grep -B 5 "app: my-pod"

# Step 2: Check Cilium endpoint identity for the affected pod
POD_IP=$(kubectl get pod my-pod -o jsonpath='{.status.podIP}')
cilium endpoint list | grep $POD_IP

# Step 3: Use Hubble to see why traffic is being dropped
hubble observe --from-pod my-namespace/my-pod --verdict DROPPED --follow

# Step 4: Check that egress to DNS is allowed (common oversight)
kubectl get ciliumnetworkpolicies -n my-namespace -o yaml | grep -A 5 "dns\|UDP.*53"
```

The most common fix: add an explicit DNS egress allow rule to your CiliumNetworkPolicy.

```yaml
# Add this egress rule to allow DNS resolution
egress:
- toEndpoints:
  - matchLabels:
      k8s:io.kubernetes.pod.namespace: kube-system
      k8s-app: kube-dns
  toPorts:
  - ports:
    - port: "53"
      protocol: UDP
    - port: "53"
      protocol: TCP
```

## FAQ Topic 2: Cilium Pods Crash After Kernel Update

```bash
# Check Cilium pod logs for kernel-specific errors
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep -i "kernel\|bpf\|error"

# Check the current kernel version
kubectl get nodes -o custom-columns="NODE:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion"

# Verify BPF filesystem is still mounted after kernel update
kubectl debug node/<node-name> -it --image=busybox -- \
  chroot /host mount | grep bpf

# If BPF filesystem is unmounted, remount it
kubectl debug node/<node-name> -it --image=ubuntu -- \
  chroot /host mount bpffs -t bpf /sys/fs/bpf
```

## FAQ Topic 3: High CPU Usage from Felix/Cilium Agent

```bash
# Check Cilium agent CPU usage
kubectl top pods -n kube-system -l k8s-app=cilium

# Check for policy or endpoint count causing overhead
cilium endpoint list | wc -l

# Reduce iptables refresh frequency if not needed
kubectl patch configmap -n kube-system cilium-config \
  --patch '{"data":{"kube-proxy-replacement":"false"}}'

# Check if policy count is unusually high
kubectl get ciliumnetworkpolicies -A | wc -l
```

## FAQ Topic 4: Hubble Not Showing Traffic

```bash
# Check Hubble is enabled
cilium status | grep Hubble

# Enable Hubble if not running
cilium hubble enable

# Verify Hubble relay is running
kubectl get pods -n kube-system | grep hubble

# Check Hubble port-forward is working
cilium hubble port-forward &
sleep 2
hubble status

# If still not showing traffic, check flow sampling settings
kubectl get configmap -n kube-system cilium-config \
  -o jsonpath='{.data.monitor-aggregation}'
```

## FAQ Topic 5: Services Not Accessible After Cilium Installation

```bash
# Check if kube-proxy is conflicting with Cilium
kubectl get pods -n kube-system | grep kube-proxy

# If using kube-proxy replacement, disable kube-proxy
kubectl -n kube-system patch ds kube-proxy \
  -p '{"spec":{"template":{"spec":{"nodeSelector":{"non-existing":"true"}}}}}'

# Verify service routing in Cilium
cilium service list

# Test service connectivity
kubectl run svc-test --image=busybox --rm -it --restart=Never -- \
  wget -qO- http://kubernetes.default.svc.cluster.local
```

## Best Practices

- Keep a runbook with the Cilium FAQ scenarios most relevant to your environment
- Use `cilium sysdump` as the first step for any Cilium issue you can't immediately diagnose
- Follow the Cilium Slack `#general` channel for new FAQ entries as they emerge from the community
- Document every production Cilium issue you encounter and how it was resolved — your team's FAQ
- Run `cilium connectivity test` after every change to catch regressions early

## Conclusion

The Cilium FAQ becomes genuinely useful when you can apply it to your specific operational scenario with the right diagnostic commands. By understanding the diagnostic path for the most common issues — policy-related drops, kernel compatibility, performance, and Hubble visibility — you can resolve most Cilium issues rapidly without escalation. Each resolved issue adds to your team's operational knowledge base for future reference.
