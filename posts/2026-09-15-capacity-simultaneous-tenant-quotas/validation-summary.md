# Validation Summary: How to Model Capacity When Multiple Tenants Hit Their Quotas at Once

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- AWS API Gateway throttling and quotas
- Kubernetes `ResourceQuota`
- Token-bucket rate limiting
- Multi-tenant capacity planning and statistical oversubscription

## Sources Consulted

- [AWS API Gateway: Throttle requests to your REST APIs for better throughput](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [RFC 3290: An Informal Management Model for Diffserv Routers](https://www.rfc-editor.org/rfc/rfc3290.html), Appendix A (token bucket fundamentals)

## Issues Found
No technical issues found.

## Review Notes
The token-bucket calculation is explicitly presented as an idealized upper-bound model, which appropriately avoids claiming exact behavior for every implementation. The CPU utilization target is also correctly identified as illustrative and subject to service-specific latency testing. No versions are pinned, and no deprecated APIs, commands, or configuration fields are used.
