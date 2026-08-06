# Route One Argo Events Webhook to Different Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Sensor, Data Filters, Trigger Conditions, Argo Workflows, Webhooks, Event Routing

Description: Route one webhook stream to different Argo workflows with dependency filters and trigger conditions while keeping matching rules explicit and testable.

---

One webhook endpoint can carry events for several actions, repositories, tenants, or environments. In Argo Events, there are two clean routing patterns:

1. define one Sensor dependency per mutually meaningful route, each with filters, then give each trigger a `conditions` expression;
2. use one broad dependency and place routing inside a single Argo Workflow.

The first pattern is useful when trigger targets, permissions, retry policies, or ownership differ. The second is safer when actions must be sequenced or share one business transaction. Sensor triggers are independent actions and do not wait for one another.

## Understand Where Matching Happens

An EventSource configuration named `requests` publishes each accepted HTTP request as a CloudEvent. For a webhook EventSource, the Sensor receives event data containing `header` and `body`. A Sensor dependency selects the EventSource name and event name, then applies optional transformation and filters. A trigger's `conditions` expression refers to dependency names.

The evaluation boundary is:

```text
HTTP request
  -> EventSource event named requests
  -> dependency transform
  -> dependency filters
  -> dependency marked satisfied
  -> trigger conditions
  -> trigger execution
```

Data filters do not choose a trigger directly. They decide whether an event satisfies a dependency. Trigger conditions then decide which trigger can run from the satisfied dependency state.

## Define One EventSource Endpoint

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: automation-hook
  namespace: argo-events
spec:
  service:
    ports:
      - name: requests
        port: 12000
        targetPort: 12000
  webhook:
    requests:
      endpoint: /automation
      port: "12000"
      method: POST
      authSecret:
        name: automation-hook-token
        key: token
```

Assume a payload contract such as:

```json
{
  "action": "deploy",
  "environment": "staging",
  "service": "payments",
  "revision": "8b65f2a",
  "eventId": "evt-7f3b"
}
```

Validate that contract at the producer boundary. Argo Events filters are routing controls, not a complete schema registry.

## Model Each Route as a Filtered Dependency

With a JetStream EventBus, the same EventSource event can appear in multiple Sensor dependencies. Each dependency applies its own filters. The legacy NATS Streaming EventBus rejects duplicate `eventSourceName` and `eventName` combinations in one Sensor, so use one Sensor per route if you still run that bus:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: automation-router
  namespace: argo-events
spec:
  template:
    serviceAccountName: automation-trigger
  dependencies:
    - name: staging-deploy
      eventSourceName: automation-hook
      eventName: requests
      filters:
        data:
          - path: body.action
            type: string
            value:
              - '^deploy$'
          - path: body.environment
            type: string
            value:
              - '^staging$'
    - name: production-deploy
      eventSourceName: automation-hook
      eventName: requests
      filters:
        data:
          - path: body.action
            type: string
            value:
              - '^deploy$'
          - path: body.environment
            type: string
            value:
              - '^production$'
    - name: rollback
      eventSourceName: automation-hook
      eventName: requests
      filters:
        data:
          - path: body.action
            type: string
            value:
              - '^rollback$'
          - path: body.environment
            type: string
            value:
              - '^staging$'
              - '^production$'
  triggers:
    - template:
        name: deploy-staging
        conditions: staging-deploy
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: deploy-staging-
              spec:
                workflowTemplateRef:
                  name: deploy-service
                arguments:
                  parameters:
                    - name: environment
                      value: staging
                    - name: service
                      value: unset
                    - name: revision
                      value: unset
          parameters:
            - src:
                dependencyName: staging-deploy
                dataKey: body.service
              dest: spec.arguments.parameters.1.value
            - src:
                dependencyName: staging-deploy
                dataKey: body.revision
              dest: spec.arguments.parameters.2.value
    - template:
        name: deploy-production
        conditions: production-deploy
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: deploy-production-
              spec:
                workflowTemplateRef:
                  name: deploy-service
                arguments:
                  parameters:
                    - name: environment
                      value: production
                    - name: service
                      value: unset
                    - name: revision
                      value: unset
          parameters:
            - src:
                dependencyName: production-deploy
                dataKey: body.service
              dest: spec.arguments.parameters.1.value
            - src:
                dependencyName: production-deploy
                dataKey: body.revision
              dest: spec.arguments.parameters.2.value
    - template:
        name: rollback-service
        conditions: rollback
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: rollback-
              spec:
                workflowTemplateRef:
                  name: rollback-service
```

For production, add parameters required by the rollback template and keep the Workflow skeleton complete enough for admission. The important fields are the dependency-level `filters.data`, trigger-level `conditions`, and trigger parameter source's matching `dependencyName`.

String data-filter values are regular expressions. Anchor exact matches with `^` and `$`; an unanchored value such as `prod` can match a larger string. Filter errors, including a missing path, are treated as false.

## Use the Right Logical Operator

Multiple `data` entries default to logical AND. Set `dataLogicalOperator: or` only when any data filter may satisfy the dependency:

```yaml
filters:
  dataLogicalOperator: or
  data:
    - path: body.action
      type: string
      value: ['^restart$']
    - path: body.action
      type: string
      value: ['^redeploy$']
```

Often one data filter with multiple allowed values is clearer:

```yaml
filters:
  data:
    - path: body.action
      type: string
      value:
        - '^restart$'
        - '^redeploy$'
```

`filtersLogicalOperator` combines different filter types, while `dataLogicalOperator` combines entries in `filters.data`. Both accept lowercase `and` or `or`; an empty value defaults to AND. Do not put uppercase `AND` in these fields.

Trigger `conditions` has a different syntax. It uses dependency names with `&&`, `||`, and parentheses:

```yaml
conditions: "(manual-approval || policy-approval) && production-deploy"
```

If a trigger omits `conditions`, Argo Events defaults to the AND of all dependencies defined on the Sensor. That default is a common reason a newly added route stops older triggers. State conditions on every routed trigger instead of relying on the implicit expression.

## Prevent Ambiguous Matches

If two dependencies match the same event, two triggers may execute. Sometimes that is intended fan-out. If it is not, prove mutual exclusion.

Create a routing table before YAML:

| Action | Environment | Dependency | Trigger |
| --- | --- | --- | --- |
| deploy | staging | `staging-deploy` | staging workflow |
| deploy | production | `production-deploy` | production workflow |
| rollback | allowed set | `rollback` | rollback workflow |
| unknown | any | none | no workflow; alert separately |

Test boundary values, missing fields, unexpected case, arrays instead of strings, and new action values. Argo Events does not provide a native exclusive `else` branch in trigger conditions. If exactly one route must always win, normalize a `route` field with JQ or Lua, filter on that field, and test it as a total function. Alternatively, submit one router Workflow and implement branching with Workflow expressions.

## Separate Routing from Authorization

An authenticated caller can still request a dangerous route. Filters should restrict:

- recognized actions;
- exact repository or tenant identity;
- allowed target environments;
- branch, ref, or revision shape;
- required approval evidence.

But a caller-provided string such as `approved: true` is not approval evidence. For production, have the workflow validate an authoritative approval record or signed policy decision. Use distinct Sensor service accounts if staging and production triggers need different permissions. A single Sensor pod uses one `serviceAccountName`, so strong privilege separation often means separate Sensor resources.

## Know When to Move Routing into a Workflow

Move routing into one Workflow when:

- branches must share an idempotency claim;
- one action must complete before another starts;
- rollback depends on deploy output;
- all paths belong to one auditable operation;
- a single concurrency or synchronization policy must cover the whole decision.

Sensor triggers are not an ordered task list. Their declaration order does not form a workflow dependency. A DAG or steps template makes ordering, retries, outputs, and exit handling explicit.

## Test and Observe the Router

Keep a fixture for each route and each rejection case:

```bash
curl https://events.example.com/automation \
  -H "Authorization: Bearer $WEBHOOK_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"action":"deploy","environment":"staging","service":"payments","revision":"8b65f2a","eventId":"evt-test-1"}'
```

Inspect Sensor logs and generated Workflows by trigger labels:

```bash
kubectl -n argo-events logs -l sensor-name=automation-router --since=10m
kubectl -n argo-events get workflows \
  -l events.argoproj.io/sensor=automation-router \
  -L events.argoproj.io/trigger
```

Pass `eventId` into each Workflow and enforce idempotency downstream. A routing test should assert the exact trigger count, not merely that at least one Workflow appeared.

## Official Documentation

- [Argo Events data filters](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [Argo Events filter introduction](https://argoproj.github.io/argo-events/sensors/filters/intro/)
- [Argo Events trigger conditions](https://argoproj.github.io/argo-events/sensors/trigger-conditions/)
- [Argo Events Sensor duplicate dependency limitations](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/#duplicate-dependencies)
- [Argo Events trigger parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events webhook EventSource](https://argoproj.github.io/argo-events/eventsources/setup/webhook/)
- [Argo Workflows conditional execution](https://argo-workflows.readthedocs.io/en/latest/walk-through/conditionals/)

## Conclusion

Route with filtered dependencies and explicit trigger conditions when destinations are independent. Anchor regex matches, state every condition, and prove routes are mutually exclusive. When branches share ordering, state, or authorization, submit one Workflow and make routing part of the workflow graph.
