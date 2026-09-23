# How to Drain a Leader Gracefully During Rolling Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Leader Election, Deployment, High Availability

Description: Drain leader-only work, checkpoint completion, and release leadership in a safe order during a rolling deployment.

---

A rolling deployment should move leadership after the old process stops making protected changes. Merely removing its Pod from a Service does not stop a background scheduler, close an existing database session, or cancel an external request.

Treat drain as an application protocol. The example here is a queue-processing singleton elected with a Kubernetes Lease; database leaders should use their database operator's switchover procedure.

## Separate four states

Use explicit states such as `following`, `leading`, `draining`, and `stopped`. Only `leading` may acquire new work. A draining process may complete already accepted work while continuing to renew its lease.

Store the state transition and work-admission check under the same synchronization mechanism. Otherwise, a worker can observe `leading`, race with drain, and acquire another task after the coordinator believes admission has stopped.

An application-level shutdown sequence looks like this:

```text
receive termination signal
atomically stop admitting new work
mark application readiness false
keep the election renewal loop alive
finish or cancel already accepted operations
persist completed checkpoints and release owned queue deliveries
wait until protected workers have stopped
cancel election context and release the lease
exit
```

This is lifecycle pseudocode, not a replacement for your queue's acknowledgment or visibility-timeout rules. The queue must redeliver unfinished work, and handlers must tolerate retries.

## Preserve leadership while draining

Client-go exposes `ReleaseOnCancel`, but its [configuration contract](https://pkg.go.dev/k8s.io/client-go/tools/leaderelection#LeaderElectionConfig) requires lease-protected work to have completed before the context is canceled. Use separate cancellation scopes for the application drain and the election loop.

The elected callback still needs to observe loss of leadership. If renewals fail while a graceful drain is underway, stop protected work immediately and rely on fencing or idempotency for effects already in flight. Drain is a convenience available while ownership remains valid, not permission to keep writing after ownership is lost.

Do not wait indefinitely for a remote call. Give each operation a deadline and persist enough state to reconcile an uncertain outcome. If a timeout leaves a payment or message delivery ambiguous, the successor should query by the same operation identifier rather than inventing a new identifier and repeating the effect.

## Budget the Pod termination period

Kubernetes starts the termination grace countdown before executing a `preStop` hook, then sends the container's stop signal after that hook finishes. After the grace period expires, the remaining processes can be forcibly terminated. The [Pod termination documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination) describes this order.

For an application whose measured drain usually takes twenty seconds, a deployment fragment might reserve sixty seconds:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: worker
          image: registry.example.com/worker:2.4.0
```

The image is a placeholder for your application. Its PID 1 must receive and handle the stop signal. The grace period does not implement drain by itself. Include startup, queue ownership, and external operation behavior in the design.

A long `preStop` sleep consumes the same grace budget. Prefer a signal handler or a bounded local drain endpoint whose behavior is observable. Readiness also does not instantly sever existing connections, and a worker may have no Service at all.

## Make the successor resume from committed progress

Checkpoint the last completed task only after its durable effects and acknowledgment meet the queue's contract. Where possible, write business state and the checkpoint in one transaction. For external systems, use an outbox or destination idempotency key so a crash between effect and checkpoint can be reconciled.

The successor should acquire leadership, establish any destination-enforced epoch, load the checkpoint, and become ready before taking fresh work. Lease ownership by itself cannot prove that an old process has stopped: the [client-go package documentation](https://pkg.go.dev/k8s.io/client-go/tools/leaderelection) explicitly disclaims fencing.

For PostgreSQL with Patroni, use an intentional [switchover](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-switchover) to a healthy eligible replica before replacing the old primary. Application work admission and database promotion are different protocols; do not apply this worker's lease-release pseudocode to PostgreSQL storage.

## Verify the handover boundary

Run a rolling update while long tasks are active. Log task IDs, ownership epochs, checkpoint positions, drain-start time, final protected effect, and successor-start time. Confirm that all admitted tasks either complete once or are safely retried.

Then exceed the grace period deliberately in an isolated test. The process may be killed before the graceful sequence finishes, so correctness must also survive that abrupt path. A successful deployment reduces disruption; it never removes the need to handle crashes.
