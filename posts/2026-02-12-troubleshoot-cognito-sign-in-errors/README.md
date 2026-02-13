# How to Troubleshoot Cognito Sign-In Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Debugging, Authentication

Description: A troubleshooting guide for common AWS Cognito sign-in errors including NotAuthorizedException, UserNotFoundException, token issues, Lambda trigger failures, and configuration mistakes.

---

Cognito sign-in errors can be frustrating because the error messages are often vague for security reasons. A generic "NotAuthorizedException" could mean a dozen different things. Let's go through the most common sign-in errors, what actually causes them, and how to fix each one.

## The Most Common Errors

Here's a quick reference of Cognito error codes you'll encounter:

```
NotAuthorizedException        - Wrong password, disabled user, or invalid refresh token
UserNotFoundException         - User doesn't exist (if your pool allows this error)
UserNotConfirmedException     - User hasn't verified their email/phone
PasswordResetRequiredException - Admin has forced a password reset
InvalidParameterException     - Missing or malformed request parameters
InvalidPasswordException      - Password doesn't meet policy requirements
TooManyRequestsException      - You've hit Cognito's rate limits
CodeMismatchException         - Wrong verification or MFA code
ExpiredCodeException          - Verification code has expired
```

## NotAuthorizedException

This is the most common and most ambiguous error. It can mean several things depending on context.

**Wrong password**: The most obvious cause. But Cognito won't tell you whether the username or password is wrong - by default it returns the same error for both.

**User is disabled**: An admin has called `AdminDisableUser`. The user exists but can't log in.

**App client secret mismatch**: If your app client has a secret and you're not including it (or including the wrong one) in the auth request.

**Invalid refresh token**: When trying to refresh, the token might be expired or revoked.

Here's how to diagnose it:

```javascript
async function diagnoseSignInError(username, error) {
    console.error('Sign-in error:', error.name, error.message);

    if (error.name === 'NotAuthorizedException') {
        // Check if the user exists and is enabled
        try {
            const userInfo = await client.send(new AdminGetUserCommand({
                UserPoolId: USER_POOL_ID,
                Username: username
            }));

            if (!userInfo.Enabled) {
                console.log('CAUSE: User account is disabled');
                return 'ACCOUNT_DISABLED';
            }

            if (userInfo.UserStatus === 'FORCE_CHANGE_PASSWORD') {
                console.log('CAUSE: User must change their temporary password');
                return 'PASSWORD_CHANGE_REQUIRED';
            }

            console.log('CAUSE: Incorrect password');
            return 'WRONG_PASSWORD';
        } catch (lookupError) {
            if (lookupError.name === 'UserNotFoundException') {
                console.log('CAUSE: User does not exist');
                return 'USER_NOT_FOUND';
            }
            throw lookupError;
        }
    }
}
```

## UserNotConfirmedException

This happens when a user signed up but never verified their email address.

Handle unconfirmed users and trigger a new verification code:

```javascript
async function handleUnconfirmedUser(username) {
    try {
        // Resend the confirmation code
        await client.send(new ResendConfirmationCodeCommand({
            ClientId: CLIENT_ID,
            Username: username
        }));
        console.log('Verification code resent');
        return { action: 'CONFIRM_REQUIRED', message: 'Please check your email for a verification code' };
    } catch (error) {
        if (error.name === 'LimitExceededException') {
            return { action: 'WAIT', message: 'Too many attempts. Please wait before requesting a new code.' };
        }
        throw error;
    }
}
```

## FORCE_CHANGE_PASSWORD Status

When an admin creates a user with a temporary password, the user gets stuck in `FORCE_CHANGE_PASSWORD` status. They need to complete the `NEW_PASSWORD_REQUIRED` challenge.

Here's how to handle this on the client:

```javascript
async function handleNewPasswordRequired(username, session, newPassword) {
    try {
        const response = await client.send(new RespondToAuthChallengeCommand({
            ChallengeName: 'NEW_PASSWORD_REQUIRED',
            ClientId: CLIENT_ID,
            Session: session,
            ChallengeResponses: {
                USERNAME: username,
                NEW_PASSWORD: newPassword,
                // Include required attributes if any
                'userAttributes.name': 'John Doe'
            }
        }));

        return response.AuthenticationResult;
    } catch (error) {
        if (error.name === 'InvalidPasswordException') {
            console.log('New password does not meet requirements');
        }
        throw error;
    }
}

// In your sign-in flow:
async function signIn(username, password) {
    try {
        const response = await client.send(new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CLIENT_ID,
            AuthParameters: { USERNAME: username, PASSWORD: password }
        }));

        // Check if a challenge is returned instead of tokens
        if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            // Prompt user for new password, then:
            return { challenge: 'NEW_PASSWORD_REQUIRED', session: response.Session };
        }

        return { tokens: response.AuthenticationResult };
    } catch (error) {
        console.error('Sign-in failed:', error.name);
        throw error;
    }
}
```

## Lambda Trigger Failures

If you have Lambda triggers attached to your user pool, any unhandled error in those triggers will block authentication. The user sees a generic error and you're left wondering what happened.

Check CloudWatch Logs for your trigger functions:

```bash
# List recent log events for a trigger Lambda
aws logs filter-log-events \
    --log-group-name /aws/lambda/your-pre-auth-function \
    --start-time $(date -d '1 hour ago' +%s000) \
    --query 'events[].message' \
    --output text

# Check for errors specifically
aws logs filter-log-events \
    --log-group-name /aws/lambda/your-pre-auth-function \
    --filter-pattern "ERROR" \
    --start-time $(date -d '1 hour ago' +%s000)
```

Common trigger issues:

- **Pre Authentication trigger** throws an error to block a user, but the error message is confusing on the client side.
- **Pre Token Generation trigger** times out because it's making slow database queries.
- **Define Auth Challenge trigger** has a logic bug in the session checking code.

Add comprehensive error handling to every trigger:

```javascript
// Good pattern for Lambda triggers
exports.handler = async (event) => {
    try {
        console.log('Event:', JSON.stringify(event, null, 2));

        // Your logic here
        // ...

        return event;
    } catch (error) {
        console.error('Trigger error:', error);
        // For most triggers, you should return the event even on error
        // to avoid blocking authentication
        // Only throw if you intentionally want to block the user
        return event;
    }
};
```

## Token Validation Errors

After successful sign-in, you might still get errors when using the tokens. Here are common ones.

**"Token is expired"**: ID and access tokens expire after 1 hour by default. You need to use the refresh token to get new ones. See [handling Cognito token refresh in applications](https://oneuptime.com/blog/post/2026-02-12-cognito-token-refresh-applications/view).

**"Token use mismatch"**: You're sending an ID token where an access token is expected, or vice versa. Check the `token_use` claim.

**"Invalid signature"**: Usually means the JWKS keys have rotated and your cached keys are stale. Clear your JWKS cache and re-fetch.

Debug token issues with this helper:

```javascript
const jwt = require('jsonwebtoken');

function debugToken(token) {
    try {
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded) {
            console.log('ERROR: Cannot decode token - not a valid JWT');
            return;
        }

        console.log('Header:', JSON.stringify(decoded.header, null, 2));
        console.log('Token use:', decoded.payload.token_use);
        console.log('Issuer:', decoded.payload.iss);
        console.log('Audience/Client:', decoded.payload.aud || decoded.payload.client_id);
        console.log('Subject:', decoded.payload.sub);

        const now = Math.floor(Date.now() / 1000);
        const exp = decoded.payload.exp;
        const iat = decoded.payload.iat;

        console.log('Issued at:', new Date(iat * 1000).toISOString());
        console.log('Expires at:', new Date(exp * 1000).toISOString());
        console.log('Is expired:', now > exp);
        console.log('Time until expiry:', `${Math.round((exp - now) / 60)} minutes`);

        if (decoded.payload['cognito:groups']) {
            console.log('Groups:', decoded.payload['cognito:groups']);
        }
    } catch (error) {
        console.log('ERROR decoding token:', error.message);
    }
}
```

## Rate Limiting (TooManyRequestsException)

Cognito has built-in rate limits. The defaults are:

- **User Pool operations**: 120 requests per second for most operations
- **Token endpoint**: 120 requests per second
- **Hosted UI**: 1000 requests per second

If you're hitting rate limits, here are your options:

```javascript
// Implement exponential backoff for retries
async function withRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.name === 'TooManyRequestsException' && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.log(`Rate limited, retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

// Usage
const result = await withRetry(() => signIn(email, password));
```

For persistent rate limit issues, request a quota increase through AWS Support.

## Configuration Checklist

When sign-in fails and you've ruled out obvious causes, run through this checklist:

1. **Auth flow enabled?** - Check that `USER_PASSWORD_AUTH` or `USER_SRP_AUTH` is enabled on your app client.
2. **Client ID correct?** - A wrong client ID gives `ResourceNotFoundException`.
3. **Region correct?** - The SDK must target the same region as your user pool.
4. **Client secret included?** - If your app client has a secret, you must compute and include the `SECRET_HASH`.
5. **User pool status?** - Is the user pool active? Check the console.
6. **User confirmed?** - Check user status in the console.
7. **Password policy changed?** - If you tightened password requirements, existing users with weaker passwords might not be able to log in during certain flows.

Check the app client configuration:

```bash
# View app client settings
aws cognito-idp describe-user-pool-client \
    --user-pool-id us-east-1_XXXXXXXXX \
    --client-id your-client-id \
    --query '{AuthFlows: UserPoolClient.ExplicitAuthFlows, HasSecret: UserPoolClient.ClientSecret != null}'
```

For the full token validation process, check out [decoding and validating Cognito JWT tokens](https://oneuptime.com/blog/post/2026-02-12-decode-validate-cognito-jwt-tokens/view).

## Wrapping Up

Cognito errors are intentionally vague to prevent information leakage, which is good for security but painful for debugging. The key is building good diagnostic tooling into your application from the start - log the error names (not just messages), check user status through the admin APIs, and always verify CloudWatch logs for Lambda trigger failures. Most sign-in issues come down to one of a few causes: wrong credentials, unconfirmed users, disabled accounts, or misconfigured app clients. Work through the checklist systematically and you'll find the root cause quickly.
