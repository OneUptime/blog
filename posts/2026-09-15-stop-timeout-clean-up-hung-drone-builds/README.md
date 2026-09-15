# How to Stop, Timeout, and Clean Up Hung Drone Builds Without Orphaning Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Docker, Troubleshooting, DevOps

Description: Cancel hung Drone builds, set bounded execution times, and verify container cleanup without removing unrelated workloads.

A hung Drone build has two kinds of state: its recorded status on the server and the processes or containers executing it. Recovery is complete when both agree that the build has stopped. Restarting the runner immediately can make that reconciliation harder by removing the component responsible for cleanup.

## Identify the build and the runner

Record the repository, build number, pipeline name, last log timestamp, and runner host. Inspect the build before taking action:

```sh
drone build info acme/api 142
drone build ls acme/api
```

Distinguish a pending pipeline from one that started and stopped producing output. Pending work often needs runner eligibility or capacity investigation; a running test may instead be waiting on a database, deadlocked process, or external API.

Cancel the exact build through Drone:

```sh
drone build stop acme/api 142
```

The [stop command](https://docs.drone.io/cli/build/drone-build-stop/) supports pending and running builds and requires push access. Watch its status and runner logs afterwards. An accepted request is evidence that cancellation was requested, not proof that every external resource has disappeared.

## Bound future executions at two levels

Set a repository timeout appropriate to the longest legitimate build:

```sh
drone repo update acme/api --timeout=30m
```

Drone documents this setting in [repository updates](https://docs.drone.io/cli/repo/drone-repo-update/). Verify the saved repository configuration and exercise a deliberately slow test in a disposable repository. Treat the new timeout as configuration for subsequent work; do not depend on it to terminate a build that is already hung.

Also put deadlines on the operations most likely to block. For example, an integration probe using curl should have a connection deadline and an overall deadline:

```sh
curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 20 \
  https://test-api.example.com/health
```

An application-specific timeout gives a useful error close to the failure. The repository timeout remains the outer bound if the application fails to honor its own deadline. See curl's [timeout options](https://curl.se/docs/manpage.html#--max-time).

## Let the runner clean up before intervening

For a Docker runner, inspect containers on the identified runner host:

```sh
docker ps -a --no-trunc
docker inspect BUILD_CONTAINER_ID
```

Match creation time, image, labels, mounts, and network attachments against the known build. Container names and label details can vary by runner version, so inspect actual metadata instead of relying on a guessed label filter. Preserve a small diagnostic record without exporting environment variables or credential-bearing configuration.

If the container remains after Drone cancellation and the runner cannot recover, stop only the verified orphan:

```sh
docker stop --timeout=30 BUILD_CONTAINER_ID
docker rm BUILD_CONTAINER_ID
```

Docker first sends the configured stop signal and later forces termination if the deadline expires. That behavior is documented in [docker container stop](https://docs.docker.com/reference/cli/docker/container/stop/). Check that the container is no longer running before removing it. Inspect any associated network or volume before deciding whether it is also safe to remove; persistent caches and bind mounts may belong to other builds.

A host-wide prune is a poor incident response shortcut. It can delete useful stopped workloads or cached state and still leave application resources outside Docker untouched.

## Treat cleanup steps as best effort

A normal cleanup step can run on success and failure:

```yaml
- name: cleanup
  image: alpine:3.22
  commands:
    - ./ci/remove-test-resources.sh
  when:
    status:
      - success
      - failure
```

This uses Drone's [step conditions](https://docs.drone.io/pipeline/docker/syntax/conditions/). It does not guarantee execution after cancellation, timeout, runner loss, or a host crash. Give external test resources a build-specific owner and an expiration time, and use an independent cleanup process to reconcile expired resources.

For a Kubernetes runner, apply the same reasoning to the specific build pod. Confirm its namespace and identity, then use normal pod deletion and observe termination. Avoid force deletion as a first step: disappearing API state alone does not prove that a process on an unreachable node has stopped.

Close the incident only after checking the Drone status, runner capacity, remaining runtime resources, and any external side effects such as a partially completed deployment.
