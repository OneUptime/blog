# How to Extract a Nested JSON Field from an Argo Workflow Output Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, JSON, Output Parameters, JSONPath, Expr

Description: Extract nested values safely from Argo Workflow output parameters with expression tags, JSONPath, bracket notation, and script-based validation.

---

Argo Workflow parameters are strings. If a task writes a JSON document to an output parameter, a downstream task does not automatically receive a Kubernetes object with addressable fields; it receives JSON text. Trying to append `.order.customer.id` to the ordinary parameter reference therefore does not traverse the document.

The cleanest solution for a required field is Argo's expression-tag `jsonpath` function:

```yaml
value: "{{=jsonpath(tasks.produce.outputs.parameters.payload, '$.order.customer.id')}}"
```

For optional fields, schema validation, or more complicated transformations, parse the JSON in a script and publish a new scalar output parameter. This article shows both patterns and the failure modes that commonly make a correct-looking expression fail.

## Produce JSON as an Output Parameter

A container or script can publish a named parameter by writing a file and declaring that file under `outputs.parameters[].valueFrom.path`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: nested-json-
spec:
  entrypoint: main

  templates:
    - name: main
      dag:
        tasks:
          - name: produce
            template: produce-payload

          - name: consume
            dependencies: [produce]
            template: print-customer
            arguments:
              parameters:
                - name: customer-id
                  value: "{{=jsonpath(tasks.produce.outputs.parameters.payload, '$.order.customer.id')}}"

    - name: produce-payload
      script:
        image: python:3.13-alpine
        command: [python]
        source: |
          import json
          from pathlib import Path

          payload = {
              "order": {
                  "number": "ORD-1042",
                  "customer": {
                      "id": "customer-73",
                      "tier": "gold"
                  }
              }
          }
          Path("/tmp/payload.json").write_text(
              json.dumps(payload, separators=(",", ":")),
              encoding="utf-8",
          )
      outputs:
        parameters:
          - name: payload
            valueFrom:
              path: /tmp/payload.json

    - name: print-customer
      inputs:
        parameters:
          - name: customer-id
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['printf "customer=%s\n" "$CUSTOMER_ID"']
        env:
          - name: CUSTOMER_ID
            value: "{{inputs.parameters.customer-id}}"
```

The `produce` DAG task completes before `consume` because it is listed as a dependency. Argo then evaluates the expression tag, parses `payload` as JSON, evaluates `$.order.customer.id`, and passes the result as the `customer-id` input.

Using an environment variable in the consumer also avoids inserting untrusted parameter text directly into a shell program. Argo substitutes the value into the Pod's environment instead of asking the shell to reinterpret it as source code.

## Understand the Three Pieces of the Reference

This expression contains three distinct languages:

```text
{{= jsonpath(tasks.produce.outputs.parameters.payload, '$.order.customer.id') }}
     |        |                                         |
     |        |                                         +-- JSONPath
     |        +-- Argo/expr variable
     +-- Argo-provided expr function
```

The outer `{{= ... }}` is an **expression tag**. It is different from a simple substitution such as `{{tasks.produce.outputs.parameters.payload}}`. Within an expression tag, Argo evaluates the expression using expr and exposes helper functions including `jsonpath` and `toJson`.

The first argument to `jsonpath` must contain valid JSON text. The second argument is the JSONPath to evaluate. A path beginning with `$` starts at the document root.

For a Steps template, use `steps` instead of `tasks`:

```yaml
value: "{{=jsonpath(steps.produce.outputs.parameters.payload, '$.order.customer.id')}}"
```

The producer must be an earlier step row. Steps in the same row run in parallel, so one cannot consume the other's output.

## Use Bracket Notation for Hyphenated Names

Hyphens are subtraction operators in expression syntax. A task called `fetch-order` and a parameter called `response-body` therefore require map indexing:

```yaml
value: >-
  {{=jsonpath(tasks['fetch-order'].outputs.parameters['response-body'],
              '$.order.customer.id')}}
```

Without bracket notation, an expression such as this is parsed incorrectly:

```yaml
# Incorrect: `fetch-order` is not a valid dotted identifier.
value: "{{=jsonpath(tasks.fetch-order.outputs.parameters.response-body, '$.order.customer.id')}}"
```

Bracket notation is also useful when a JSON object key contains punctuation or spaces. That case belongs in the JSONPath portion:

```yaml
value: >-
  {{=jsonpath(tasks.produce.outputs.parameters.payload,
              '$.metadata["build-id"]')}}
```

Keep Argo-name indexing and JSON-key indexing separate: the first argument addresses the Argo output parameter; the JSONPath addresses the content stored in it.

## Extract an Array for `withParam`

`withParam` requires a JSON array. If the nested field is already an array, extract it and serialize the resulting expr value back to compact JSON with `toJson`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: region-fanout-
spec:
  entrypoint: main
  templates:
    - name: main
      dag:
        tasks:
          - name: discover
            template: discover

          - name: deploy
            dependencies: [discover]
            template: deploy-region
            arguments:
              parameters:
                - name: region
                  value: "{{item}}"
            withParam: >-
              {{=toJson(jsonpath(tasks.discover.outputs.parameters.payload,
                                  '$.deployment.regions'))}}

    - name: discover
      script:
        image: python:3.13-alpine
        command: [python]
        source: |
          import json
          from pathlib import Path
          value = {"deployment": {"regions": ["eu-west-1", "us-east-1"]}}
          Path("/tmp/payload.json").write_text(json.dumps(value))
      outputs:
        parameters:
          - name: payload
            valueFrom:
              path: /tmp/payload.json

    - name: deploy-region
      inputs:
        parameters:
          - name: region
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['printf "deploying to %s\n" "$REGION"']
        env:
          - name: REGION
            value: "{{inputs.parameters.region}}"
```

`jsonpath` returns the selected value to the expression. `toJson` is important here because `withParam` consumes JSON text, not expr's in-memory list representation.

If the whole output parameter is already the desired JSON array, do not extract it again:

```yaml
withParam: "{{tasks.discover.outputs.parameters.regions}}"
```

## Promote the Field as a DAG Output

If several callers need the same nested field, expose it once as an output of the enclosing DAG template:

```yaml
- name: lookup-order
  dag:
    tasks:
      - name: fetch
        template: fetch-order
  outputs:
    parameters:
      - name: customer-id
        valueFrom:
          expression: >-
            jsonpath(tasks.fetch.outputs.parameters.payload,
                     '$.order.customer.id')
```

Unlike `value:` in an argument, `valueFrom.expression` contains the expression directly and does not use the `{{= ... }}` wrapper. A caller can now use a normal parameter reference:

```yaml
value: "{{tasks.lookup.outputs.parameters.customer-id}}"
```

This creates a stable template interface. The caller does not need to know the producer's complete response schema or repeat its JSONPath.

## Parse in a Script When the Field Is Optional

An expression is ideal when invalid JSON or a missing required field should fail the workflow. A script is clearer when you need to distinguish these cases:

- malformed JSON;
- a missing object along the path;
- an explicitly `null` value;
- a value of the wrong type;
- a default that is valid for the application.

The following template parses the document, validates the required type, and writes a scalar output:

```yaml
- name: extract-customer-id
  inputs:
    parameters:
      - name: payload
  script:
    image: python:3.13-alpine
    command: [python]
    env:
      - name: PAYLOAD
        value: "{{inputs.parameters.payload}}"
    source: |
      import json
      import os
      from pathlib import Path

      try:
          document = json.loads(os.environ["PAYLOAD"])
      except json.JSONDecodeError as exc:
          raise SystemExit(f"payload is not valid JSON: {exc}")

      customer = document.get("order", {}).get("customer", {})
      customer_id = customer.get("id")
      if not isinstance(customer_id, str) or not customer_id:
          raise SystemExit("order.customer.id must be a non-empty string")

      Path("/tmp/customer-id.txt").write_text(customer_id, encoding="utf-8")
  outputs:
    parameters:
      - name: customer-id
        valueFrom:
          path: /tmp/customer-id.txt
```

Wire it after the producer just like any other task:

```yaml
- name: extract
  dependencies: [produce]
  template: extract-customer-id
  arguments:
    parameters:
      - name: payload
        value: "{{tasks.produce.outputs.parameters.payload}}"
```

This extra Pod is not necessary for a straightforward required field, but it gives you explicit validation, useful error messages, and complete control over defaults.

## Do Not Confuse Parameter JSONPath with Resource Output JSONPath

Argo also has a `valueFrom.jsonPath` field for outputs from a **resource template**. It selects data from the Kubernetes object managed by that resource template:

```yaml
outputs:
  parameters:
    - name: service-cluster-ip
      valueFrom:
        jsonPath: '{.status.loadBalancer.ingress[0].ip}'
```

That field is not a general-purpose way to parse an arbitrary output parameter. For JSON text produced by a container, script, or HTTP task, use the expression `jsonpath(...)` function or parse the text in a script.

The names are similar, but the input sources and placement in YAML are different.

## Avoid Quoting and Serialization Traps

### Do not embed raw JSON in another JSON string

This is fragile:

```yaml
args:
  - >-
    curl -d '{"payload": "{{tasks.produce.outputs.parameters.payload}}"}'
```

Quotes and backslashes in the payload can make the generated command invalid or change its meaning. Pass the parameter through an environment variable or file and let a JSON-aware program encode the final request.

### Write JSON, not a language representation

Python's `str(dictionary)` uses single quotes and is not valid JSON:

```python
# Incorrect for a JSON output parameter
Path("/tmp/payload.json").write_text(str(payload))

# Correct
Path("/tmp/payload.json").write_text(json.dumps(payload))
```

Likewise, make sure command output contains only the JSON document if you rely on `outputs.result`. Diagnostic logging mixed into standard output makes the captured result invalid JSON. A named file output is usually easier to control.

### Remember the `result` capture limit

Container and script standard output is exposed as `outputs.result`, with a documented 256 KB capture limit. A small API response can be read directly:

```yaml
value: "{{=jsonpath(tasks.request.outputs.result, '$.data.id')}}"
```

For larger documents, durable payloads, or binary data, use an artifact instead. Parameters are best for compact control-plane values such as IDs, flags, and small JSON arrays.

## Diagnose an Unresolved or Invalid Expression

Start with the Workflow and node status rather than only the main container logs:

```bash
argo get -n workflows <workflow-name>
kubectl get workflow -n workflows <workflow-name> -o yaml
kubectl get workflow -n workflows <workflow-name> \
  -o jsonpath='{.status.message}{"\n"}'
```

Then check these points in order:

1. **Did the producer run?** A skipped or omitted node may not have an output at all.
2. **Is the dependency explicit?** The consumer must run after the producer.
3. **Is the prefix correct?** Use `tasks` in DAG templates and `steps` in Steps templates.
4. **Are names hyphenated?** Use `tasks['fetch-order']` and `parameters['response-body']` in expression tags.
5. **Is the parameter valid JSON?** Copy the exact output value and parse it with a JSON tool.
6. **Does the JSONPath match the real shape?** Arrays require indices or an array-returning path; object keys are case-sensitive.
7. **Is the expression in the right form?** Argument values use `{{=...}}`; `valueFrom.expression` stores the bare expression.

To inspect the exact producer output:

```bash
kubectl get workflow -n workflows <workflow-name> -o json \
  | jq -r '.status.nodes[]
      | select(.displayName == "produce")
      | .outputs.parameters[]
      | select(.name == "payload")
      | .value'
```

Do not debug a JSONPath against the payload you expected to produce. Debug it against the value recorded in Workflow status.

## Choose the Smallest Reliable Pattern

Use an expression tag when the field is required and the transformation is simple:

```yaml
value: "{{=jsonpath(tasks.produce.outputs.parameters.payload, '$.order.customer.id')}}"
```

Use `toJson(jsonpath(...))` when the selected value is an array or object that must become JSON text again, especially for `withParam`.

Use `valueFrom.expression` to make the selected field an output of a Steps or DAG template.

Use a parser task when you need optional-field behavior, schema validation, type checks, or precise error messages. And use an artifact rather than a parameter when the JSON is no longer a small control value.

## Official Documentation

- [Argo Workflows: Workflow Variables and Expression Tags](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Output Parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/)
- [Argo Workflows: Loops and `withParam`](https://argo-workflows.readthedocs.io/en/latest/walk-through/loops/)
- [Argo Workflows: Conditional Artifacts and Parameters](https://argo-workflows.readthedocs.io/en/latest/conditional-artifacts-parameters/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
