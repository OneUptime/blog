# How to Generate Reusable Drone Pipelines with Jsonnet and Validate the Rendered YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Jsonnet, CI/CD, Testing, DevOps

Description: Build reusable Drone pipeline templates with Jsonnet and check the rendered pipeline names, images, and execution behavior.

Jsonnet is useful when several Drone pipelines differ in a few deliberate parameters. It lets you express those differences once, but the generated YAML is still the configuration that reviewers and runners must understand. Test that output as a first-class artifact.

Drone supports [Jsonnet configurations](https://docs.drone.io/pipeline/scripting/jsonnet/) and provides a CLI command to render them. You can either commit generated YAML or configure a self-hosted server to read Jsonnet directly.

## Start with an explicit template

For a Node repository with a lockfile and test script, save this as `.drone.jsonnet`:

```jsonnet
local testPipeline(version) = {
  kind: 'pipeline',
  type: 'docker',
  name: 'node-' + version,
  trigger: {
    event: ['push', 'pull_request'],
  },
  steps: [
    {
      name: 'test',
      image: 'node:' + version + '-alpine',
      commands: ['npm ci', 'npm test'],
    },
  ],
};

[testPipeline(version) for version in ['22', '24']]
```

This generates two independent pipelines. The function receives only the part that varies. Keep deployment credentials, routing decisions, and trust rules explicit instead of hiding them behind a broad collection of optional parameters.

Render the array as a YAML document stream:

```sh
drone jsonnet --source=.drone.jsonnet --stream --format --stdout > rendered.yml
```

The `--stream` option is necessary for the intended multi-document output; its behavior is documented in the [Jsonnet CLI reference](https://docs.drone.io/cli/drone-jsonnet/). Review both documents, including the trigger in each. A correctly rendered array is not evidence that the pipelines execute in sequence; independent documents can run concurrently.

## Check the rendered structure

A YAML parser catches serialization mistakes. Add assertions that capture the requirements of this specific template. For example, install PyYAML into your chosen development environment and run:

```python
from pathlib import Path
import yaml

pipelines = list(yaml.safe_load_all(Path("rendered.yml").read_text()))
expected = {"node-22": "node:22-alpine", "node-24": "node:24-alpine"}
assert len(pipelines) == len(expected)
assert {p["name"] for p in pipelines} == set(expected)
for pipeline in pipelines:
    assert pipeline["kind"] == "pipeline"
    assert pipeline["type"] == "docker"
    assert pipeline["trigger"]["event"] == ["push", "pull_request"]
    assert len(pipeline["steps"]) == 1
    step = pipeline["steps"][0]
    assert step["image"] == expected[pipeline["name"]]
    assert step["commands"] == ["npm ci", "npm test"]
```

These assertions verify the template's intended matrix; they are not a complete Drone schema or security validator. Expand them when adding dependencies, privileged steps, or secret references. Pin the parser and rendering tools in the environment that checks generated files.

Use the [Jsonnet language specification](https://jsonnet.org/ref/spec.html) when changing object inheritance or field visibility. Those features can affect the manifested result in ways that are less obvious than a simple function call.

## Execute representative rendered pipelines

For Docker pipelines, run the generated file locally:

```sh
drone exec --pipeline=node-22 --event=push --branch=main rendered.yml
drone exec --pipeline=node-24 --event=pull_request --branch=main rendered.yml
```

Choose a clean checkout and disposable test credentials. Local execution checks commands and images but does not reproduce webhook processing, server extensions, or repository permissions. Follow with a controlled server build for each relevant event path.

## Choose one source-of-truth workflow

For generated YAML, keep Drone's repository configuration path set to `.drone.yml`, regenerate that file through a repeatable command, and fail your normal review checks when committed YAML differs from fresh output. This approach also lets reviewers inspect exactly what will execute.

For server-side Jsonnet, an administrator must enable `DRONE_JSONNET_ENABLED=true`, and the repository configuration path must point to `.drone.jsonnet`. Drone's [server setting](https://docs.drone.io/server/reference/drone-jsonnet-enabled/) says this mode is disabled by default and intended for trusted environments. Test imported library availability and rendering behavior on your actual server before depending on locally available files.

Keep shared template versions immutable. A change to a central function can alter every consumer's pipeline, so review the rendered differences across representative repositories before rolling it out broadly.
