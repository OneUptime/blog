# How to Upgrade Drone Server and Runners Without Stranding In-Flight Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Docker, High Availability, DevOps

Description: Upgrade Drone through measured runner draining, compatible server changes, verified backups, and explicit in-flight build checks.

A Drone upgrade must account for work already claimed by a runner. Replacing containers without checking that work can leave builds interrupted, partial deployments unreconciled, or server records waiting for a runner that no longer exists. Treat draining and verification as part of the upgrade itself.

The procedure below focuses on Docker runners. Kubernetes, exec, and other runners need their own tested termination behavior; do not assume every runner implements the same drain mechanism.

## Record the state you need to preserve

Before changing anything, record the server image digest, each runner's image digest and name, database configuration, extension versions, and current active builds. Preserve configuration securely without copying secret values into change notes.

For representative repositories:

```sh
drone build ls acme/api
drone build info acme/api 142
```

Record whether builds are pending, executing tests, or performing deployment side effects. A build that publishes an artifact may be safe to rerun; a partially completed database migration may need a separate recovery procedure.

Read the target release notes and check server/runner compatibility, database changes, authentication changes, and extension requirements. Back up the database using its supported method and test restoration. Drone documents its persistence choices in [database configuration](https://docs.drone.io/server/storage/database/).

## Verify how your runner drains

In the Docker runner source, termination cancels the polling context. The shared poller stops requesting new work while dispatched execution uses a separate context and the poller waits for active dispatches. This supports graceful draining in that implementation. Review the [Docker daemon](https://github.com/drone-runners/drone-runner-docker/blob/master/command/daemon/daemon.go) and [runner poller](https://github.com/drone/runner-go/blob/master/poller/poller.go) at the revisions used by your installed image before relying on it.

Prove the behavior in staging: start a bounded long-running test, send the normal termination signal, and confirm no further work is claimed while the existing build completes and reports its result.

A service manager can defeat graceful draining by sending a forced kill too soon. Docker's [stop command](https://docs.docker.com/reference/cli/docker/container/stop/) sends the configured stop signal, then forces termination after its timeout. Set that timeout above the maximum remaining execution time plus cleanup margin:

```sh
docker stop --timeout=2100 drone-runner-1
```

The 35-minute value is illustrative for builds bounded below that duration. Measure your own maximum and leave cleanup time. Keep the Drone server, Docker daemon, network, and secret extensions available while the runner drains. Do not stop the entire Compose stack as a substitute for draining one component.

## Replace one runner at a time

If capacity permits, start an updated canary runner with the same required type, platform, labels, and policy configuration. Limit its initial work to a controlled repository or routing group using administrator-managed restrictions.

Drain an old runner, confirm its active builds reached terminal states, and inspect its runtime resources for cleanup. Recreate it from the updated pinned image using the preserved configuration. A successful container start is only the first check: verify RPC connectivity and a full build through clone, tests, artifact handling, and completion reporting.

Do not use a guessed `DRONE_RUNNER_CAPACITY=0` as a universal live drain API. Capacity is a startup configuration value, and changing an environment variable outside a running process does not reconfigure it. Use a tested termination workflow or stop new build intake and wait for zero active work.

## Upgrade the server with a compatible database plan

For a single server, pause new triggers using a reversible, documented method, allow active work to finish, then stop the server and take the final consistent backup. Record webhook deliveries or events that need replay. Upgrade and verify the server before resuming normal intake.

For multiple servers, rolling replacement is appropriate only when the target release supports the required mixed-version and database-schema behavior. Drone's [HA documentation](https://docs.drone.io/server/ha/overview/) labels HA as beta; multiple replicas do not establish that every release can be rolled safely. Use a maintenance window when compatibility is uncertain.

A database migration can make an old server image incompatible with the new schema. A rollback plan may therefore require restoring a backup with a clearly understood data-loss boundary, rather than simply changing the image tag back.

## Close the upgrade with build-state reconciliation

Check the builds recorded at the beginning. Every running build should now have a credible terminal result; every intentionally pending build should either start or remain pending for a known reason. Check for leftover containers and any partially completed external deployment.

Run a fresh push build, a pull request test, a secret-dependent allowed build, and a cancellation test. Verify webhook processing, logs, status reporting, and runner capacity. Resume automatic triggers only after those paths work, then replay any deliberately held events without duplicating completed deployment actions.
