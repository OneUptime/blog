# How to Use EventBridge Connection Resources for Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EventBridge, Authentication, OAuth, API Key, Connections, Security

Description: Deep dive into EventBridge Connection resources for managing authentication to external APIs and webhook endpoints

---

When EventBridge sends events to external HTTP endpoints via API Destinations, it needs credentials. You could hardcode these in your infrastructure templates, but that is a security risk and a maintenance nightmare. EventBridge Connections solve this by providing a dedicated resource for managing authentication credentials.

Connections handle three authentication methods, store credentials securely in Secrets Manager, and even manage OAuth token refresh automatically. This guide covers everything you need to know about working with them.

## What Is a Connection Resource?

A Connection is an EventBridge resource that encapsulates authentication details for external API calls. When you create an API Destination, you associate it with a Connection. Every time EventBridge invokes that API Destination, it fetches the credentials from the Connection and attaches them to the HTTP request.

```mermaid
graph TD
    A[EventBridge Rule] --> B[API Destination]
    B --> C[Connection]
    C --> D{Auth Type?}
    D -->|API Key| E[Adds Header/Query Param]
    D -->|Basic| F[Adds Authorization Header]
    D -->|OAuth| G[Fetches Token from Auth Server]
    G --> H[Caches Token Until Expiry]
    H --> I[Adds Bearer Token Header]
    E --> J[HTTP Request to Endpoint]
    F --> J
    I --> J
```

Behind the scenes, Connections use AWS Secrets Manager to store credentials. EventBridge creates and manages the secret automatically - you never interact with it directly.

## Authentication Type 1: API Key

API Key authentication adds a key-value pair as a header or query parameter to every request. This is the most common auth method for webhook services.

### Example: Datadog API Key

Datadog's API expects an `DD-API-KEY` header:

```bash
# Connection with Datadog API key as a custom header
aws events create-connection \
  --name datadog-connection \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "DD-API-KEY",
      "ApiKeyValue": "your-datadog-api-key-here"
    }
  }'
```

### Example: Custom Service with Query Parameter

Some APIs expect the key as a query parameter:

```bash
# Connection with API key passed as a query parameter
aws events create-connection \
  --name custom-service-connection \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "api_key",
      "ApiKeyValue": "sk_live_abc123"
    }
  }'
```

When using `API_KEY` auth type, EventBridge adds the key as an HTTP header by default. The `ApiKeyName` becomes the header name and `ApiKeyValue` becomes the header value.

## Authentication Type 2: Basic Auth

Basic authentication encodes a username and password as a Base64 string in the `Authorization` header.

```bash
# Connection with basic username/password authentication
aws events create-connection \
  --name jira-connection \
  --authorization-type BASIC \
  --auth-parameters '{
    "BasicAuthParameters": {
      "Username": "admin@company.com",
      "Password": "api-token-from-jira"
    }
  }'
```

EventBridge automatically handles the Base64 encoding. The resulting HTTP request includes a header like `Authorization: Basic YWRtaW5AY29tcGFueS5jb206YXBpLXRva2VuLWZyb20tamlyYQ==`.

## Authentication Type 3: OAuth Client Credentials

This is the most powerful auth type. EventBridge handles the full OAuth client credentials flow:

1. Sends client ID and secret to the authorization endpoint
2. Receives an access token
3. Caches the token until it expires
4. Automatically refreshes when needed
5. Attaches the token to each API request

```bash
# Connection with OAuth client credentials flow
aws events create-connection \
  --name salesforce-connection \
  --authorization-type OAUTH_CLIENT_CREDENTIALS \
  --auth-parameters '{
    "OAuthParameters": {
      "ClientParameters": {
        "ClientID": "your-salesforce-client-id",
        "ClientSecret": "your-salesforce-client-secret"
      },
      "AuthorizationEndpoint": "https://login.salesforce.com/services/oauth2/token",
      "HttpMethod": "POST",
      "OAuthHttpParameters": {
        "BodyParameters": [
          {
            "Key": "grant_type",
            "Value": "client_credentials",
            "IsValueSecret": false
          }
        ]
      }
    }
  }'
```

### Adding Extra OAuth Parameters

Some OAuth providers require additional parameters. You can add headers, query parameters, and body parameters to both the authorization request and the API request.

```bash
# OAuth connection with additional custom parameters
aws events create-connection \
  --name custom-oauth-connection \
  --authorization-type OAUTH_CLIENT_CREDENTIALS \
  --auth-parameters '{
    "OAuthParameters": {
      "ClientParameters": {
        "ClientID": "client-id",
        "ClientSecret": "client-secret"
      },
      "AuthorizationEndpoint": "https://auth.example.com/oauth/token",
      "HttpMethod": "POST",
      "OAuthHttpParameters": {
        "BodyParameters": [
          {"Key": "grant_type", "Value": "client_credentials", "IsValueSecret": false},
          {"Key": "scope", "Value": "events.write", "IsValueSecret": false}
        ],
        "HeaderParameters": [
          {"Key": "Content-Type", "Value": "application/x-www-form-urlencoded", "IsValueSecret": false}
        ]
      }
    },
    "InvocationHttpParameters": {
      "HeaderParameters": [
        {"Key": "X-Custom-Header", "Value": "custom-value", "IsValueSecret": false}
      ]
    }
  }'
```

The `InvocationHttpParameters` section adds extra parameters to the actual API call (not the auth endpoint). This is useful when the target API requires custom headers alongside the OAuth token.

## Additional Request Parameters

All three auth types support `InvocationHttpParameters` for adding extra headers, query parameters, or body parameters to the final API request:

```bash
# Connection with API key plus additional custom headers
aws events create-connection \
  --name enriched-connection \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "X-API-Key",
      "ApiKeyValue": "your-api-key"
    },
    "InvocationHttpParameters": {
      "HeaderParameters": [
        {"Key": "Content-Type", "Value": "application/json", "IsValueSecret": false},
        {"Key": "X-Source", "Value": "aws-eventbridge", "IsValueSecret": false},
        {"Key": "X-Secret-Token", "Value": "webhook-signing-secret", "IsValueSecret": true}
      ]
    }
  }'
```

Parameters marked with `"IsValueSecret": true` are stored encrypted in Secrets Manager and not returned in API responses.

## Managing Connections with CloudFormation

For infrastructure-as-code, define Connections in CloudFormation:

```yaml
# CloudFormation template for EventBridge Connection and API Destination
Resources:
  WebhookConnection:
    Type: AWS::Events::Connection
    Properties:
      Name: webhook-connection
      AuthorizationType: API_KEY
      AuthParameters:
        ApiKeyAuthParameters:
          ApiKeyName: Authorization
          ApiKeyValue: !Sub "Bearer {{resolve:secretsmanager:webhook-token}}"

  WebhookDestination:
    Type: AWS::Events::ApiDestination
    Properties:
      Name: webhook-destination
      ConnectionArn: !GetAtt WebhookConnection.Arn
      InvocationEndpoint: https://api.example.com/webhooks
      HttpMethod: POST
      InvocationRateLimitPerSecond: 10

  WebhookRule:
    Type: AWS::Events::Rule
    Properties:
      Name: send-to-webhook
      EventPattern:
        source:
          - "my.application"
      Targets:
        - Id: webhook-target
          Arn: !GetAtt WebhookDestination.Arn
          RoleArn: !GetAtt EventBridgeRole.Arn
```

Use `{{resolve:secretsmanager:...}}` dynamic references to pull sensitive values from Secrets Manager rather than hardcoding them in templates.

## Updating Connection Credentials

When credentials rotate, update the Connection:

```bash
# Update the API key on an existing connection
aws events update-connection \
  --name datadog-connection \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "DD-API-KEY",
      "ApiKeyValue": "new-rotated-api-key"
    }
  }'
```

The update takes effect immediately. Any in-flight requests use the old credentials, and new requests use the updated ones. There is no downtime.

For OAuth connections, if the client secret rotates:

```bash
# Update OAuth client credentials after rotation
aws events update-connection \
  --name salesforce-connection \
  --authorization-type OAUTH_CLIENT_CREDENTIALS \
  --auth-parameters '{
    "OAuthParameters": {
      "ClientParameters": {
        "ClientID": "your-client-id",
        "ClientSecret": "new-rotated-client-secret"
      },
      "AuthorizationEndpoint": "https://login.salesforce.com/services/oauth2/token",
      "HttpMethod": "POST"
    }
  }'
```

## Connection States

Connections go through several states:

- **CREATING** - Being created
- **AUTHORIZING** - OAuth flow in progress
- **AUTHORIZED** - Ready to use (OAuth token obtained)
- **DEAUTHORIZING** - OAuth token being revoked
- **DEAUTHORIZED** - Needs re-authorization

Check connection status:

```bash
# Check the current state of a connection
aws events describe-connection \
  --name salesforce-connection \
  --query '{Name: Name, State: ConnectionState, AuthType: AuthorizationType}'
```

If an OAuth connection enters `DEAUTHORIZED` state, it means the token refresh failed. Check that the authorization endpoint is reachable and credentials are still valid.

## Security Best Practices

1. **Use least-privilege IAM policies** - Only grant `events:CreateConnection` to roles that need to manage connections
2. **Mark sensitive values** - Set `IsValueSecret: true` for any parameter that should be encrypted
3. **Rotate credentials regularly** - Use `update-connection` to rotate API keys and OAuth secrets
4. **Monitor connection health** - Set up alarms on `FailedInvocations` for early warning of auth issues
5. **Use separate connections per service** - Do not share connections across unrelated API Destinations

## Wrapping Up

EventBridge Connections provide a clean, secure way to manage authentication for external API integrations. They handle the tedious parts - credential storage, OAuth token refresh, and secret management - so you can focus on the event routing logic. Combined with API Destinations, they let you build webhook integrations without any Lambda functions.

For a complete walkthrough of building webhook integrations with API Destinations, see our guide on [using EventBridge API Destinations for Webhooks](https://oneuptime.com/blog/post/2026-02-12-use-eventbridge-api-destinations-for-webhooks/view).
