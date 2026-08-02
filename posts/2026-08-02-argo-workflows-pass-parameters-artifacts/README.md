# How to Pass Parameters and Artifacts Between Argo Workflow Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Parameters, Artifacts, Data Pipelines, S3, Workflow Outputs

Description: Pass small values and files between Argo Workflow steps or DAG tasks with correctly declared inputs, outputs, references, artifact repositories, and production-safe data contracts.

---

Tasks in an Argo Workflow commonly run in different pods. A file written to `/tmp/report.json` by one task is therefore not automatically present at that path in the next task.

Argo provides two explicit data channels:

- **Parameters** carry small string values used in arguments, conditions, loops, and configuration.
- **Artifacts** carry files or directories through a configured artifact repository.

The producer must declare an output, the caller must wire that output to an argument, and the consumer must declare a matching input. Missing any one of those layers produces an unresolved variable, a missing file, or an artifact upload/download error.

## Choose the Right Channel

| Data | Use | Why |
| --- | --- | --- |
| Version, count, flag, object key, small JSON value | Parameter | Easy to substitute into arguments and expressions |
| Report, model, binary, archive, directory | Artifact | Designed for file data and external storage |
| Very large shared working set with repeated access | Volume or external data system | Avoid repeated artifact packaging and transfer |
| Password, token, private key | Kubernetes Secret | Workflow parameters and outputs are not a secret store |

Parameters are strings even when their content represents a number, boolean, or JSON document. Parse and validate them in the consumer.

Do not put a large payload into a parameter merely to avoid configuring artifacts. Argo's implicit `result` output captures at most 256 KB of standard output for script and container templates. Files and bulk JSON belong in artifact storage or another external data service.

## The Complete Producer-to-Consumer Contract

This DAG produces a count and a JSON report, then passes both to a consumer:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: pass-data-
spec:
  entrypoint: pipeline

  templates:
    - name: pipeline
      dag:
        tasks:
          - name: generate
            template: generate-report

          - name: consume
            dependencies: [generate]
            template: consume-report
            arguments:
              parameters:
                - name: record-count
                  value: "{{tasks.generate.outputs.parameters.record-count}}"
              artifacts:
                - name: report
                  from: "{{tasks.generate.outputs.artifacts.report}}"

    - name: generate-report
      script:
        image: python:3.13-alpine
        command: [python]
        source: |
          import json

          records = [
              {"id": 1, "status": "ready"},
              {"id": 2, "status": "ready"},
          ]

          with open("/tmp/report.json", "w", encoding="utf-8") as report:
              json.dump(records, report)

          with open("/tmp/count.txt", "w", encoding="utf-8") as count:
              count.write(str(len(records)))
      outputs:
        parameters:
          - name: record-count
            valueFrom:
              path: /tmp/count.txt
        artifacts:
          - name: report
            path: /tmp/report.json

    - name: consume-report
      inputs:
        parameters:
          - name: record-count
        artifacts:
          - name: report
            path: /work/report.json
      container:
        image: python:3.13-alpine
        command: [python, -c]
        args:
          - |
            import json

            with open("/work/report.json", encoding="utf-8") as report:
                records = json.load(report)

            expected = int("{{inputs.parameters.record-count}}")
            if len(records) != expected:
                raise SystemExit(
                    f"expected {expected} records, found {len(records)}"
                )

            print(f"validated {expected} records")
```

This manifest assumes an artifact repository is configured. Argo uploads `report` after `generate-report` succeeds and materializes it at `/work/report.json` before the consumer's main command runs.

Notice the different argument fields:

```yaml
parameters:
  - name: record-count
    value: "{{tasks.generate.outputs.parameters.record-count}}"
artifacts:
  - name: report
    from: "{{tasks.generate.outputs.artifacts.report}}"
```

A parameter argument uses `value`; an artifact passed from another node uses `from`.

## Produce an Explicit Output Parameter

An explicit output parameter reads a file after the task runs:

```yaml
- name: calculate-version
  container:
    image: alpine:3.23
    command: [sh, -c]
    args:
      - printf '%s' '2026.08.02' > /tmp/version.txt
  outputs:
    parameters:
      - name: version
        valueFrom:
          path: /tmp/version.txt
```

The file at `valueFrom.path` must exist and be readable when the template completes. `printf` is useful when trailing newlines are not part of the desired value.

The caller passes it into a declared input:

```yaml
- name: publish
  dependencies: [calculate-version]
  template: publish
  arguments:
    parameters:
      - name: version
        value: "{{tasks.calculate-version.outputs.parameters.version}}"
```

And the consumer uses only its input contract:

```yaml
- name: publish
  inputs:
    parameters:
      - name: version
  container:
    image: alpine:3.23
    command: [echo]
    args: ["publishing {{inputs.parameters.version}}"]
```

This separation makes the consumer reusable. It does not need to know which upstream task calculated the version.

## Use `result` for Small Standard Output

Script and container templates automatically expose standard output as `outputs.result`, up to the documented 256 KB limit. HTTP templates expose a non-empty response body in the same result field.

For example:

```yaml
- name: choose-region
  script:
    image: python:3.13-alpine
    command: [python]
    source: |
      print("eu-west-2", end="")
```

A DAG task can consume it with:

```yaml
value: "{{tasks.choose-region.outputs.result}}"
```

In a steps template, the prefix is different:

```yaml
value: "{{steps.choose-region.outputs.result}}"
```

Use `result` when stdout is intentionally the value. Do not mix diagnostic logs and machine-readable output on stdout and then expect a clean parameter. Send logs to stderr or write a dedicated output file and use `valueFrom.path`.

## Steps Use `steps`; DAGs Use `tasks`

This naming difference applies to both parameters and artifacts:

| Caller type | Parameter reference | Artifact reference |
| --- | --- | --- |
| Steps | `{{steps.make.outputs.parameters.id}}` | `{{steps.make.outputs.artifacts.bundle}}` |
| DAG | `{{tasks.make.outputs.parameters.id}}` | `{{tasks.make.outputs.artifacts.bundle}}` |

A steps-based handoff looks like:

```yaml
- name: pipeline
  steps:
    - - name: make
        template: producer
    - - name: use
        template: consumer
        arguments:
          parameters:
            - name: id
              value: "{{steps.make.outputs.parameters.id}}"
          artifacts:
            - name: bundle
              from: "{{steps.make.outputs.artifacts.bundle}}"
```

Copying a snippet from a DAG into steps without changing `tasks` to `steps` is one of the most common unresolved-reference errors.

## Configure an Artifact Repository First

Argo's artifact documentation states that workflows using artifacts need an artifact repository. Supported backends include S3-compatible storage, GCS, Azure Blob Storage, Artifactory, OSS, HDFS, HTTP, and supported plugins, with capabilities varying by driver.

The effective repository is selected in this order:

1. an explicit `artifactRepositoryRef` on the Workflow;
2. a default artifact-repository ConfigMap in the workflow's namespace; or
3. the workflow controller's configured default.

An explicit reference keeps the Workflow independent of the controller-wide default:

```yaml
spec:
  artifactRepositoryRef:
    configMap: artifact-repositories
    key: team-a-s3
```

For an explicit `artifactRepositoryRef`, Argo looks for the referenced ConfigMap in the Workflow namespace first and then in the workflow controller namespace. Credential Secrets referenced by the repository are retrieved from the Workflow namespace. Ensure those resources exist in the applicable namespaces and that the workflow's execution identity can use the configured mechanism.

Prefer repository references and key-only artifacts over repeating endpoints and Secret selectors throughout every WorkflowTemplate. This reduces YAML duplication and keeps storage configuration separate from the pipeline contract.

## Pass an Artifact, Not Its Producer Path

The producer path says where Argo collects data in the producer:

```yaml
outputs:
  artifacts:
    - name: model
      path: /outputs/model.bin
```

The consumer path says where Argo places that artifact in the consumer:

```yaml
inputs:
  artifacts:
    - name: model
      path: /models/current.bin
```

Those paths do not need to match. The stable contract is the artifact name `model`; each template owns its internal filesystem layout.

An artifact can also be a directory:

```yaml
outputs:
  artifacts:
    - name: site
      path: /workspace/public
```

Argo packages output artifacts as tarballs with gzip compression by default. The `archive` strategy can change compression or disable archiving where the driver and desired object layout support it. Evaluate that deliberately for already compressed binaries and very large directories.

## Parameters Can Carry Artifact Metadata

Often the best interface uses both channels:

- artifact: the file or directory;
- parameters: checksum, media type, record count, schema version, partition date, or repository key.

The consumer can validate the artifact before using it. This is stronger than assuming that a successfully downloaded file has the expected semantic content.

For data already stored in an external system, pass a URI or object key as a parameter and let a purpose-built client retrieve it. Do not upload and download the same large object through Argo solely to communicate its location.

## Workflow Parameters Are Inputs, Not Task Outputs

Values under `spec.arguments.parameters` are globally scoped inputs and are referenced as:

```text
{{workflow.parameters.log-level}}
```

They are appropriate for submission-time configuration shared by many tasks:

```yaml
spec:
  arguments:
    parameters:
      - name: log-level
        value: INFO
```

An upstream task output remains a task or step output unless you deliberately export it. Do not expect writing a file named `log-level` to mutate `workflow.parameters.log-level`; workflow parameters are not mutable global variables.

Argo supports `globalName` for exporting selected output parameters into global workflow outputs. Use it sparingly. Direct task-to-task wiring makes data dependencies visible in the DAG and avoids hidden coupling through global names.

## Handle Conditional Producers Carefully

If a producing task is skipped by `when` or omitted because its `depends` expression is false, a normal consumer reference may have no value to resolve. Argo's current output-parameter documentation supports `valueFrom.default` on an output parameter for skipped or omitted producers.

More importantly, make control flow agree with data flow:

```yaml
- name: consume
  depends: "generate.Succeeded"
  template: consumer
  arguments:
    parameters:
      - name: id
        value: "{{tasks.generate.outputs.parameters.id}}"
```

If the consumer may run without the producer, define an explicit fallback contract and test that path. Do not rely on an unresolved placeholder becoming an empty string.

Artifacts can be declared optional where the field and use case support it, but the consumer must still behave correctly when the file is absent.

## Loops Need JSON for `withParam`

A task can generate a JSON array as a parameter and a downstream task can fan out with `withParam`:

```yaml
- name: process-one
  dependencies: [list-items]
  template: process-one
  withParam: "{{tasks.list-items.outputs.parameters.items}}"
  arguments:
    parameters:
      - name: item
        value: "{{item}}"
```

The `items` value must be valid JSON, such as:

```json
["alpha","beta","gamma"]
```

Shell output that merely looks list-like—`alpha beta gamma`, single-quoted Python representation, or newline-separated text—is not a JSON array. Generate it with a JSON library and keep unrelated logs off stdout if `outputs.result` supplies the value.

Looped tasks can produce aggregated parameters, but aggregation changes the shape of the output. Inspect the actual Workflow status and parse the documented JSON form rather than assuming a scalar.

## Artifact Storage Is Part of the Security Model

Artifacts can contain source code, customer data, models, build outputs, and logs. Apply controls at the repository:

- least-privilege bucket or container permissions;
- workload identity or short-lived credentials where supported;
- TLS and certificate validation;
- encryption and retention policies;
- per-namespace or per-tenant prefixes;
- audit logs; and
- artifact garbage collection matched to the backend's capabilities.

Do not pass secrets as parameters. Parameter values and workflow outputs can appear in Workflow resources, the UI, CLI output, events, or logs. Use Kubernetes Secrets and mount them or expose selected keys as secret-backed environment variables according to the workload's needs.

## When a Shared Volume Is Better

Artifacts are ideal for a durable handoff between pods and for outputs that should be downloadable or retained. A PVC or another shared data system may be better when:

- many tasks repeatedly read and write the same large working set;
- random access is required;
- artifact packing would dominate runtime; or
- an application already has a transactional external store.

A volume changes the contract: tasks share mutable state and must coordinate paths, writers, locking, and cleanup. Artifact handoffs are immutable in spirit and make producer/consumer edges easier to audit. Choose based on access pattern, not just file size.

## Debug a Broken Handoff Systematically

### Parameter Is Unresolved

Check:

- `steps` versus `tasks` prefix;
- producer task name;
- `outputs.parameters` name;
- consumer `inputs.parameters` name;
- the caller's argument `name` and `value`; and
- dependency or step ordering.

Names are case-sensitive and hyphens must match exactly.

### Output Parameter File Is Missing

Inspect the producer command and path. The file must be created in the main container filesystem at the declared `valueFrom.path`. A successful process that writes elsewhere still cannot produce the declared output.

### Artifact Upload Fails

Verify the effective artifact repository, endpoint DNS, TLS trust, bucket existence, credential Secret keys, workload identity, and write permissions. The producer's business command can succeed while output collection fails afterward, causing the node or Workflow to report an artifact error.

### Artifact Download Fails

Confirm that the upstream output was actually produced, the `from` reference names it correctly, and the consumer can read the same repository object with its configured credentials. Distinguish an object-not-found error from authorization and TLS failures.

### Consumer Sees an Empty or Unexpected Directory

Check whether the producer output path named a directory or file and whether the default tar/gzip archive strategy changed the expected layout. Make the producer write a single well-defined root and have the consumer validate its contents.

### `result` Is Truncated or Polluted

The documented result limit is 256 KB. Move large data to an artifact. If logs contaminate the value, emit logs on stderr or switch to an explicit output file.

## Validate the Contract Before Production

Lint the manifest against the Argo CLI version used with the cluster:

```bash
argo lint workflow.yaml
```

Submit to a test namespace and watch it:

```bash
argo submit \
  --namespace workflows-test \
  workflow.yaml \
  --watch
```

Then inspect the Workflow resource and node outputs:

```bash
argo get --namespace workflows-test <workflow-name> -o yaml
```

Test more than the success path:

1. producer succeeds with expected files;
2. producer exits successfully without the output path;
3. producer fails before output collection;
4. artifact storage rejects a write;
5. consumer cannot read the object;
6. conditional producer is skipped; and
7. payload approaches the parameter or storage limit.

A good Argo data contract makes every edge explicit: small values through named parameters, files through named artifacts, and shared mutable state through a deliberately managed volume or service.

## Official Documentation

- [Argo Workflows: Output parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/)
- [Argo Workflows: Artifacts](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/)
- [Argo Workflows: Workflow inputs and output wiring](https://argo-workflows.readthedocs.io/en/latest/workflow-inputs/)
- [Argo Workflows: Parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/parameters/)
- [Argo Workflows: Configure an artifact repository](https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/)
- [Argo Workflows: Artifact repository references](https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/)
- [Argo Workflows: Key-only artifacts](https://argo-workflows.readthedocs.io/en/latest/key-only-artifacts/)
- [Argo Workflows: Loops](https://argo-workflows.readthedocs.io/en/latest/walk-through/loops/)
- [Argo Workflows: Secrets](https://argo-workflows.readthedocs.io/en/latest/walk-through/secrets/)
- [Argo Workflows: Field reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
