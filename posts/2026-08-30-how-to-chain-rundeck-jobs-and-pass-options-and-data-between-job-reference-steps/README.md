# How to Chain Rundeck Jobs and Pass Options and Data Between Job Reference Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Automation, Job Scheduling

Description: Build a Rundeck orchestration job that passes typed options into child jobs and exports captured child data to later Job Reference steps.

---

Job Reference steps let a parent job reuse other saved jobs without copying their workflows. Inputs travel into a referenced job as option arguments. Output requires a deliberate data path: capture step output, normalize its scope, and export it from the child so the parent can pass it to the next reference.

Consider a three-job pipeline:

1. `Release/Build` creates an immutable artifact and release ID.
2. `Release/Deploy` takes that release ID and an environment.
3. `Release/Verify` tests the same release.

Create a fourth job, `Release/Orchestrate`, that contains the three Job Reference steps.

## Pass Parent Options into a Reference

Give the parent a required plain option named `environment`, configure its allowed environments, and enable **Enforced from values**. Give `Deploy` and `Verify` plain options with the same name. In the Job Reference argument field, use the same syntax as Rundeck's `run` command:

```text
-environment ${option.environment}
```

Literal and forwarded values can be mixed:

```text
-environment ${option.environment} -strategy rolling
```

If the child has a required option that is not present in the argument string, Rundeck uses its default when defined; otherwise the reference fails because the option is missing.

Secure types must remain aligned across the boundary. Rundeck supports Plain-to-Plain, Secure-to-Secure, and Secure Remote Authentication-to-the-same-type mappings. It intentionally does not let a Secure value populate a Plain child option, because that would defeat storage and visibility guarantees.

## Capture Data in the Child Job

Have the Build job emit a single machine-readable line after it has committed the artifact:

```bash
printf 'RUNDECK:DATA:release_id=%s\n' "$release_id"
```

Attach the **Key Value Data** log filter to that step. Its default pattern recognizes:

```text
^RUNDECK:DATA:(.+?)\s*=\s*(.+)$
```

The captured value becomes `data.release_id`. Do not capture secrets this way: captured data is execution context and can appear in logs or later expansions.

Scope matters. A workflow step runs once and captures Global Scope data. A node step runs per target and captures one value per node. If Build runs on a node named `builder01`, its value can be referenced as:

```text
${data.release_id@builder01}
```

For multiple nodes, `${data.release_id*}` collects values with commas by default. Only collect multiple values when order and delimiter are part of the contract; an artifact release ID should normally have one authoritative producer.

## Export Data Back to the Parent

Inside the referenced Build job, add a **Global Variable** workflow step after capture. Configure it conceptually as:

```text
Value: ${data.release_id@builder01}
Group: export
Name:  release_id
```

If capture was already in Global Scope, the value can be `${data.release_id}`. The special `export` group makes the value available to the parent after the Job Reference completes. The parent refers to it as:

```text
${export.release_id}
```

This Global Variable step is the crucial bridge. A data value that exists only in a child node scope is not a stable parent-job interface.

Now configure the Deploy Job Reference:

```text
-release_id ${export.release_id} -environment ${option.environment}
```

and the Verify reference the same way:

```text
-release_id ${export.release_id} -environment ${option.environment}
```

Both child jobs should define required plain `release_id` and `environment` options and validate them. Treat exported data like any other untrusted input at the child boundary.

## Choose Workflow or Node Job References

A Job Reference is a Workflow Step by default: it runs once per parent execution. That is appropriate for orchestration jobs that call a child which owns its own node dispatch.

When configured as a **Node Step**, the reference runs once for every node selected by the parent and may use node variables in its arguments:

```text
-target ${node.name} -environment ${option.environment}
```

Do not accidentally make a fleet-level deployment job a Node Reference under a fleet-level parent; that can multiply executions. Make one layer clearly responsible for node selection.

The reference can also override the child job's node filter and dispatch settings. Use that when the parent owns targeting, but keep the override narrow and review ACL node restrictions. Otherwise let the child own its saved filter.

## Handle Failure and Data Availability

A Workflow-Step Job Reference waits for the referenced workflow to finish. If it fails, the reference step fails. With the parent's default **Stop at the failed step** setting and no recovering error handler, a failed Build stops the sequence before `${export.release_id}` is consumed. **Run remaining steps before failing** or a recovering error handler can allow later references to run, so do not enable those behaviors on this path.

Do not provide a plausible default release ID that could deploy the wrong artifact. Make the child option required and configure its **Match Regular Expression** restriction to accept only your immutable ID format. Log the release ID and environment for audit, but never log Secure options.

Be aware that the Retry setting on a referenced job is not honored when it is invoked as a Job Reference. Configure job-level Retry on the directly invoked top-level orchestration job, or put operation-specific retry around the unstable operation, and make every repeated step idempotent.

## Cross-Project and Runner Caveats

References can target jobs in another project when authorization permits. If you use Enterprise Runners, which are available in Runbook Automation commercial products, Runner selection then matters. Current Rundeck documentation states that with automatic selection, the parent project's Runner selection governs the reference; with manual selection, selection is made per job and the referenced project's configuration is honored. Test this explicitly before using server-local paths or credentials across projects.

Version exported variable names as a small interface: document option names/types, export group keys, permitted formats, and failure semantics. Changing `release_id` to `artifact` is an API change for every parent job.

## Conclusion

Pass inputs to Job References with `-name ${option.name}`, capture output using a data log filter, and add a child Global Variable step that writes the value to the `export` group. The parent can then pass `${export.name}` to later references. Clear scope, type alignment, and one owner for node dispatch keep multi-job workflows predictable.

## Official Documentation

- [Built-in Node Steps: Job Reference](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html)
- [Built-in Workflow Steps: Global Variable](https://docs.rundeck.com/docs/manual/jobs/job-plugins/workflow-steps/builtin.html)
- [Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html)
- [Key Value Data Log Filter](https://docs.rundeck.com/docs/manual/log-filters/key-value-data.html)
- [Rundeck Job Options and Job References](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
