# Documenting Typha High Availability in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Documentation, Hard Way

Description: Create the operational documentation your team needs to maintain Typha HA in a manifest-based Calico installation - covering architecture diagrams in text, runbook templates, and configuration...

---

## Introduction

A Typha deployment that lacks documentation is a liability. When an incident occurs at 2am, the on-call engineer needs to know the expected replica count, the HA configuration rationale, the certificate rotation procedure, and the recovery steps - without reading through Kubernetes manifests. Good documentation turns a Typha deployment from a personal knowledge silo into a shared operational asset.

This post covers the key documents to create: an architecture description, a configuration inventory, a runbook for common operations, and a decision log for HA choices.

---

## Prerequisites

- Typha deployed and configured per the earlier posts in this series
- A team wiki, Git repository, or documentation system to store the documents
- Access to the deployed configuration for reference

---

## Step 1: Document the Architecture

Every Typha deployment should have a written architecture description that explains the data flow, the component roles, and the HA design decisions:

```markdown
# Typha Architecture - Production Cluster

## Component Roles

- **kube-apiserver**: Authoritative source for all Calico resources
  (NetworkPolicy, IPPool, FelixConfiguration, etc.)
- **calico-typha**: Fan-out cache between the API server and Felix agents.
  Holds one watch connection per resource type and broadcasts updates to
  all connected Felix agents. Runs as 3 replicas (one per AZ).
- **calico-node (Felix)**: Enforces network policy on each node by
  programming iptables/eBPF rules. Connects to Typha instead of the
  API server directly.

## Data Flow

1. A NetworkPolicy is created via kubectl or calicoctl.
2. kube-apiserver stores the resource and notifies Typha via its watch stream.
3. Typha fans the update out to all connected Felix agents.
4. Each Felix agent programs the local iptables/eBPF rules.

## High Availability Design

- 3 Typha replicas, one per availability zone (zone-a, zone-b, zone-c)
- Pod anti-affinity by hostname ensures no two replicas are co-located
- TopologySpreadConstraint ensures one replica per zone
- PodDisruptionBudget: minAvailable=2 (one pod can be evicted at a time)
- Topology-aware Service routing: Felix agents prefer Typha in the same zone

## mTLS Configuration

- All Felix-to-Typha connections use mutual TLS
- Calico CA: stored in calico-ca Secret (outside cluster - in Vault)
- Certificate expiry: 825 days from last rotation date (see rotation log)
- TYPHA_CLIENTCN: calico-felix
- typhaServerCN: calico-typha
```

---

## Step 2: Create a Configuration Inventory

Store the current Typha configuration in a human-readable inventory that is kept in version control alongside the cluster manifests:

```bash
# Run this script to generate the current configuration inventory
echo "=== Typha Configuration Inventory ===" > typha-inventory.txt
echo "Generated: $(date -u)" >> typha-inventory.txt
echo "" >> typha-inventory.txt

echo "--- Deployment ---" >> typha-inventory.txt
kubectl get deployment calico-typha -n kube-system \
  -o jsonpath='Replicas: {.spec.replicas}{"\n"}Image: {.spec.template.spec.containers[0].image}{"\n"}' \
  >> typha-inventory.txt

echo "" >> typha-inventory.txt
echo "--- FelixConfiguration (Typha fields) ---" >> typha-inventory.txt
calicoctl get felixconfiguration default -o yaml 2>/dev/null \
  | grep -E "typha|Typha" >> typha-inventory.txt

echo "" >> typha-inventory.txt
echo "--- PodDisruptionBudget ---" >> typha-inventory.txt
kubectl get pdb calico-typha-pdb -n kube-system \
  -o jsonpath='minAvailable: {.spec.minAvailable}{"\n"}' >> typha-inventory.txt

cat typha-inventory.txt
```

---

## Step 3: Write the Operational Runbook

Every common Typha operation should have a step-by-step runbook entry:

```markdown
# Typha Operational Runbook

## Scale Typha Replicas

**When**: After cluster grows beyond the current replica threshold
(rule: 1 replica per 200 nodes, minimum 2)

**Steps**:
1. Check current node count: `kubectl get nodes --no-headers | wc -l`
2. Calculate desired replicas: `ceil(node_count / 200)`
3. Scale: `kubectl scale deployment calico-typha -n kube-system --replicas=<N>`
4. Monitor: `kubectl rollout status deployment/calico-typha -n kube-system`
5. Verify Felix connections: check `typha_connections_active` in Prometheus

## Rotate TLS Certificates

**When**: 30 days before certificate expiry (expiry dates in rotation log)

**Steps**:
1. Generate new certificates (see secure-typha-scaling post)
2. Update Secrets: `kubectl create secret generic calico-typha-tls --dry-run=client ...`
3. Rolling restart Typha: `kubectl rollout restart deployment/calico-typha -n kube-system`
4. Rolling restart calico-node: `kubectl rollout restart ds/calico-node -n kube-system`
5. Verify Felix connections in logs: `kubectl logs -n kube-system -l k8s-app=calico-node | grep typha`

## Recover from Typha Pod Crash

**When**: One Typha pod enters CrashLoopBackOff

**Steps**:
1. Check logs: `kubectl logs -n kube-system <typha-pod> --previous`
2. Describe pod for events: `kubectl describe pod -n kube-system <typha-pod>`
3. If TLS error: verify Secret exists and has correct CA
4. If OOMKilled: increase memory limit in Deployment
5. After fix: `kubectl delete pod -n kube-system <typha-pod>`
```

---

## Step 4: Document HA Decisions

Record the rationale behind HA configuration choices so future engineers understand why they exist:

```markdown
# Typha HA Decision Log

## Decision: 3 replicas (not 2)

- **Date**: 2026-03-13
- **Rationale**: Cluster spans 3 availability zones. Using 3 replicas (one per zone)
  ensures that a full zone failure leaves 2 replicas operational, exceeding the
  PDB minAvailable=2 requirement. 2 replicas would leave only 1 after a zone failure,
  which is a single point of failure.

## Decision: PDB minAvailable=2 (not maxUnavailable=1)

- **Date**: 2026-03-13
- **Rationale**: minAvailable=2 is expressed as an absolute count, which is more
  predictable than a percentage as replica counts change. With 3 replicas, this
  allows exactly 1 pod to be evicted at a time during node drains.

## Decision: topology-aware routing on the Typha Service

- **Date**: 2026-03-13
- **Rationale**: In a 3-zone cluster with ~300 nodes, cross-zone traffic to Typha
  adds unnecessary bandwidth costs and increases Felix reconnection latency during
  zone-local issues. Topology routing reduces this by 2/3 on average.
```

---

## Best Practices

- Keep the architecture document, configuration inventory, runbook, and decision log in the same Git repository as the Typha manifests.
- Update the configuration inventory as part of every PR that modifies Typha resources.
- Include a "last validated" date in the runbook so engineers know when it was last tested against the live cluster.
- Add the runbook link to Prometheus alert annotations so on-call engineers have it during incidents.
- Treat the decision log as append-only history - never delete old decisions, only add new ones when decisions change.

---

## Conclusion

Good Typha documentation includes an architecture description that explains the data flow, a configuration inventory that captures the current state, a runbook for common operations, and a decision log that explains why the HA configuration looks the way it does. Together, these make Typha a maintainable component rather than tribal knowledge.

---

*Link your Typha runbook to incident alerts and track operational history with [OneUptime](https://oneuptime.com).*
