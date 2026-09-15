# Drone Pipelines Pending: Check Runner Labels, Platform, Type, and Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Docker, Troubleshooting, DevOps

Description: Diagnose a pending Drone pipeline by checking runner connectivity, pipeline type, platform, label matching, and available execution slots.

A pending pipeline has not necessarily reached a runner. Restarting Docker or increasing concurrency will not help when every connected runner is ineligible for that pipeline. First establish whether the job is waiting for a matching execution environment or for space on an otherwise eligible runner.

This guide covers self-hosted Drone with the Docker runner. A Kubernetes pod that has already been created and remains Pending requires a separate Kubernetes scheduling investigation.

## Identify the stage that is actually waiting

Record the repository, build number, pipeline name, commit, and time the pipeline entered the queue. A build can contain several pipelines, so investigate the individual pipeline rather than relying only on the overall build badge.

Check the runner logs:

```bash
docker logs --since 15m drone-runner
```

Replace `drone-runner` with your container name. The runner installation guide shows a successful remote-server ping as the initial connectivity check. If RPC authentication or connection attempts fail, repair that connection before investigating scheduling. A successful ping establishes communication; it does not prove eligibility for this job. [Drone runner installation](https://docs.drone.io/runner/docker/installation/linux/)

Also check whether an earlier pipeline dependency or an approval requirement is holding the build. Queue capacity cannot resolve either condition.

## Compare the pipeline with the runner

Use a small, explicit configuration to make the requirements visible:

```yaml
kind: pipeline
type: docker
name: routing-check

platform:
  os: linux
  arch: amd64

node:
  pool: general
  region: london

steps:
  - name: identify
    image: alpine:3
    commands:
      - uname -s
      - uname -m
```

The relevant runner configuration would include:

```dotenv
DRONE_RUNNER_LABELS=pool:general,region:london
DRONE_RUNNER_CAPACITY=2
```

Compare these dimensions independently:

| Dimension | What to check | Typical mismatch |
|---|---|---|
| Pipeline type | `type: docker` has an available Docker runner | Only an Exec runner is installed |
| Operating system | Pipeline `platform.os` matches the execution environment | Windows pipeline, Linux-only fleet |
| Architecture | Pipeline `platform.arch` matches the execution environment | ARM runner, implicit amd64 pipeline |
| Labels | Pipeline `node` matches the runner's configured labels | Runner has an additional unmatched label |
| Capacity | An eligible runner has an available pipeline slot | Every eligible runner is occupied |

Drone defaults an unspecified Docker pipeline platform to `linux/amd64`. Setting `platform` selects where execution should occur; it does not convert binaries or install CPU emulation. [Drone platform configuration](https://docs.drone.io/pipeline/docker/syntax/platform/)

Pay particular attention to label direction. Drone's routing documentation says the pipeline must match **all runner labels**; matching only a subset is insufficient. The YAML key in the documented example is singular `node`, although the surrounding prose calls it a nodes section. Keep a small, deliberate label set and make the match explicit. [Drone routing](https://docs.drone.io/pipeline/docker/syntax/routing/), [runner label configuration](https://docs.drone.io/runner/docker/configuration/reference/drone-runner-labels/)

## Check restrictions beyond labels

A runner can also be restricted to selected repositories or trusted repositories. Inspect the actual deployed configuration, not an old Compose file. For a dedicated release runner, a matching `node` block alone is insufficient if the repository is outside the allowed repository list. [Repository restrictions](https://docs.drone.io/runner/docker/configuration/reference/drone-limit-repos/), [trusted-repository restrictions](https://docs.drone.io/runner/docker/configuration/reference/drone-limit-trusted/)

When comparing environment settings, select only the non-secret fields you need. Dumping the whole container environment can expose the RPC secret or other credentials.

## Increase capacity only after proving a capacity bottleneck

`DRONE_RUNNER_CAPACITY` limits concurrent **pipelines**, with a documented default of two. It does not describe the number of steps or the amount of memory available. A pipeline with parallel steps and services can consume considerably more resources than a simple sequential pipeline. [Runner capacity](https://docs.drone.io/runner/docker/configuration/reference/drone-runner-capacity/)

Check CPU, memory, disk, and the existing workload before raising this limit. If two long builds occupy a runner and the next eligible pipeline starts as soon as one completes, that is evidence of a capacity queue. If the runner is idle and the pipeline never starts, revisit eligibility.

After correcting a configuration mismatch, start a controlled build with the same routing requirements. Confirm the intended runner accepts it, the identity step reports the expected platform, and the original workload starts. Record queue wait separately from execution time so a future capacity problem is distinguishable from a routing regression.
