# Validation Summary: How to Build API Gateway Architecture

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- API gateway architecture
- Kong Gateway
- NGINX
- AWS API Gateway / CloudFormation / SAM / Lambda authorizers
- Node.js / Express middleware
- JWT authentication
- Redis-backed rate limiting
- Prometheus metrics
- Docker Compose
- Kubernetes Deployments

## Sources Consulted
- Kong Gateway JWT plugin documentation: https://developer.konghq.com/plugins/jwt/
- Kong Gateway Rate Limiting plugin configuration reference: https://developer.konghq.com/plugins/rate-limiting/reference/
- Kong Gateway Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/
- Kong Gateway DB-less/declarative configuration documentation: https://developer.konghq.com/gateway/db-less-mode/
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- AWS CloudFormation `AWS::ApiGateway::Method` integration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigateway-method-integration.html
- AWS CloudFormation `AWS::ApiGateway::Authorizer` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-authorizer.html
- AWS API Gateway Lambda authorizer guide: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Redis transactions documentation: https://redis.io/docs/latest/develop/using-commands/transactions/
- IETF RateLimit header fields draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/

## Issues Found
- The JWT middleware configured both `HS256` and `RS256` while using a single `JWT_SECRET`. RS256 requires asymmetric key material, so the example was changed to `HS256` only.
- The Redis rate limiter described a Redis pipeline as atomic. Pipelines batch commands but do not provide transaction semantics, so the example now uses `redis.multi()` and updates the comments accordingly.
- The response transformation middleware assumed `transformed.meta` existed when pagination was enabled. It now initializes `meta` before adding pagination data.
- The Kong rate-limiting examples used deprecated flat Redis fields such as `redis_host` and `redis_port`. They now use the current nested `redis.host`, `redis.port`, `redis.password`, and `redis.database` shape.
- The Kong transformer example used unsupported dynamic placeholders for `$(now)` and `$(latency)` in simple transformer snippets. These were replaced with static header transformations.
- The Docker Compose example used the obsolete top-level `version` field and older Kong `3.5` image tags. The version key was removed and the Kong image tag was updated to `3.14`.
- The full Kong declarative configuration had two top-level `plugins:` keys, causing one list to override the other in YAML parsers. The plugin entries were merged into a single list.
- The NGINX product route configured `proxy_cache_valid` and `proxy_cache_use_stale` without defining or enabling a cache zone. Added `proxy_cache_path` and `proxy_cache product_cache`.
- The AWS API Gateway template omitted permission for API Gateway to invoke the Lambda authorizer. Added an `AWS::Lambda::Permission` resource.
- The AWS API Gateway template mapped a request ID header incorrectly and attempted request body transformation with `HTTP_PROXY`, which is pass-through. Removed the invalid mapping and changed the transformed POST integration to `HTTP` with integration and method responses.
- The Kubernetes Deployment snippet lacked `template.metadata.labels`, so the selector did not match pods. Added matching labels.
- The Kubernetes Kong health probes used `/health` on the proxy port, which Kong does not expose by default. Changed the probes to execute `kong health`.

## Review Notes
The post is technically relevant and broadly accurate after fixes. Some snippets remain illustrative rather than complete production manifests, especially the Kubernetes Kong deployment, which would still need environment, service, and database configuration in a real cluster.
