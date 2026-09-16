# How to Gate Buildkite Fork Builds Before Untrusted Pipeline Code Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Security, GitHub, CI/CD, DevOps

Description: Place a trusted Buildkite approval gate before checkout and pipeline upload, then isolate approved fork jobs from privileged resources.

---

A block step inside a pull request's `.buildkite/pipeline.yml` is too late to protect the job that checked out the pull request and ran its pipeline generator. Repository hooks and generator code may already have executed before that block was uploaded.

Put the gate in trusted initial pipeline configuration, before any agent command that consumes fork-controlled code. After approval, continue to run the fork in an environment designed for untrusted work.

## Establish the trusted entry point

Store the initial steps in Buildkite's pipeline settings or a centrally controlled configuration system that contributors cannot modify. A minimal example is:

```yaml
steps:
  - block: "Approve fork code execution"
    key: approve-fork
    if: build.pull_request_repo != "" && build.pull_request_repo != build.repository
    allowed_teams:
      - ci-maintainers

  - label: "Load reviewed pipeline"
    key: load-pipeline
    depends_on: approve-fork
    command: "buildkite-agent pipeline upload .buildkite/pipeline.yml"
    agents:
      queue: untrusted-tests
```

Replace `ci-maintainers` with the actual team slug and create the intended queue and access policy. The condition is the fork-detection form documented in Buildkite's [dynamic-pipeline security guidance](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines).

The block itself runs in Buildkite rather than requiring an agent to execute repository code. The explicit dependency keeps the uploader behind it. When the condition omits the block for a nonfork build, the skipped dependency is treated according to Buildkite's dependency rules.

If your integration represents repository identities differently, verify the condition with real build metadata. Do not substitute a branch-name heuristic for repository identity.

## Review everything that can run after checkout

Approval must cover more than the final test command. Inspect changes to `.buildkite/`, hook files, plugin references, dependency manifests, package-install scripts, Dockerfiles, and test helpers. Code fetched by those mechanisms can execute with the job's permissions.

The reviewer should approve the exact build commit. If the contributor pushes another revision, require review of the new build rather than treating an earlier approval as permanent trust in the branch.

The [block-step reference](https://buildkite.com/docs/pipelines/configure/step-types/block-step) explains `allowed_teams`. It restricts who can unblock that gate, but it does not limit what arbitrary code can do after the gate opens.

## Avoid an untrusted pre-gate generator

A common mistake is to start with `buildkite-agent pipeline upload` and rely on the uploaded YAML to add the approval step. To read that YAML, the initial job normally checks out the repository. Its hooks may execute before the upload command.

Another mistake is running a fork-controlled script to decide whether the fork needs approval. That script is itself the untrusted work the gate was meant to prevent.

If a sophisticated allowlist is necessary, evaluate it in a trusted service or a preinstalled trusted bootstrap whose inputs are treated as data. Keep credentials and policy outside the pull request. A simple static condition is easier to audit when it meets the requirement.

## Limit what the approved job can access

An approval is a human decision to run code, not a sandbox. Use ephemeral workers with restricted network access, no production credentials, and no writable shared release cache for fork tests.

A queue name is only a routing request unless platform controls enforce the boundary. A malicious pipeline can upload additional jobs with other agent selectors. Restrict the pipeline's cluster and queue access so it cannot select a privileged worker merely by changing YAML.

Buildkite's [security controls guide](https://buildkite.com/docs/pipelines/best-practices/security-controls) recommends disabling fork builds for public pipelines where they are unnecessary and isolating sensitive workloads. If forks are required, apply the isolation independently of the block step.

On Kubernetes, also restrict service accounts, pod security settings, volume mounts, and controller configuration. Do not let untrusted uploaded steps request an administrative service account or mount the host Docker socket.

## Protect secrets and downstream pipelines

Deny production secrets to fork contexts through the secret provider's policy, not only through an `if` condition in repository YAML. Apply the same principle to OIDC role trust and artifact publishing credentials.

Control which downstream pipelines can be triggered and which artifacts can be consumed across trust boundaries. An untrusted test artifact should not become a deployable release solely because it has a familiar filename.

Signed pipelines can help enforce approved command definitions, but the signing key and trusted generator must remain outside untrusted code. Signing a document produced by an unrestricted fork script without checking its contents simply authenticates the attacker's chosen commands.

## Test that nothing runs before approval

Create a harmless fork change that adds a marker to a repository hook and another to the pipeline generator. Start the build and leave it blocked. Confirm no agent job starts and neither marker appears.

Approve the exact revision and confirm the job runs only on the untrusted queue. Then attempt to request a privileged queue or secret from a staging fork test; the platform should deny access independently of the gate.

The desired boundary is visible and testable: trusted configuration decides when code may begin, reviewers approve a specific revision, and infrastructure policy limits what that code can reach afterward.
