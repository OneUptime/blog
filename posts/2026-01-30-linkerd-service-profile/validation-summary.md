# Validation Summary: How to Build Linkerd ServiceProfile

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd ServiceProfiles
- Linkerd CLI and Linkerd Viz
- Kubernetes Deployments, Services, and custom resources
- OpenAPI
- Protocol Buffers / gRPC
- Prometheus / PromQL

## Sources Consulted
- Linkerd ServiceProfiles reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd Setting Up Service Profiles task guide: https://linkerd.io/2-edge/tasks/setting-up-service-profiles/
- Linkerd `profile` CLI reference: https://linkerd.io/2-edge/reference/cli/profile/
- Linkerd retries reference: https://linkerd.io/2-edge/reference/retries/
- Linkerd timeouts reference: https://linkerd.io/2-edge/reference/timeouts/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd supported Kubernetes versions reference: https://linkerd.io/2-edge/reference/k8s-versions/
- Linkerd proxy source for ServiceProfile path regex anchoring and route matching: https://github.com/linkerd/linkerd2-proxy

## Issues Found
- Added current-version context that ServiceProfiles are superseded by Gateway API resources as of Linkerd 2.16, while still supported for backwards compatibility.
- Corrected the Kubernetes prerequisite from open-ended "v1.21 or later" to note that Linkerd 2.14 supports Kubernetes v1.21 through v1.28 and newer Linkerd versions have their own support matrix.
- Clarified that Linkerd anchors unanchored ServiceProfile `pathRegex` values, avoiding misleading regex matching guidance.
- Corrected retry behavior wording to say retries occur for connection errors or responses classified as failures, not simply all 5xx responses.
- Corrected timeout behavior: ServiceProfile route timeouts cover the overall request including retries, rather than each retry attempt having an independent route timeout.
- Replaced the `linkerd profile --open-api` URL example with the documented stdin pattern using `curl ... | linkerd profile --open-api -`.
- Fixed the protobuf example by importing `google/protobuf/empty.proto`, using `google.protobuf.Empty`, and defining the referenced request/response messages.
- Corrected Prometheus queries to use route metric labels `dst` and `rt_route` instead of non-route labels such as `dst_service` and `route`; removed the unverified `route_retry_total` query.
- Reordered the e-commerce product routes so `/api/products/search` appears before `/api/products/{id}`, matching the post's stated first-match route behavior.
- Changed the sample application wording to make clear that `example/user-service:v1` is a placeholder image to replace, not a runnable published sample image.

## Review Notes
ServiceProfiles remain technically valid for backwards compatibility, but Linkerd's current documentation recommends Gateway API resources for new per-route metrics, retries, and timeouts on Linkerd 2.16 and later.
