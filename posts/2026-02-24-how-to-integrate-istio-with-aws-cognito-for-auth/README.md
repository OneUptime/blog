# How to Integrate Istio with AWS Cognito for Auth

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS Cognito, Authentication, JWT, Cloud Security

Description: Configure AWS Cognito as your identity provider with Istio for user authentication and authorization using JWT validation in your service mesh.

---

If you are running your Kubernetes cluster on AWS, using Cognito as your identity provider is a pragmatic choice. It is managed, scales automatically, and integrates neatly with other AWS services. Connecting Cognito to Istio lets you validate user tokens at the mesh level so your services do not need to handle authentication logic.

The integration relies on Cognito issuing JWTs and Istio validating them using Cognito's public JWKS endpoint. It is straightforward once you know where to find the right endpoints and how to structure the configuration.

## Setting Up AWS Cognito

Create a User Pool in Cognito. You can do this through the AWS Console or with the CLI:

```bash
aws cognito-idp create-user-pool \
  --pool-name mesh-users \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}"
```

Note the User Pool ID from the output (something like `us-east-1_aBcDeFgHi`).

Create a User Pool Client (this is the OAuth2 client your services will use):

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_aBcDeFgHi \
  --client-name mesh-client \
  --generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --supported-identity-providers COGNITO \
  --allowed-o-auth-flows code client_credentials \
  --allowed-o-auth-flows-user-pool-client \
  --allowed-o-auth-scopes openid email profile \
  --callback-urls "https://app.mycompany.com/callback"
```

Create a Resource Server for custom scopes:

```bash
aws cognito-idp create-resource-server \
  --user-pool-id us-east-1_aBcDeFgHi \
  --identifier "https://api.mycompany.com" \
  --name "Mesh API" \
  --scopes "ScopeName=read,ScopeDescription=Read access" \
          "ScopeName=write,ScopeDescription=Write access" \
          "ScopeName=admin,ScopeDescription=Admin access"
```

Set up the domain for Cognito's hosted UI:

```bash
aws cognito-idp create-user-pool-domain \
  --user-pool-id us-east-1_aBcDeFgHi \
  --domain mycompany-auth
```

## Understanding Cognito's JWT Endpoints

Cognito's OIDC endpoints follow a specific pattern based on your region and pool ID:

- **Issuer**: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_aBcDeFgHi`
- **JWKS URI**: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_aBcDeFgHi/.well-known/jwks.json`
- **Token endpoint**: `https://mycompany-auth.auth.us-east-1.amazoncognito.com/oauth2/token`
- **Authorize endpoint**: `https://mycompany-auth.auth.us-east-1.amazoncognito.com/oauth2/authorize`

The issuer URL does NOT have a trailing slash. This matters because Istio compares the issuer claim exactly.

## Configuring Istio Request Authentication

Create the RequestAuthentication resource:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: cognito-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_aBcDeFgHi"
      jwksUri: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_aBcDeFgHi/.well-known/jwks.json"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

One important detail with Cognito: by default, Cognito access tokens include a `client_id` claim but not a standard `aud` claim. ID tokens do include `aud`. If you want to validate the audience, you might need to use ID tokens or handle this in your authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: cognito-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_aBcDeFgHi"
      jwksUri: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_aBcDeFgHi/.well-known/jwks.json"
      forwardOriginalToken: true
```

## Egress Configuration

Istio needs to reach Cognito's JWKS endpoint to fetch signing keys. If you have strict egress policies, add a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: cognito
  namespace: istio-system
spec:
  hosts:
    - "cognito-idp.us-east-1.amazonaws.com"
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Authorization Policies

Require authentication:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-cognito-auth
  namespace: default
spec:
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
      to:
        - operation:
            notPaths: ["/healthz", "/readyz"]
```

Using Cognito groups for authorization. First, create groups in Cognito:

```bash
aws cognito-idp create-group \
  --user-pool-id us-east-1_aBcDeFgHi \
  --group-name admins \
  --description "Admin users"

aws cognito-idp create-group \
  --user-pool-id us-east-1_aBcDeFgHi \
  --group-name developers \
  --description "Developer users"

# Add user to group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_aBcDeFgHi \
  --username user@example.com \
  --group-name admins
```

Cognito includes the `cognito:groups` claim in tokens. Use it in Istio policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-only
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://cognito-idp.us-east-1.amazonaws.com/us-east-1_aBcDeFgHi/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[cognito:groups]
          values: ["admins"]
```

## Custom Attributes

Cognito supports custom attributes on user profiles. Add them to the user pool:

```bash
aws cognito-idp add-custom-attributes \
  --user-pool-id us-east-1_aBcDeFgHi \
  --custom-attributes Name=department,AttributeDataType=String,Mutable=true \
                      Name=team,AttributeDataType=String,Mutable=true
```

To include custom attributes in the access token, you need a Pre Token Generation Lambda trigger:

```python
def handler(event, context):
    event['response']['claimsOverrideDetails'] = {
        'claimsToAddOrOverride': {
            'department': event['request']['userAttributes'].get('custom:department', ''),
            'team': event['request']['userAttributes'].get('custom:team', '')
        }
    }
    return event
```

After attaching this Lambda to the User Pool, the tokens will include your custom attributes, which you can reference in Istio authorization policies.

## Getting Tokens

For user authentication (password grant):

```bash
TOKEN=$(aws cognito-idp initiate-auth \
  --client-id your-client-id \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=user@example.com,PASSWORD=UserPassword123 \
  | jq -r '.AuthenticationResult.AccessToken')
```

For machine-to-machine (client credentials):

```bash
TOKEN=$(curl -s -X POST \
  "https://mycompany-auth.auth.us-east-1.amazoncognito.com/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "scope=https://api.mycompany.com/read https://api.mycompany.com/write" \
  | jq -r '.access_token')
```

## Testing

```bash
# Should fail - no token
curl -s -o /dev/null -w "%{http_code}" https://app.mycompany.com/api/data

# Should succeed - valid token
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  https://app.mycompany.com/api/data

# Inspect token contents
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

## Token Refresh

Cognito access tokens expire after 1 hour by default (configurable between 5 minutes and 24 hours). Handle refresh:

```bash
aws cognito-idp initiate-auth \
  --client-id your-client-id \
  --auth-flow REFRESH_TOKEN_AUTH \
  --auth-parameters REFRESH_TOKEN=your-refresh-token
```

## Troubleshooting

**Tokens rejected by Istio**: Check the issuer URL. Cognito's issuer does not have a trailing slash. Verify by decoding the token:

```bash
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .iss
```

**Groups claim not present**: Make sure the user is actually assigned to a Cognito group. The `cognito:groups` claim only appears when the user belongs to at least one group.

**Custom scope not in token**: Resource server scopes only work with client credentials or authorization code flows with the hosted UI. They do not work with the USER_PASSWORD_AUTH flow through the API.

Cognito with Istio gives you a fully AWS-native authentication stack. No extra infrastructure to manage, automatic scaling, and tight integration with IAM, Lambda, and other AWS services.
