# How to Fan Out Argo Workflow Tasks with withItems, withParam, and Sequences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Loop, Fan-Out, withItems, withParam, withSequence

Description: Fan out Argo Workflow steps and DAG tasks with static items, runtime JSON arrays, and numeric sequences while keeping inputs, outputs, and concurrency predictable.

---

Fan-out turns one logical step into many Argo Workflow nodes. Argo offers three loop fields for doing it:

- `withItems` embeds a static YAML list in the Workflow.
- `withParam` reads a JSON array, often produced at runtime.
- `withSequence` generates a numeric range without first building a list.

All three work on a step or a DAG task. Argo expands the loop into one invocation of the referenced template per item, and the invocations are eligible to run in parallel. The surrounding dependencies and any configured parallelism limits still apply.

## Choose the Loop That Matches the Data

| Requirement | Use | Input form |
| --- | --- | --- |
| A small list known when YAML is written | `withItems` | YAML scalars or objects |
| A list supplied or discovered at runtime | `withParam` | A string containing a valid JSON array |
| A contiguous numeric range | `withSequence` | `count`, or `start` and `end` |

The field is `withParam`, singular. It is easy to accidentally write `withParams`, especially because other Argo fields use plural names.

## Fan Out Over a Static List with `withItems`

Use `withItems` when the list belongs in the Workflow definition:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: region-check-
spec:
  entrypoint: main
  templates:
    - name: main
      steps:
        - - name: check-region
            template: check-region
            arguments:
              parameters:
                - name: region
                  value: "{{item}}"
            withItems:
              - eu-west-1
              - us-east-1
              - ap-southeast-2

    - name: check-region
      inputs:
        parameters:
          - name: region
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['printf "checking %s\\n" "$REGION"']
        env:
          - name: REGION
            value: "{{inputs.parameters.region}}"
```

Inside the loop definition, `{{item}}` is the current scalar. Passing it as a template argument keeps the worker template reusable and makes its input contract explicit.

### Static objects

Items can also be objects. Address their fields as `{{item.field}}`:

```yaml
withItems:
  - {region: eu-west-1, tier: critical}
  - {region: us-east-1, tier: standard}
arguments:
  parameters:
    - name: region
      value: "{{item.region}}"
    - name: tier
      value: "{{item.tier}}"
```

Prefer ordinary alphanumeric field names. If a key contains characters that are awkward in an expression, normalize it in the producer or use expression-tag bracket notation where that field supports an expression.

## Generate a Range with `withSequence`

`withSequence` avoids manually listing numbered shards:

```yaml
- - name: process-shard
    template: process-shard
    arguments:
      parameters:
        - name: shard
          value: "{{item}}"
    withSequence:
      start: "0"
      count: "8"
      format: "%02d"
```

That creates eight values beginning at zero, formatted as `00` through `07`. The official field reference defines these options:

- `start` selects the first number and defaults to zero.
- `count` selects how many elements to generate.
- `end` selects the inclusive end of a range.
- `format` is a `printf`-style format string.

Use either `count` or `end`, not both. For example, `start: "100"` and `end: "105"` generate an inclusive range from 100 through 105. Argo's official examples also demonstrate a descending range by setting `start` greater than `end`.

Treat the substituted item as a parameter string at the template boundary. If the program needs an integer, parse and validate it in that program rather than depending on shell coercion.

## Fan Out Over Runtime Data with `withParam`

`withParam` is the dynamic option. Its value must be a string containing a JSON array-not a YAML list and not a comma-separated string.

The array can arrive as a Workflow parameter:

```yaml
spec:
  arguments:
    parameters:
      - name: targets
        value: '[{"region":"eu-west-1"},{"region":"us-east-1"}]'

  templates:
    - name: main
      inputs:
        parameters:
          - name: targets
      steps:
        - - name: check
            template: check-region
            arguments:
              parameters:
                - name: region
                  value: "{{item.region}}"
            withParam: "{{inputs.parameters.targets}}"
```

More commonly, an earlier task discovers the work:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: dynamic-fanout-
spec:
  entrypoint: main
  templates:
    - name: main
      steps:
        - - name: discover
            template: discover
        - - name: process
            template: process-target
            arguments:
              parameters:
                - name: target
                  value: "{{item.name}}"
                - name: region
                  value: "{{item.region}}"
            withParam: "{{steps.discover.outputs.result}}"

    - name: discover
      script:
        image: python:3.13-alpine
        command: [python]
        source: |
          import json
          import sys

          targets = [
              {"name": "orders", "region": "eu-west-1"},
              {"name": "billing", "region": "us-east-1"},
          ]
          json.dump(targets, sys.stdout)

    - name: process-target
      inputs:
        parameters:
          - name: target
          - name: region
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['printf "processing %s in %s\\n" "$TARGET" "$REGION"']
        env:
          - name: TARGET
            value: "{{inputs.parameters.target}}"
          - name: REGION
            value: "{{inputs.parameters.region}}"
```

The step groups enforce the dependency: `discover` must finish before Argo can expand `process`. In a DAG, express the same relationship with `dependencies: [discover]` or a `depends` expression, and reference `{{tasks.discover.outputs.result}}` instead.

`outputs.result` captures standard output from a script or container template, up to Argo's documented 256 KB result limit. The producer must therefore write only the JSON array to standard output. Send diagnostic logs to standard error; a log line mixed into standard output makes the value invalid JSON.

For a larger manifest, store it as an artifact or split it into pages rather than forcing it through a parameter. Large fan-outs also create many Workflow nodes and Pods, so batching is often operationally safer.

## Consume Aggregate Loop Results

After every loop iteration completes, Argo can expose their results as a JSON array:

```yaml
- - name: transform
    template: transform-one
    arguments:
      parameters:
        - name: value
          value: "{{item}}"
    withParam: '[1, 2, 3]'
- - name: summarize
    template: summarize
    arguments:
      parameters:
        - name: results
          value: "{{steps.transform.outputs.result}}"
```

When aggregating `outputs.result`, each iteration must emit valid JSON. For example, emit this:

```json
{"input":1,"output":"1.json"}
```

Do not emit an unquoted sentence and expect Argo to construct valid JSON around it. In the summarizer, parse the aggregate parameter with a JSON parser rather than splitting it on commas.

The loop is a synchronization point: the next step group waits for all expanded nodes. Execution completion order may differ from input order, so design each item as independent work and attach an explicit identifier to every result.

## Bound the Parallel Work

A loop describes *what* to fan out; it does not by itself protect the cluster or a downstream API. Add a `parallelism` limit at the Workflow or template level when the list can be large:

```yaml
spec:
  parallelism: 20
  templates:
    - name: main
      parallelism: 5
      steps:
        # looped step here
```

Workflow-level `parallelism` caps Pods running for that Workflow. Template-level `parallelism` limits parallel execution within that template invocation. Semaphores are a better fit when multiple Workflows share a fixed external capacity, such as ten database connections.

## Make Fan-Out Safe to Retry

One failed iteration can cause a looped step or task to fail even though other iterations completed. Assume successful items may have already produced side effects before an operator retries the Workflow.

- Give each item a stable business key, not just its loop index.
- Make writes idempotent or use an idempotency key.
- Keep discovery deterministic when repeatability matters.
- Validate the entire generated array before printing it.
- Apply retry policies to transient failures, with bounded backoff.
- Set resource requests and concurrency limits for the largest expected list.

These practices also make individual nodes easier to find in the UI. A display-name annotation based on an input can replace an opaque generated node label with a useful target name:

```yaml
annotations:
  workflows.argoproj.io/display-name: "process-{{inputs.parameters.target}}"
```

## Debugging Checklist

If Argo does not expand a loop as expected, inspect the Workflow and the producer node before changing the worker template:

1. Confirm the field name and indentation: `withItems`, `withParam`, or `withSequence` belongs on the step or DAG task.
2. For `withParam`, copy the resolved value and parse it with a JSON parser. The top level must be an array.
3. Check that the producer is an earlier step or an actual DAG dependency.
4. Use `steps.<name>` inside a steps template and `tasks.<name>` inside a DAG template.
5. Verify every object has the keys referenced by `{{item.key}}`.
6. Inspect Workflow `parallelism`, template `parallelism`, synchronization locks, quotas, and pending Pods if fewer items run concurrently than expected.
7. When aggregating results, make every iteration's result valid JSON.

The cleanest design is usually static configuration with `withItems`, computed work with `withParam`, and numbered partitions with `withSequence`. Keep generation, per-item execution, and aggregation in separate templates so each contract can be tested independently.

## Official Documentation

- [Argo Workflows: Loops](https://argo-workflows.readthedocs.io/en/latest/walk-through/loops/)
- [Argo Workflows: Scripts and Results](https://argo-workflows.readthedocs.io/en/latest/walk-through/scripts-and-results/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: Limiting Parallelism](https://argo-workflows.readthedocs.io/en/latest/parallelism/)
- [Argo Workflows examples: loops-sequence.yaml](https://github.com/argoproj/argo-workflows/blob/main/examples/loops-sequence.yaml)
