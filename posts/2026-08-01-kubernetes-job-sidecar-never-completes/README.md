# Why Your Kubernetes Job Never Completes When a Sidecar Keeps Running

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Sidecar Containers, Batch Processing, Pod Lifecycle, Troubleshooting

Description: Diagnose Jobs that stay active after their worker exits, then fix the lifecycle with a native Kubernetes sidecar or a compatible fallback.

---

The worker printed “done” and exited with code 0, but the Job still shows `0/1` completions. The usual cause is an always-running helper—such as a proxy, log collector, or credential agent—declared as a second ordinary container.

Kubernetes does not know that one ordinary container is “the worker” and another is “only a sidecar.” Both entries in `spec.template.spec.containers` participate in the Pod's lifetime. If one stays running, the Pod is not complete, and the Job cannot count it as a successful completion.

## Recognize the Stuck Pattern

This Job looks reasonable but never succeeds:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: export-report
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: exporter
          image: registry.example.com/exporter:4.7.0
          command: ["/app/export", "--once"]
        - name: log-shipper
          image: registry.example.com/log-shipper:2.9.0
          command: ["/app/ship", "--follow"]
```

After the export finishes, inspect container states rather than only the Job summary:

```bash
kubectl get job export-report
kubectl get pods -l job-name=export-report
kubectl get pod <pod-name> \
  -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\t"}{.state}{"\n"}{end}'
kubectl describe pod <pod-name>
```

You will typically see `exporter` terminated with exit code 0 while `log-shipper` remains running. The Pod stays `Running`, so the Job's `.status.succeeded` does not increase.

This is not fixed by either Job retry setting:

- `backoffLimit` controls retries after failures; it does not declare one container unimportant to completion.
- `activeDeadlineSeconds` eventually terminates an overlong Job, but that is a failure deadline, not successful completion.

Do not use a deadline to disguise the lifecycle mismatch.

## Use a Native Sidecar

On a cluster that supports native sidecars, move the helper to `initContainers` and set its container-level `restartPolicy` to `Always`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: export-report
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      initContainers:
        - name: log-shipper
          image: registry.example.com/log-shipper:2.9.0
          restartPolicy: Always
          startupProbe:
            exec:
              command: ["/app/ship", "--check-started"]
            periodSeconds: 2
            failureThreshold: 30
          volumeMounts:
            - name: logs
              mountPath: /var/run/report
      containers:
        - name: exporter
          image: registry.example.com/exporter:4.7.0
          command: ["/app/export", "--once", "--log=/var/run/report/export.log"]
          volumeMounts:
            - name: logs
              mountPath: /var/run/report
      volumes:
        - name: logs
          emptyDir: {}
```

An init-container entry with `restartPolicy: Always` is a native sidecar. It starts during Pod initialization, stays running alongside the exporter, and restarts if it exits while the Pod is active. Crucially, it does not prevent Pod completion after the regular application container finishes.

The Pod-level `restartPolicy: Never` still applies to the exporter. It does not override the native sidecar's container-level `Always` policy. Jobs allow `Never` or `OnFailure`; choose between those based on whether a failed worker should restart inside the same Pod or let the Job controller create a replacement Pod.

## Know the Version Boundary

Native sidecars were alpha in Kubernetes 1.28 behind the `SidecarContainers` feature gate, beta and enabled by default in 1.29, and stable in 1.33. Test the manifest against the server:

```bash
kubectl apply --dry-run=server -f export-report.yaml
```

During mixed-version upgrades, also confirm that every eligible node has a kubelet that supports the feature. Client-side YAML parsing is not proof that the cluster can run it.

## Startup and Completion Are Separate Guarantees

The manifest above uses a startup probe because “the sidecar process exists” and “the sidecar can ship logs” are different milestones.

For a native sidecar in the ordered `initContainers` list:

1. The kubelet starts the sidecar.
2. If there is a startup probe, the kubelet waits for it to succeed before starting the next init container or moving toward application startup.
3. The exporter starts after initialization completes.
4. The sidecar can restart independently while the exporter runs.
5. When regular containers finish, the native sidecar does not block completion and is terminated as part of Pod shutdown.

A readiness probe does not provide step 2. Readiness contributes to the Pod's `Ready` condition; the startup probe establishes the native sidecar's init-sequence milestone.

## Preserve the Last Logs During Shutdown

Native sidecar semantics solve completion, but they do not promise an unlimited flush interval. During graceful termination, Kubernetes lets main containers stop before native sidecars and then stops sidecars in reverse declaration order. All of that shares the Pod's termination grace period.

Set a realistic budget and make both processes handle signals correctly:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
```

The exporter should close its log file before exiting. The shipper should detect appended records, drain its in-memory queue, and handle `SIGTERM`. If the worker consumes the entire grace period, the sidecar can receive very little time before forced termination. Measure the real worst case instead of assuming the default 30 seconds is sufficient.

Also make output durable or idempotent. Kubernetes documents that even a Job configured for one completion can sometimes start the same program more than once after failures or control-plane races. A sidecar change does not alter that Job-level requirement.

## Fallback for Clusters Without Native Sidecars

If every target cluster cannot support the native field, the helper must arrange to exit. A shared completion marker is a common fallback:

```yaml
spec:
  restartPolicy: Never
  containers:
    - name: exporter
      image: registry.example.com/exporter:4.7.0
      command:
        - /bin/sh
        - -c
        - |
          rc=0
          /app/export --once --log=/work/export.log || rc=$?
          touch /work/export.finished
          exit "$rc"
      volumeMounts:
        - name: work
          mountPath: /work
    - name: log-shipper
      image: registry.example.com/log-shipper:2.9.0
      command:
        - /bin/sh
        - -c
        - |
          /app/ship --file=/work/export.log --until-file=/work/export.finished
      volumeMounts:
        - name: work
          mountPath: /work
  volumes:
    - name: work
      emptyDir: {}
```

This is only a protocol sketch; the images must actually contain a shell and the helper must implement bounded draining. Account for failure modes:

- ensure the marker is written on success and expected failure paths;
- avoid treating a partial log flush as success;
- bound the wait if the worker is killed before it writes the marker;
- make a retry safe when the Job controller creates another Pod;
- do not use `preStop` as the only completion signal, because `preStop` is not called for a container that has already completed and does not run on every abrupt node failure.

Another fallback is to run both processes under one purpose-built supervisor in a single container. That gives the supervisor responsibility for child-process ordering and exit status, but sacrifices separate container resources, logs, and health checks. A helper that can run as a separate Service may be a cleaner design if it does not need Pod-local files or `localhost`.

## Verify the Fix End to End

Create a disposable Job and watch its states:

```bash
kubectl apply -f export-report.yaml
kubectl get job export-report -w
kubectl get pods -l job-name=export-report -w
kubectl logs job/export-report -c exporter
kubectl logs job/export-report -c log-shipper
```

Then verify all of the following:

1. The shipper is listed in `.status.initContainerStatuses` and is running while the exporter works.
2. Its startup probe succeeds before the exporter begins.
3. The exporter exits with code 0.
4. The Job reaches its requested completion without a manual `kubectl exec` or kill command.
5. The final records arrive before the Pod disappears.
6. A deliberate shipper crash restarts the shipper without rerunning the exporter.

The durable fix is to express the real lifetime contract. A continuously running ordinary container means “this Pod is still doing application work.” A native sidecar means “keep this helper alive while application work exists, but do not let the helper redefine completion.”

## Official Documentation

- [Kubernetes: Sidecar Containers, Including Jobs](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: Pod Lifecycle and Container Restart Policy](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Adopting Sidecar Containers](https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
