# Validation Summary: From Lambda to Portable Containers and Knative

## Status
validated

## Post Type
Technical guide / migration architecture guide

## Technologies Covered
- AWS Lambda
- Lambda container images, Runtime API, runtime interface clients, and runtime interface emulator
- OCI and Docker container images
- Distroless Debian container images
- Kubernetes
- Knative Serving, Services, Revisions, Knative Pod Autoscaler, and scale-to-zero
- Knative Eventing, sources, brokers, sinks, and CloudEvents
- Amazon SQS, SNS, EventBridge, Kinesis, and DynamoDB event-source integrations
- IAM and Kubernetes workload identity
- Event delivery, retries, partial batch failures, idempotency, and dead-letter handling

## Sources Consulted
- AWS Lambda container image documentation: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- AWS Lambda Runtime API: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda function scaling and concurrency: https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
- AWS Lambda Managed Instances overview and concurrency differences: https://docs.aws.amazon.com/lambda/latest/dg/lambda-managed-instances.html
- AWS Lambda Managed Instances scaling: https://docs.aws.amazon.com/lambda/latest/dg/lambda-managed-instances-scaling.html
- AWS Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda SQS partial batch failure handling: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- Knative Serving overview: https://knative.dev/docs/serving/
- Knative Serving API reference: https://knative.dev/docs/serving/reference/serving-api/
- Knative runtime contract: https://github.com/knative/specs/blob/main/specs/serving/runtime-contract.md
- Knative Serving validation source for reserved environment variables: https://github.com/knative/serving/blob/main/pkg/apis/serving/k8s_validation.go
- Knative autoscaling overview: https://knative.dev/docs/serving/autoscaling/
- Knative scale bounds: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative scale-to-zero configuration: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative Eventing overview: https://knative.dev/docs/eventing/
- Knative event sources: https://knative.dev/docs/eventing/sources/
- Knative brokers: https://knative.dev/docs/eventing/brokers/
- Knative sinks: https://knative.dev/docs/eventing/sinks/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Distroless image documentation and supported tags: https://github.com/GoogleContainerTools/distroless
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md

## Issues Found
- The Knative Service manifest explicitly declared `PORT` under `env`. Current Knative Serving reserves `PORT` for the serving container and rejects a user declaration. I removed that environment entry, declared `ports[].containerPort: 8080`, and added a concise explanation that Knative injects the selected port as `PORT`.
- The Dockerfile used `gcr.io/distroless/static-debian12:nonroot` without saying that `/server` must be statically linked. That base image is intended for static binaries; I narrowed the introductory sentence so the example's runtime requirement is explicit.
- The portability checklist said to use a "read-only image," which does not accurately express the runtime requirement because container image layers are already immutable while the container root filesystem can still be writable. I changed it to require that the application be able to run with a read-only root filesystem and bounded temporary storage.
- The operations comparison characterized Lambda scaling as "per-invocation scaling" without identifying the compute type. AWS now distinguishes the single-concurrency, scale-to-zero Lambda default compute type from Lambda Managed Instances, which use multi-concurrent execution environments and asynchronous resource-based scaling. I scoped the statement and comparison table to the default compute type and changed the phrase to "managed concurrency scaling."

## Review Notes
- The Lambda Runtime API, runtime interface client, read-only filesystem, writable `/tmp`, Linux-only, and single-architecture image claims agree with current AWS documentation.
- The Knative `containerConcurrency`, `timeoutSeconds`, `min-scale`, and `max-scale` fields are current. `min-scale: "0"` permits a zero lower bound, but scale-to-zero still depends on KPA and the cluster-global `enable-scale-to-zero` setting, which defaults to `true` in current Knative documentation.
- The Knative image digest is intentionally a placeholder. A real deployment also requires the `billing` namespace, the `invoice-api` ServiceAccount, registry access, and a real image digest to exist.
- Lambda Managed Instances are outside the comparison table's stated default-compute scope. A migration involving Managed Instances must separately inventory its capacity provider, multi-concurrency safety, scaling configuration, continuously active execution environments, and instance-based pricing.
- Knative Eventing delivery behavior depends on the selected source and Broker implementation. The post correctly instructs readers to preserve and verify source-specific delivery, retry, ordering, settlement, and dead-letter semantics rather than assuming portability from CloudEvents alone.
