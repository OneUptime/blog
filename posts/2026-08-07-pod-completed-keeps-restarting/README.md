# Why Does a Long-Running Pod Exit as `Completed` and Keep Restarting?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pods, Container Lifecycle, RestartPolicy, CrashLoopBackOff, Troubleshooting

Description: Diagnose containers that exit successfully but restart forever, fix service entrypoints, and choose a Job when completion is intentional.

---

`Completed` does not mean Kubernetes decided that a long-running service was healthy. It normally reports that a container process terminated with exit code `0`. If the container follows the Pod-level `restartPolicy: Always`—the default, and the only Pod-level policy allowed for Deployments—the kubelet starts that container again even though the exit was successful.

That produces a confusing loop: the previous container state says `Completed`, the restart count rises, and a sufficiently fast loop may be displayed as `CrashLoopBackOff`. The right fix depends on intent. A service process must remain in the foreground. A process that is supposed to finish belongs in a Job or CronJob, not a Deployment.

## Separate Pod Phase from Container State

Kubernetes reports status at two different levels:

- A **container state** is `Waiting`, `Running`, or `Terminated`. A terminated container records a reason, exit code, signal, and timestamps. `reason: Completed` normally accompanies `exitCode: 0`.
- A **Pod phase** is a coarse summary such as `Running`, `Succeeded`, or `Failed`. A Pod is `Succeeded` only when every container terminated successfully and none will be restarted.
- The `STATUS` column printed by `kubectl get pods` is a human-oriented display. Values such as `Completed` and `CrashLoopBackOff` are not additional Pod phases.

When a container follows the Pod-level `restartPolicy: Always`, an exit-zero container is eligible for restart. The Pod therefore does not settle in `Succeeded`; while the container is starting or restarting, the Pod phase can remain `Running`.

For a container that follows the Pod-level policy, the basic table is:

| Container result | `Always` | `OnFailure` | `Never` |
| --- | --- | --- | --- |
| Exit code 0 | Restart | Do not restart | Do not restart |
| Non-zero exit | Restart | Restart | Do not restart |

The Pod-level default is `Always`. When the `ContainerRestartRules` feature gate is enabled—beta since Kubernetes v1.35 and enabled by default—application and regular init containers can set a container-level `restartPolicy` and `restartPolicyRules` that override the Pod-level behavior. Native sidecars are another special case: they are restartable init containers with their own `restartPolicy: Always` and continue to restart independently of the Pod-level policy.

## Confirm the Exit-Restart Loop

Start with the actual container status rather than the summarized `STATUS` column:

```bash
kubectl get pod api-7d8b6f7c8c-2m9xz -n production -o json \
  | jq '.status.containerStatuses[] |
      {name, restartCount, state, lastState}'
```

A successful short-lived process under `Always` looks similar to this:

```json
{
  "name": "api",
  "restartCount": 12,
  "state": {
    "waiting": {
      "reason": "CrashLoopBackOff"
    }
  },
  "lastState": {
    "terminated": {
      "exitCode": 0,
      "reason": "Completed"
    }
  }
}
```

Then inspect the configured policy, command, owner, logs, and events:

```bash
POD=api-7d8b6f7c8c-2m9xz
NS=production

kubectl get pod "$POD" -n "$NS" \
  -o jsonpath='{.spec.restartPolicy}{"\n"}'

kubectl get pod "$POD" -n "$NS" \
  -o jsonpath='{range .metadata.ownerReferences[*]}{.kind}{"/"}{.name}{"\n"}{end}'

kubectl get pod "$POD" -n "$NS" \
  -o jsonpath='{range .spec.containers[*]}{.name}{" command="}{.command}{" args="}{.args}{"\n"}{end}'

kubectl logs "$POD" -n "$NS" -c api --previous --timestamps
kubectl describe pod "$POD" -n "$NS"
kubectl get pod "$POD" -n "$NS" --watch
```

`--previous` is important because the current instance may have emitted nothing yet. The previous termination record reports how the process ended, including its exit code, signal, and reason. Events and timestamps are still needed to attribute that termination to a failed probe or another external action.

## Find Why the Main Process Returned Zero

Kubernetes runs the image entrypoint unless the Pod overrides it. In a Pod spec, `command` corresponds to the image entrypoint and `args` corresponds to its default arguments. An override can silently replace a correct image entrypoint with a finite command.

Common causes include:

1. **A setup command was deployed as a service.** A database migration, configuration renderer, queue drain, or one-time import completes normally and returns zero.
2. **A wrapper backgrounds the real server.** A shell runs `/app/server &` and then exits. The shell was the container's main process, so the container lifetime ends with it.
3. **The program daemonizes itself.** Traditional `--daemon` modes fork into the background and let the parent return. Containers need the server in foreground mode.
4. **The wrong subcommand or argument was supplied.** `worker validate`, `server --version`, or a help path may print output and finish successfully.
5. **A script swallows failure.** A command fails, but the script runs a final successful command or explicitly exits zero. Kubernetes sees success even though initialization failed.
6. **The application interprets missing work as shutdown.** A consumer drains the current queue and exits rather than waiting for more work.

Reproduce the exact image command outside production when possible. Do not test only the image's default entrypoint if the Pod overrides `command` or `args`; reproduce the effective Pod command.

## Fix a Workload That Is Intended to Be a Service

The container's main process must stay attached and run for the service's lifetime. Avoid a shell when it adds no value:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: registry.example.com/api:2.4.1
          command: ["/app/api"]
          args: ["serve", "--listen=:8080", "--foreground"]
          ports:
            - name: http
              containerPort: 8080
```

If a wrapper really is needed, make failure visible and replace the shell with the server using `exec`:

```yaml
containers:
  - name: api
    image: registry.example.com/api:2.4.1
    command: ["/bin/sh", "-c"]
    args:
      - |
        set -eu
        /app/render-config --output=/work/config.yaml
        exec /app/api serve --config=/work/config.yaml --foreground
```

`exec` replaces the shell with the server as the container's main process. That also lets normal termination signals reach the application directly. Do not “fix” the restart loop with `sleep infinity` or `tail -f /dev/null`; that only keeps an otherwise finished container alive while the real workload is absent.

Deployments, StatefulSets, and DaemonSets model continuously running workloads. Their Pod templates use `restartPolicy: Always`. Trying to turn a finite program into a service by changing that policy fights the controller's contract; change the process behavior or choose a different controller.

## Use a Job When Completion Is Correct

If exit code `0` is the desired outcome, represent that outcome explicitly with a Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: rebuild-search-index
spec:
  backoffLimit: 3
  ttlSecondsAfterFinished: 86400
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: indexer
          image: registry.example.com/indexer:2.4.1
          command: ["/app/indexer"]
          args: ["rebuild", "--all"]
```

A Job tracks successful completions and retries failures according to its Job policy. Job Pod templates allow `Never` or `OnFailure`, not `Always`. Use `Never` during troubleshooting so each failed Pod and its logs remain easy to inspect; the Job controller creates replacement Pods while the failure count remains below `backoffLimit`.

Use a CronJob if the finite task must run on a schedule. Use a Deployment only when the program should keep serving, polling, or waiting until Kubernetes asks it to stop.

## Do Not Blame Probes or Resources Without Evidence

A liveness probe failure can make the kubelet terminate and restart a running container. If the application handles the termination signal and exits cleanly, the previous state can still record exit code `0` and `Completed`; do not exclude probes from the exit code alone. Repeated `Unhealthy` and `Killing` events, together with the probe configuration and termination timestamps, distinguish that path from a process that returned on its own.

Similarly, an OOM kill normally records `reason: OOMKilled`; node disruption, eviction, and manual deletion leave different status and event evidence. Use all three signals together:

- `lastState.terminated` identifies the previous process outcome;
- `restartCount` proves whether the same container in the same Pod restarted;
- the owner reference tells you whether a controller could also be replacing entire Pods.

Container restarts keep the same Pod UID. Controller replacement creates a new Pod UID. Distinguishing those prevents you from debugging a Deployment rollout as though it were a kubelet restart loop.

## Verify the Repair

After updating the owning workload, watch the rollout and the replacement Pod rather than deleting a single Pod and assuming the problem is gone:

```bash
kubectl rollout status deployment/api -n production --timeout=5m
kubectl get pods -n production -l app=api -w

kubectl get pods -n production -l app=api \
  -o custom-columns='NAME:.metadata.name,PHASE:.status.phase,RESTARTS:.status.containerStatuses[*].restartCount'
```

Confirm that restart counts stay flat, readiness becomes true, and application logs show the server entering its steady-state loop. Alert on restart-rate increases rather than only absolute restart counts; a Pod can have an old harmless restart while a fast-growing count indicates an active loop.

## Official Documentation

- [Kubernetes Pod lifecycle, container states, and restart policies](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Define a command and arguments for a container](https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

## Conclusion

`Completed` is a successful process exit, not a declaration that a service should stop. When a container follows `restartPolicy: Always`, Kubernetes correctly restarts that process and eventually backs off repeated short runs. Inspect the previous termination, effective command, and workload owner first. Keep a real service in the foreground—using `exec` when a wrapper is necessary—and move intentionally finite work to a Job or CronJob.
