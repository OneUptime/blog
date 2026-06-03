# Validation Summary: How to Use ECS with AWS App Mesh for Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS App Mesh
- Amazon ECS
- AWS Fargate
- Envoy proxy
- AWS Cloud Map
- AWS CLI
- Amazon CloudWatch
- AWS X-Ray

## Sources Consulted
- AWS App Mesh User Guide: What Is AWS App Mesh? https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html
- AWS App Mesh User Guide: Getting started with AWS App Mesh and Amazon ECS https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-ecs.html
- AWS App Mesh User Guide: Envoy image https://docs.aws.amazon.com/app-mesh/latest/userguide/envoy.html
- AWS App Mesh User Guide: Envoy configuration variables https://docs.aws.amazon.com/app-mesh/latest/userguide/envoy-config.html
- AWS CLI Command Reference: appmesh create-mesh https://docs.aws.amazon.com/cli/latest/reference/appmesh/create-mesh.html
- AWS CLI Command Reference: appmesh create-virtual-service https://docs.aws.amazon.com/cli/latest/reference/appmesh/create-virtual-service.html
- AWS CLI Command Reference: appmesh create-route https://docs.aws.amazon.com/cli/latest/reference/appmesh/create-route.html
- AWS CloudFormation Template Reference: App Mesh HttpRetryPolicy https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-appmesh-route-httpretrypolicy.html
- AWS X-Ray Developer Guide: Amazon EC2 and AWS App Mesh https://docs.aws.amazon.com/xray/latest/devguide/xray-services-appmesh.html

## Issues Found
- AWS has announced App Mesh end of support for September 30, 2026. Added a caveat near the introduction and scoped the closing guidance to existing deployments.
- The post described App Mesh as "injecting" Envoy into ECS tasks. ECS App Mesh configuration requires adding an Envoy sidecar to the task definition, so the wording was corrected.
- The explanation of `DROP_ALL` egress omitted the AWS API exception for `*.amazonaws.com`. Added that exception.
- The `backends` explanation overstated that the field alone prevents unintended communication. Clarified that it helps with restrictive egress configuration.
- The Envoy image tag was older than the currently recommended AWS App Mesh Envoy image. Updated the example to `v1.34.13.1-prod`.
- The observability section conflated metrics and X-Ray. Clarified that metrics go to CloudWatch or third-party tools, while traces go to X-Ray, and that Envoy-generated traces do not replace application-level instrumentation.

## Review Notes
The AWS CLI and App Mesh JSON snippets match the documented API shapes for meshes, virtual nodes, virtual routers, routes, virtual services, ECS proxy configuration, and X-Ray tracing environment variables. The local AWS CLI was not installed, so command validation was performed against official AWS CLI and AWS service documentation.
