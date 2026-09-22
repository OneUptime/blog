# How to Expose OpenMetrics StateSet Metrics Without Conflicting State Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Observability

Description: Expose StateSet metrics with the required family-name state label, bounded states, and conflict-free entity labels.

---

An OpenMetrics StateSet adds a label whose name is the metric family's name. That label identifies each state. If an exporter already uses the same name for an ordinary entity label, the two meanings collide and the payload cannot represent the intended metric correctly.

Keep entity identity and state identity separate before serialization. For a worker state machine, use a stable `worker` label for the entity and reserve `worker_phase` for the states of the `worker_phase` family.

## Understand the two label layers

The [OpenMetrics StateSet definition](https://prometheus.io/docs/specs/om/open_metrics_spec/#stateset) treats a StateSet as related Boolean values. Each state appears as a sample with a zero or one value. When representing an enum, exactly one state must be true for each entity.

```text
# TYPE worker_phase stateset
# HELP worker_phase Current lifecycle phase of a worker.
worker_phase{worker="east",worker_phase="starting"} 0
worker_phase{worker="east",worker_phase="running"} 1
worker_phase{worker="east",worker_phase="stopped"} 0
# EOF
```

There is no `_stateset` suffix. The family and sample names are both `worker_phase`. The ordinary metric label set contains `worker="east"`; the generated state label supplies `worker_phase="running"` and its sibling states.

This is invalid:

```text
worker_phase{worker_phase="east",worker_phase="running"} 1
```

A label name cannot occur twice in one label set. Renaming only the second occurrence to `state` also breaks the StateSet representation, because the state label must match the family name. Rename the ordinary entity dimension instead.

## Let a client library produce the samples

Python's [Enum metric](https://prometheus.github.io/client_python/instrumenting/enum/) provides the common one-active-state behavior:

```python
from prometheus_client import CollectorRegistry, Enum
from prometheus_client.openmetrics.exposition import generate_latest

registry = CollectorRegistry()
phase = Enum(
    "worker_phase",
    "Current lifecycle phase of a worker.",
    labelnames=["worker"],
    states=["starting", "running", "stopped"],
    registry=registry,
)
phase.labels(worker="east").state("running")
print(generate_latest(registry).decode("utf-8"), end="")
```

The OpenMetrics serializer emits all declared states, including zero-valued inactive states. Do not filter those zeros out as a space optimization: a consumer needs to observe that the previously active state became false.

For this example, state transitions change values on a fixed set of three series. A design that invents a new state string for every error message instead produces unbounded label values. Put detailed failure text in logs and map operational state to a small stable vocabulary.

Python Enum chooses the first declared state initially. Initialize the real state promptly, or include an explicit `unknown` state and set it while discovery is incomplete. Do not expose `running` just because a collector has not read the application yet. Also note that the Python client's multiprocess mode does not support Enum; this example is for a normal process registry.

## Preserve a coherent state transition

A custom collector should take one snapshot of each entity's state before emitting its samples. If it asks “is starting?” and “is running?” at different moments, a transition between those reads can produce two true states or none.

Represent the current state internally as one validated enum value, then derive the Boolean vector from it:

```python
states = ("starting", "running", "stopped")
current = "running"
assert current in states
samples = {name: int(name == current) for name in states}
assert sum(samples.values()) == 1
```

A general StateSet can legitimately have several true states when it represents independent capabilities. The exactly-one check belongs to your enum contract, not to every possible StateSet. Document which interpretation the exporter uses.

## Query and troubleshoot the state family

After scraping, selecting the active running state is straightforward:

```promql
worker_phase{worker_phase="running"} == 1
```

An enum consistency check for entities that are present is:

```promql
sum without (worker_phase) (worker_phase) != 1
```

This preserves `worker`, `job`, `instance`, and any other identity labels. It cannot detect a worker whose entire metric disappeared, so pair it with inventory or availability checks when absence matters.

Round-trip the response through an OpenMetrics parser and inspect the decoded label names. Test every transition, an unsupported state, two entities with different states, and an entity disappearing. The [Python implementation](https://github.com/prometheus/client_python/blob/master/prometheus_client/metrics.py) also rejects conflicting Enum label names, but application-level tests are still needed for state completeness and snapshot consistency.

If ingestion reports duplicate labels or a missing state label, check your internal schema before adding relabeling rules. Fixing the reserved state dimension at the source preserves a clear and stable representation for every consumer.
