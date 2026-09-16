# How to Rotate Drone's RPC Secret Across Servers and Runners with a Controlled Maintenance Window

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Security, CI/CD, Docker, DevOps

Description: Rotate the shared Drone RPC secret through runner draining, coordinated server replacement, staged reconnection, and a controlled recovery plan.

Drone's RPC secret authenticates communication between the server and its runners. Changing only one side creates a mismatch: containers may appear healthy while runners can no longer obtain work or report results reliably.

The [server setting](https://docs.drone.io/server/reference/drone-rpc-secret/) requires the same value on the server and runners. The [Docker runner setting](https://docs.drone.io/runner/docker/configuration/reference/drone-rpc-secret/) describes the corresponding shared secret. These interfaces expose one value, so plan a coordinated maintenance window instead of assuming an overlap period with two accepted keys.

## Map every consumer before the window

Inventory each server replica, every runner type, autoscaler launch template, Kubernetes Secret reference, Compose environment file, and recovery configuration containing `DRONE_RPC_SECRET`. Include powered-off or automatically created runners: an old template can reintroduce the mismatch after an apparently successful rotation.

Record image versions, configuration sources, and a harmless canary repository for each routing group. Keep a list of active builds and their external side effects. An interrupted test can often be rerun, while a partially applied deployment needs reconciliation.

Keep the RPC secret separate from `DRONE_DATABASE_SECRET`, provider OAuth credentials, and extension authentication secrets. Rotating those unrelated values at the same time makes failures harder to diagnose and can have different recovery requirements.

## Stop new execution and finish active work

Pause new triggers through your maintenance process and track events that must be replayed. If your deployed server supports the administrative `drone queue pause` command, verify its actual behavior first. A queue pause is not a promise that all existing work has stopped, and its state must not be assumed to survive a restart or propagate across every HA configuration.

Keep the old server and old secret available while runners drain. For a Docker runner whose graceful termination has been tested, allow a timeout longer than its remaining bounded build time:

```sh
docker stop --timeout=2100 drone-runner-1
```

Docker documents that [stop sends the stop signal and then forces termination after the timeout](https://docs.docker.com/reference/cli/docker/container/stop/). The example allows 35 minutes; choose your own limit from build policy. Confirm the runner has actually exited and its claimed builds have terminal results. Do not infer draining from a container being in a stopping state.

Repeat for the remaining runners. Kubernetes and exec runners need their own verified shutdown procedures. If a build cannot complete, cancel it deliberately, inspect the target for partial effects, and record the recovery action before proceeding.

## Stage the new value securely

Generate a fresh secret in a restricted administrative session, with command tracing disabled:

```sh
set +x
umask 077
openssl rand -hex 32 > /secure-config/drone-rpc-secret.next
```

The directory must already exist with appropriate access controls. Transfer the value into your secret manager or deployment configuration without printing it into logs. This file contains the value only; a Docker environment file instead requires a `DRONE_RPC_SECRET=value` entry. Do not pass a raw-value file to `--env-file`.

Update every server and runner definition, including autoscaling templates, while the runners remain stopped. Recreate the server processes from the updated configuration. Editing an environment file or Kubernetes Secret does not automatically change an environment variable inside an already running process.

For a multi-server deployment, prevent mixed-secret replicas from handling runner traffic. A load balancer distributing requests between old and new values can create intermittent authentication failures that resemble networking faults.

## Reconnect in controlled stages

Start one runner with the new value, confirm RPC authentication, and run the canary through checkout, a harmless command, and completion reporting. If a queue pause remains in effect, resume only when the server configuration and canary execution plan are ready.

Check the runner's type, platform, labels, capacity, and server address as well as its secret source. Avoid enabling broad request tracing that might expose authentication material during diagnosis. A typo in the host or TLS configuration will not be repaired by repeatedly generating new secrets.

Bring back the other routing groups and observe a representative build on each. Confirm that automatically provisioned runners also connect. Resume held triggers gradually, checking that canceled or completed deployments are not duplicated.

## Close the recovery path deliberately

Retain the previous secret only for the planned recovery period, with restricted access. If the new value cannot be deployed consistently, either finish the coordinated update or restore the old value across all participants while work remains stopped. Do not leave half the fleet on each value.

When rotation follows a suspected disclosure, reconnecting with the compromised value is not an acceptable routine fallback; keep the affected execution path stopped until the new configuration works.

After successful canaries, retire the old secret from templates and secret-manager versions according to policy. Record which runner groups were verified and whether any held events remain. The useful success criterion is complete builds under the new secret across the whole fleet, not merely a restarted server.
