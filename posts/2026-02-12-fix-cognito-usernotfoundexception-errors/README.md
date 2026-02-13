# How to Fix Cognito 'UserNotFoundException' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Authentication, Troubleshooting

Description: Troubleshoot and resolve UserNotFoundException errors in AWS Cognito, including alias conflicts, case sensitivity issues, and migration triggers.

---

Getting a `UserNotFoundException` from AWS Cognito seems pretty self-explanatory - the user doesn't exist. But in practice, there are several surprising reasons this error shows up even when you're sure the user is there. Let's dig into each one and see how to fix them.

## The Basic Error

The error typically looks like this:

```
UserNotFoundException: User does not exist.
```

You'll see it during sign-in, password reset, user confirmation, or any operation that references a specific user. Let's walk through the reasons.

## Cause 1: The User Really Doesn't Exist

Let's start with the obvious. Maybe the user hasn't signed up yet, or they signed up in a different user pool, or in a different AWS region.

Verify the user exists in the correct pool.

```bash
# Check if a user exists in the specified user pool
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_ABC123 \
  --username testuser
```

If you get `UserNotFoundException` from this command too, the user genuinely isn't in this pool. Double-check the user pool ID and region.

You can also list users to search by email or other attributes.

```bash
# Search for a user by email attribute
aws cognito-idp list-users \
  --user-pool-id us-east-1_ABC123 \
  --filter 'email = "test@example.com"'
```

## Cause 2: Case Sensitivity Issues

This is a sneaky one. By default, Cognito usernames are case-sensitive. If someone signed up as "TestUser" and tries to log in as "testuser", Cognito treats them as different users.

Starting with newer user pools, you can configure case insensitivity during pool creation, but you can't change it after the fact.

```bash
# Create a user pool with case-insensitive usernames
aws cognito-idp create-user-pool \
  --pool-name my-pool \
  --username-configuration CaseSensitive=false
```

If you already have a pool with case-sensitive usernames, you'll need to handle it in your application layer. Normalize usernames to lowercase before sending them to Cognito.

```javascript
// Always normalize the username to lowercase before calling Cognito
async function signIn(username, password) {
  const normalizedUsername = username.toLowerCase().trim();

  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: 'your_client_id',
    AuthParameters: {
      USERNAME: normalizedUsername,
      PASSWORD: password,
    },
  });

  return client.send(command);
}
```

## Cause 3: Using Email as Username with Aliases

Cognito has two modes for handling email as a sign-in identifier: username aliases and email as the username attribute. The behavior differs significantly.

When you use **aliases** (email or phone as alias), the actual username is a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`. The user can sign in with their email, but if your code passes the email to admin APIs (which expect the actual username), you'll get `UserNotFoundException`.

To find the actual username from an email when using aliases:

```bash
# Look up the user by their email alias to find the real username
aws cognito-idp list-users \
  --user-pool-id us-east-1_ABC123 \
  --filter 'email = "user@example.com"' \
  --query 'Users[0].Username'
```

Then use that UUID-style username with admin APIs.

When you use **email as the username** (configured at pool creation), the email address IS the username and you should pass it directly. Make sure you're using the right mode for your pool.

## Cause 4: User Pool Migration Trigger Not Configured

If you're migrating users from another system, Cognito supports a "User Migration" Lambda trigger. When enabled, if Cognito can't find a user locally, it calls your Lambda to check the old system and automatically migrate the user.

If you haven't set up this trigger yet, or if it's failing silently, users from the old system will get `UserNotFoundException`.

Here's a basic migration trigger in Node.js.

```javascript
// Lambda function for Cognito User Migration trigger
exports.handler = async (event) => {
  if (event.triggerSource === 'UserMigration_Authentication') {
    // User is trying to sign in - check old database
    const user = await lookupUserInOldSystem(
      event.userName,
      event.request.password
    );

    if (user) {
      // Return user attributes so Cognito creates the user
      event.response.userAttributes = {
        email: user.email,
        email_verified: 'true',
        name: user.name,
      };
      event.response.finalUserStatus = 'CONFIRMED';
      event.response.messageAction = 'SUPPRESS';
    }
  }

  if (event.triggerSource === 'UserMigration_ForgotPassword') {
    // User is trying to reset password - check old database
    const user = await lookupUserInOldSystemByUsername(event.userName);

    if (user) {
      event.response.userAttributes = {
        email: user.email,
        email_verified: 'true',
      };
      event.response.messageAction = 'SUPPRESS';
    }
  }

  return event;
};
```

Attach this Lambda to your user pool.

```bash
# Set the user migration Lambda trigger on the user pool
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_ABC123 \
  --lambda-config UserMigration=arn:aws:lambda:us-east-1:123456789012:function:migrate-user
```

## Cause 5: Federated Users and External Providers

Users who signed in through external identity providers (Google, Facebook, SAML, etc.) have usernames that include the provider prefix, like `Google_1234567890`. If you try to look them up without the prefix, Cognito won't find them.

```bash
# List users and filter by the identity provider
aws cognito-idp list-users \
  --user-pool-id us-east-1_ABC123 \
  --filter 'cognito:user_status = "EXTERNAL_PROVIDER"'
```

When linking federated users to local accounts, make sure you're referencing the correct username format.

## Cause 6: Prevent User Existence Errors Setting

Here's a subtle one. Cognito has a setting called "Prevent user existence errors" on app clients. When enabled, instead of returning `UserNotFoundException`, Cognito returns a generic `NotAuthorizedException` with "Incorrect username or password." This is a security best practice because it prevents username enumeration attacks.

If you're suddenly not seeing `UserNotFoundException` anymore and getting `NotAuthorizedException` instead, check this setting.

```bash
# Check if the app client prevents user existence errors
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_ABC123 \
  --client-id your_client_id \
  --query 'UserPoolClient.PreventUserExistenceErrors'
```

If it returns `ENABLED`, that's why you're seeing `NotAuthorizedException` instead. This is actually the recommended setting for production.

## Handling the Error Gracefully

Your app should handle this error without revealing whether an account exists. Here's a solid pattern.

```python
import boto3
from botocore.exceptions import ClientError

cognito = boto3.client('cognito-idp')

def forgot_password(username):
    """Initiate password reset without revealing if the user exists."""
    try:
        cognito.forgot_password(
            ClientId='your_client_id',
            Username=username.lower().strip()
        )
        # Always show success to the user, even if we catch an error
        return {"message": "If an account exists, you will receive a reset code."}
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code in ('UserNotFoundException', 'NotAuthorizedException'):
            # Don't reveal that the user doesn't exist
            return {"message": "If an account exists, you will receive a reset code."}
        raise  # Re-raise unexpected errors
```

## Debugging Checklist

1. Confirm the user pool ID and region are correct
2. Verify the exact username (check case sensitivity)
3. If using aliases, look up the real username first
4. Check if "Prevent user existence errors" is enabled on the client
5. For federated users, include the provider prefix
6. If migrating, verify the migration Lambda trigger is configured and working
7. Search by email or phone to find the user's actual username

The most frequent culprits are case sensitivity and the alias/username confusion. Nail those down first, and you'll resolve most `UserNotFoundException` issues. For broader authentication monitoring, consider setting up [alerts on your Cognito service](https://oneuptime.com/blog/post/2026-02-12-fix-cognito-notauthorizedexception-errors/view) to catch sign-in failures before users start reporting them.
