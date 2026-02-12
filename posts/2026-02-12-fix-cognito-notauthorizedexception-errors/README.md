# How to Fix Cognito 'NotAuthorizedException' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Authentication, Troubleshooting

Description: A practical guide to diagnosing and resolving NotAuthorizedException errors in AWS Cognito, covering wrong credentials, app client misconfigurations, and token issues.

---

The `NotAuthorizedException` in AWS Cognito is one of those errors that can mean a dozen different things. Sometimes it's a wrong password. Other times it's a misconfigured app client, an expired token, or a secret hash you forgot to compute. Let's break down every scenario where this error shows up and how to fix each one.

## The Error Message

You'll typically see something like this:

```
NotAuthorizedException: Incorrect username or password.
```

Or sometimes:

```
NotAuthorizedException: Unable to verify secret hash for client <client_id>
```

Or even:

```
NotAuthorizedException: Access Token has been revoked
```

Each variant points to a different root cause.

## Cause 1: Wrong Username or Password

This is the most obvious one, but it's worth checking first. The error doesn't distinguish between a wrong username and a wrong password for security reasons - it always says "Incorrect username or password."

A few things to verify:

- Is the user actually confirmed? Unconfirmed users can't sign in.
- Is the user's account enabled? Admins can disable accounts.
- Has the user been forced to reset their password?

Check the user's status with the CLI.

```bash
# Check the user's current status in the user pool
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_ABC123 \
  --username testuser
```

Look at the `UserStatus` field. It should be `CONFIRMED`. If it's `FORCE_CHANGE_PASSWORD`, the user needs to complete the password change flow before they can sign in normally.

To force-confirm a user during development, use this command.

```bash
# Force-confirm a user so they can sign in immediately
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-east-1_ABC123 \
  --username testuser
```

And if you need to set a permanent password for testing purposes:

```bash
# Set a permanent password for a user (skips the force-change flow)
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_ABC123 \
  --username testuser \
  --password "MyNewP@ssw0rd!" \
  --permanent
```

## Cause 2: Missing Client Secret Hash

If your app client has a client secret (which is the default when creating one through CloudFormation or the CLI), you need to compute and send a `SECRET_HASH` with every authentication request. Forgetting this is extremely common.

Here's how to compute the secret hash in Python.

```python
import hmac
import hashlib
import base64

def compute_secret_hash(client_id, client_secret, username):
    """Compute the SECRET_HASH required by Cognito when the app client has a secret."""
    message = username + client_id
    dig = hmac.new(
        client_secret.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

# Usage
secret_hash = compute_secret_hash(
    client_id="your_client_id",
    client_secret="your_client_secret",
    username="testuser"
)
```

And the equivalent in Node.js.

```javascript
const crypto = require('crypto');

// Compute Cognito SECRET_HASH from client ID, secret, and username
function computeSecretHash(clientId, clientSecret, username) {
  return crypto
    .createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}
```

If you don't want to deal with secret hashes (common for frontend apps), create an app client without a secret.

```bash
# Create an app client without a client secret for browser-based apps
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_ABC123 \
  --client-name my-frontend-client \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

## Cause 3: Revoked or Expired Tokens

When you see `Access Token has been revoked`, it means the token was explicitly invalidated, usually through a global sign-out or admin sign-out call.

This can happen when:
- Someone called `AdminUserGlobalSignOut` or `GlobalSignOut`
- The user's password was changed by an admin
- Token revocation is enabled on the app client and the refresh token was revoked

To check if token revocation is enabled on your app client:

```bash
# Check app client settings including token revocation
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_ABC123 \
  --client-id your_client_id \
  --query 'UserPoolClient.EnableTokenRevocation'
```

The fix is straightforward - the user needs to sign in again to get fresh tokens.

## Cause 4: Disabled User

An admin might have disabled the user's account. This also triggers `NotAuthorizedException` without much additional context.

```bash
# Re-enable a disabled user account
aws cognito-idp admin-enable-user \
  --user-pool-id us-east-1_ABC123 \
  --username testuser
```

## Cause 5: Wrong Auth Flow Configuration

Each app client is configured to allow specific auth flows. If you're trying to use `USER_PASSWORD_AUTH` but the client only allows `USER_SRP_AUTH`, you'll get this error.

Check what flows are enabled.

```bash
# List the allowed auth flows for an app client
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_ABC123 \
  --client-id your_client_id \
  --query 'UserPoolClient.ExplicitAuthFlows'
```

Update the client to include the flow you need.

```bash
# Enable additional auth flows on the app client
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_ABC123 \
  --client-id your_client_id \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

## Cause 6: Custom Auth Lambda Trigger Failures

If you have Lambda triggers configured (pre-authentication, define auth challenge, etc.), they can throw errors that surface as `NotAuthorizedException`. Check the Lambda function's CloudWatch logs for the real error.

```bash
# Check the last 20 log events from a Cognito trigger Lambda
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-pre-auth-trigger \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --limit 20
```

If a pre-authentication trigger returns a failure response, Cognito translates that into a `NotAuthorizedException` for the client. Your Lambda function might be rejecting users based on custom logic that you forgot about.

## Handling the Error in Your App

Your application should handle `NotAuthorizedException` gracefully. Here's a pattern for doing that.

```javascript
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

async function signIn(username, password) {
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: 'your_client_id',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);
    return response.AuthenticationResult;
  } catch (error) {
    if (error.name === 'NotAuthorizedException') {
      // Could be wrong password, disabled user, revoked token, etc.
      console.error('Authentication failed:', error.message);

      if (error.message.includes('revoked')) {
        // Token was revoked - redirect to login
        return { action: 'REDIRECT_LOGIN' };
      }

      // Generic auth failure - show error to user
      return { action: 'SHOW_ERROR', message: 'Invalid credentials' };
    }
    throw error; // Re-throw unexpected errors
  }
}
```

## Debugging Checklist

When you hit `NotAuthorizedException`, work through this list:

1. Verify the username and password are correct
2. Check the user's status (CONFIRMED, enabled, not force-change-password)
3. Verify the app client configuration (secret, auth flows)
4. If using a client secret, confirm you're sending the SECRET_HASH
5. Check if tokens have been revoked
6. Review any Lambda triggers for custom rejection logic
7. Ensure you're using the correct user pool ID and client ID

Most of the time, it's either wrong credentials, a missing secret hash, or a misconfigured auth flow. Start with those three and you'll resolve the majority of cases.

For monitoring your authentication infrastructure and catching these issues in real-time, you might want to look into setting up proper [observability for your AWS services](https://oneuptime.com/blog/post/fix-sns-authorization-error-subscriptions/view).
