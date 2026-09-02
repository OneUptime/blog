# How to Reconstruct Service Dependency Order for a Reliable Recovery Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Runbook, Reliability, DevOps

Description: Reconstruct hard and soft service dependencies from runtime evidence and convert the resulting graph into a gated recovery order.

---

Starting services in the order shown on an architecture slide often fails. Slides omit identity, DNS, secrets, certificate authorities, migration jobs, queues, feature flags, and the observability needed to decide whether a step succeeded. They also confuse request direction with recovery order.

A reliable runbook uses a tested dependency graph. Azure Site Recovery recovery plans explicitly support grouping protected machines and sequencing their failover and startup to model application dependencies; the difficult part is discovering the correct graph first.

## Define a Dependency Precisely

Represent each relationship as a directed edge:

~~~text
A -> B means A relies on B to reach full recovery
~~~

Attach attributes rather than storing only two names:

~~~yaml
from: checkout-api
to: orders-database
criticality: hard
roles:
  - data
phases:
  - startup
  - runtime
readiness: SELECT recovery_probe() returns expected schema version
timeout_seconds: 30
degraded_behavior: none
owner: database-platform
evidence:
  - trace-service-graph
  - runtime-connection-inventory
~~~

Record criticality as:

- **hard:** the service cannot meet its recovery acceptance criteria until the prerequisite is ready;
- **soft:** the service can meet a documented degraded-mode acceptance criterion while the prerequisite is unavailable.

Also record one or more roles:

- **bootstrap:** needed to create, configure, or authenticate another component;
- **control-plane:** needed to change the environment but not necessarily serve steady-state traffic;
- **data:** must reach a compatible schema and recovery point;
- **observability:** needed to prove health or operate safely.

Record whether the dependency exists at build, startup, runtime, recovery, or failback. An artifact registry may be a recovery dependency even when running processes never contact it.

## Gather Evidence from Several Planes

No single telemetry source is complete. Reconstruct the graph by combining and corroborating evidence.

### Request and message telemetry

Distributed traces reveal synchronous calls and some asynchronous producer/consumer links. OpenTelemetry describes a trace as the path of a request through an application. Use trace service graphs, but remember that sampling, failed instrumentation, batch jobs, and startup calls can hide edges.

### Network and DNS telemetry

Flow logs, socket inventories, and proxy logs reveal observed flows, sockets, and requests; firewall rules describe permitted or blocked paths, and DNS query logs reveal name-resolution attempts even when application tracing is absent. Distinguish periodic health or telemetry traffic from an acceptance-path dependency.

### Configuration and identity

Parse deployment manifests, environment-variable references, secret bindings, IAM policies, workload identities, certificate issuers, service discovery, and feature-flag clients. A permission grant often reveals a possible edge, not proof that the edge is active.

### Data and operations

Inspect schema migration order, backup and restore plans, queue topology, replication links, scheduled jobs, dashboards, alerts, incident timelines, and past startup logs.

### People

Interview service and platform owners with concrete prompts: “What must exist for a clean install?” “What fails closed?” “Which one-time job runs before traffic?” Validate answers against runtime evidence.

## Build and Challenge the Graph

Start with nodes for customer-facing services, then add every observed prerequisite. Mark evidence strength and last-observed time. Resolve conflicts with a controlled test rather than opinion.

Look explicitly for:

- shared DNS, time, identity, secret, and certificate infrastructure;
- circular bootstrap paths;
- migrations that require an old application version;
- consumers that start before producers or schemas are ready;
- queues that replay stale work on startup;
- global resources whose names cannot be recreated;
- external providers with separate recovery objectives;
- validation systems that themselves depend on the failed stack.

### Deal with cycles

For each recovery phase, run a strongly connected component analysis on the subgraph of hard edges. A hard-edge cycle such as identity -> secrets -> database -> identity has no topological order. Break it by design:

- pre-provision an offline bootstrap identity;
- split read-only startup from write-enabled operation;
- restore a minimum trusted configuration bundle;
- define a manual, audited bootstrap procedure and gate that temporarily supplies or relaxes one prerequisite;
- change a hard dependency to soft by making the service tolerate its temporary unavailability.

Do not encode a cycle as arbitrary sleeps. Time passing does not establish readiness.

## Convert the Graph into Recovery Waves

After hard-edge cycles are resolved, order every hard prerequisite before its dependents. With the dependent -> prerequisite edge notation used above, that is the reverse of the usual topological output. Preserve soft edges in the evidence graph, but do not make them ordering constraints when the documented degraded mode is accepted. Parallelize nodes whose hard prerequisites are all satisfied inside a wave.

~~~text
Wave 0: isolated network, time, emergency identity, evidence collector
Wave 1: DNS, certificate trust, secret access, artifact registry access
Wave 2: databases, object stores, queues
Wave 3: schema migrations and reconciliation jobs
Wave 4: internal APIs and workers with outbound side effects disabled
Wave 5: ingress and synthetic validation
Wave 6: enable writes, consumers, and external side effects
Wave 7: shift traffic and observe
~~~

The exact waves are workload-specific. In some designs DNS and identity are externally resilient prerequisites rather than recovered components. Record that explicitly.

Each transition needs a machine-verifiable gate:

~~~yaml
gate: orders-data-ready
requires:
  - database accepts TLS with recovery identity
  - schema_version == 2026090201
  - recovered_order_sequence >= approved_recovery_watermark
  - integrity_check == pass
on_failure:
  stop: true
  preserve_evidence: true
  escalate_to: database-platform
~~~

Process health, an open port, or a green load-balancer probe is rarely sufficient for data services.

## Validate the Order Experimentally

In an isolated recovery environment:

1. begin with no inherited shared services except documented external prerequisites;
2. execute one wave at a time;
3. block undeclared east-west and outbound connections;
4. capture denied connection attempts and DNS queries with logging whose coverage and limitations you have verified;
5. prove each gate from inside the consuming workload's identity and network;
6. inject slow and failed dependencies to confirm bounded behavior;
7. test the documented degraded mode for soft edges;
8. run critical business transactions before enabling external side effects.

An unexpected denied connection attempt is evidence of a missing or misclassified edge. A service that appears healthy while silently dropping work has a bad readiness condition.

## Keep the Graph Operational

Store the graph as versioned data, generate a human-readable diagram from it, and make the runbook consume the same source. Require service changes to declare added or removed dependencies. Compare recent traces, flow logs, DNS queries, and IAM changes with the stored graph and open a review when they differ.

Assign every node and external edge an owner, recovery objective, contact path, last validation time, and fallback behavior. Expire evidence after a defined interval or material architecture change.

## Acceptance Criteria

The recovery order is credible when:

- every critical transaction maps to a graph of dependencies labeled hard or soft and assigned bootstrap, control-plane, data, and observability roles;
- edges include applicable phases, readiness condition, owner, and evidence;
- all hard-edge cycles are broken by design or a documented bootstrap procedure that safely supplies or relaxes a prerequisite;
- independent services recover in parallel without violating prerequisites;
- transitions depend on semantic readiness, not fixed sleeps;
- blocked-network testing finds no unexplained observed connection attempts within verified logging coverage;
- soft dependencies demonstrate their degraded behavior;
- an isolated full recovery follows the generated order and passes business acceptance within RTO.

The output is more than a diagram. It is an executable theory of how the service becomes trustworthy again.

## Official References

- [Azure Site Recovery: About recovery plans](https://learn.microsoft.com/en-us/azure/site-recovery/recovery-plan-overview)
- [OpenTelemetry: Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
