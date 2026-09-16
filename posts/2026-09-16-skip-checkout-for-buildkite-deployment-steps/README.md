# How to Skip Repository Checkout for Buildkite Deployment Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Deployment, CI/CD, DevOps, Automation

Description: Use Buildkite checkout.skip for artifact-driven deployment jobs and account for agent versions, script locations, and override policy.

---

A deployment job that only invokes a preinstalled deployment tool or consumes a previously built artifact may not need the repository. Skipping checkout removes Git access and checkout latency from that job, provided its command does not secretly depend on files that checkout supplied.

Use the native checkout setting on current agents, then make the deployment's inputs explicit. The key design question is where its executable code and release identity come from.

## Use the native checkout setting

Current Buildkite pipeline YAML supports:

```yaml
steps:
  - label: "Verify deployment tooling"
    key: deployment-tooling
    command: "/opt/company/bin/deployctl --version"
    checkout:
      skip: true
    agents:
      queue: deployments
```

This example assumes the deployment queue's agent image contains `/opt/company/bin/deployctl`. Replace it with your actual preinstalled tool. The harmless version command is useful for a first test before introducing a real release operation.

The [Git checkout documentation](https://buildkite.com/docs/pipelines/configure/git-checkout) requires agent v3.136.0 or newer for the documented checkout YAML features. Check every eligible agent, not only the uploader. Mixed agent versions can make identical jobs behave differently.

Skipping checkout does not download a deployment script, install dependencies, or copy files from another job. It simply changes the checkout phase for this job.

## Make the release an explicit input

A useful deployment contract names the artifact's source build and verifies the artifact before using it. For a deployment in the same build, a stable producer key can identify the package:

```yaml
steps:
  - label: "Build release package"
    key: package
    command: "./scripts/package.sh"
    artifact_paths:
      - "dist/release.tar.gz"
      - "dist/release.tar.gz.sha256"

  - label: "Verify release package"
    depends_on: package
    command: "/opt/company/bin/verify-release-artifact"
    checkout:
      skip: true
    agents:
      queue: deployments
```

The preinstalled verifier can create a temporary directory, download the two `dist` paths with `--step package`, verify the checksum, and inspect the package manifest. Its implementation belongs in the controlled agent image or another trusted distribution mechanism.

Use an explicit build UUID for cross-build deployments. A branch name or “latest” artifact is insufficient when the deployment is meant to release a specific tested commit. The [artifact reference](https://buildkite.com/docs/agent/cli/reference/artifact) documents build and producer scoping.

## Remove hidden checkout dependencies

Check for commands such as `./deploy.sh`, `make deploy`, or `buildkite-agent pipeline upload` without an explicit file. Those usually depend on repository files. They will fail, or worse, accidentally use stale local files if a persistent directory happens to contain them.

Also inspect plugins. A non-vendored plugin is fetched independently, but it may still read a repository configuration file. A vendored plugin lives inside the repository and cannot be treated as available before checkout. Docker Compose commonly needs a Compose file, and package managers need their manifests.

A repository hook cannot be your reliable mechanism for enabling skipped checkout because the repository is not yet available. Use the step setting or controlled agent-side configuration for this decision. The [hook lifecycle](https://buildkite.com/docs/agent/hooks) explains which hooks exist before checkout.

## Understand override precedence

The agent resolves checkout settings alongside environment and startup configuration. A step-level setting overrides a pipeline-level setting in the normal configuration flow. An agent started with a forced skip setting can prevent a job from re-enabling checkout under protected override modes.

An `environment` or `pre-checkout` hook can also alter `BUILDKITE_SKIP_CHECKOUT` after earlier settings were resolved. If checkout still runs unexpectedly, inspect those hooks rather than repeatedly changing YAML indentation.

The [agent configuration reference](https://buildkite.com/docs/agent/self-hosted/configure) describes `checkout-override-mode`. Treat that setting as agent policy. Do not relax a centrally enforced mode just to fix one step without understanding why it was chosen.

## Support older agents deliberately

The established environment-variable form is:

```yaml
steps:
  - label: "Check deployment tooling"
    command: "/opt/company/bin/deployctl --version"
    env:
      BUILDKITE_SKIP_CHECKOUT: "true"
```

Use this only after verifying the installed agent supports the intended behavior and permits the override. Prefer upgrading to a consistent version and using the native key for new configuration.

Do not confuse an agent checkout option with a similarly named Docker plugin option. A plugin may implement its own hook or container behavior. Read the pinned plugin's documentation before assuming the settings are interchangeable.

## Validate on an empty worker

Run the harmless tooling check on an agent that has never checked out the repository. Confirm the logs show checkout was skipped and that the command can find every required executable and configuration file.

Then verify a package from a known test build, including a deliberate missing-artifact and checksum-failure case. The job should fail before release execution in both cases.

A checkout-free deployment is reliable when its tooling is provisioned independently, its release inputs are immutable and verified, and it succeeds without relying on any files left behind by previous jobs.
