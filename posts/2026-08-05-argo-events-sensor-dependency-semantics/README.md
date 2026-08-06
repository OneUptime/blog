# Combine Argo Sensor Dependencies with AND, OR, Reset, and Latest Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Sensor, Trigger Conditions, Event Correlation, Kubernetes, EventBus

Description: Design multi-dependency Argo Sensors with explicit AND and OR conditions, reset windows, and a correct understanding of latest-event state.

---

An Argo Events Sensor can wait for several named dependencies before executing a trigger. This is stateful correlation, but it is not a SQL join and not a FIFO zip of two event streams.

The most important documented behavior is this: if a trigger waits for `A && B`, and events `a1` through `a10` arrive before `b1`, the trigger uses `a10` with `b1`; `a1` through `a9` are dropped for that trigger round. Argo Events retains the latest event for a dependency, not an unbounded queue of pairable events.

That makes Sensor conditions suitable for gates and latest-state signals. It makes them unsuitable for correlating every order event with its matching payment event by business key.

## Define Dependencies and Conditions Separately

Dependencies name accepted event streams:

```yaml
dependencies:
  - name: image-built
    eventSourceName: build-events
    eventName: completed
  - name: approved
    eventSourceName: approval-events
    eventName: granted
  - name: emergency
    eventSourceName: approval-events
    eventName: emergency
```

Each trigger has a boolean `conditions` expression using dependency names:

```yaml
triggers:
  - template:
      name: deploy
      conditions: "image-built && (approved || emergency)"
      argoWorkflow:
        operation: submit
        source:
          resource:
            apiVersion: argoproj.io/v1alpha1
            kind: Workflow
            metadata:
              generateName: deploy-
            spec:
              workflowTemplateRef:
                name: deploy
```

Supported operators are `&&`, `||`, and parentheses. If `conditions` is omitted, the default is AND across all dependencies defined on the Sensor. Always state the expression when a Sensor serves more than one trigger; adding a new dependency can otherwise change an existing trigger's implicit requirement.

## Understand AND State

For `A && B`:

1. an accepted `A` marks A satisfied and stores that event;
2. later A events replace the stored A value before B arrives;
3. an accepted B makes the expression true;
4. the trigger receives the latest stored event for each dependency;
5. after the trigger round, the relevant dependency state is cleared for the next round.

Do not rely on arrival order between source systems. EventBus transport, retries, network delay, and producer clocks make global order unavailable.

If every input must share a key, filtering `A` and `B` independently does not prove that keys match each other. A Sensor data filter compares an event to configured values, not one dependency payload to another. Use one of these patterns instead:

- publish both facts to a keyed state store and trigger a workflow that queries it;
- aggregate upstream into one canonical event;
- start a workflow on the first event and let it wait or poll for the matching second fact;
- use a stream processor designed for keyed windows and joins.

## Understand OR State and Parameterization

For `A || B`, either dependency can satisfy the trigger. Trigger parameter resolution fails when a parameter references the dependency that did not arrive, unless a default `src.value` is configured. Create separate triggers when source payloads differ materially, or normalize both to the same contract.

```yaml
triggers:
  - template:
      name: deploy-standard
      conditions: approved
      # source parameters reference approved
  - template:
      name: deploy-emergency
      conditions: emergency
      # source parameters reference emergency
```

This is often clearer than one trigger with `approved || emergency` and a mixture of fallback values. It also lets the emergency path use distinct permissions, labels, and audit metadata.

## Reset Stale Partial Conditions

Without a reset, an A event today can combine with a B event tomorrow. `conditionsReset` lets a trigger clear condition state on a cron schedule:

```yaml
triggers:
  - template:
      name: daily-deploy
      conditions: "image-built && approved"
      conditionsReset:
        - byTime:
            cron: "59 23 * * *"
            timezone: Europe/London
      argoWorkflow:
        operation: submit
        source:
          resource:
            apiVersion: argoproj.io/v1alpha1
            kind: Workflow
            metadata:
              generateName: daily-deploy-
            spec:
              workflowTemplateRef:
                name: deploy
```

The timezone is optional and defaults to UTC. Use an IANA timezone identifier. A scheduled reset is a coarse correlation window, not an event-time window. It follows Sensor processing time and the configured cron boundary.

Reset schedules belong under a trigger template's `conditionsReset`. If different triggers need different windows, configure them independently or split Sensors.

## Avoid Cross-Entity Mixing

Suppose `image-built` events exist for ten services and `approved` events exist for ten services. One unpartitioned `image-built && approved` condition can pair the latest build for service A with approval for service B.

Prevent that by design:

- use separate Sensors per bounded entity when the cardinality is small and managed declaratively;
- publish entity-specific EventSource event names or bus subjects where supported;
- aggregate by key outside the Sensor;
- have the workflow revalidate that both event payloads identify the same entity before any side effect.

The last check is mandatory even when upstream partitioning should prevent mixing. Treat event payloads as claims until the workflow validates the authoritative state.

## Do Not Use Conditions for Trigger Sequencing

Dependencies represent incoming events, not completion of other triggers. Two triggers whose conditions become true in the same round execute independently. Writing trigger B after trigger A in YAML does not make B wait.

If one action must precede another, submit one Workflow with steps or a DAG. If completion of an external action truly arrives as a new event, model that completion as a separate EventSource dependency in a separate lifecycle, but include a correlation key and durable state.

## Build a Correlation Contract

For every multi-dependency Sensor, record:

```yaml
condition: image-built && (approved || emergency)
state_model: latest_event_per_dependency
correlation_key: service_and_revision
where_key_is_verified: deploy-workflow/preflight
maximum_age: until_23_59_Europe_London
late_event_behavior: retained_until_reset_or_next_round
duplicate_behavior: workflow_idempotency_key
```

This forces the team to answer which events can combine and how stale state expires.

Pass provider or CloudEvent IDs into the workflow, but derive the business idempotency key from the operation, such as service, environment, and revision. Two different approvals may authorize the same deployment without justifying two deployments.

## Test Timelines, Not Just Manifests

Use a deterministic matrix:

1. A then B, expect one trigger.
2. B then A, expect one trigger.
3. A1, A2, then B1, prove A2 is used.
4. A only, cross the reset time, then B, expect no stale combination.
5. A and B for different entities, expect the workflow preflight to reject.
6. duplicate A and duplicate B, prove idempotent business execution.
7. restart the active Sensor between partial and complete state, observe release-specific recovery behavior.

Sensor logs are useful evidence, but assert generated Workflow parameters and downstream idempotency records as well. A log saying conditions were met does not prove the correct entity pair was used.

## Official Documentation

- [Argo Events trigger conditions](https://argoproj.github.io/argo-events/sensors/trigger-conditions/)
- [Argo Events more about Sensors and triggers](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events Sensor concept](https://argoproj.github.io/argo-events/concepts/sensor/)
- [Argo Events trigger parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Workflows DAGs](https://argo-workflows.readthedocs.io/en/latest/walk-through/dag/)

## Conclusion

Argo Sensor conditions combine the latest accepted event for each dependency. Use AND and OR for gates, add resets to bound stale partial state, and never assume FIFO pairing or keyed joins. When every event must be correlated, move that responsibility to a keyed store, stream processor, or workflow that can verify authoritative state.
