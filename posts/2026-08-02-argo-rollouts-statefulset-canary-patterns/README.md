# Can Argo Rollouts Manage StatefulSets? Safer Patterns for Stateful Canary Releases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, StatefulSet, Canary Deployment, Databases, Progressive Delivery, Persistent Volumes

Description: Understand why Argo Rollouts does not manage StatefulSets and choose partitioned updates, operators, replication, or stateless boundaries for safer stateful releases.

---

Argo Rollouts is a Deployment-style controller. A `Rollout` owns ReplicaSets created from its pod template and adds canary or blue-green behavior around them. It does not wrap, replace, or progressively manage a Kubernetes `StatefulSet`.

That boundary matters because a StatefulSet provides guarantees a ReplicaSet does not:

- stable pod names and ordinals;
- stable per-pod persistent volume claims;
- ordered creation, update, and termination;
- identity through a governing headless Service;
- controller revision history tailored to stateful pods.

Converting a database StatefulSet directly into a Rollout can break storage identity and ordering even if the pod templates look similar.

## Use a Partitioned StatefulSet Rolling Update

Kubernetes supports staged updates through `.spec.updateStrategy.rollingUpdate.partition`. When a partition is set, pods with ordinals greater than or equal to it use the updated template; lower ordinals stay on the preceding revision.

For a three-replica StatefulSet, stage a template change without updating any pod:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  replicas: 3
  serviceName: database
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 3
  # selector, template, and volumeClaimTemplates omitted
```

Update the pod template while `partition: 3`. Because existing ordinals are `0`, `1`, and `2`, no pod is updated yet.

Canary the highest ordinal by lowering the partition:

```bash
kubectl patch statefulset database \
  -p '{"spec":{"updateStrategy":{"type":"RollingUpdate","rollingUpdate":{"partition":2}}}}'
```

The controller replaces `database-2` with the new template and preserves its stable identity and PVC. Validate it before continuing:

```bash
kubectl rollout status statefulset/database
kubectl get pods -l app=database -L controller-revision-hash
kubectl logs database-2
```

Then reduce the partition deliberately—`1`, then `0`—with an application-specific verification gate between stages.

This is ordinal canarying, not percentage-based traffic shifting. Your client, proxy, or database topology decides which requests reach the updated member.

## Respect Stateful Ordering and Readiness

With the default `OrderedReady` pod management policy, StatefulSet rolling updates proceed from the highest ordinal downward and wait for an updated pod to become Running and Ready before continuing. Accurate startup/readiness probes and `minReadySeconds` therefore become release gates.

Do not mark a database Ready before it has joined replication, replayed required logs, and is safe for its advertised role. Conversely, a probe that depends on a leader-only endpoint can permanently block a healthy follower.

The Kubernetes documentation warns about a forced-rollback edge case: after reverting a bad pod template, a StatefulSet using ordered rolling updates can continue waiting on the broken pod. You may need to delete the already-created bad pod after restoring the good template so the controller recreates it correctly. Test this recovery path before relying on partitions in production.

## Let a Database or Stateful Operator Orchestrate the Upgrade

For PostgreSQL, MySQL, Kafka, Elasticsearch, and similar systems, Kubernetes pod readiness is only part of a safe upgrade. The process may require leader switchover, replication lag checks, quorum preservation, protocol compatibility, data migration, or backup coordination.

An established operator for that system can understand those roles and expose supported upgrade fields. Prefer its documented rolling, minor-version, or major-version procedure over putting the managed pods under a second rollout controller.

Do not edit an operator-owned StatefulSet directly unless the operator documents that field as user-controlled; it will usually reconcile its generated resource back.

## Use Application-Native Replication for Blue-Green

Two independent stateful stacks are not made safe by pointing a Service from blue to green. Before a stateful blue-green cutover, the green side needs a defined data path:

- restore from a consistent backup and catch up through log shipping;
- stream changes through database-native physical or logical replication;
- run a version-supported cluster membership transition;
- use change-data capture and a controlled cutover;
- verify writes are fenced so only one side is authoritative.

Never mount one read-write-once PVC into two independent database pods or assume two separately cloned PVCs remain synchronized. Storage attachment is not replication.

A safe cutover defines write quiescence or leader promotion, connection draining, DNS/Service behavior, rollback compatibility, and how writes made after cutover would be reconciled.

## Separate Stateless Delivery from Stateful Evolution

Often the best Argo Rollouts boundary is the stateless API, proxy, worker, or frontend that talks to the stateful service:

```text
Argo Rollout (API canary)
        |
        v
Stable database Service -> StatefulSet or database operator
```

The API can use canary traffic routing and automated analysis while the database follows its own migration runbook. This requires backward- and forward-compatible schemas during the release window.

Use expand/contract migrations:

1. add compatible schema or indexes;
2. deploy code that can use both old and new forms;
3. backfill and verify data;
4. switch reads/writes deliberately;
5. remove old schema only after rollback is no longer required.

That preserves the ability to abort an application canary without asking an old binary to read an irreversible new schema.

## When `OnDelete` Is Appropriate

StatefulSet `OnDelete` update strategy changes the template but replaces pods only when an operator deletes them. It can support an externally orchestrated, one-member-at-a-time procedure:

```yaml
updateStrategy:
  type: OnDelete
```

Use it only with a runbook or controller that knows the safe order and validates each member. It removes automatic rollout progression; it does not provide canary analysis by itself.

## A Stateful Release Checklist

- Keep the resource a StatefulSet or use its specialist operator.
- Take and restore-test an application-consistent backup.
- Confirm version-skew and downgrade compatibility.
- Preserve pod identity, PVC mapping, and governing Services.
- Decide how the canary ordinal receives test traffic or workload.
- Validate replication, quorum, lag, and member role—not only Pod Ready.
- Stage partition changes one ordinal at a time where appropriate.
- Document the forced-rollback pod deletion path.
- Fence writers during blue-green or leader transitions.
- Make schema changes compatible with application rollback.
- Keep Argo Rollouts focused on stateless ReplicaSet-based components.

Argo Rollouts is powerful because it controls fungible ReplicaSets and traffic between revisions. Stateful releases need identity-, storage-, and data-aware orchestration; use the native or application-specific controller that owns those guarantees.

## Official Documentation

- [Argo Rollouts: How It Works](https://argo-rollouts.readthedocs.io/en/stable/)
- [Argo Rollouts: Architecture](https://argo-rollouts.readthedocs.io/en/stable/architecture/)
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Kubernetes: StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes: StatefulSet API Reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/)
- [Kubernetes: StatefulSet Basics and Partitioned Updates](https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/)
