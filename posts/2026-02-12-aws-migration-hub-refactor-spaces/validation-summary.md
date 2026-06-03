# Validation Summary: How to Use AWS Migration Hub Refactor Spaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Migration Hub Refactor Spaces
- AWS CLI
- Amazon API Gateway
- AWS Transit Gateway
- AWS Lambda
- Amazon CloudWatch
- Python
- Boto3

## Sources Consulted
- AWS CLI Command Reference: create-environment - https://docs.aws.amazon.com/cli/latest/reference/migration-hub-refactor-spaces/create-environment.html
- AWS CLI Command Reference: create-application - https://docs.aws.amazon.com/cli/latest/reference/migration-hub-refactor-spaces/create-application.html
- AWS CLI Command Reference: create-service - https://docs.aws.amazon.com/cli/latest/reference/migration-hub-refactor-spaces/create-service.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/migration-hub-refactor-spaces/create-route.html
- AWS CLI Command Reference: list-routes - https://docs.aws.amazon.com/cli/latest/reference/migration-hub-refactor-spaces/list-routes.html
- AWS CLI Command Reference: update-route - https://docs.aws.amazon.com/cli/latest/reference/migration-hub-refactor-spaces/update-route.html
- AWS Migration Hub Refactor Spaces API Reference: CreateService - https://docs.aws.amazon.com/migrationhub-refactor-spaces/latest/APIReference/API_CreateService.html
- AWS Migration Hub Refactor Spaces User Guide: How Refactor Spaces works - https://docs.aws.amazon.com/migrationhub-refactor-spaces/latest/userguide/how-it-works.html
- AWS Migration Hub Refactor Spaces User Guide: Concepts - https://docs.aws.amazon.com/migrationhub-refactor-spaces/latest/userguide/welcome-concepts.html
- Boto3 MigrationHubRefactorSpaces client reference: create_service, create_route, get_service - https://docs.aws.amazon.com/boto3/latest/reference/services/migration-hub-refactor-spaces/

## Issues Found
- AWS Migration Hub availability changed: official AWS documentation states that AWS Migration Hub is no longer open to new customers as of November 7, 2025. Added a caveat near the start of the post so readers understand the current access limitation.
- The post described Refactor Spaces as handling "service discovery." AWS documentation describes automatic DNS resolution for service endpoints, not a general-purpose service discovery system. Updated the wording to "DNS resolution."
- Several placeholder Refactor Spaces IDs did not match AWS-documented identifier constraints. Updated examples to use valid-looking `env-`, `app-`, `svc-`, and `rte-` identifiers with the documented lengths and allowed characters.
- Several placeholder VPC IDs did not match AWS-documented VPC ID constraints. Updated them to valid-looking VPC IDs.
- The Lambda ARN example used a nine-digit account ID. Updated it to a 12-digit AWS account ID.
- URL service endpoint examples used `.internal` hostnames. The Refactor Spaces URL endpoint docs require RFC 3986 URLs and state that domain-name hosts must be publicly resolvable; updated create-service examples to use private IP URLs inside the service VPC.
- The CloudWatch example used a hard-coded Refactor Spaces API Gateway name derived from an invalid application ID. Updated it to tell readers to replace the API name with the actual API Gateway name created by Refactor Spaces.

## Review Notes
- The AWS CLI was not installed in the workspace, so CLI validation was performed against the current official AWS CLI command reference rather than local `aws --help` output.
- The Python examples use Boto3 request and response field names that match the official Boto3 MigrationHubRefactorSpaces client reference.
