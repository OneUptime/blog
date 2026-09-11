# How to Centralize Buildkite Configuration Across Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Automation, Git, DevOps

Description: Share versioned Buildkite configuration through pinned templates and plugins while keeping repository inputs and rollout control explicit.

---

Copying the same Buildkite steps across repositories creates drift. A queue migration or test-command fix must be applied repeatedly, and it becomes difficult to tell which repositories use which behavior.

Centralization works best when the shared configuration has a versioned contract. Keep repository-specific values small and visible, pin the shared revision, and make upgrades ordinary reviewed changes. A central file fetched from a moving branch is harder to reproduce than a versioned dependency.

## Decide what should be shared

Separate three kinds of reuse. Shared pipeline configuration defines jobs and dependencies. Plugins package actions that run during job lifecycle hooks. Repository scripts implement application-specific build and test behavior.

A shared test step can call a conventional repository script such as `.buildkite/scripts/test.sh`, while each repository owns that script. This avoids putting every application's test command into one central generator.

For organizations using the relevant plan, Buildkite also provides [pipeline templates](https://buildkite.com/docs/pipelines/governance/templates). Those templates define static step configurations, and updating a template affects its assigned pipelines. Dynamic uploads can be part of that static bootstrap when runtime variation is needed.

## Store a versioned pipeline contract

Create a shared configuration repository with a file such as `templates/standard-tests.json`:

```json
{
  "steps": [
    {
      "label": "Repository tests",
      "key": "shared-tests",
      "command": "bash .buildkite/scripts/test.sh"
    }
  ]
}
```

Each consuming repository stores a small `.buildkite/shared-ci.json`:

```json
{
  "repository": "git@github.com:YOUR-ORG/shared-ci.git",
  "commit": "REPLACE_WITH_REVIEWED_40_CHARACTER_COMMIT_SHA",
  "template": "templates/standard-tests.json",
  "queue": "linux-tests"
}
```

Replace the repository and commit with your actual reviewed values. The commit is the reproducibility boundary. A release tag can be useful for discovery, but the consuming repository should record the immutable revision it approved.

The template contract requires the consumer to provide `.buildkite/scripts/test.sh`. Document its working directory, available tools, expected output, and failure behavior. A shared template without a clear consumer contract merely moves hidden assumptions into another repository.

## Fetch and compose the pipeline

A Python bootstrap can validate the configuration, check out the pinned revision, and customize the queue:

```python
import json
import re
import subprocess
import tempfile
from pathlib import Path

config = json.loads(Path(".buildkite/shared-ci.json").read_text())
commit = config["commit"]
if not re.fullmatch(r"[0-9a-f]{40}", commit):
    raise SystemExit("Shared CI commit must be a full SHA-1 commit ID")
if config["template"] != "templates/standard-tests.json":
    raise SystemExit("Unsupported shared template")
if not re.fullmatch(r"[a-z0-9-]+", config["queue"]):
    raise SystemExit("Invalid queue key")

with tempfile.TemporaryDirectory() as temp:
    checkout = Path(temp) / "shared-ci"
    subprocess.run([
        "git", "clone", "--no-checkout", config["repository"], str(checkout)
    ], check=True)
    subprocess.run([
        "git", "-C", str(checkout), "checkout", "--detach", commit
    ], check=True)
    actual = subprocess.check_output([
        "git", "-C", str(checkout), "rev-parse", "HEAD"
    ], text=True).strip()
    if actual != commit:
        raise SystemExit("Shared CI revision mismatch")
    pipeline = json.loads((checkout / config["template"]).read_text())
    for step in pipeline["steps"]:
        step["agents"] = {"queue": config["queue"]}
    print(json.dumps(pipeline))
```

This example targets conventional SHA-1 Git repositories. It loads data from the shared checkout rather than importing Python code, although the resulting pipeline still executes the trusted commands that data defines. Restrict write access to the shared repository accordingly.

Git clone and checkout messages normally go to standard error. Keep any additional diagnostic output there too, because standard output is the generated pipeline document.

## Upload through a small wrapper

Save the generator as `.buildkite/generate-shared.py`, then call it from:

```bash
#!/usr/bin/env bash
set -euo pipefail

pipeline_file=$(mktemp)
trap 'rm -f "$pipeline_file"' EXIT
python3 .buildkite/generate-shared.py > "$pipeline_file"
buildkite-agent pipeline upload --no-interpolation "$pipeline_file"
```

The bootstrap agent needs read access to both repositories. Use your established SSH or HTTPS credential mechanism and host verification. Authentication to the application's repository does not automatically grant access to a private shared repository.

The generated test job runs against the application's normal checkout, where the conventional test script must exist. The temporary shared checkout is not transferred to execution agents.

## Use plugins for repeated job behavior

If the shared requirement is authenticating a registry, configuring a container, or collecting results, a plugin may be the better interface. Buildkite's [plugin guide](https://buildkite.com/docs/pipelines/integrations/plugins/using) documents step-level configuration and recommends pinning a tag or commit.

Avoid a plugin that silently downloads a moving pipeline from the network. Pin the plugin and any configuration dependency it loads. Also consider hook ordering when combining plugins; cleanup hooks and setup hooks have lifecycle semantics beyond their visual placement in YAML.

## Roll out changes with evidence

Create a shared configuration change, test it on a representative consumer, then update pinned revisions through reviewed pull requests. Record which consumers still use older revisions so a migration can be completed intentionally.

Preview the generated document before upload and compare it with the old version. In real builds, test the script contract, queue routing, artifact expectations, and failure propagation. A valid JSON file alone does not prove those integration points work.

Keep a known previous revision available for rollback. Centralization should make policy consistent while preserving a clear answer to which shared code produced each build.

## Conclusion

Treat shared CI configuration as a versioned dependency with a small consumer contract. Pin revisions, compose repository inputs explicitly, and roll changes through representative test builds before broad adoption.

## Official Documentation

- [Buildkite dynamic pipelines](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Using and pinning plugins](https://buildkite.com/docs/pipelines/integrations/plugins/using)
- [Pipeline templates](https://buildkite.com/docs/pipelines/governance/templates)
- [Git clone options](https://git-scm.com/docs/git-clone)
