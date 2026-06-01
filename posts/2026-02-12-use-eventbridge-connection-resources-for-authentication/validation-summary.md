# Validation Summary: How to Use EventBridge Connection Resources for Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge API destinations
- Amazon EventBridge connections
- AWS CLI
- AWS CloudFormation
- AWS Secrets Manager
- OAuth client credentials
- API key and Basic authentication

## Sources Consulted
- Amazon EventBridge User Guide: Authorization methods for connections: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-target-connection-auth.html
- Amazon EventBridge User Guide: Connections for API targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-target-connection.html
- Amazon EventBridge User Guide: Connection states: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-target-connection-states.html
- Amazon EventBridge User Guide: Updating connections: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-target-connection-edit.html
- Amazon EventBridge User Guide: API destinations as targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-api-destinations.html
- AWS CLI Command Reference: events create-connection: https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/events/create-connection.html
- AWS CLI Command Reference: events update-connection: https://docs.aws.amazon.com/cli/latest/reference/events/update-connection.html
- AWS CloudFormation Template Reference: AWS::Events::Connection: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-connection.html
- AWS CloudFormation Template Reference: AWS::Events::Connection AuthParameters: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-events-connection-authparameters.html

## Issues Found
- The post said built-in EventBridge API key authentication could add a key as either a header or query parameter. AWS documents API key authorization as header-based. I changed the explanation and mermaid diagram to say API key auth adds a header.
- The query-parameter API key example incorrectly placed `api_key` inside `ApiKeyAuthParameters`, which would make it a header name. I changed the example to use `InvocationHttpParameters.QueryStringParameters` for the query parameter.
- The OAuth refresh explanation said EventBridge cached the token until expiry and automatically refreshed when needed. AWS documents refresh on `401` or `407`, and proactive refresh during an HTTPS invocation when the token expires within 60 seconds. I updated the wording to match.
- The update-credentials section claimed updates take effect immediately with no downtime. AWS documents re-authorization and connectivity verification for certain updates, so I softened the claim to avoid unsupported behavior.
- The connection-state list omitted current documented states (`UPDATING`, `DELETING`, `ACTIVE`, and `FAILED_CONNECTIVITY`) and described `AUTHORIZED` too narrowly. I updated the list and descriptions.
- The `DEAUTHORIZED` explanation said an OAuth connection in that state means token refresh failed. AWS documents that this can be one cause, so I changed it to "can mean".

## Review Notes
The AWS CLI examples and CloudFormation property names match current AWS documentation. The local environment did not have the AWS CLI installed, so CLI syntax was checked against AWS's official command reference instead of local `aws --help` output.
