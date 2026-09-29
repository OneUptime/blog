# Roll Back, Fail Over, or Fix Forward? A Time-Boxed Decision Framework for Active Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, SRE, Reliability, Disaster Recovery

Description: Choose rollback, failover, or a forward fix during an incident by comparing time to verified recovery, compatibility, capacity, and irreversible risk.

During an outage, three engineers can make three reasonable proposals: revert the release, move traffic, or ship a small patch. The useful question is which option can reduce customer impact soonest with an acceptable chance of making the situation worse.

Use a brief decision window with an explicit owner and evidence requirements. The framework below is a proposed response practice. Its timing examples are planning aids, not universal incident policy.

AWS recommends preparing and testing rollback or forward-fix plans before production changes. A live incident should apply that preparation while checking whether its assumptions still hold. [AWS: Plan for unsuccessful changes](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_mit_deploy_risks_plan_for_unsucessful_changes.html)

## Start with the Failure You Need to Stop

Write the immediate objective in customer terms:

```text
Restore successful checkout for the affected European cell.
Do not create duplicate charges or lose accepted orders.
Decision due: 14:15 UTC, five minutes from now.
Decision owner: incident commander.
Technical recommendation: checkout operations lead.
```

The five-minute window is for selecting the next step, not for completing recovery. If an established emergency action is already appropriate, execute it under the existing procedure. If none of the options is safe, the decision may be to contain impact while requesting the missing expertise.

Pause unrelated production changes in the affected area according to your incident process. Preserve the relevant release, configuration, and impact evidence so the proposed mitigation has a defined starting state.

## Compare Time to Verified Recovery

A patch that takes two minutes to write may need twenty minutes to build, deploy, and verify. A failover command that completes instantly may take several minutes to drain existing connections and warm caches.

Use a decision table with estimates and confidence:

| Option | Evidence it addresses the failure | Time to verify recovery | Blocking risk |
| --- | --- | --- | --- |
| Roll back | Errors began with release 42; old cohort healthy | 8–12 minutes, previously rehearsed | Confirm old binary reads current data |
| Fail over | Failures confined to one cell | 10–20 minutes, capacity uncertain | Destination may overload |
| Fix forward | Reproduced timeout bug with narrow patch | 20–35 minutes, build queue known | Patch might miss other changed behavior |

These numbers are illustrative. Include deployment, propagation, cache warming, and observation time. Where possible, use recent drill results instead of optimistic guesses.

Reject options that violate a hard constraint before ranking the remainder. A fast action that risks unacceptable data loss is not the fastest acceptable recovery.

## Evaluate Rollback Compatibility

Rollback is attractive when a recent change explains the symptoms and a known working revision remains available. Check the entire compatibility surface:

- Can the old application read data written by the new version?
- Did the release remove schema, change message formats, or rotate credentials?
- Does the old artifact still work with the current configuration and dependencies?
- Will a deployment controller immediately reapply the faulty desired state?
- Is the previous revision actually healthy, or merely older?

For a Kubernetes Deployment, verify the target context and namespace, then inspect the history and the specific candidate before choosing it. Replace the example context with the verified cluster:

```bash
incident_context=production-eu
kubectl --context "$incident_context" -n payments rollout history deployment/checkout
kubectl --context "$incident_context" -n payments rollout history deployment/checkout --revision=41
```

Only after verifying the revision and following the service's change procedure would the operator run:

```bash
: "${incident_context:?Set and verify the target context first}"
kubectl --context "$incident_context" -n payments rollout undo deployment/checkout --to-revision=41
kubectl --context "$incident_context" -n payments rollout status deployment/checkout --timeout=180s
```

Kubernetes rolls back the Deployment's Pod template. It does not restore a database, external configuration, or every related resource. Also, rollout completion is a controller result; verify the customer journey separately. [Kubernetes Deployment rollback documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

The status timeout ends the watch; it does not cancel the rollout. By default, `rollout status` follows a newer revision if another rollout starts. Coordinate concurrent changes and verify the resulting Pod template against the approved target. When pinning the watch with `--revision`, use the new revision created by the rollback, not the historical revision restored. [kubectl rollout status](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)

## Evaluate Failover as a Capacity and Data Decision

Failover helps when the destination avoids the failing dependency and can serve the transferred workload. Confirm that assumption for identity, storage, DNS, secrets, and any shared control plane.

For stateful systems, check replication lag, the recovery point requirement, write fencing, client routing, and the process for reconciling state afterward. Do not treat a standby label as proof that safe write promotion is possible.

AWS's recovery guidance distinguishes strategies with different capacity and recovery characteristics, and notes that replication alone does not protect against corruption. Use the tested strategy for the actual workload instead of improvising a generic region switch. [AWS recovery strategies](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_disaster_recovery.html)

A partial traffic shift may provide useful evidence, but only if routing and state semantics support it. Split-brain writes are not a reasonable experiment.

## Evaluate a Forward Fix Against the Real Deadline

Fix forward can be appropriate when rollback is incompatible, a data or configuration repair is necessary, or a narrow defect is already understood and tested.

Require the proposed change, its test evidence, deployment path, expected improvement, and failure response. “The fix is nearly ready” is not a recovery estimate. Ask which steps remain and what could force another iteration.

Assign a checkpoint: if the candidate is not deployable by the agreed time, reconsider containment or another mitigation. This prevents an indefinitely imminent patch from blocking a safer alternative.

## Commit to One Coordinated Action and Reassess

Record the chosen option, rejected alternatives, assumptions, operator, verification query, and abort condition. Assign separate owners to collect evidence for fallback options if useful, but avoid overlapping changes to the same failure domain.

When the action completes, classify the outcome as improved, unchanged, worse, or unobservable. If recovery cannot be measured, pause expansion and resolve that uncertainty. Update the decision table with the actual result rather than restarting the debate from memory.

## Conclusion

The best incident mitigation is the option with the shortest credible path to verified recovery within the service's safety constraints. Make compatibility, spare capacity, and data consequences explicit; time-box uncertainty; and preserve the reasoning so the next decision starts with better evidence.
