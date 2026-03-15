# Building a Runbook for FailedCreatePodSandBox Errors After Installing Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Pods, Runbook

Description: Create a structured runbook with step-by-step procedures for diagnosing and resolving FailedCreatePodSandBox errors that occur after deploying Calico CNI in Kubernetes.

---

## Introduction

A runbook transforms ad-hoc troubleshooting into a repeatable, documented process. When FailedCreatePodSandBox errors appear after installing Calico, on-call engineers need a clear decision tree to identify the root cause quickly rather than guessing at solutions.

FailedCreatePodSandBox errors have multiple possible causes in a Calico environment: the CNI binary may not be installed on the node, the Calico configuration file may be missing or malformed, IPAM may be exhausted, or the calico-node pod may not be running. Each cause requires a different remediation path.

This guide provides a production-ready runbook structure that your team can adopt directly or adapt to your environment. It includes diagnostic commands, decision points, and resolution steps for each failure mode.

## Prerequisites

- A Kubernetes cluster with Calico as the CNI plugin
- `kubectl` access with permissions to read pods, events, nodes, and Calico CRDs
- Access to node SSH or `kubectl debug` for node-level diagnostics
- A runbook platform (wiki, Confluence, or incident management tool)

## Runbook: Initial Triage

Begin by gathering context about the failure scope and timing.

```bash
# Step 1: Identify affected pods and nodes
# This shows all pods with sandbox creation failures
kubectl get events --all-namespaces \
  --field-selector reason=FailedCreatePodSandBox \
  --sort-by='.lastTimestamp' | tail -20

# Step 2: Determine if the problem is cluster-wide or node-specific
kubectl get events --all-namespaces \
  --field-selector reason=FailedCreatePodSandBox \
  -o jsonpath='{range .items[*]}{.source.host}{"\n"}{end}' | sort | uniq -c | sort -rn

# Step 3: Check the timing relative to Calico installation or changes
kubectl get pods -n calico-system --sort-by='.status.startTime' \
  -o custom-columns=NAME:.metadata.name,STARTED:.status.startTime,STATUS:.status.phase
```

Document the scope in your incident:

```text
# Decision Point 1: Scope
# - All nodes affected → Likely a cluster-wide CNI configuration issue
# - Single node affected → Likely a node-specific CNI binary or config issue
# - Specific namespace only → Likely an IPAM or network policy issue
```

## Runbook: CNI Binary and Configuration Checks

The most common cause is a missing or misconfigured CNI setup on the node.

```bash
# Step 4: Verify CNI binaries exist on affected node
# Replace NODE_NAME with the affected node
kubectl debug node/NODE_NAME -it --image=busybox -- ls -la /host/opt/cni/bin/

# Expected output should include:
# - calico (or calico-ipam)
# - install (Calico CNI installer)
# - loopback
# - bandwidth
# - portmap

# Step 5: Check CNI configuration file
kubectl debug node/NODE_NAME -it --image=busybox -- cat /host/etc/cni/net.d/10-calico.conflist

# Step 6: Verify calico-node is running on the affected node
kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=NODE_NAME -o wide

# Step 7: Check calico-node logs for errors
kubectl logs -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=NODE_NAME --tail=50
```

Decision tree:

```text
# Decision Point 2: CNI Status
# - CNI binaries missing → calico-node init container failed, check init logs
# - CNI config missing → calico-node has not started successfully
# - CNI config present but malformed → Check Calico Installation CR
# - Everything present → Move to IPAM checks
```

## Runbook: IPAM and IP Pool Verification

If CNI binaries and configuration are correct, the issue may be IPAM exhaustion.

```bash
# Step 8: Check IP pool utilization
kubectl get ippools.crd.projectcalico.org -o yaml | grep -E "cidr|blockSize"

# Step 9: Check IPAM block allocations per node
kubectl get ipamblocks.crd.projectcalico.org \
  -o custom-columns=NAME:.metadata.name,CIDR:.spec.cidr,AFFINITY:.spec.affinity

# Step 10: Look for leaked or orphaned IPs
kubectl get ipamhandles.crd.projectcalico.org -o name | wc -l

# Step 11: Verify the Calico IPAM configuration matches the pod CIDR
kubectl get installation default -n calico-system -o yaml | grep -A5 ipPools
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.podCIDR}{"\n"}{end}'
```

```yaml
# Reference: Check the IPPool resource matches your cluster configuration
# This is what a healthy IPPool looks like
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
```

## Runbook: Calico Component Health and Recovery

```bash
# Step 12: Full Calico component health check
kubectl get pods -n calico-system -o wide
kubectl get pods -n calico-apiserver -o wide 2>/dev/null

# Step 13: Check Felix status on the affected node
kubectl exec -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node --field-selector spec.nodeName=NODE_NAME \
  -o jsonpath='{.items[0].metadata.name}') -- calico-node -felix-ready

# Step 14: Restart calico-node on the affected node if needed
kubectl delete pod -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node --field-selector spec.nodeName=NODE_NAME \
  -o jsonpath='{.items[0].metadata.name}')

# Step 15: After calico-node restarts, verify CNI is reinstalled
kubectl debug node/NODE_NAME -it --image=busybox -- ls -la /host/etc/cni/net.d/
```

## Verification

After applying fixes, verify the resolution:

```bash
# Confirm no new FailedCreatePodSandBox events
kubectl get events --all-namespaces \
  --field-selector reason=FailedCreatePodSandBox \
  --sort-by='.lastTimestamp' | tail -5

# Test pod creation on the previously affected node
kubectl run runbook-test --image=nginx --restart=Never \
  --overrides='{"spec":{"nodeName":"NODE_NAME"}}'
kubectl wait --for=condition=Ready pod/runbook-test --timeout=60s
echo "Pod sandbox creation successful"
kubectl delete pod runbook-test

# Verify all calico-node pods are ready
kubectl get ds calico-node -n calico-system
```

## Troubleshooting

- **calico-node pod is CrashLoopBackOff**: Check logs with `kubectl logs -n calico-system -l k8s-app=calico-node --previous`. Common causes include incorrect `IP_AUTODETECTION_METHOD` or datastore connectivity issues.
- **CNI config keeps disappearing**: The calico-node pod installs the CNI config via an init container. If the node has a custom CNI path, set `spec.cni.cniBinPath` and `spec.cni.cniConfDir` in the Calico Installation CR.
- **IPAM blocks exhausted**: Increase the IP pool CIDR or reduce the block size. Note that changing block size requires recreating the IPPool.
- **Multiple CNI configs conflicting**: Check `/etc/cni/net.d/` for leftover configs from previous CNI plugins. Remove any non-Calico configs and restart kubelet.

## Conclusion

A well-structured runbook for FailedCreatePodSandBox errors reduces incident resolution time by guiding engineers through a systematic diagnostic process. The key is to check in order: event scope, CNI binary and configuration presence, IPAM health, and Calico component status. Store this runbook in your incident management system and update it as you encounter new failure modes specific to your environment.
