# Why Does Gatekeeper Report Only 20 Violations? How to Raise the Limit Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Audit, Scalability, Observability

Description: Learn why Gatekeeper caps Constraint status at 20 violations, how to see the real total, and when to raise, disable, or bypass the list.

---

Gatekeeper's audit status stores at most 20 individual violations per Constraint by default. This cap protects Gatekeeper memory and the size of the Constraint object stored in the Kubernetes API.

It does not mean audit stopped after 20 resources.

## Read the total separately

Compare the stored examples with the total:

```bash
kubectl get <constraint-kind> <constraint-name> \
  -o jsonpath='stored={.status.violations}{"\n"}total={.status.totalViolations}{"\n"}'
```

For a concise count:

```bash
kubectl get <constraint-kind> <constraint-name> \
  -o jsonpath='{.status.totalViolations}{"\n"}'
```

`status.totalViolations` includes violations beyond the individual list cap. The Prometheus `gatekeeper_violations` metric also provides an aggregate from the latest audit run.

Only the most recent audit run is represented in status, so neither field is a historical record.

## Why the list is capped

Each Constraint is a Kubernetes API object backed by etcd. An unbounded `.status.violations` array would make every audit run:

- Retain more violation objects in the audit process.
- Send larger status updates to the API server.
- Increase etcd object and watch traffic.
- Risk exceeding the API object's size limit.
- Make every client watching Constraints process a larger update event.

The Gatekeeper documentation notes the default etcd request limit of 1.5 MiB and recommends no more than 500 stored violations per Constraint. The safe number can be lower when violation messages or resource identifiers are large, or when the Constraint is already large.

## Configure the audit process

The runtime flag is:

```text
--constraint-violations-limit=<number>
```

For example:

```yaml
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --operation=audit
            - --constraint-violations-limit=100
```

Change the source Helm values, operator resource, Kustomize patch, or deployment manifest used by your installation. Do not make an untracked live edit that the release manager will immediately revert.

After rollout, confirm the audit Pod has the intended argument:

```bash
kubectl get pods -n gatekeeper-system \
  -l gatekeeper.sh/operation=audit \
  -o jsonpath='{range .items[*]}{.metadata.name}{"  "}{.spec.containers[?(@.name=="manager")].args}{"\n"}{end}'
```

Labels vary between installation methods. If this selector returns nothing, locate the Pod containing `--operation=audit`.

The next completed audit writes the larger list. Changing the flag does not reconstruct an old run.

## Choose a limit from an operational goal

Do not set the limit equal to the largest possible violation count. Decide what Constraint status is for.

Use a modest list such as 20 to 100 when:

- Operators need representative examples.
- Dashboards use aggregate counts.
- Full detail is available from logs or export.

Consider a larger list, up to the documented recommendation, when:

- A remediation tool reads Constraint status.
- Messages and metadata are short.
- You have measured API object size and audit memory.
- The number of affected Constraints is small.

Test the worst case in a non-production cluster. One Constraint with 500 short entries is different from hundreds of Constraints each writing 500 large entries.

## Use zero when status detail is unnecessary

`--constraint-violations-limit=0` prevents audit from storing individual entries in `.status.violations`. Audit still updates fields such as `auditTimestamp` and `totalViolations`.

This is useful when a central log or export pipeline is the source of detailed findings. It does not eliminate all status writes, and it does not make multiple audit replicas safe. Audit remains a singleton operation.

## Get complete violation details elsewhere

Gatekeeper audit logs emit one JSON event per violation with:

```json
{
  "event_type": "violation_audited",
  "audit_id": "2026-07-25T12:00:00Z",
  "constraint_kind": "K8sRequiredLabels",
  "constraint_name": "workloads-must-have-owner",
  "resource_kind": "Deployment",
  "resource_namespace": "production",
  "resource_name": "api"
}
```

Use `audit_id` to group entries from one run. Gatekeeper also supports violation export to configured backends. Exports avoid Constraint status size limits, although delivery guarantees depend on the chosen backend.

For reporting:

- Use metrics for totals and trends.
- Use logs or exports for complete per-resource findings.
- Use Constraint status for a bounded, current summary.

This separation scales better than turning a Kubernetes custom resource into a compliance database.

## Monitor the cost after raising it

Watch:

- Audit Pod memory and restarts.
- Audit run duration and completion time.
- API server request latency and rejected requests.
- Etcd request size errors.
- Constraint update conflicts.
- The serialized object size.

```bash
kubectl get <constraint-kind> <constraint-name> -o json \
  | wc -c
```

If a larger cap slows audit or approaches API size limits, reduce it and move detailed findings to logs or export.

## Official documentation

- [Gatekeeper audit result limits](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper violation export](https://open-policy-agent.github.io/gatekeeper/website/docs/export/)
- [Etcd request limits](https://etcd.io/docs/v3.5/dev-guide/limit/)

