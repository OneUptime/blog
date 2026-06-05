# Validation Summary: How to Trace AWS API Gateway to Lambda End-to-End with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS API Gateway HTTP API and REST API
- AWS Lambda
- AWS X-Ray
- OpenTelemetry JavaScript API and propagation
- W3C Trace Context
- Serverless Framework
- DynamoDB AWS SDK for JavaScript v3
- API Gateway access logging

## Sources Consulted
- AWS API Gateway documentation: HTTP API Lambda proxy integration payload formats and lowercase headers, https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS API Gateway documentation: X-Ray tracing support for REST APIs, https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-xray.html
- AWS X-Ray documentation: API Gateway active tracing support and X-Ray-only REST API note, https://docs.aws.amazon.com/xray/latest/devguide/xray-services-apigateway.html
- AWS API Gateway documentation: HTTP API access log variables, https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- AWS API Gateway documentation: access logging variables including integration latency and X-Ray trace ID for REST APIs, https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-variables-for-access-logging.html
- AWS Lambda documentation: supported Node.js runtimes and deprecation dates, https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda documentation: Node.js context object and awsRequestId, https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html
- OpenTelemetry Lambda Node.js layer documentation, https://github.com/open-telemetry/opentelemetry-lambda/blob/main/nodejs/README.md
- OpenTelemetry specification: propagators and W3C Trace Context requirements, https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry JavaScript API documentation: W3CTraceContextPropagator and CompositePropagator, https://open-telemetry.github.io/opentelemetry-js/
- W3C Trace Context recommendation, https://www.w3.org/TR/trace-context/
- Serverless Framework documentation: HTTP API access logs, https://www.serverless.com/framework/docs/providers/aws/events/http-api
- Serverless Framework serverless.yml reference, https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml

## Issues Found
- The post described HTTP API v2 as creating gateway-level X-Ray spans through `tracing.apiGateway: true`. AWS documents X-Ray tracing for API Gateway REST APIs, while HTTP APIs pass request headers but do not create API Gateway X-Ray segments. I changed the explanation and Serverless snippet to enable Lambda tracing only for the HTTP API example, and added the REST API caveat where gateway segments are discussed.
- The access logging snippet used `provider.httpApi.accessLogFormat`, which is not the documented Serverless Framework syntax. I changed it to `provider.logs.httpApi.format`.
- The HTTP API access logging example included `$context.xrayTraceId`, which is documented for API Gateway access logging generally/REST API X-Ray use but is not listed in the HTTP API access log variable reference. I removed it from the HTTP API example and noted that REST APIs with X-Ray can include it.
- The Lambda runtime was `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. I updated the example to `nodejs22.x`, a currently supported runtime.
- The opening and testing sections implied a gateway span would always be part of the trace. I narrowed those statements so gateway segments are expected only for REST API X-Ray tracing or when those X-Ray segments are exported into the same backend.

## Review Notes
The manual JavaScript examples are syntactically valid CommonJS and use current OpenTelemetry and AWS SDK v3 APIs. Some span attributes use older HTTP semantic convention names such as `http.method` and `http.url`; these remain commonly emitted by existing instrumentation during the OpenTelemetry semantic convention stability migration, but future revisions could update examples to the stable names such as `http.request.method` and `url.full`.
