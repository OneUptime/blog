# Validation Summary: How to Alert on Unexpected Credential Access and Egress During Agent Runs

## Status
validated

## Post Type
Technical security and monitoring guide with a runnable Python example and a Kubernetes audit policy fragment.

## Technologies Covered
- LLM agent runtimes, workload identities, and task-scoped authorization
- AWS Secrets Manager, CloudTrail, IAM temporary credentials, and VPC Flow Logs
- Kubernetes Secrets and API auditing
- Python 3 dictionaries, sets, membership checks, and list comprehensions
- Network egress monitoring, DNS, proxies, and destination allowlists
- OpenTelemetry attributes and sensitive telemetry handling

## Sources Consulted
- [AWS Secrets Manager CloudTrail logging](https://docs.aws.amazon.com/secretsmanager/latest/userguide/monitoring-cloudtrail.html) — API event coverage and collection across accounts and Regions.
- [CloudTrail event record contents](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-record-contents.html) — event timestamps, authenticated identity, and request context.
- [Getting and viewing CloudTrail log files](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/get-and-view-cloudtrail-log-files.html) — delivery delay and lack of a guaranteed delivery time.
- [VPC Flow Logs limitations](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html) — skipped records, Amazon DNS traffic, and instance metadata exclusions.
- [VPC flow log records](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html) — network-flow metadata and aggregation.
- [Revoking IAM role temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html) — permissions-based revocation and its scope.
- [Kubernetes auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/) — Metadata level, first-match rule ordering, core API group configuration, and audit backends.
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/) — mounted files and environment-variable delivery.
- [Python data structures](https://docs.python.org/3/tutorial/datastructures.html) — dictionaries, sets, and filtered list comprehensions.
- [OpenTelemetry sensitive data handling](https://opentelemetry.io/docs/security/handling-sensitive-data/) — credential sensitivity and data minimization.
- [OpenTelemetry tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/) — start/end lifecycle and recording an end timestamp at completion.
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) — destination allowlists, IP validation, and redirect bypass risks.
- [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) — agent security and least-privilege context.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the author link resolves to the intended profile.

## Issues Found
- The run-to-runtime mapping instructions required recording the actual end time at execution start, before that time is known. Updated the sentence to record the initial identity and start time at startup, then record the end time when execution finishes. This preserves accurate run boundaries for event correlation.

## Review Notes
- Executed the exact Python code block with Python 3.15.0. Both assertions passed, and output contained exactly the denied payroll secret access and allowed unknown external egress. The approved-model event was excluded as intended.
- The Python example explicitly assumes normalized events. Unknown event kinds or missing fields would raise errors; production ingestion needs schema validation, but that is outside this demonstration's stated scope.
- The Kubernetes YAML fields match the official audit policy example. Its omission of apiVersion and kind is appropriate because the post explicitly labels it a fragment. It was reviewed against documentation, not deployed to a live cluster.
- Kubernetes API auditing covers API requests; reading an already-delivered file or environment variable does not itself issue a Secret API request. Runtime monitoring coverage must be assessed separately.
- CloudTrail identity fields alone cannot uniquely attribute concurrent runs sharing credentials. The post correctly preserves ambiguity and recommends runtime evidence.
- Flow logs provide traffic metadata, may omit traffic, and cannot establish that a particular secret was transmitted. The distinction between attempts, successful access, and confirmed data transfer is correct.
- AWS role-session revocation can affect multiple sessions issued before a cutoff. A concrete response implementation must account for shared-role scope; the post appropriately leaves implementation to the response policy.
- All three technical links in the post resolved to the intended official documentation. No terminal commands, pinned product versions, or deprecated APIs occur in the examples.
- No live AWS resources, Kubernetes workloads, credential probes, or network enforcement rules were created. Verification consisted of official-source review and local execution of the self-contained Python example.
