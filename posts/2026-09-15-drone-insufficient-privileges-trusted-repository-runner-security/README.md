# “Insufficient Privileges to Use Privileged Mode” in Drone: Trusted Repositories and Runner Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, Security, CI/CD, Troubleshooting

Description: Understand Drone privileged-mode restrictions, the trusted repository flag, administrator responsibilities, and isolation for elevated build workloads.

An insufficient-privileges error can occur before your build command runs. Drone is rejecting a restricted pipeline setting, rather than reporting a missing Linux capability inside an already-running process.

The quoted error is documented in Drone's older 0.8 documentation. Current Docker-pipeline documentation still restricts explicit `privileged: true` to trusted repositories, although exact error wording depends on the installed version. [Historical error reference](https://0-8-0.docs.drone.io/error-insufficient-privileges/), [current privileged-step documentation](https://docs.drone.io/pipeline/docker/syntax/steps/#privileged-mode)

## Find the setting that requested elevated access

Inspect the configuration used by the failing build, including any generated YAML. Look for explicit privileged steps, host-volume mounts, and runner-injected configuration.

For example, this step requests privileged container execution:

```yaml
kind: pipeline
type: docker
name: elevated-check

steps:
  - name: hardware-check
    image: alpine:3
    privileged: true
    commands:
      - ./ci/hardware-check.sh
```

The command is a project-specific example, not a reason by itself to grant privilege. Determine what it actually requires. A copied `privileged: true` line is often unnecessary for compilation or ordinary unit tests.

Removing an unnecessary request is a complete fix. If the workload genuinely requires host-level access, the repository and execution environment need an explicit trust decision.

## Understand what the trusted flag permits

Drone administrators can enable or disable a repository's trusted flag. That flag permits privileged pipeline capabilities, including privileged containers and host-machine volumes. Repository administrator access in the Git provider is a different role from Drone system administrator access. [Drone administrator capabilities](https://docs.drone.io/server/user/admin/)

An authorized Drone administrator can update the selected repository:

```bash
drone repo update --trusted=true acme/internal-image-builder
drone repo info acme/internal-image-builder
```

The CLI documents the trusted option, but the server enforces whether the caller can change that capability. Do not grant system-wide administrator access merely to work around a single repository's build requirement. [Drone repository update](https://docs.drone.io/cli/repo/drone-repo-update/)

Trusted status is not a sandbox. A malicious Dockerfile, build script, dependency installation hook, or modified pipeline can execute with the capabilities the environment provides. Drone explicitly warns that privileged mode effectively grants root access to the host. Review who can change code executed by this repository, including PR behavior and generated configurations.

## Isolate elevated workloads on their own runners

For a dedicated runner serving one trusted repository, use runner-side restrictions in addition to routing labels:

```dotenv
DRONE_LIMIT_TRUSTED=true
DRONE_LIMIT_REPOS=acme/internal-image-builder
DRONE_RUNNER_LABELS=pool:elevated-builds
```

The pipeline's matching routing block is:

```yaml
node:
  pool: elevated-builds
```

`DRONE_LIMIT_TRUSTED` limits the runner to trusted repositories, while `DRONE_LIMIT_REPOS` limits the repository set. These are stronger controls than a label that repository authors can copy into their own YAML. Keep the elevated runner away from production credentials, unrelated workloads, and broad internal network access. [Trusted-runner restriction](https://docs.drone.io/runner/docker/configuration/reference/drone-limit-trusted/), [repository restriction](https://docs.drone.io/runner/docker/configuration/reference/drone-limit-repos/)

Inspect runner-wide injected volumes and privileged-image configuration as well. A repository may receive sensitive host access through administrator configuration even if its YAML has no explicit mount.

## Do not confuse privileged plugin images with general permission

The Docker runner has a `DRONE_RUNNER_PRIVILEGED_IMAGES` setting for images that are started privileged by default. This is a separate mechanism from a repository explicitly requesting `privileged: true`. Review the effective list for your deployed runner version rather than assuming every image with a familiar name is approved. [Privileged image configuration](https://docs.drone.io/runner/docker/configuration/reference/drone-runner-privileged-images/)

Adding an arbitrary image to that list is a security-policy change, not a harmless substitute for repository trust. Pin and review allowed images, protect the registry that serves them, and keep the list small.

Likewise, mounting `/var/run/docker.sock` into a build step can grant control of the host Docker daemon even without a privileged flag. Docker documents the daemon control surface as highly sensitive. [Docker Engine security](https://docs.docker.com/engine/security/)

## Verify capability and placement together

Run a controlled build and confirm it executes on the dedicated runner with the expected repository restrictions. Test the required operation rather than merely observing that YAML validation now passes.

Also verify that an unrelated repository cannot use that runner and that untrusted contributions cannot reach the elevated workflow. If the workload later moves to a builder with fewer host privileges, remove obsolete privileged settings and revisit the trusted flag. The durable repair is a documented capability requirement with an appropriately isolated executor.
