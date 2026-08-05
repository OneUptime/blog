# Transform Argo Events Payloads with Lua or JQ Before Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Sensor, Lua, JQ, Event Transformation, Filters, Kubernetes

Description: Normalize Argo Events dependency data with Lua or JQ before filters run, while handling failures, types, context limits, and testable contracts.

---

Argo Events Sensor transforms solve a specific problem: an EventSource produced valid event data, but its shape is inconvenient or inconsistent for filters and triggers. A dependency can run either a Lua script or a JQ expression before evaluating its filters.

The exact order matters:

```text
EventSource -> EventBus -> dependency transform -> dependency filters -> conditions -> trigger
```

Transforms have been available since Argo Events v1.6.0. They receive only the event's `data`, not its CloudEvent `context`. A transform must return a valid JSON object. If transformation fails, the event is discarded. A dependency cannot configure both `script` and `jq`.

## Use JQ for Declarative JSON Reshaping

JQ is a strong default for field selection, renaming, defaults, array mapping, and constructing a small contract. Argo Events evaluates it with the Go implementation `gojq`, so check compatibility before relying on obscure native-jq features.

Assume incoming webhook data:

```json
{
  "header": {
    "X-Request-Id": ["evt-123"]
  },
  "body": {
    "serviceName": "PAYMENTS",
    "target": {"environment": "STAGING"},
    "git": {"sha": "8b65f2a"}
  }
}
```

Normalize it in the dependency:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: deployment-events
  namespace: argo-events
spec:
  dependencies:
    - name: deployment
      eventSourceName: deploy-hook
      eventName: requests
      transform:
        jq: >-
          .contract = {
            service: ((.body.serviceName // "") | ascii_downcase),
            environment: ((.body.target.environment // "") | ascii_downcase),
            revision: (.body.git.sha // ""),
            eventId: (.header["X-Request-Id"][0] // "")
          }
      filters:
        data:
          - path: contract.service
            type: string
            value: ['^[a-z][a-z0-9-]*$']
          - path: contract.environment
            type: string
            value: ['^(staging|production)$']
          - path: contract.eventId
            type: string
            value: ['^.+$']
```

The original data remains present because the expression adds `.contract` to the input object. To minimize retained payload, construct a new object instead:

```yaml
transform:
  jq: >-
    {
      contract: {
        service: (.body.serviceName // ""),
        revision: (.body.git.sha // "")
      }
    }
```

That change is intentional and breaking: later filters and parameter sources can no longer access `body` or `header`.

## Use Lua for Procedural Logic

Lua is useful when normalization needs readable branching or loops that would make JQ hard to review. The event data is available as global table `event`, and the script must return a table representing a JSON object.

```yaml
dependencies:
  - name: deployment
    eventSourceName: deploy-hook
    eventName: requests
    transform:
      script: |-
        local env = ""
        if event.body ~= nil and event.body.target ~= nil then
          env = string.lower(event.body.target.environment or "")
        end

        local service = ""
        if event.body ~= nil then
          service = string.lower(event.body.serviceName or "")
        end

        event.contract = {
          service = service,
          environment = env,
          revision = event.body and event.body.git and event.body.git.sha or ""
        }
        return event
    filters:
      data:
        - path: contract.environment
          type: string
          value: ['^(staging|production)$']
```

Lua tables have an important JSON edge case. By default, an empty table serializes as `{}`, not `[]`. The official Argo Events documentation shows using a metatable flag for an empty array:

```lua
event.contract.changedFiles = setmetatable({}, { __is_array = true })
return event
```

Use that only where an array is semantically required. Test nonempty and empty forms because type changes can break filters or Kubernetes resource admission.

## Remember That Context Is Unavailable

Transforms cannot read CloudEvent context fields such as `context.id`, `source`, `subject`, or `time`. They see event data only. If an identifier must be normalized, use an identifier already carried in data, such as a provider delivery header. Parameterization can separately use `contextKey` or `contextTemplate`, but the dependency transform itself cannot.

Do not invent a transform that refers to `event.context.id`. It will not have the documented input.

## Filter the Transformed Shape

All dependency filter types run after a successful transform. This enables a clean contract:

- transform provider names and types into stable fields;
- filter required values and authorization boundaries;
- use trigger conditions only after the dependency is valid;
- parameterize the trigger from the same stable fields.

Argo Events evaluates filter types in the documented order: expression, data, context, then time. A filter error is false. Transformation failure is more severe: the event is discarded before any filter can accept it.

If a transformation supplies an empty string for a missing required field, add a filter such as `^.+$`. Otherwise the transform may technically succeed and allow an incomplete contract to reach parameterization.

## Do Not Put Side Effects in a Transform

Lua and JQ transforms are pure event reshaping. They are not places to call an API, fetch a Secret, consult a database, or make an approval decision. They run inside the Sensor process on incoming events. Keep execution bounded and deterministic.

If normalization requires external authoritative data, trigger a Workflow that performs that lookup with normal timeouts, retries, credentials, and audit logs. The Sensor can do coarse routing; the workflow performs the business decision.

## Control Payload and Cardinality Growth

A transform can accidentally multiply data by copying a large original payload into several derived arrays. This increases EventBus-to-Sensor processing, Sensor memory, logs, and the size of generated resources.

Prefer a small contract with:

```json
{
  "contract": {
    "version": "deploy.v1",
    "eventId": "evt-123",
    "service": "payments",
    "environment": "staging",
    "revision": "8b65f2a"
  }
}
```

Pass a durable object reference rather than embedding a large document in Workflow parameters. Kubernetes object-size limits and Argo Workflow status growth make giant inline payloads a poor transport.

## Test Transform Failure Explicitly

For each transform, keep fixture-driven cases:

| Case | Expected result |
| --- | --- |
| complete valid payload | contract created and dependency valid |
| optional field absent | documented default or empty value |
| required object absent | transform succeeds to invalid contract, filter rejects |
| wrong input type | rejected, not silently coerced |
| empty array | remains `[]`, not `{}` |
| malformed transform | Sensor reports failure and no trigger runs |
| large payload | bounded runtime and output size |

Use a log trigger in an isolated namespace to inspect normalized output, and never log production secrets or full sensitive payloads. Validate the Sensor against the installed CRD:

```bash
argo-events lint sensor.yaml
kubectl apply --server-side --dry-run=server -f sensor.yaml
```

Then send real fixtures through the EventSource. A successful dry run validates fields, not transformation behavior.

## Choose Between Lua and JQ

Use JQ when the rule is a compact mapping visible as data flow. Use Lua when guarded procedural logic is substantially clearer. Do not choose based on which language can compress the most behavior into one line.

Whichever you choose:

- return an object;
- make required fields explicit;
- bound loops and output size;
- include a contract version;
- test missing fields and wrong types;
- keep the provider-specific shape out of the WorkflowTemplate.

## Official Documentation

- [Argo Events event transformation](https://argoproj.github.io/argo-events/sensors/transform/)
- [Argo Events filter introduction](https://argoproj.github.io/argo-events/sensors/filters/intro/)
- [Argo Events data filters](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [Argo Events script filters](https://argoproj.github.io/argo-events/sensors/filters/script/)
- [gojq project used by Argo Events](https://github.com/itchyny/gojq)
- [Lua reference manual](https://www.lua.org/manual/5.4/)

## Conclusion

Use a Sensor transform as a pure adapter from a provider payload to a small internal contract. JQ is usually best for declarative reshaping, while Lua helps with guarded procedural logic. Because transforms run before filters and failures discard events, test malformed, missing, and type-changing inputs as carefully as the happy path.
