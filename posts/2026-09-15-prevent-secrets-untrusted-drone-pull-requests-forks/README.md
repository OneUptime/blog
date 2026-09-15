# How to Prevent Secrets from Reaching Untrusted Drone Pull Requests and Forks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Security, GitHub, DevOps

Description: Keep Drone pull request builds free of privileged credentials by enforcing secret permissions, event boundaries, and isolated execution.

A pull request author can change test code, package installation hooks, and build scripts. Any credential available to those processes can be copied out of the build, even if the pipeline never prints its value. Protect secrets at the point where they are granted to a build.

Drone [repository secrets](https://docs.drone.io/secret/repository/) are unavailable to pull requests by default. Preserve that default for registry writers, deployment tokens, signing keys, and other privileged credentials.

## Separate testing from publishing

Use a test pipeline without privileged secrets and a separate publishing pipeline that runs only for your intended trusted event:

```yaml
kind: pipeline
type: docker
name: pull-request-tests

trigger:
  event:
    - pull_request

steps:
  - name: test
    image: node:24-alpine
    commands:
      - npm ci
      - npm test

---
kind: pipeline
type: docker
name: publish-main

trigger:
  event:
    - push
  branch:
    - main

steps:
  - name: publish
    image: plugins/docker
    settings:
      repo: acme/api
      tags:
        - latest
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
```

Use an existing Node project with a lockfile and test script. Pin the publishing plugin to a reviewed version in your environment. The trigger syntax follows Drone's [pipeline filtering documentation](https://docs.drone.io/pipeline/docker/syntax/trigger/).

This layout makes the intended flow clear, but YAML conditions alone are not the security boundary. An attacker who controls the configuration can add another step. Secret-side permission settings must still prevent pull request access. Protect the main branch so a push event actually represents the review process you intend to trust.

## Audit every credential source

For each repository, review more than the list of repository secrets:

| Source | What to verify |
| --- | --- |
| Repository secrets | Pull request access remains disabled |
| Organization secrets | Scope is restricted to intended repositories and events supported by the installation |
| External secret extensions | Repository, event, branch, and fork checks deny unauthorized requests |
| Runner environment and mounts | No host credential files or privileged sockets reach untrusted jobs |
| Private image credentials | Read access grants only the images the build needs |
| Caches and artifacts | Trusted jobs do not execute unverified output written by untrusted jobs |

Vault is an especially useful counterexample to assuming all secret sources share the same defaults. Drone's [Vault integration documentation](https://docs.drone.io/secret/external/vault/) states that external secrets are available across repositories and events unless their access is restricted. Apply its repository and event filters explicitly. A successful repository-secret test does not verify the extension.

## Reduce the power of the execution environment

A secret-free pipeline can still be dangerous if it can access a host Docker socket, cloud metadata endpoint, privileged service account, shared deployment directory, or another build's cache. Use runners and network rules appropriate for untrusted code. Do not mark a repository trusted just to make an unfamiliar privilege error disappear.

If you do not need pull request builds, Drone exposes repository options to ignore them or forks. Confirm the behavior in your Git provider integration and your installed CLI using the [repository update reference](https://docs.drone.io/cli/repo/drone-repo-update/). Disabling execution is different from approving a particular revision; document which workflow maintainers should use.

A manual review must cover the exact commit that will execute. New commits after approval can change the code that receives privileges. Avoid workflows that copy an untrusted branch into a trusted event merely to obtain secrets.

## Verify denial without exposing a real credential

Create a disposable canary credential in a test repository. From a pull request, attempt only to detect whether the variable is nonempty and fail the test if it is. Do not print, encode, hash, or transmit the credential. Repeat the test for an external fork and a branch within the same repository.

Then confirm an allowed main-branch build receives the canary, and remove it. Repeat these checks after changing secret providers, runner configuration, or repository permissions. The desired evidence is denied access for untrusted events and successful access for the narrowly defined publishing path.

Log masking helps reduce accidental disclosure; it does not prevent a process from using a secret it already possesses. The reliable control is withholding the credential until the code, event, and execution environment meet the required trust level.
