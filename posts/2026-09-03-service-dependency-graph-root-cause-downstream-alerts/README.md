# Separate Root-Cause Alerts with a Service Dependency Graph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Graph, Incident Correlation, Distributed Tracing, Grafana, Alerting

Description: Combine trace-derived dependency edges, directional symptoms, and timing to rank root-cause candidates while keeping downstream impact visible.

---

A service graph can explain why ten services alert when one dependency fails, but it cannot prove root cause by itself. The graph records observed communication. It does not know whether an edge is critical, whether fallback succeeded, or whether missing telemetry concealed another dependency.

Use the graph to generate and rank hypotheses. Keep downstream user-impact alerts visible, show the evidence behind every ranking, and reserve notification inhibition for narrow, tested relationships.

## Build an Edge Model from Traces

Grafana Tempo's service-graph processor derives edges by inspecting trace spans with parent-child relationships that represent requests. It exports Prometheus metrics including request counts, failed request counts, client/server duration histograms, and unpaired-span counts. The essential identity is directional:

~~~text
client service  ->  server service
checkout        ->  inventory
checkout        ->  payments
payments        ->  card-gateway
~~~

Consistent `service.name` resource attributes and correct context propagation are prerequisites. If a client and server use different names for the same service, the graph splits a node. If trace context is lost, the processor may not pair the two sides.

An illustrative PromQL query for recent failing edges is:

~~~promql
sum by (client, server) (
  rate(traces_service_graph_request_failed_total[5m])
)
/
sum by (client, server) (
  rate(traces_service_graph_request_total[5m])
)
~~~

Handle absent series and zero denominators in production. Confirm metric names and labels for the installed Tempo/Alloy version before creating rules.

## Normalize Alerts onto Graph Nodes

Map every alert's service or resource ID through a versioned catalog. An application alert maps directly to a service node. A database, queue, load balancer, or cloud resource may map to an external/dependency node with several owners.

Retain alert type:

- **cause candidate:** dependency availability, saturation, rejected requests, broker lag, node failure;
- **user symptom:** latency, error rate, failed synthetic journey, SLO burn;
- **supporting evidence:** deploy, configuration change, restart, capacity shift;
- **telemetry health:** missing spans, exporter failure, scrape failure.

These are roles for ranking, not permanent truth. A saturation alert on a downstream database can be caused by a retry storm from upstream, so the direction must be tested against metrics and traces.

## Rank Candidates with Direction and Time

When service A calls B and both alert, B is a stronger root-cause candidate when:

1. B's direct failure begins before A's caller-side symptom, after accounting for evaluation delay.
2. A's failing traces show errors or latency specifically on the A-to-B edge.
3. Other callers of B show compatible symptoms.
4. Services not depending on B remain healthy.
5. Recovery or failover of B improves downstream symptoms.

An alert arriving first is not automatically causal. Scrape intervals, `for` clauses, group waits, and ingestion delays reorder notifications. Use the source's condition start time and retain observed time separately.

Compute a transparent score rather than a magic answer:

~~~text
+3 direct alert on candidate node
+3 failing/slow edge in affected interval
+2 candidate onset precedes symptoms within expected skew
+2 multiple upstream callers affected
+1 recent change on candidate
-3 unaffected callers contradict candidate
-4 graph edge low-confidence or stale
~~~

Display the components and supporting links. Scores should prioritize investigation, never silently close or suppress an alert.

## Keep Downstream Symptoms Visible

User-impact symptoms answer whether the incident matters and whether mitigation worked. If a cluster failure inhibits every checkout SLO page, responders can miss that failover did not protect users.

A safer incident view has:

~~~text
Candidate root: orders-db connection exhaustion
Evidence: direct saturation alert; failing edges from checkout and fulfillment
Impact: checkout latency and order-submit synthetic failures
Other hypotheses: network policy rollout; retry amplification
Inhibited notifications: 18 instance alerts (still viewable)
~~~

Alertmanager inhibition can mute target notifications when a source alert is firing and selected labels are equal. It does not understand a dynamic graph. Generate explicit rules only for relationships that are stable and well tested, ensure equality labels are present, and keep inhibited alerts in history and incident views.

## Account for Graph Blind Spots

Trace-derived graphs can be incomplete because:

- head sampling did not record a trace;
- a tail sampler saw only part of a trace;
- propagation broke at an HTTP or message boundary;
- spans arrived too late to be paired;
- batch messaging uses links rather than a simple parent-child edge;
- traffic was too low during the selected interval;
- an out-of-band dependency emits no spans.

Tempo exposes an unpaired-spans metric that helps diagnose some graph gaps. Monitor graph-generation drops and cardinality limits as well. Supplement observed graphs with a declared service catalog, but record which source supplied each edge. A declared dependency may be stale; an observed edge may be transient.

Async systems need special treatment. A queue connects producer, broker/destination, and consumer across time. Model the logical destination and consumer relationship using messaging semantic attributes and links rather than assuming a synchronous client-server duration. Long queue delay can make a consumer symptom occur well outside an HTTP-oriented correlation window.

## Validate with Failure Exercises

For a representative dependency, inject a controlled failure and record:

1. direct alerts on the dependency;
2. edge error/latency changes;
3. caller and user-impact alerts;
4. source timestamps and notification times;
5. candidate ranking;
6. failover behavior and recovery order.

Repeat with an upstream retry storm that overloads the dependency, a telemetry propagation failure, partial sampling, and two simultaneous unrelated failures. The ranking should surface alternative hypotheses rather than forcing one root.

Track top-candidate accuracy, time to correct candidate, false inhibition, graph coverage, unpaired spans, and responder overrides. Version graph and scoring logic so post-incident review can reproduce the decision.

## Conclusion

A service dependency graph is most valuable as a directional evidence map. Normalize alerts onto nodes, compare source-time onset, verify failing edges in traces and metrics, and rank candidates transparently. Preserve downstream impact, model async edges honestly, and account for sampling and propagation gaps. That separates plausible causes from symptoms without replacing investigation with an unreliable graph heuristic.

## Official References

- [Grafana Tempo Service Graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/)
- [Grafana Tempo Metrics-Generator](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/)
- [Grafana: Enable Service Graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/enable-service-graphs/)
- [OpenTelemetry Service Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry Semantic Conventions for Messaging Spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [Alertmanager Configuration: Inhibition Rules](https://prometheus.io/docs/alerting/latest/configuration/#inhibit_rule)
