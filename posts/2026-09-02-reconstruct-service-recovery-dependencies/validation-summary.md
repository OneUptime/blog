# Validation Summary: How to Reconstruct Service Dependency Order for a Reliable Recovery Runbook

## Status

validated

## Post Type

Technical guide / disaster recovery runbook design guide

## Technologies Covered

- Directed service-dependency graphs, strongly connected components, topological ordering, and parallel recovery waves
- Disaster recovery, failover and failback, recovery time objectives (RTOs), recovery gates, and degraded operation
- Azure Site Recovery recovery plans
- OpenTelemetry distributed traces, sampling, producer/consumer spans, and trace-derived service graphs
- Network flow logs, socket and proxy evidence, firewall rules, DNS query logs, and blocked-network testing
- IAM, workload identity, secrets, certificate trust, service discovery, and feature flags
- Databases, object stores, queues, schema migrations, reconciliation jobs, and semantic readiness checks
- YAML dependency and gate records

## Sources Consulted

- [Azure Site Recovery: About recovery plans](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [Azure Site Recovery: Add Azure Automation runbooks to recovery plans](https://learn.microsoft.com/en-us/azure/site-recovery/site-recovery-runbook-automation)
- [OpenTelemetry: Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry: Sampling](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry Collector Contrib: Service Graph Connector](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [NetworkX: `topological_sort`](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.dag.topological_sort.html)
- [NetworkX: `strongly_connected_components`](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.components.strongly_connected_components.html)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)
- [AWS: VPC Flow Log basics](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-basics.html)
- [AWS: VPC Flow Log limitations](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html)
- [Amazon Route 53: Resolver query logging](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html)
- [Google Cloud: VPC firewall rules logging overview](https://docs.cloud.google.com/firewall/docs/vpc-firewall-rules-logging-overview)
- [AWS IAM: Policies and permissions](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [Kubernetes: Liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)

## Issues Found

- The Azure sentence said recovery plans explicitly group and order arbitrary application components. Azure Site Recovery directly groups protected machines and sequences their failover and startup to model application dependencies. Updated the wording to match the documented resource and sequencing behavior.
- The edge definition described every edge as blocking, which conflicted with the later definition of a soft dependency. The schema also used one `class` field for two orthogonal dimensions: hard/soft criticality and bootstrap/control-plane/data/observability roles. Redefined the edge as a full-recovery dependency, split `criticality` from `roles`, represented multiple phases as a list, and corrected the acceptance criterion's undefined `validation` category to the defined `observability` role.
- Cycle detection and recovery ordering were applied to the full graph even though accepted soft dependencies are not blockers. Scoped strongly connected component analysis and prerequisite ordering to the hard-edge subgraph for each recovery phase, preserved soft edges as evidence without making them blocking constraints, clarified how a bootstrap procedure actually relaxes a cycle, and limited parallel waves to nodes whose hard prerequisites are satisfied.
- “Intersecting” incomplete telemetry sources would retain only evidence common to all sources and discard valid edges visible in only one plane. Changed the guidance to combine and corroborate evidence.
- Firewall rules and DNS queries were described as proof of connections, and the test procedure required recording “every” denied connection and DNS query. Firewall rules describe permitted or blocked paths, DNS logs show resolution attempts, flow logs can aggregate, omit, or skip records, and resolver caches can suppress repeated query-log entries. Updated the text to distinguish each evidence type, refer to connection attempts, require verified logging coverage, and scope the acceptance criterion to observed attempts within that coverage.

## Review Notes

- Both YAML snippets parse as valid YAML 1.2-compatible mappings. Their field names and gate expressions are illustrative, vendor-neutral runbook data rather than a schema accepted directly by Azure Site Recovery; an implementation must supply the evaluator for the human-readable readiness expressions.
- The dependent-to-prerequisite edge direction and reverse-topological recovery order are correct. A standard topological order places the source of `u -> v` before its destination, so this post's edge orientation must be reversed to put prerequisites first.
- The OpenTelemetry trace description and sampling caveat are correct. Trace-derived service graphs remain implementation- and instrumentation-dependent; the OpenTelemetry Collector Contrib service-graph connector is currently alpha and needs suitable paired spans, which reinforces the post's use of multiple evidence planes.
- Azure Site Recovery recovery-plan group progression is based on machines being reported as running, not on the semantic data gates shown in the post. Azure also documents that recovery plans continue after a runbook script fails, so a strict `on_failure.stop` gate requires custom orchestration or an appropriate manual control.
- NIST SP 800-34 Rev. 1 was published in 2010 and NIST SP 800-184 in 2016; both remain marked Final and their recovery dependency, ordering, testing, and acceptance guidance remains relevant. No executable commands, product API calls, or version-pinned configuration are present.
- All external links in the post resolved to the intended authoritative pages during validation.
