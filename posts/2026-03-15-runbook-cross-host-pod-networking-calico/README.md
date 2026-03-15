# How to Build a Runbook for Cross-Host Pod Networking Failures with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Runbook, Incident Response, BGP, SRE

Description: How to build a structured incident response runbook for cross-host pod networking failures in Calico-managed Kubernetes clusters.

---

## Introduction

Cross-host pod networking failures are high-severity incidents that affect all inter-node communication in a Kubernetes cluster. When these failures occur, on-call engineers need a clear, step-by-step runbook that guides them from alert to resolution without requiring deep Calico networking expertise.

A well-built runbook for cross-host failures must cover BGP peering verification, encapsulation protocol checks, route table inspection, security group validation, and tunnel interface diagnostics. The runbook should be structured as a decision tree so engineers can quickly narrow down the root cause.

This guide provides the complete structure and content for a production-ready cross-host networking runbook for Calico clusters.

## Prerequisites

- Documented cluster architecture including encapsulation mode and BGP topology
- Monitoring and alerting already configured for Calico metrics
- On-call rotation with escalation paths defined
- `kubectl` and `calicoctl` available to on-call engineers
- SSH access to cluster nodes documented

## Runbook Header Template

```markdown
# Runbook: Cross-Host Pod Networking Failure (Calico)

**Severity**: P1 - Critical
**Impact**: All inter-node pod communication broken
**Escalation**: Platform/Networking team
**Last updated**: 2026-03-15
**Owner**: Platform Engineering

## Quick Reference
- Encapsulation mode: [VXLAN/IP-in-IP/None]
- BGP topology: [Full mesh/Route reflectors]
- Pod CIDR: [e.g., 10.244.0.0/16]
- Calico version: [e.g., v3.27]
```

## Phase 1: Rapid Triage (Under 5 Minutes)

```bash
# Step 1: Confirm cross-host failure
# Pick two pods on DIFFERENT nodes
kubectl get pods -o wide -A | awk 'NR>1 {print $1,$2,$8}' | sort -k3 | head -10

# Test cross-host connectivity
kubectl exec <pod-on-node-A> -- ping -c 2 -W 3 <pod-ip-on-node-B>
# FAIL -> Continue to Step 2
# PASS -> Not a cross-host issue, check application layer

# Step 2: Check calico-node status
kubectl get pods -n calico-system -l k8s-app=calico-node -o wide
# Any pods not Running/Ready -> Go to "calico-node Recovery"
# All pods Running -> Continue to Step 3

# Step 3: Check BGP peering
sudo calicoctl node status
# Peers not Established -> Go to "BGP Recovery"
# Peers Established -> Go to "Route/Tunnel Diagnosis"
```

## Phase 2: BGP Recovery Branch

```bash
# 2a: Check if BGP port is reachable between nodes
nc -zv <peer-node-ip> 179 -w 3
# FAIL -> Firewall/security group issue

# 2b: Restart calico-node on the node with broken peering
kubectl delete pod <calico-node-pod> -n calico-system
# Wait 60 seconds, then re-check
sudo calicoctl node status

# 2c: If mesh is disabled, verify BGP configuration
calicoctl get bgpConfiguration default -o yaml
# If nodeToNodeMeshEnabled is false, check BGP peers
calicoctl get bgpPeer -o wide

# 2d: Re-enable mesh if it was accidentally disabled
calicoctl patch bgpConfiguration default --patch \
  '{"spec":{"nodeToNodeMeshEnabled": true}}'
```

## Phase 3: Route and Tunnel Diagnosis Branch

```bash
# 3a: Check routes on the source node
ip route | grep -E "bird|cali|blackhole"
# Missing routes for remote pod CIDRs -> BGP is not propagating routes

# 3b: Check tunnel interface
ip link show tunl0 2>/dev/null || ip link show vxlan.calico 2>/dev/null
# Interface DOWN or MISSING -> Restart calico-node

# 3c: Verify encapsulation protocol is not blocked
# For IP-in-IP
sudo tcpdump -i eth0 proto 4 -nn -c 5 &
kubectl exec <pod-on-node-A> -- ping -c 3 <pod-ip-on-node-B>
# No packets seen -> Protocol 4 blocked

# For VXLAN
sudo tcpdump -i eth0 udp port 4789 -nn -c 5 &
kubectl exec <pod-on-node-A> -- ping -c 3 <pod-ip-on-node-B>
# No packets seen -> UDP 4789 blocked
```

## Phase 4: Remediation Actions

```markdown
### Action: Fix Security Group Rules
1. Open cloud console or use CLI
2. Add inbound rule: Protocol 4 (IP-in-IP) from node CIDR
   OR UDP 4789 (VXLAN) from node CIDR
3. Add inbound rule: TCP 179 (BGP) from node CIDR
4. Verify: `nc -zv <peer-node-ip> 179 -w 3`

### Action: Restart calico-node
1. `kubectl delete pod <calico-node-pod> -n calico-system`
2. Wait: `kubectl wait --for=condition=ready pod -l k8s-app=calico-node -n calico-system --timeout=120s`
3. Verify: `sudo calicoctl node status`

### Action: Fix MTU Mismatch
1. Check: `ip link show eth0 | grep mtu`
2. Set (for IPIP): `calicoctl patch felixconfiguration default --patch '{"spec":{"ipipMTU": <correct-mtu>}}'`
   Or (for VXLAN): `calicoctl patch felixconfiguration default --patch '{"spec":{"vxlanMTU": <correct-mtu>}}'`
3. Restart: `kubectl rollout restart ds/calico-node -n calico-system`

### Action: Switch Encapsulation Mode
1. Get pool: `calicoctl get ippool default-ipv4-ippool -o yaml > pool.yaml`
2. Edit: Change ipipMode/vxlanMode
3. Apply: `calicoctl apply -f pool.yaml`
4. Restart: `kubectl rollout restart ds/calico-node -n calico-system`
```

## Phase 5: Verification

```bash
# Verify connectivity is restored
kubectl exec <pod-on-node-A> -- ping -c 5 <pod-ip-on-node-B>

# Verify BGP peering
sudo calicoctl node status

# Verify routes
ip route | grep <remote-pod-cidr>

# Test multiple node pairs
for node_pod in $(kubectl get pods -o wide -A --no-headers | awk '{print $2":"$7}' | sort -t: -k2 -u | head -5); do
  pod=$(echo $node_pod | cut -d: -f1)
  echo -n "$pod -> <test-ip>: "
  kubectl exec $pod -- ping -c 1 -W 2 <test-ip> 2>&1 | grep -o "1 received" || echo "FAILED"
done

# Monitor for 10 minutes for stability
watch -n 30 'sudo calicoctl node status'
```

## Escalation Criteria

```markdown
### Escalate Immediately When:
- All BGP peering is down across the entire cluster
- calico-node pods are crash-looping on multiple nodes
- The issue persists after security group and calico-node fixes
- Node-level networking (node-to-node) is also broken

### Escalate After 30 Minutes When:
- Root cause cannot be identified using this runbook
- The fix is applied but connectivity is intermittent
- Only specific node pairs are affected with no clear pattern
```

## Post-Incident Documentation

```markdown
### Incident Record
- **Alert**: [alert name and time]
- **Impact duration**: [start to resolution]
- **Root cause**: [specific cause]
- **Fix applied**: [what was done]
- **Triage time**: [time to identify root cause]
- **Recovery time**: [time from fix to verified resolution]
- **Follow-up actions**:
  - [ ] Add preventive monitoring for this failure mode
  - [ ] Update infrastructure-as-code if security group change was needed
  - [ ] Schedule review of runbook effectiveness
  - [ ] File bug if Calico behavior was unexpected
```

## Troubleshooting

- **Runbook steps assume wrong encapsulation mode**: Keep the Quick Reference section updated with the actual cluster configuration.
- **On-call engineer lacks SSH access**: Pre-provision access or use `kubectl debug node/<name>` as an alternative.
- **BGP status command requires root**: Set up `calicoctl` with appropriate kubeconfig or RBAC for on-call use.
- **Multiple root causes simultaneously**: Work through the decision tree for each symptom independently and fix in order of severity.

## Conclusion

A cross-host pod networking runbook for Calico should provide a fast triage path that categorizes the issue within 5 minutes, followed by targeted diagnosis and remediation branches for BGP peering, route propagation, tunnel interfaces, and security group rules. The runbook should include exact commands with expected outputs, clear escalation criteria, and a post-incident template. Regular runbook drills ensure on-call engineers can execute it under pressure.
