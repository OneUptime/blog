# Validation Summary: How to Use Dapr with AWS Greengrass

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime for microservices)
- AWS Greengrass v2 (edge computing platform)
- AWS DynamoDB (state store)
- AWS SNS/SQS (pub/sub messaging)
- AWS IoT Core
- Python (application code)
- Docker (container runtime for Dapr sidecar)

## Sources Consulted
- AWS Greengrass v2 component recipe reference: https://docs.aws.amazon.com/greengrass/v2/developerguide/component-recipe-reference.html
- Dapr AWS DynamoDB state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr AWS SNS/SQS pub/sub component: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr State Management HTTP API: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub HTTP API: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- AWS CLI greengrassv2 reference: https://docs.aws.amazon.com/cli/latest/reference/greengrassv2/
- Docker Hub daprio/daprd: https://hub.docker.com/r/daprio/daprd

## Issues Found

1. **Greengrass recipe artifact field name `URI` was incorrect (line 64)**
   - **What was wrong:** The artifact URI field was written as `URI` (all caps). AWS Greengrass v2 recipe format requires `Uri` (Pascal case).
   - **Fix:** Changed `URI` to `Uri`.

2. **Dapr SNS/SQS pub/sub component type was incorrect (line 103)**
   - **What was wrong:** The component type was `pubsub.snssqs`, which is missing the required `aws.` namespace prefix. This would cause the Dapr component to fail to load.
   - **Fix:** Changed `pubsub.snssqs` to `pubsub.aws.snssqs`.

3. **Unused Python imports including `boto3` (lines 125-127)**
   - **What was wrong:** The Python code imported `json`, `os`, and `boto3` but none of these were used. Since Dapr handles all AWS communication, `boto3` is unnecessary, and its presence would cause an `ImportError` if not installed on the edge device.
   - **Fix:** Removed unused imports `json`, `os`, and `boto3`.

## Review Notes
- The Dapr component configurations use `secretKeyRef` to reference AWS credentials but do not include an `auth.secretStore` field at the spec level. In self-hosted (non-Kubernetes) mode, this field is required to tell Dapr which secret store to resolve from. Since this is an edge deployment (not Kubernetes), users may need to add this field or use environment variable-based authentication instead.
- The `daprio/daprd:1.13.0` image tag is used. Dapr 1.13.x has been superseded by newer releases. Users should consider using a more recent stable version for production edge deployments.
- The overview states Greengrass runs "Docker containers or JVM processes" — Greengrass v2 components can also be native processes (any executable), not just Docker or JVM. This is a simplification but not technically incorrect for the scope of this tutorial.
