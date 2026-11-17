# How to Alert on Unexpected Credential Access and Egress During Agent Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Security, AWS, Monitoring

Description: Correlate agent runtime identities with secret-access audits and network egress to detect unexpected behavior while accounting for missing and delayed telemetry.

An agent can produce a harmless final answer after attempting to read an unrelated secret or contact an unapproved host. Monitor those actions at the runtime and infrastructure boundaries. The model's transcript is useful context, but it is not an authoritative record of every credential read or network connection.

Build alerts around the permissions and destinations required for the current task. A broad list of everything the service account can access is a weak baseline for a narrowly scoped agent run.

## Establish a run-to-runtime mapping

At execution start, record an opaque run ID, workload identity, container or process identity, and start time. Record the end time when execution finishes. Include the task's approved secret references and destination classes. Keep this mapping in a protected audit store.

Use dedicated or short-lived identities where practical. When multiple concurrent runs share one identity and host, a cloud audit event may not identify the responsible run. Preserve process or container telemetry and report ambiguous attribution rather than assigning the event to the nearest timestamp.

Never copy credentials into span attributes to make correlation easier. A secret reference can itself reveal sensitive information, so use an internal inventory ID in broadly accessible telemetry and resolve it only in the investigation system.

## Collect independent evidence

For AWS Secrets Manager, CloudTrail records API calls. Collect relevant events across the accounts and Regions where your workloads operate, rather than relying solely on the agent application's own instrumentation. [Secrets Manager logging with CloudTrail](https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html).

For Kubernetes API access, use an audit policy that captures metadata for Secret requests. `Metadata` records who requested which resource and operation without the request or response body. Audit rules are ordered, so integrate the rule before broader rules that might capture bodies. The following is a policy fragment, not a complete cluster policy:

```yaml
rules:
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
```

Configure audit backends and access controls according to your cluster deployment. Kubernetes API auditing does not observe a process reading a Secret that was already mounted as a file or injected into its environment. That requires runtime controls and, where appropriate, process-level monitoring. [Kubernetes auditing and audit levels](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/).

For network activity, collect egress-proxy decisions, DNS resolver logs, firewall events, and flow metadata as appropriate. Proxy logs can provide application destinations; flow logs generally provide network addresses and ports rather than a full URL or request body.

## Join events to a task policy

This runnable Python example illustrates a policy decision over already normalized events. It does not ingest AWS or Kubernetes logs:

```python
policy = {
    "secret_ids": {"inventory-readonly"},
    "destination_ids": {"approved-model", "internal-search"},
}
events = [
    {"kind": "secret_access", "target": "payroll-admin", "result": "denied"},
    {"kind": "egress", "target": "unknown-external", "result": "allowed"},
    {"kind": "egress", "target": "approved-model", "result": "allowed"},
]

def unexpected(event):
    key = {"secret_access": "secret_ids", "egress": "destination_ids"}[event["kind"]]
    return event["target"] not in policy[key]

alerts = [event for event in events if unexpected(event)]
assert len(alerts) == 2
assert alerts[0]["result"] == "denied"
print(alerts)
```

A denied unexpected access is still worth recording. Separate attempted access from successful access and from verified data transfer. Access to a secret followed by outbound traffic is a suspicious sequence, but it does not prove that the secret was transmitted.

Normalize hostnames and resolve them through an approved destination inventory. Do not rely on a naive suffix check, and account for redirects, proxies, IPv6, and direct-IP connections in enforcement and tests. Where feasible, prevent disallowed egress at the network boundary rather than waiting for an alert.

## Account for telemetry blind spots

AWS documents that VPC Flow Logs can skip records and omit some traffic, including instance metadata traffic and requests to the Amazon DNS server. A missing flow record therefore cannot establish that no connection occurred. [VPC Flow Logs limitations](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html).

Track delivery delay, collector health, dropped events, and unmapped runtime identities. If the agent finishes before cloud audit events arrive, keep the correlation window open for delayed evidence. Use event timestamps and observed clock uncertainty, not ingestion order, when reconstructing the sequence.

Distinguish “no unexpected event observed” from “all relevant actions were monitored.” Include a coverage state in the incident record and dashboard.

## Make alerts actionable

Attach the run ID, authenticated workload identity, approved task scope, unexpected resource or destination reference, decision outcome, and links to protected evidence. Include whether enforcement blocked the action and whether any external effect is confirmed.

Test the pipeline with a synthetic secret and a controlled test endpoint. Verify an allowed read, a denied unrelated read, allowed egress, blocked egress, and delayed delivery. Do not use real credentials as probes.

For high-confidence unexpected activity, your response policy can pause the run, revoke its short-lived access, and preserve evidence. Keep response actions idempotent and auditable. Tune recurring legitimate events by changing the explicit task policy after review, rather than silencing broad categories of credential or network activity.
