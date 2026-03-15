# How to Build a Runbook for ClusterIP Reachability Issues with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, ClusterIP, Runbook, Incident Response, SRE, Networking

Description: A complete guide to building a structured runbook for diagnosing and resolving ClusterIP reachability issues in Calico-managed Kubernetes clusters.

---

## Introduction

A well-structured runbook transforms ClusterIP reachability incidents from chaotic firefighting into systematic resolution. In Calico-managed Kubernetes clusters, ClusterIP failures can stem from multiple layers of the networking stack, and without a documented process, on-call engineers waste time retracing diagnostic steps.

An effective runbook captures the decision tree from alert trigger to resolution, including the exact commands to run, expected outputs, and escalation criteria. It should be usable by any engineer with basic Kubernetes knowledge, not just networking specialists.

This guide walks through building a comprehensive runbook covering triage, diagnosis, remediation, and post-incident review for ClusterIP reachability failures.

## Prerequisites

- Existing monitoring and alerting for ClusterIP services
- Documented service architecture and dependencies
- Access to a runbook platform (wiki, Git repository, or incident management tool)
- On-call rotation with defined escalation paths
- `kubectl` and `calicoctl` CLI tools available to on-call engineers

## Runbook Structure Overview

A ClusterIP reachability runbook should contain these sections in order:

```text
1. Alert Context        - What triggered, severity, affected services
2. Impact Assessment    - Blast radius and user impact
3. Quick Triage         - Fast checks to categorize the issue
4. Detailed Diagnosis   - Layer-by-layer investigation
5. Remediation Steps    - Fixes organized by root cause
6. Verification         - Confirming the fix works
7. Escalation Criteria  - When to involve additional teams
8. Post-Incident        - Documentation and follow-up
```

## Section 1: Alert Context Template

```markdown
## Alert: ServiceHasNoEndpoints / ClusterIPUnreachable

**Severity**: Critical
**Triggered by**: [Alert name and source]
**Affected service**: [namespace/service-name]
**ClusterIP**: [IP address]
**Time detected**: [timestamp]

### First Responder Checklist
- [ ] Acknowledge the alert
- [ ] Open incident channel
- [ ] Begin triage steps below
```

## Section 2: Impact Assessment

```bash
# Determine which services depend on the affected ClusterIP
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.containers[].env[]?.value | strings | contains("<service-name>")) | "\(.metadata.namespace)/\(.metadata.name)"'

# Check for cascading failures
kubectl get events --all-namespaces --field-selector reason=BackOff --sort-by='.lastTimestamp' | tail -20

# Count affected users (if ingress metrics available)
# Check error rate on upstream services
```

## Section 3: Quick Triage Decision Tree

```bash
# Step 1: Are endpoints populated?
kubectl get endpoints <service-name> -n <namespace>
# If empty -> Go to "No Endpoints" section
# If populated -> Continue to Step 2

# Step 2: Can a pod reach the ClusterIP?
kubectl run triage-test --image=busybox --rm -it -- \
  wget -qO- --timeout=3 http://<cluster-ip>:<port>
# If timeout -> Go to "Network/Policy Issue" section
# If connection refused -> Go to "Pod Health" section
# If success -> Issue may be resolved or node-specific

# Step 3: Is this node-specific?
# Run the test from pods on different nodes
kubectl get pods -n <namespace> -o wide
# If only some nodes fail -> Go to "Node-Specific" section
```

## Section 4: Detailed Diagnosis Commands

```bash
# Endpoint investigation
kubectl get endpoints <service-name> -n <namespace> -o yaml
kubectl get pods -n <namespace> -l <selector> -o wide --show-labels

# kube-proxy investigation
kubectl get pods -n kube-system -l k8s-app=kube-proxy -o wide
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=30 --since=10m

# iptables investigation (on affected node)
sudo iptables -t nat -L KUBE-SERVICES -n | grep <cluster-ip>
sudo conntrack -C

# Calico investigation
calicoctl node status
kubectl logs -n calico-system -l k8s-app=calico-node --tail=30 | grep -i "deny\|error\|fail"
calicoctl get networkpolicy -n <namespace> -o yaml
```

## Section 5: Remediation by Root Cause

```markdown
### No Endpoints
1. Check pod readiness: `kubectl get pods -n <ns> -l <selector>`
2. Fix failing probes or restart unhealthy pods
3. Verify selector match: compare service selector with pod labels

### kube-proxy iptables Missing
1. Restart kube-proxy: `kubectl rollout restart ds/kube-proxy -n kube-system`
2. Wait for rollout: `kubectl rollout status ds/kube-proxy -n kube-system`
3. Verify rules: `sudo iptables -t nat -L KUBE-SERVICES -n | grep <cluster-ip>`

### Calico Policy Blocking
1. Identify deny rules: check Felix logs for denied packets
2. Apply temporary allow rule if severity warrants
3. Fix the restrictive policy with correct selectors

### conntrack Exhaustion
1. Check: `sudo sysctl net.netfilter.nf_conntrack_count`
2. Increase: `sudo sysctl -w net.netfilter.nf_conntrack_max=524288`
3. Clear stale: `sudo conntrack -F`
```

## Section 6: Verification Steps

```bash
# Confirm service is reachable
kubectl run verify --image=nicolaka/netshoot --rm -it -- \
  curl -s --connect-timeout 5 http://<service-name>.<namespace>.svc.cluster.local:<port>

# Confirm endpoints are healthy
kubectl get endpoints <service-name> -n <namespace>

# Monitor for 5 minutes for recurrence
watch -n 10 kubectl get endpoints <service-name> -n <namespace>
```

## Section 7: Escalation Criteria

```markdown
### Escalate to Networking Team when:
- Issue persists after kube-proxy restart and policy review
- Multiple unrelated services are affected simultaneously
- BGP peering issues visible in `calicoctl node status`
- Packet captures show unexpected behavior

### Escalate to Platform Team when:
- Node-level networking is broken (not just ClusterIP)
- Kernel or OS-level issues suspected
- conntrack table repeatedly fills despite increases
```

## Section 8: Post-Incident Template

```markdown
### Post-Incident Review
- **Duration**: [start - end]
- **Root cause**: [description]
- **Detection time**: [how long from issue start to alert]
- **Resolution time**: [how long from alert to fix]
- **Action items**:
  - [ ] Update monitoring to catch this earlier
  - [ ] Add preventive configuration
  - [ ] Update this runbook with lessons learned
```

## Troubleshooting

- **Runbook commands fail**: Ensure on-call engineers have correct RBAC permissions before incidents occur.
- **Triage takes too long**: Add timing guidance to each section. Quick triage should complete in under 5 minutes.
- **Root cause unclear**: Document the diagnostic dead-end and escalate. Do not spend more than 30 minutes without escalation.
- **Multiple root causes**: Address the most impactful one first, then create follow-up tickets for secondary issues.

## Conclusion

A ClusterIP reachability runbook for Calico clusters should provide a clear decision tree from alert to resolution. The key elements are a fast triage process to categorize the issue, detailed diagnosis commands for each layer, targeted remediation steps organized by root cause, and a post-incident template that drives continuous improvement. Keep the runbook in version control and update it after every incident to capture new failure modes and faster diagnostic shortcuts.
