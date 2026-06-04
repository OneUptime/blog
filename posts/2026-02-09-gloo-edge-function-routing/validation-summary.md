# Validation Summary: How to Deploy Gloo Edge API Gateway with Function Routing Capabilities

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Gloo Gateway / Gloo Edge API
- Envoy Proxy
- Kubernetes Services, Deployments, and custom resources
- Gloo VirtualService and Upstream resources
- AWS Lambda routing
- REST and gRPC function routing
- Gloo transformations
- Gloo Gateway Enterprise rate limiting
- Prometheus and Grafana observability

## Sources Consulted
- Gloo Gateway quick start and installation docs: https://docs.solo.io/gloo-edge/main/getting_started/
- Gloo Gateway Kubernetes installation docs: https://docs.solo.io/gloo-edge/latest/installation/gateway/kubernetes/
- Gloo discovered upstream annotation docs: https://docs.solo.io/gloo-edge/main/guides/traffic_management/destination_types/discovered_upstream/discovered-upstream-configuration/
- Gloo REST endpoint function routing docs: https://docs.solo.io/gloo-edge/main/guides/traffic_management/destination_types/rest_endpoint/
- Gloo REST API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/options/rest/rest.proto.sk/
- Gloo gRPC API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/options/grpc/grpc.proto.sk/
- Gloo AWS Lambda guide: https://docs.solo.io/gloo-edge/main/guides/traffic_management/destination_types/aws_lambda/
- Gloo AWS API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/options/aws/aws.proto.sk/
- Gloo `glooctl create secret aws` CLI reference: https://docs.solo.io/gloo-edge/main/reference/cli/glooctl_create_secret_aws/
- Gloo transformations docs: https://docs.solo.io/gloo-edge/latest/guides/traffic_management/request_processing/transformations/
- Gloo multiple destinations docs: https://docs.solo.io/gloo-edge/main/guides/traffic_management/destination_types/multi_destination/
- Gloo RateLimitConfig docs: https://docs.solo.io/gloo-edge/main/guides/security/rate_limiting/crds/
- Gloo observability docs: https://docs.solo.io/gloo-edge/main/guides/observability/
- Gloo Settings API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/settings.proto.sk/

## Issues Found
- The installation command pinned Gloo Edge to `1.16.0`, which is outdated compared with the current documented 1.21 series. Updated the example to `glooctl install gateway --version 1.21.0`.
- The post claimed direct routing to Google Cloud Functions, Azure Functions, and generic cloud-function metadata discovery. The official Gloo Edge API references support AWS Lambda function routing in this flow, so the wording was narrowed to AWS Lambda plus REST/gRPC service functions.
- The REST discovery example used `gloo.solo.io/scrape-openapi-*` annotations, which are Portal API document discovery annotations rather than Gloo Edge Upstream function routing configuration. Replaced them with `gloo.solo.io/upstream_config` carrying `kube.serviceSpec.rest.swaggerInfo`.
- The discovered REST Upstream example showed `rest` at the wrong level and simplified transformations as path/method fields. Updated it to the documented `spec.kube.serviceSpec.rest` structure with transformation templates.
- The AWS secret command used non-existent `--access-key-id` and `--secret-access-key` flags. Updated them to the documented `--access-key` and `--secret-key` flags.
- The gRPC discovered Upstream example used incorrect field names. Updated it to show `serviceSpec.grpc.descriptors`, `grpcServices`, `packageName`, `serviceName`, and `functionNames`.
- The transformation template examples used unsupported helper names such as `request_header` and `request_body`. Updated them to the documented `header(...)` helper and parsed-body template variables.
- The "Aggregating Multiple Functions" section incorrectly claimed `routeAction.multi` calls multiple backends in one request. Gloo multiple destinations perform weighted routing to one destination per request, so the section now describes weighted routing across functions.
- The rate-limit example omitted the required `rateLimits` actions and did not mention that `RateLimitConfig` is Enterprise. Added a route reference and a valid raw `generic_key` descriptor/action pair.
- The monitoring example used a non-existent `grafanaIntegration.enabled` field and implied automatic function-level Envoy metrics. Replaced it with documented Grafana integration settings and clarified that Envoy metrics are upstream-level unless functions are modeled as distinct upstreams.

## Review Notes
The tutorial remains conceptual because the sample services and Lambda functions are placeholders. I did not run the examples against a live Kubernetes cluster or AWS account; validation was performed against official Gloo/Solo documentation and API references.
