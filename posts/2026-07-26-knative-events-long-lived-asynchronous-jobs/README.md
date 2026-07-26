# How to Run Long-Lived or Asynchronous Jobs from Knative Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, JobSink, Kubernetes Jobs, Asynchronous Processing, CloudEvents, Reliability

Description: Decouple long-running work from Knative's HTTP delivery using JobSink or a durable application queue, with explicit idempotency and completion reporting.

---

A normal Knative Eventing subscriber is an HTTP endpoint. Keeping that request open for a long-running task increases the chance of a timeout, disconnect, Pod termination, and redelivery. A larger Serving timeout does not turn an HTTP request into a durable job.

Use one of these boundaries instead:

- a Knative `JobSink` when each CloudEvent should create a Kubernetes Job;
- a short-lived subscriber that durably enqueues work and returns `2xx`;
- a workflow or batch queue when jobs have dependencies, quotas, approvals, or large scale.

The acknowledgement should mean "durable responsibility accepted," not "a background goroutine was started."

## Use JobSink for One Kubernetes Job per Event

`JobSink` is a Knative Eventing sink with API version `sinks.knative.dev/v1alpha1`. It supports a full Kubernetes `batch/v1` Job template. When it receives a CloudEvent, it creates a Job and mounts the structured CloudEvent JSON at:

```text
/etc/jobsink-event/event
```

Create a bounded job template:

```yaml
apiVersion: sinks.knative.dev/v1alpha1
kind: JobSink
metadata:
  name: report-generator
  namespace: production
spec:
  job:
    metadata:
      labels:
        app.kubernetes.io/name: report-generator
    spec:
      backoffLimit: 3
      activeDeadlineSeconds: 7200
      ttlSecondsAfterFinished: 86400
      template:
        spec:
          serviceAccountName: report-generator
          restartPolicy: Never
          containers:
            - name: main
              image: registry.example.com/report-generator@sha256:REPLACE_WITH_DIGEST
              args:
                - "--event-file=/etc/jobsink-event/event"
              resources:
                requests:
                  cpu: "500m"
                  memory: "512Mi"
                limits:
                  memory: "2Gi"
```

JobSink injects the event volume. The program should open the file, deserialize it as a CloudEvent, validate `source`, `id`, `type`, and data, then perform the work.

Check that the sink is ready:

```bash
kubectl get jobsink report-generator -n production
kubectl describe jobsink report-generator -n production
```

## Route Broker Events to JobSink

Reference JobSink as a Trigger subscriber:

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: report-requested
  namespace: production
spec:
  broker: reports
  filter:
    attributes:
      type: com.example.report.requested.v1
  subscriber:
    ref:
      apiVersion: sinks.knative.dev/v1alpha1
      kind: JobSink
      name: report-generator
  delivery:
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: report-request-dead-letter
```

Support for these delivery fields depends on the configured Broker class and, for an `MTChannelBasedBroker`, its backing Channel implementation. When supported, the Trigger delivery covers getting the event accepted by JobSink. It does **not** keep the HTTP request open until the resulting Job finishes. A Job that fails thirty minutes later will not cause the Trigger to retry or send the original event to its dead letter sink.

There are therefore two separate retry systems:

- Knative Trigger `spec.delivery.retry` handles HTTP delivery to JobSink when the Broker implementation supports it;
- Kubernetes Job `backoffLimit` handles failed Job Pods.

Alert and recovery procedures must cover both.

## Understand JobSink Idempotency

JobSink identifies an event by `(source, id)`. If a Job for that pair is already present, receiving the same event does not create another Job.

Preserve the identity when retrying the same occurrence. Generate a new event ID for a genuinely new request.

The official contract is conditional on the Job still being present. If `ttlSecondsAfterFinished` deletes it, a much later replay can no longer rely on that Job object as the deduplication record. For durable business idempotency, the job itself should claim `(source, id)` in a database or object store before performing non-repeatable work.

Also make Pod retries safe. Kubernetes may start another Pod for the same Job after a failure, and a process can crash after committing an external side effect.

## Report Completion as a New Event

Job creation is not job completion. Publish an explicit result CloudEvent such as:

```text
com.example.report.completed.v1
com.example.report.failed.v1
```

Include the original request identity as correlation data, while giving the result event its own `source` and `id`. Persist the result and outbound event in an outbox before publishing so a final network error cannot lose completion notification.

For each Job, record:

- request `(source, id)`;
- Kubernetes Job name and UID;
- start, completion, and failure timestamps;
- attempt count and terminal condition;
- output location and checksum;
- result-event publish state.

Do not infer business success merely because JobSink acknowledged the request.

## Use an Accept-and-Enqueue Subscriber for Sustained Work

Creating one Kubernetes Job per event is not ideal for every workload. At high event rates, Job objects, Pods, image pulls, scheduling, and API writes can become the bottleneck.

A durable inbox pattern is:

```text
Trigger -> intake Service -> database/queue -> worker pool
```

The intake handler should:

1. validate the CloudEvent;
2. insert `(consumer, source, id)` and the payload into a durable queue in one transaction;
3. return `2xx` only after commit;
4. let a separately managed worker claim and renew jobs;
5. store terminal state and publish completion through an outbox.

Do not return `202` after placing work only in process memory. Knative Serving can scale down, restart, or roll to another Revision immediately after the response.

The queue design should include leases, visibility timeouts, attempts, poison-job quarantine, cancellation, priority, retention, and idempotency. Kubernetes Jobs can still execute the work if a controller turns durable queue entries into Job resources.

## Choose a Workflow System When the Job Is a Workflow

Use a purpose-built workflow or batch scheduler when you need:

- multi-step DAGs and fan-in;
- per-team quotas and admission;
- GPU or specialized node scheduling;
- suspension and approval;
- checkpointing and resume;
- large indexed or parallel Jobs;
- cancellation and dependency-aware retries.

JobSink supports Kubernetes Job queuing systems such as Kueue because its template exposes the full Job resource. Keep the CloudEvent ingress as the request boundary, while the batch system owns execution state.

## Set Job Safety Controls

For every job template, decide:

- `activeDeadlineSeconds` for a hard runtime ceiling;
- `backoffLimit` and `podFailurePolicy`;
- `parallelism` and `completions`;
- resource requests, limits, and ephemeral storage;
- ServiceAccount and least-privilege RBAC;
- node placement, tolerations, and priority;
- cleanup with `ttlSecondsAfterFinished`;
- output retention independent of Job object retention.

The event file can contain sensitive data. Restrict Pod access, avoid logging the entire event by default, and apply the same data-retention policy to Job logs and outputs.

## Test Every Failure Boundary

Send one event with a known `(source, id)` and verify:

```bash
kubectl get jobs -n production \
  -l app.kubernetes.io/name=report-generator
kubectl describe job -n production <job-name>
kubectl logs -n production job/<job-name>
```

Then test:

1. duplicate HTTP delivery while the Job exists;
2. a Pod crash before work begins;
3. a crash after an external side effect;
4. Job deadline expiry;
5. JobSink unavailability and Trigger dead lettering;
6. completion-event publish failure;
7. replay after Job cleanup.

Long-running work becomes reliable when the HTTP delivery ends at a durable creation or enqueue step and the execution system owns everything after that boundary.

## Official Documentation

- [Knative JobSink](https://knative.dev/docs/eventing/sinks/job-sink/)
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Knative sinks and destinations](https://knative.dev/docs/eventing/sinks/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [CloudEvents 1.0 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
