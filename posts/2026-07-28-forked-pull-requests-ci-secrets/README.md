# How to Build Forked Pull Requests Safely When CI Tests Need Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, GitHub Action, GitLab CI, Secrets Management, Supply Chain Security

Description: Test forked contributions with a secretless untrusted lane and move privileged integration work behind reviewed, isolated, least-privilege boundaries.

---

A forked pull request is untrusted code. If CI gives that code a secret and executes it, the contributor can change a build script, dependency hook, test, or workflow command to send the secret elsewhere.

Secret masking is not a defense. It hides matching text in logs; it cannot stop code from encoding a credential, using it through an API, or reading data reachable with it.

The safe architecture separates untrusted computation from privileged operations.

## Use the Default Secretless Pull-Request Lane

On GitHub, a workflow triggered by `pull_request` from a fork does not receive Actions secrets. Its `GITHUB_TOKEN` is read-only by default unless an administrator enables broader fork permissions.

Keep this lane useful:

- compile and run unit tests;
- run formatters, linters, and static analysis;
- start local disposable databases or services;
- use public test fixtures;
- build packages without publishing;
- upload non-sensitive diagnostics under restricted permissions.

Set permissions explicitly:

```yaml
on:
  pull_request:

permissions:
  contents: read

jobs:
  untrusted-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: ./scripts/test-untrusted
```

Avoid persistent self-hosted runners with internal network access for untrusted code. An ephemeral runner with no trusted credentials and restricted egress reduces the damage available to a malicious test.

## Redesign Tests That "Need" Production Secrets

Classify each credential:

| Test need | Safer replacement |
| --- | --- |
| Database password | Disposable local database with generated throwaway credential |
| Cloud API | Emulator, fake server, or sandbox account with minimal scope |
| Private fixture | Sanitized non-sensitive fixture |
| Package download | Read-only proxy or public test package |
| Signing key | Verify unsigned package structure; sign only after merge |
| Deployment credential | Never provide to fork CI |

Many tests need authenticated behavior, not a valuable credential. Generate a per-run token for a local service. If an external sandbox is unavoidable, make the credential short-lived, resource-scoped, rate-limited, and unable to reach production.

Treat any credential exposed to fork code as compromised by design. Do not reuse it in trusted workflows.

## Do Not Execute Fork Code Under `pull_request_target`

GitHub's `pull_request_target` event runs in the context of the base repository and can have access to secrets and a more privileged token. It is suitable for carefully designed operations on pull-request metadata, such as labeling or commenting.

It is dangerous to check out the fork's head and run it:

```yaml
# Unsafe design: privileged event plus untrusted execution
on: pull_request_target
steps:
  - uses: actions/checkout@v6
    with:
      ref: ${{ github.event.pull_request.head.sha }}
  - run: npm ci
  - run: npm test
```

`npm ci` can execute lifecycle scripts controlled by the pull request. So can Makefiles, test configuration, compiler plugins, and code generators. "We only run tests" is still arbitrary code execution.

GitHub's secure-use guidance is explicit: if additional secret access is unnecessary, use `pull_request`; if `pull_request_target` checks out pull-request code, inspect it only as data and never execute it.

## Split Privileged Work into a Trusted Workflow

A common model has two lanes:

### Lane A: fork pull request

- runs untrusted source;
- has no repository or environment secrets;
- uses read-only permissions;
- produces test results and possibly an artifact;
- cannot publish or deploy.

### Lane B: reviewed privileged operation

- starts only after maintainer review or merge to a trusted branch;
- uses a workflow definition from trusted source;
- checks out trusted reviewed code;
- obtains the minimum credential;
- publishes, signs, or tests a protected integration.

Be careful with `workflow_run` handoffs. An artifact produced by Lane A is still attacker-controlled. Lane B must not download and execute it merely because the second workflow is trusted. Treat it as untrusted data, validate its format, and rebuild from reviewed source for privileged release work.

If a maintainer manually approves a fork workflow, GitHub still expects the maintainer to inspect proposed workflow changes. Approval authorizes running the contributor's workflow; it does not turn the code trustworthy or automatically provide ordinary Actions secrets.

## Use Environment Protection for Human-Gated Work

GitHub environment secrets are made available only to jobs referencing the environment and only after configured protection rules pass. That can be useful for a reviewed sandbox integration.

However, an approval gate cannot make arbitrary fork code safe to receive a production credential. The reviewer would need to audit every executable path, dependency, action, generated script, and build hook. Prefer running a trusted test harness against data or a deployed preview, not executing the fork with secrets.

Use short-lived identity federation instead of long-lived cloud keys when possible, with claims restricted to the repository, trusted ref, workflow, and environment. A token minted for an untrusted ref is still dangerous; claim policy is the boundary.

## Protect Caches and Artifacts

GitHub documents that fork pull requests can read base-branch caches. Never cache credentials or authenticated configuration. Restored cache data is untrusted and can influence later execution.

For low-trust workflows:

- use restore-only caching where appropriate;
- populate shared caches from trusted pushes;
- cache package downloads, not secret-bearing home directories;
- validate dependencies through committed locks;
- never allow a privileged workflow to execute a fork-produced cache or artifact.

Artifacts can also leak test data. Upload only files on an explicit allowlist, and inspect reports for tokens or private fixtures before making them broadly accessible.

## Apply the Same Trust Model on GitLab

GitLab fork merge-request pipelines normally run in the fork project with the fork's configuration, resources, and variables. Parent-project members can trigger a pipeline in the parent project, but GitLab warns that the fork configuration may contain malicious code and the parent pipeline uses parent resources and variables.

GitLab protected variables and protected runners are available to merge-request pipelines only under documented protected-branch and same-project conditions; fork merge requests cannot access those protected resources.

Before running a fork pipeline in the parent:

- review `.gitlab-ci.yml` and included configuration;
- ensure no protected or valuable variables are exposed;
- use trusted isolated runners;
- constrain permissions and network access;
- prefer a secretless test path.

## Defend Against Non-Secret Exfiltration Targets

Untrusted CI can attack more than explicit secrets:

- cloud instance metadata;
- credentials left on a self-hosted runner;
- Docker sockets;
- internal services reachable on the network;
- package-manager config in a home directory;
- writable cache or artifact repositories;
- an overly broad `GITHUB_TOKEN`;
- credentials embedded in repository history.

Use ephemeral runners, network segmentation, read-only tokens, safe checkout options, restricted action policies, and no privileged container sockets. Pin third-party actions to reviewed immutable SHAs in trusted workflows.

## A Review Checklist

Before enabling a fork workflow, answer:

1. Which exact code and configuration can the contributor modify?
2. Which credentials, tokens, caches, and services can the job access?
3. Is the runner ephemeral and isolated from internal networks?
4. Can a dependency install or build hook execute contributor code?
5. Can an uploaded artifact influence a later privileged workflow?
6. Can the job write repository content, releases, packages, or checks?
7. What happens after a maintainer clicks approve?

If untrusted code and valuable credentials meet in one process, redesign the boundary. The secure result is not a clever way to hide the secret; it is a pipeline where the fork can prove correctness without possessing it.

## Official Documentation

- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [Securely using `pull_request_target`](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
- [Events that trigger GitHub Actions workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Approving GitHub workflow runs from forks](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)
- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitLab merge request pipelines and forks](https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/)
- [GitLab CI/CD variable security](https://docs.gitlab.com/ci/variables/)
