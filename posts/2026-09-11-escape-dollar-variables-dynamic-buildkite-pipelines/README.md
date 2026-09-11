# How to Escape Dollar Variables in Dynamic Buildkite Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, YAML, Bash, Troubleshooting

Description: Control shell, YAML, and Buildkite interpolation so dynamically uploaded commands expand variables at the intended stage.

---

A dynamic Buildkite command can pass through three interpreters before it runs: the shell generating the document, the YAML parser, and Buildkite's environment interpolation. The job's shell then performs its own expansion. A dollar sign intended for the final job can disappear during an earlier pass.

The reliable approach is to decide which variables belong to the upload job and which belong to the eventual execution job. Then make each layer preserve the characters required by the next layer.

## Separate upload time from job runtime

Suppose the uploaded file contains:

```yaml
steps:
  - label: "Show selected region"
    command: 'printf "%s\n" "$DEPLOY_REGION"'
    env:
      DEPLOY_REGION: "eu-west-1"
```

The single quotes are YAML syntax. They do not disable the agent's interpolation. If the upload environment has a different `DEPLOY_REGION`, it can be substituted before this step ever receives its own `env` values.

Use two dollar signs in the uploaded YAML to preserve a variable for runtime:

```yaml
steps:
  - label: "Show selected region"
    command: 'printf "%s\n" "$$DEPLOY_REGION"'
    env:
      DEPLOY_REGION: "eu-west-1"
```

After agent interpolation, the stored command contains one dollar sign. The executing shell expands that remaining reference using the step's environment. The [pipeline upload reference](https://buildkite.com/docs/agent/cli/reference/pipeline) documents both `$$` and `\$` escaping; using `$$` avoids some YAML backslash complications.

## Protect a shell-generated heredoc

A pipeline generator often uses `cat`. Quote the heredoc delimiter so the generator shell does not expand its contents:

```bash
#!/usr/bin/env bash
set -euo pipefail

cat <<'YAML' | buildkite-agent pipeline upload
steps:
  - label: "Runtime identity"
    command: |
      printf 'Job: %s\n' "$$BUILDKITE_JOB_ID"
      printf 'Region: %s\n' "$$DEPLOY_REGION"
    env:
      DEPLOY_REGION: "eu-west-1"
YAML
```

Here the quoted delimiter preserves `$$` for the agent. With an unquoted delimiter, the generating Bash process interprets `$$` as its own process ID. The eventual command might contain something like `4812BUILDKITE_JOB_ID`, which no longer resembles a variable reference.

The `|` following `command:` is YAML's literal block marker. The pipe between `cat` and `buildkite-agent` is a shell pipeline. They have different purposes even though they use the same character.

## Use one expansion strategy per document

If every variable reference should survive until job execution, disable interpolation:

```bash
buildkite-agent pipeline upload --no-interpolation .buildkite/runtime.yml
```

Then write ordinary shell references in `.buildkite/runtime.yml`:

```yaml
steps:
  - label: "Runtime region"
    command: 'printf "%s\n" "$DEPLOY_REGION"'
    env:
      DEPLOY_REGION: "eu-west-1"
```

Do not keep `$$DEPLOY_REGION` when switching this file to `--no-interpolation`. The final shell would see two dollar signs and expand its process ID. Changing the upload option changes the required source syntax.

Disabling interpolation also means `${BUILDKITE_BRANCH}` inside a label remains literal text. If labels need upload-time values while commands need runtime values, either use the normal interpolation mode with escaped command references or build the labels explicitly in a serializer.

## Serialize values rather than inserting raw YAML

Values such as release messages may contain quotes, colons, newlines, or dollar signs. Use JSON, which the uploader also accepts:

```python
import json
import os

print(json.dumps({
    "steps": [{
        "label": "Inspect " + os.environ["RELEASE_NAME"],
        "command": 'printf "%s\\n" "$RELEASE_NAME"',
        "env": {"RELEASE_NAME": os.environ["RELEASE_NAME"]},
    }]
}))
```

Save this as `.buildkite/generate.py`, then execute:

```bash
RELEASE_NAME='release $5: candidate' \
  python3 .buildkite/generate.py > /tmp/generated-pipeline.json
buildkite-agent pipeline upload --no-interpolation /tmp/generated-pipeline.json
```

The release name is data in the environment map, while the command remains fixed. This avoids turning a value into shell syntax. For a production upload wrapper, create a unique temporary file and clean it up after upload.

## Check the intermediate document

Use a harmless test value to inspect the exact result:

```bash
DEPLOY_REGION=upload-side \
  BUILDKITE_AGENT_ACCESS_TOKEN=local-dry-run-placeholder \
  buildkite-agent pipeline upload --dry-run .buildkite/pipeline.yml
```

The placeholder accommodates agent v4.0.3's access-token requirement for local `--dry-run`; it cannot authenticate a real upload. For the escaped example, expect the resulting command to contain `$DEPLOY_REGION`, not `upload-side`, while the step's `env` still declares `eu-west-1`. In the no-interpolation example, add `--no-interpolation` to the dry run too. The preview must use the same options as the real upload.

Also inspect a generated document before it reaches the agent. If its dollar signs already became process IDs, the heredoc or generator is responsible. If the document is correct but the dry run replaces them too early, fix the agent interpolation layer. If the stored command is correct but execution is wrong, check the job shell and its environment.

## Watch YAML quoting and required inputs

A backslash before `$` is not a valid general escape in a double-quoted YAML string. Prefer single-quoted YAML strings, literal blocks, or the double-dollar syntax. Keep shell quotes around runtime values to prevent word splitting.

For intentional upload-time inputs, `${VAR?}` can make an unset variable reject the upload. This is useful for a required deployment target, but a value that must also be nonempty should receive an explicit validation check in the generator.

## Conclusion

Treat pipeline generation, agent interpolation, and job execution as separate stages. Quoted heredocs preserve source text, `$$` defers variables through normal uploads, and `--no-interpolation` makes serialized documents easier to reason about.

## Official Documentation

- [Pipeline interpolation and escaping](https://buildkite.com/docs/agent/cli/reference/pipeline)
- [Dynamic pipeline generation](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Writing build scripts](https://buildkite.com/docs/pipelines/configure/writing-build-scripts)
