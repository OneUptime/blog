# From Lambda to Portable Containers and Knative

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS Lambda, Knative, Containers, Serverless, Kubernetes, Cloud Portability, Event-Driven Architecture

Description: Decide when a generic container or Knative service reduces Lambda migration work, and separate portable business logic from event, identity, scaling, and operations adapters.

---

Packaging an AWS Lambda function as a container image does not by itself make the function portable. Lambda container images must implement the Lambda Runtime API, and the workload still executes under Lambda's invocation, scaling, filesystem, timeout, identity, and event-source contracts.

Containers improve portability when the process contract is generic: listen on a port, handle ordinary HTTP, receive termination signals, externalize durable state, and avoid provider metadata. Knative can then add request-driven scaling on Kubernetes. That trade replaces some provider coupling with cluster and platform operations.

## Identify the Lambda Contract in the Code

Inventory more than the handler function:

- Lambda event and context types;
- API Gateway or Function URL request shapes;
- SQS, SNS, EventBridge, Kinesis, or DynamoDB event-source mappings;
- partial batch failure behavior;
- IAM role permissions and AWS SDK calls;
- `/tmp` usage and assumed execution lifetime;
- reserved and provisioned concurrency;
- destinations, dead-letter queues, retries, and timeouts;
- extensions, layers, tracing, and environment variables.

Classify each dependency as business logic, trigger adapter, provider service, or runtime operation. Only the first category should be shared without translation.

## Extract a Runtime-Neutral Core

Keep a thin Lambda handler around ordinary application code:

```text
lambda handler
  -> decode SQS event
  -> for each message call InvoiceProcessor.process(command)
  -> translate failures to Lambda batch response

HTTP server
  -> decode POST /invoices
  -> call InvoiceProcessor.process(command)
  -> translate result to HTTP response
```

The core should receive domain values and interfaces, not the full provider event object:

```text
InvoiceProcessor.process(
  command: {message_id, customer_id, invoice_id},
  store: InvoiceStore,
  publisher: DomainEventPublisher
)
```

This preserves unit tests and business behavior while allowing the transport and provider clients to change.

## Choose a Truly Generic Container Contract

A portable HTTP service should:

- run as a non-root process where the target supports it;
- listen on `0.0.0.0` and a configurable `PORT`;
- expose readiness and liveness endpoints;
- write logs to standard output or standard error;
- handle `SIGTERM` and stop accepting new work;
- keep durable state in external services;
- be able to run with a read-only root filesystem and bounded temporary storage;
- support multiple concurrent requests only when its dependencies are safe;
- avoid assuming a cloud metadata endpoint exists.

A statically linked server binary can use a small Dockerfile:

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
COPY server /server
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

Pin the deployed image by digest. Build and scan only the architecture variants supported by the target runtimes.

Publish separate single-architecture images or digests when targets need different CPU architectures. AWS Lambda requires each function image to target exactly one architecture and does not support a multi-architecture container image manifest.

## Understand What a Lambda Container Image Means

AWS documents that a Lambda container image must implement the Runtime API. AWS base images include the required components; an alternative base image needs a runtime interface client or custom runtime implementation.

That image is a deployment package for Lambda, not automatically an HTTP server suitable for Kubernetes. A clean architecture can produce two images or entrypoints from the same core:

```text
invoice-lambda  -> Lambda runtime client and handler
invoice-http    -> ordinary HTTP server
```

Avoid starting a Lambda runtime emulator in production Kubernetes merely to preserve the old contract. It carries the provider invocation model into the new platform.

## Use Knative When Request-Driven Scaling Is the Requirement

Knative Serving manages stateless, request-driven services on Kubernetes and can scale revisions to zero with the Knative Pod Autoscaler when the cluster is configured for it.

A basic service is concise:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: invoice-api
  namespace: billing
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/min-scale: "0"
        autoscaling.knative.dev/max-scale: "50"
    spec:
      containerConcurrency: 20
      timeoutSeconds: 60
      serviceAccountName: invoice-api
      containers:
        - image: registry.example.com/billing/invoice-api@sha256:REPLACE_ME
          ports:
            - containerPort: 8080
```

Knative injects the serving `containerPort` as the reserved `PORT` environment variable; do not declare `PORT` under `env`.

Set concurrency and timeouts from load tests. `containerConcurrency: 20` is a limit for this example, not a universal recommendation.

The `min-scale: "0"` annotation permits a zero lower bound; it does not enable scale-to-zero by itself. Knative scale-to-zero requires the Knative Pod Autoscaler (KPA) and the cluster-global `enable-scale-to-zero` setting. Verify both, along with scale-from-zero routing, on every target cluster.

Knative portability still requires compatible CRDs, networking, autoscaler configuration, DNS, certificates, image access, and workload identity in every cluster. Compare the exact Knative and Kubernetes versions supported by the platform.

## Redesign Event Sources, Not Just Compute

A request-based Knative service does not automatically replace an SQS event-source mapping. Choose one of these patterns:

- a broker-neutral consumer process receives messages and calls the core;
- an event adapter pulls from the provider queue and sends CloudEvents or HTTP to the service;
- Knative Eventing components connect supported sources to a broker and sink;
- the application uses a narrow internal queue interface with provider adapters.

Preserve delivery semantics explicitly. Record whether the source provides at-least-once delivery, ordering by key, acknowledgment deadlines, maximum attempts, dead-lettering, and batch failure. Make consumers idempotent with a durable operation or message ID.

Do not acknowledge the source message before durable processing completes. When an HTTP adapter sits between a queue and Knative, define how HTTP success maps to settlement and how timeouts produce retries.

## Compare Operational Cost and Behavior

Lambda's default compute type includes a managed control plane, event integrations, managed concurrency scaling, and provider observability. Knative requires a Kubernetes cluster and operators for its serving stack, networking, upgrades, security, and capacity.

Compare measured dimensions:

| Dimension | Lambda (default compute type) | Knative or generic containers |
| --- | --- | --- |
| Unit of deployment | function package/image | OCI image and service resources |
| Trigger integration | deep AWS integrations | adapters, Eventing, or HTTP |
| Scale-to-zero | managed by service | requires configured autoscaler and request path |
| Capacity | account concurrency and service quotas | cluster/node capacity and autoscaler limits |
| Identity | execution role | target workload identity mapping |
| Portability | handler and integrations need adaptation | image is reusable; platform config still differs |
| Operations | provider-managed runtime | platform team owns more components |

For stable high utilization, containers may improve resource efficiency. For sparse events, Lambda's managed model may be cheaper operationally even when migration would require work.

## Migrate with Parallel Verification

1. extract the core and run the same contract suite through Lambda and HTTP adapters;
2. deploy the container to a nonproduction target;
3. replay sanitized events and compare results;
4. mirror a portion of production events without applying side effects, or use shadow outputs;
5. validate idempotency, retries, ordering, and poison messages;
6. canary a small authoritative traffic slice;
7. observe cold starts, saturation, queue age, and downstream pressure;
8. switch the source and retain a tested rollback route.

If two consumers process the same event during migration, side effects must be explicitly suppressed or deduplicated.

## Official Documentation

- [AWS Lambda container images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [AWS Lambda Runtime API](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html)
- [AWS Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Knative Serving overview](https://knative.dev/docs/serving/)
- [Knative autoscaling](https://knative.dev/docs/serving/autoscaling/)
- [Knative scale to zero](https://knative.dev/docs/serving/autoscaling/scale-to-zero/)
- [Knative Serving API](https://knative.dev/docs/serving/reference/serving-api/)
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)

## Conclusion

Move from Lambda when a generic process contract and reuse across environments are worth the added platform work. A Lambda container remains Lambda-specific unless it also exposes an ordinary runtime contract. Keep business logic independent, build thin trigger adapters, make event semantics explicit, and treat Knative as a portable Kubernetes platform component rather than a guarantee of identical behavior everywhere.
