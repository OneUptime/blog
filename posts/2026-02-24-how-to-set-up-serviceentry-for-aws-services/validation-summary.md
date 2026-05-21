# Validation Summary: How to Set Up ServiceEntry for AWS Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio VirtualService
- Istio DestinationRule
- Istio telemetry metrics
- Kubernetes
- AWS service endpoints for S3, SQS, DynamoDB, Secrets Manager, STS, IAM, and ECR

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio egress wildcard hosts task: https://istio.io/latest/docs/tasks/traffic-management/egress/wildcard-egress-hosts/
- Istio wildcard DYNAMIC_DNS documentation: https://istio.io/latest/blog/2026/egress-dynamic-dns/
- AWS STS regional endpoints documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_region-endpoints.html
- AWS regional and global endpoint reference: https://docs.aws.amazon.com/general/latest/gr/rande.html
- AWS ECR endpoints documentation: https://docs.aws.amazon.com/general/latest/gr/ecr.html
- Amazon S3 user guide endpoint behavior: https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html

## Issues Found
- The post originally implied ServiceEntries provide per-request AWS API metrics for normal AWS SDK HTTPS calls. Updated the wording to explain that Istio sees SNI and connection-level telemetry for encrypted HTTPS passthrough, not individual HTTP API operations.
- The wildcard ServiceEntry text said `resolution: NONE` is required for wildcard hosts. Updated it to say `NONE` is broadly compatible and that newer Istio versions can use `DYNAMIC_DNS` for wildcard HTTPS destinations.
- The ECR section suggested pod image pulls go through the pod's sidecar. Updated it to clarify that Kubernetes image pulls are performed by the kubelet on the node, and ECR ServiceEntries are relevant for in-mesh application traffic to ECR APIs or registry endpoints.
- The Traffic Policies section used `VirtualService` HTTP timeout and retry examples for AWS HTTPS API calls. Replaced those examples with connection-level `DestinationRule` controls because Istio HTTP routes and HTTP retries do not apply to normal HTTPS passthrough traffic.
- The DestinationRule connection pool example used the invalid field `maxPendingRequests`. Removed the HTTP connection-pool block and kept TCP connection limits, which are applicable to HTTPS passthrough connections.
- The Monitoring section queried `istio_requests_total` and HTTP duration histograms for normal AWS HTTPS calls. Updated it to use TCP connection and byte metrics, with a note that HTTP metrics apply only when HTTP is visible to Istio.

## Review Notes
The ServiceEntry API version, host syntax, AWS endpoint examples, STS regional endpoint guidance, and ECR endpoint patterns are technically valid. The post intentionally keeps examples region-specific; readers still need to add every AWS Region and hostname style their workloads actually use.
