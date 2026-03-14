# Documenting Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Scaling, Documentation, Hard Way

Description: Create the operational documentation your team needs to understand and manage Typha scaling decisions in a manifest-based Calico installation - covering scaling formulas, configuration...

---

## Introduction

Typha scaling decisions made without documentation leave the next engineer to touch the cluster guessing: why are there 5 replicas instead of 3? What is the maximum this cluster can support without adding more? When was the last time the replica count was changed and why?

This post covers the documentation artifacts you should maintain alongside your Typha deployment: a scaling rationale document, a configuration inventory, a scaling runbook, and a change log.

---

## Prerequisites

- Typha deployed and configured per the earlier posts in this series
- A Git repository or wiki to store documentation alongside cluster manifests
- Current cluster size and Typha replica count

---

## Step 1: Document the Scaling Rationale

Every Typha deployment should have a written document that explains why the current replica count was chosen:

```markdown
# Typha Scaling Rationale

## Cluster: production-us-east-1

## Scaling Formula
The standard Calico scaling formula is used:
  desired_replicas = max(2, ceil(node_count / 200))

## Current Configuration
- Node count at last review: 450 nodes
- Desired replicas (formula): ceil(450 / 200) = 3
- Actual replicas deployed: 3
- Last reviewed: 2026-03-13
- Next review threshold: cluster reaches 600 nodes (triggers move to 4 replicas)

## Override Rationale
None - formula-driven count matches zone count (3 AZs), so no override needed.
If cluster were in 2 AZs with 450 nodes, formula gives 3 replicas but we would
round down to 2 to match zone count, and monitor connection load carefully.

## Resource Sizing
- CPU request: 500m (leaves burst headroom for reconnection storms)
- Memory request: 256Mi (steady state for ~150 connections + policy cache)
- Memory limit: 512Mi (allows headroom for reconnection spikes)

## Connection Cap
TYPHA_MAXCONNECTIONSLOWERLIMIT=150 per pod
(cap = node_count / replicas * 1.1 = 450 / 3 * 1.1 = 165, rounded down to 150)
```

---

## Step 2: Create a Current Configuration Snapshot

Store a snapshot of the actual deployed configuration in version control:

```bash
# Generate a configuration snapshot for version control
echo "# Typha Configuration Snapshot" > typha-config-snapshot.yaml
echo "# Generated: $(date -u)" >> typha-config-snapshot.yaml
echo "" >> typha-config-snapshot.yaml

# Capture the Deployment spec
kubectl get deployment calico-typha -n kube-system -o yaml \
  | grep -v "resourceVersion\|uid\|creationTimestamp\|generation\|annotations:" \
  >> typha-config-snapshot.yaml

echo "---" >> typha-config-snapshot.yaml

# Capture the FelixConfiguration
calicoctl get felixconfiguration default -o yaml \
  >> typha-config-snapshot.yaml

echo "---" >> typha-config-snapshot.yaml

# Capture the PDB
kubectl get pdb calico-typha-pdb -n kube-system -o yaml \
  | grep -v "resourceVersion\|uid\|creationTimestamp" \
  >> typha-config-snapshot.yaml

echo "Snapshot saved to typha-config-snapshot.yaml"
```

---

## Step 3: Write the Scaling Runbook

Document the exact steps to change Typha replica counts:

```markdown
# Typha Scaling Runbook

## When to Scale Up
- Cluster reaches `current_replicas * 200` nodes
- Any Typha pod shows > 180 active connections (approaching the configured cap)
- CPU or memory usage consistently above 80% of the limit

## When to Scale Down
- Cluster shrinks below `(current_replicas - 1) * 200` nodes for 7+ days
- All Typha pods show < 50 active connections (inefficient resource use)

## Scale Up Procedure

1. Calculate new replica count:
   new_replicas = max(2, ceil(node_count / 200))

2. Round to nearest zone multiple if multi-zone cluster:
   new_replicas = ceil(new_replicas / zone_count) * zone_count

3. Apply the change:
   kubectl scale deployment calico-typha -n kube-system --replicas=<new_replicas>

4. Update the PDB if needed (minAvailable = new_replicas - 1):
   kubectl patch pdb calico-typha-pdb -n kube-system \
     --patch '{"spec":{"minAvailable":<new_replicas - 1>}}'

5. Monitor rollout:
   kubectl rollout status deployment/calico-typha -n kube-system

6. Verify Felix connections:
   Check typha_connections_active per pod in Prometheus
   Expected: connections distributed roughly evenly across new replica count

7. Update the scaling rationale document (Step 1 above).

## Scale Down Procedure
Same steps as scale up, but verify connection counts before scaling down:
- Ensure no pod has connections > new_replicas * (node_count / new_replicas) * 1.2
- Scale down 1 replica at a time if total change is 2+
```

---

## Step 4: Maintain a Scaling Change Log

Keep a chronological record of every Typha scaling event:

```markdown
# Typha Scaling Change Log

## 2026-03-13 - Initial deployment
- Replicas: 2
- Cluster size: 120 nodes
- Reason: Initial setup; 2 replicas for HA with cluster below 200-node threshold

## 2026-06-01 - Scale up to 3
- Replicas: 2 → 3
- Cluster size: 210 nodes
- Reason: Crossed 200-node threshold; also aligns with 3-zone AZ configuration
- Engineer: platform-team

## 2026-09-15 - Scale up to 5
- Replicas: 3 → 5
- Cluster size: 420 nodes
- Reason: Formula yields ceil(420/200)=3 but one Typha pod was showing CPU
  saturation during business hours. Investigated and found policy count doubled
  due to new applications. Added 2 extra replicas to reduce per-pod load.
- Engineer: platform-team
```

---

## Best Practices

- Update the scaling rationale document every time you change the replica count, not just when you deploy Typha.
- Store the configuration snapshot in the same Git repository as your cluster manifests so it is versioned alongside code changes.
- Make the scaling runbook a PR review requirement for any Typha Deployment change - this forces engineers to check the runbook before making changes.
- Include the change log review as part of your quarterly cluster audit; a long gap in the log often indicates the autoscaler is working but no one is reviewing its decisions.
- Link the runbook from Prometheus alert annotations so on-call engineers have immediate access during incidents.

---

## Conclusion

Good scaling documentation captures the rationale, current configuration, operational procedure, and change history in one place. This turns Typha scaling from an ad-hoc judgment call into a documented, repeatable process that any engineer on your team can follow confidently.

---

*Track Typha scaling events and correlate them with cluster health trends in [OneUptime](https://oneuptime.com).*
