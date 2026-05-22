# Validation Summary: How to Configure Istio for Object Storage (S3, GCS)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry, DestinationRule, VirtualService, outbound traffic policy, and telemetry
- Kubernetes Services, Deployments, pod annotations, and kubectl
- AWS S3 and AWS STS/IRSA
- Google Cloud Storage and GKE Workload Identity Federation
- Azure Blob Storage and Microsoft Entra authentication endpoints
- MinIO/S3-compatible object storage
- Prometheus queries for Istio metrics

## Sources Consulted
- Istio external service egress documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio TLS origination documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio wildcard egress hosts task: https://istio.io/latest/docs/tasks/traffic-management/egress/wildcard-egress-hosts/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- AWS S3 virtual-hosted-style URL documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html
- AWS EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS EKS SDK/IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts-minimum-sdk.html
- AWS IP address ranges documentation: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- Google Cloud Storage request endpoints: https://docs.cloud.google.com/storage/docs/request-endpoints
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Azure Blob Storage endpoint documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-query-endpoint-srp
- Azure Storage Microsoft Entra authorization documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-auth-aad-app

## Issues Found
- The post used `networking.istio.io/v1beta1` throughout. Updated Istio networking resources to the current stable `networking.istio.io/v1` API used in current official Istio examples.
- The `REGISTRY_ONLY` description implied it was a production security control. Updated the wording to match Istio's warning that it helps catch missing ServiceEntries but is not a full outbound firewall.
- The S3, GCS, and Azure ServiceEntry examples combined wildcard hosts with `resolution: DNS`. Istio wildcard egress documentation notes that normal DNS resolution cannot be used for wildcard hosts, so the examples now use `resolution: NONE`.
- The post recommended `DestinationRule tls.mode: SIMPLE` for normal SDK HTTPS traffic and described it as preventing mTLS. This was incorrect: `SIMPLE` makes Envoy originate TLS and is intended for TLS origination scenarios. Removed those DestinationRules and clarified that normal SDK HTTPS traffic is originated by the application and routed by SNI.
- The timeout example used an HTTP `VirtualService` route for external S3 HTTPS traffic. Since Envoy cannot see HTTP requests inside application-originated TLS, changed the example to an in-cluster MinIO HTTP service and added the caveat for external SDK HTTPS traffic.
- The monitoring examples used HTTP request metrics and response codes for external S3/GCS HTTPS passthrough traffic. Updated the examples to target HTTP-visible MinIO traffic and added TCP metrics for normal external HTTPS passthrough.
- The large-upload section implied Envoy buffers large object uploads and that the shown DestinationRule controlled buffer limits. Reworded it to focus on connection limits, idle timeouts, and protocol settings.
- The GCS authentication note treated `oauth2.googleapis.com` as required for Workload Identity. Updated it to note that GKE Workload Identity Federation commonly uses the GKE metadata server, while other SDK flows may use OAuth endpoints.
- The presigned URL section described URL generation as a mesh call to the SDK. Updated it to clarify that URL generation is usually local signing work, while credential-refresh calls may go through the mesh.
- The AWS S3 IP ranges annotation described two CIDRs as S3 IP ranges. Reworded this as an example and directed readers to AWS's current `ip-ranges.json`.

## Review Notes
The guide is technically relevant and salvageable. The remaining examples are intentionally generic; real production configurations should enumerate only the object storage regions, bucket hostnames, authentication endpoints, and egress bypass ranges actually used by the workload.
