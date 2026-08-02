# Fixing Argo Workflow `when` Expressions, Quoting Errors, and Unresolved Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Conditionals, Expressions, YAML, Workflow Variables, Debugging

Description: Fix Argo Workflow when-condition failures by choosing the right expression form, quoting YAML safely, indexing hyphenated names, ordering outputs, and handling skipped values.

---

An Argo `when` condition passes through several parsers before a task runs:

1. YAML parses the Workflow document.
2. Argo substitutes simple tags or evaluates an expression tag.
3. The conditional engine decides whether the step or DAG task should run.

An error at any layer can look like “bad quoting.” The reliable fix is to identify which layer failed, then use one of two supported forms:

```yaml
# Traditional conditional: substitute a simple tag into a govaluate expression.
when: "{{steps.flip.outputs.result}} == heads"

# Expression tag: read the value as typed expression data.
when: "{{=steps.flip.outputs.result == 'heads'}}"
```

The expression-tag form is usually safer for parameters that can contain spaces or quotes, for type conversions, and for hyphenated names.

## A Minimal Working Conditional

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: conditional-
spec:
  entrypoint: main
  arguments:
    parameters:
      - name: environment
        value: staging

  templates:
    - name: main
      steps:
        - - name: deploy
            template: deploy
            when: "{{=workflow.parameters.environment == 'production'}}"

    - name: deploy
      container:
        image: alpine:3.23
        command: [echo]
        args: ["deploying"]
```

Argo parameters are strings, so the expression compares `environment` to the string `'production'`. If the value is `staging`, the step finishes as `Skipped`; that is an intentional terminal node phase, not a failure.

## Simple Tags vs. Expression Tags

### Traditional simple-tag condition

Argo's conditionals walkthrough uses this readable form:

```yaml
when: "{{steps.flip-coin.outputs.result}} == heads"
```

Argo first substitutes the output into the text, then the govaluate-based conditional parser evaluates the result. This is fine for a controlled scalar such as `heads` or `tails`.

It becomes fragile if the value contains quotes. Given an input such as:

```text
He said "go"
```

textual substitution can create an invalid expression.

### Expression-tag condition

An expression tag begins with `{{=` and accesses the variable directly:

```yaml
when: "{{=inputs.parameters.message == 'example'}}"
```

The value is data rather than source text inserted into another expression. Argo's conditionals documentation specifically recommends this form for values that may contain quotes.

For a value containing double quotes, a folded YAML scalar keeps the layers readable:

```yaml
when: >-
  {{=inputs.parameters.message == 'He said "go"'}}
```

YAML sees the block as a string; expr sees a single-quoted string literal containing double quotes. If the comparison value itself comes from a parameter, compare two variables and avoid a literal entirely:

```yaml
when: >-
  {{=inputs.parameters.actual == inputs.parameters.expected}}
```

## Quote the YAML Value, Not Every Subexpression

YAML punctuation can be interpreted before Argo ever sees it. Colons followed by spaces, `#`, braces, leading `!`, and boolean-looking words can change YAML parsing.

Prefer one of these forms:

```yaml
when: "{{=inputs.parameters.mode == 'safe'}}"
```

```yaml
when: >-
  {{=inputs.parameters.mode == 'safe' &&
      asInt(inputs.parameters.replicas) > 0}}
```

The `>-` form folds the physical lines into one logical string and removes the final newline. It is useful for longer expressions. Do not put a YAML comment in the middle of the expression block; it becomes part of the scalar rather than a comment about the field.

This is invalid YAML, not an Argo expression error:

```yaml
# Incorrect: the colon-space can start a YAML mapping.
when: {{inputs.parameters.message}} == status: ready
```

Quote or block the whole scalar:

```yaml
when: >-
  {{=inputs.parameters.message == 'status: ready'}}
```

## Use Bracket Notation for Hyphenated Names

In expression syntax, `-` is an operator. These dotted references are invalid:

```yaml
# Incorrect expression references
when: "{{=steps.fetch-data.outputs.parameters.run-mode == 'full'}}"
```

Index maps with brackets instead:

```yaml
when: >-
  {{=steps['fetch-data'].outputs.parameters['run-mode'] == 'full'}}
```

The same rule applies to DAG tasks and input parameters:

```yaml
when: >-
  {{=tasks['check-policy'].outputs.parameters['approval-state'] == 'approved'}}
```

```yaml
when: >-
  {{=inputs.parameters['target-environment'] == 'production'}}
```

Simple tags can use hyphenated names directly, but expression tags must use indexing. Do not mechanically convert a simple tag to `{{=...}}` without checking every identifier.

## Use the Correct Scope: `steps` vs. `tasks`

Steps templates expose earlier outputs under `steps`:

```yaml
- name: main
  steps:
    - - name: inspect
        template: inspect
    - - name: publish
        template: publish
        when: "{{=steps.inspect.outputs.result == 'ready'}}"
```

DAG templates use `tasks`:

```yaml
- name: main
  dag:
    tasks:
      - name: inspect
        template: inspect
      - name: publish
        template: publish
        depends: inspect.Succeeded
        when: "{{=tasks.inspect.outputs.result == 'ready'}}"
```

`steps.inspect...` inside a DAG and `tasks.inspect...` inside a Steps template cannot resolve.

Output timing matters too. Steps in the same inner list run in parallel, so this is wrong:

```yaml
steps:
  - - name: inspect
      template: inspect
    - name: publish
      template: publish
      when: "{{=steps.inspect.outputs.result == 'ready'}}"
```

Move `publish` to the next step group. In a DAG, add `depends` or `dependencies` so the producer finishes before the consumer's condition is evaluated.

## Compare the Right Type

Workflow and template parameters are strings, even when YAML input looks numeric or boolean:

```yaml
arguments:
  parameters:
    - name: enabled
      value: "true"
    - name: replicas
      value: "3"
```

Compare or convert deliberately:

```yaml
when: "{{=inputs.parameters.enabled == 'true'}}"
```

```yaml
when: "{{=asInt(inputs.parameters.replicas) >= 3}}"
```

For whitespace or capitalization controlled by users, normalize with documented Sprig helpers:

```yaml
when: >-
  {{=sprig.lower(sprig.trim(inputs.parameters.enabled)) == 'true'}}
```

Sprig functions do not all fail on invalid input; some return zero values. For validation-sensitive numeric data, validate in a script or constrain parameter values rather than silently turning malformed input into `0`.

JSON extraction can return typed data. If an output parameter contains this JSON:

```json
{"approved": true, "score": 92}
```

compare the selected JSON boolean to a boolean:

```yaml
when: >-
  {{=jsonpath(tasks.check.outputs.parameters.decision, '$.approved') == true}}
```

Do not compare it to `'true'` unless the JSON field itself is a string.

## Keep `depends` and `when` Responsibilities Separate

In a DAG:

- `depends` controls which upstream **node results** permit scheduling;
- `when` controls a **data condition** once required values are available.

```yaml
- name: notify
  template: notify
  depends: "deploy.Failed || deploy.Errored"
  when: "{{=workflow.parameters.notifications == 'enabled'}}"
```

Enhanced Depends Logic exposes results such as `.Succeeded`, `.Failed`, `.Errored`, `.Skipped`, `.Omitted`, and `.Daemoned`. An operand without an explicit result is compatible with ordinary dependencies and is equivalent to success, skipped, or daemoned.

Use explicit results when the distinction matters:

```yaml
depends: "validate.Succeeded && (scan.Succeeded || scan.Skipped)"
```

Do not use both `dependencies` and `depends` on the same DAG task. When using enhanced `depends`, encode allowed failure paths in the expression instead of relying on `dag.task.continueOn`.

## Handle Outputs from Skipped or Omitted Nodes

A skipped or omitted node never ran and produced no output. Current Argo variable semantics distinguish an absent output from an empty string. An unhandled reference can fail the consumer with a terminal resolution error.

There are three clean patterns.

### Give the producer output a default

```yaml
- name: optional-check
  script:
    image: alpine:3.23
    command: [sh]
    source: |
      printf '%s' '{"approved":true}' > /tmp/decision.json
  outputs:
    parameters:
      - name: decision
        valueFrom:
          path: /tmp/decision.json
          default: '{"approved":false}'
```

References to this declared output can resolve to the producer default when the producing node is skipped or omitted.

### Give the consumer input a default

If the entire argument is the absent output reference, Argo can omit that argument so the consumer input default applies:

```yaml
- name: consume
  inputs:
    parameters:
      - name: decision
        default: '{"approved":false}'
```

```yaml
arguments:
  parameters:
    - name: decision
      value: "{{tasks.optional-check.outputs.parameters.decision}}"
```

### Use the expression null-coalescing operator

Expression tags see an absent skipped output as `nil`, so `??` can provide a fallback:

```yaml
when: >-
  {{=jsonpath(
        tasks['optional-check'].outputs.parameters.decision
          ?? '{"approved":false}',
        '$.approved'
      ) == true}}
```

These semantics were tightened in maintained Argo release lines. If you operate an older release, use that release's versioned documentation and test skipped-output behavior before relying on it.

## Avoid Referencing the Current Node's Future Outputs

`when` is evaluated before the guarded node runs. It cannot use that node's result:

```yaml
# Impossible: publish has not run, so it has no output.
- name: publish
  template: publish
  when: "{{=steps.publish.outputs.result == 'ok'}}"
```

Use an earlier node, an input parameter, a global Workflow value, or split the operation into “evaluate” and “act” templates.

The same timing rule applies to lifecycle hooks: a hook that fires during execution cannot read outputs that do not exist until the hooked template completes. Use an exit handler when completion outputs are required.

## Common Error Patterns

### `failed to resolve {{...}}`

Check:

- spelling and case;
- `steps` vs. `tasks`;
- producer ordering/dependency;
- output parameter declaration;
- skipped/omitted producer;
- scope—the referenced value may exist only inside another template.

### `invalid token`, `unexpected token`, or failed condition evaluation

Check:

- a raw substituted value containing quotes;
- unbalanced parentheses or string delimiters;
- hyphenated dotted identifiers;
- comparing a string to a number or boolean;
- YAML having altered the scalar before Argo evaluated it.

### A literal `{{...}}` reaches the Pod

Confirm the field supports Argo variable substitution and remove whitespace inside simple tags. Argo's variable documentation notes a known interpolation issue with whitespace and recommends:

```yaml
args: ["{{inputs.parameters.message}}"]
```

rather than:

```yaml
args: ["{{ inputs.parameters.message }}"]
```

Also check whether another renderer—Helm, Kustomize plugins, Jinja, or Terraform—consumed or escaped the braces before the Workflow reached Kubernetes.

## Debug the Stored Workflow

Lint the exact rendered manifest:

```bash
argo lint workflow.yaml
argo submit --dry-run -o yaml workflow.yaml > rendered-workflow.yaml
```

If another template engine generates the file, lint its final output rather than the source template.

For a submitted Workflow:

```bash
argo get -n workflows <workflow-name>

kubectl get workflow -n workflows <workflow-name> -o yaml

kubectl get workflow -n workflows <workflow-name> -o json \
  | jq -r '
      .status.nodes[]
      | [
          .displayName,
          .phase,
          (.message // ""),
          (.outputs.result // "")
        ]
      | @tsv
    '
```

Inspect the producer's recorded output exactly. Do not debug the condition against the value you expected the script to print.

When the Workflow remains pending or errors before a Pod exists, controller logs often contain the resolution failure:

```bash
kubectl logs -n argo deployment/workflow-controller \
  --since=15m \
  | grep '<workflow-name>'
```

## A Safe Conditional Style

For new Workflows:

1. Use expression tags for data comparisons.
2. Quote short conditions and use `>-` for long ones.
3. Use bracket notation for every hyphenated name.
4. Treat parameters as strings unless explicitly converted.
5. Add ordering before referencing node outputs.
6. Use `depends` for node phases and `when` for data.
7. Provide defaults or `??` for outputs that can be absent.
8. Lint the fully rendered manifest and inspect recorded node values.

Most conditional bugs disappear once values remain values instead of being pasted into expression source text.

## Official Documentation

- [Argo Workflows: Conditionals](https://argo-workflows.readthedocs.io/en/latest/walk-through/conditionals/)
- [Argo Workflows: Workflow Variables and Expression Tags](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Enhanced Depends Logic](https://argo-workflows.readthedocs.io/en/latest/enhanced-depends-logic/)
- [Argo Workflows: Output Parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/)
- [Argo Workflows: Lifecycle Hooks](https://argo-workflows.readthedocs.io/en/latest/lifecyclehook/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
