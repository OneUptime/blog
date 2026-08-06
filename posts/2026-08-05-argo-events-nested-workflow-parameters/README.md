# Pass Nested Argo Events Payloads to WorkflowTemplate Parameters Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Argo Workflows, WorkflowTemplate, Parameterization, JSON, Event Contracts, Sensor

Description: Stabilize nested event payloads before mapping them into WorkflowTemplate parameters, with defaults, normalization, and contract tests.

---

Argo Events can copy a nested payload value into a Workflow with a `dataKey` such as `body.pull_request.head.sha`. That is convenient, but it couples the Sensor to the producer's entire nesting layout. A provider version change, alternate event action, missing optional object, or array shape can turn parameter resolution into a failed trigger.

The durable design is to create a small internal event contract at the Sensor boundary. Normalize provider-specific data into stable top-level fields, validate that contract, and parameterize the Workflow from those fields. The workflow should know it received `revision`, `repository`, and `eventId`, not how GitHub, GitLab, or an internal gateway happened to nest them.

## Know the Two Path Languages

Argo Events parameterization uses two path syntaxes:

- `src.dataKey` selects from the event's `data` using GJSON-style paths;
- `dest` writes into the trigger resource using SJSON-style paths.

For a webhook CloudEvent whose data resembles this:

```json
{
  "headers": {
    "X-Request-Id": ["evt-123"]
  },
  "body": {
    "repository": {
      "full_name": "example/payments"
    },
    "pull_request": {
      "head": {
        "sha": "8b65f2a"
      }
    }
  }
}
```

a direct mapping is valid:

```yaml
- src:
    dependencyName: pull-request
    dataKey: body.pull_request.head.sha
  dest: spec.arguments.parameters.1.value
```

It is not inherently wrong. It becomes brittle when dozens of triggers repeat provider paths, or when one dependency accepts events with several payload shapes.

## Define the Workflow's Input Contract First

Keep the reusable workflow provider-neutral:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: verify-revision
  namespace: argo-events
spec:
  entrypoint: verify
  arguments:
    parameters:
      - name: repository
      - name: revision
      - name: event-id
      - name: actor
        value: unknown
      - name: event-json
        value: '{}'
  templates:
    - name: verify
      container:
        image: alpine:3.20
        env:
          - name: REPOSITORY
            value: '{{workflow.parameters.repository}}'
          - name: REVISION
            value: '{{workflow.parameters.revision}}'
          - name: EVENT_ID
            value: '{{workflow.parameters.event-id}}'
          - name: EVENT_JSON
            value: '{{workflow.parameters.event-json}}'
        command: [sh, -c]
        args:
          - >-
            printf 'repository=%s revision=%s event=%s event_json=%s\n'
            "$REPOSITORY"
            "$REVISION"
            "$EVENT_ID"
            "$EVENT_JSON"
```

Argo Workflow parameters are string values. Serialize structured input intentionally, for example as JSON text, and parse it inside a script or container. Do not expect a Workflow parameter to preserve an arbitrary object type.

## Normalize Provider Data Once

Argo Events v1.6.0 and later supports dependency transforms using JQ or Lua. A JQ transform receives only event data, not CloudEvent context, and must return a JSON object. It runs before filters.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: pull-request-normalizer
  namespace: argo-events
spec:
  template:
    serviceAccountName: workflow-trigger
  dependencies:
    - name: pull-request
      eventSourceName: github
      eventName: repository-events
      transform:
        jq: >-
          .contract = {
            repository: (.body.repository.full_name // ""),
            revision: (.body.pull_request.head.sha // ""),
            eventId: (.headers["X-Github-Delivery"][0] // ""),
            changedFiles: (.body.pull_request.changed_files // 0)
          }
      filters:
        data:
          - path: contract.repository
            type: string
            value: ['^example/payments$']
          - path: contract.revision
            type: string
            value: ['^[0-9a-f]{40}$']
          - path: contract.eventId
            type: string
            value: ['^.+$']
  triggers:
    - template:
        name: submit-verification
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: verify-revision-
              spec:
                workflowTemplateRef:
                  name: verify-revision
                arguments:
                  parameters:
                    - name: repository
                      value: unset
                    - name: revision
                      value: unset
                    - name: event-id
                      value: unset
                    - name: actor
                      value: unknown
                    - name: event-json
                      value: '{}'
          parameters:
            - src:
                dependencyName: pull-request
                dataKey: contract.repository
              dest: spec.arguments.parameters.0.value
            - src:
                dependencyName: pull-request
                dataKey: contract.revision
              dest: spec.arguments.parameters.1.value
            - src:
                dependencyName: pull-request
                dataKey: contract.eventId
              dest: spec.arguments.parameters.2.value
```

The normalization paths remain provider-specific, but now they exist once. Filters and triggers depend on the stable `contract` object. If the provider changes shape, one transform and its fixtures change instead of every workflow mapping.

The SHA expression assumes full Git commit IDs. Some test fixtures and APIs may supply another revision form; align the regex with the real producer contract rather than copying it blindly.

## Use `dataTemplate` for Extraction and Serialization

`dataTemplate` renders a Go template with Sprig functions against the event data available as `.Input`. It is useful when a result needs formatting, concatenation, or JSON serialization:

```yaml
- src:
    dependencyName: pull-request
    dataTemplate: >-
      {{ dict
        "repository" .Input.contract.repository
        "revision" .Input.contract.revision
        | toJson }}
  dest: spec.arguments.parameters.4.value
```

This writes JSON text into the Workflow parameter. Keep the template simple. Complex provider normalization belongs in a JQ or Lua transform where its output can be filtered before any trigger executes.

The current API reference and implementation allow `dataKey` and `dataTemplate` on the same source: the template is attempted first, then the key, then the literal `value`. This is separate from the documented rule that data selectors take precedence when both context and data selectors are present. Avoid using template-to-key fallback as silent schema-version negotiation. If a new shape appears, explicit normalization, metrics, and tests make the change visible; fallback can hide a producer regression.

## Handle Missing Values Deliberately

The parameter source supports a literal `value` default. A missing path without a usable default can fail trigger parameter resolution. Defaults are appropriate only when the value is truly optional:

```yaml
- src:
    dependencyName: pull-request
    dataKey: contract.actor
    value: unknown
  dest: spec.arguments.parameters.3.value
```

Do not default security-relevant inputs such as repository, target environment, tenant, or approval status. Filter out the event and alert on the contract violation.

JQ's `//` operator also supplies defaults, but remember that it treats `false` and `null` as absent and selects its right-hand alternative. For booleans where `false` is meaningful, use an explicit type or presence check rather than `// true`.

## Treat Arrays and Objects as JSON Text

The GitHub header map uses arrays of strings. Select the first value for a scalar:

```yaml
dataKey: headers.X-Github-Delivery.0
```

For a complete array or object, render it to JSON text:

```yaml
- src:
    dependencyName: pull-request
    dataTemplate: '{{ .Input.body.pull_request.labels | toJson }}'
  dest: spec.arguments.parameters.4.value
```

`useRawData` can preserve JSON types when writing into a trigger field that actually accepts those types. A Workflow parameter's `value` is a string field, so raw object insertion is the wrong target. Use serialized JSON instead.

## Version the Contract

Add a contract version when producers evolve independently:

```json
{
  "contract": {
    "version": "deploy.v1",
    "repository": "example/payments",
    "revision": "8b65f2a...",
    "eventId": "evt-123"
  }
}
```

Filter on supported versions. Introduce `v2` alongside `v1`, update consumers, then remove `v1` only after telemetry shows no remaining producers. Do not guess event type from missing nested fields.

## Test with Realistic Fixtures

Store sanitized examples for every accepted provider action and negative case. Test:

- a normal event;
- optional objects absent or `null`;
- empty arrays;
- multiple header values;
- unexpected number, boolean, or array types;
- a renamed provider field;
- values containing dots or regex characters;
- oversized structured parameters.

Use `argo-events lint` where supported by your installed CLI, server-side dry run against the actual CRD, and a nonproduction end-to-end delivery. Static YAML validation cannot prove that a GJSON path exists in runtime data.

```bash
argo-events lint sensor.yaml
kubectl apply --server-side --dry-run=server -f sensor.yaml
```

## Official Documentation

- [Argo Events trigger parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events event transformation](https://argoproj.github.io/argo-events/sensors/transform/)
- [Argo Events data filters](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Workflows parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/parameters/)
- [GJSON path syntax](https://github.com/tidwall/gjson/blob/master/SYNTAX.md)

## Conclusion

Direct `dataKey` paths are fine at a small, stable boundary. When provider payloads fan out to reusable workflows, normalize once into a versioned internal contract, filter required fields, and pass only provider-neutral strings or intentional JSON text. That turns nested paths from scattered dependencies into one tested adapter.
