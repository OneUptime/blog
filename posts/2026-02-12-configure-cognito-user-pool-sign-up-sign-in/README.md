# How to Configure Cognito User Pool Sign-Up and Sign-In

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Authentication, JavaScript

Description: Configure Amazon Cognito sign-up and sign-in flows including self-registration, admin-created users, and custom authentication challenges.

---

After creating a Cognito User Pool, the next step is configuring how users actually register and authenticate. Cognito supports multiple sign-up and sign-in patterns - self-registration, admin-created accounts, email-based authentication, and custom challenge flows. Getting these right determines the user experience of your application.

## Sign-Up Flow Options

Cognito offers two main paths for user creation:

1. **Self-registration**: Users sign themselves up through your app
2. **Admin creation**: Administrators create accounts, users get temporary passwords

Most consumer apps use self-registration. Enterprise and internal tools often use admin creation.

## Configuring Self-Registration

Self-registration is enabled by default. Users can sign up through the Cognito API or hosted UI. Here's the Terraform configuration:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  # Allow self-registration
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Require email verification
  auto_verified_attributes = ["email"]
  username_attributes       = ["email"]

  # Invitation message for admin-created users
  admin_create_user_config {
    invite_message_template {
      email_subject = "Welcome to MyApp"
      email_message = "Your username is {username} and temporary password is {####}."
      sms_message   = "Your username is {username} and temporary password is {####}."
    }
  }
}
```

## Implementing Sign-Up in JavaScript

Using the AWS Amplify library, here's how users sign up:

```javascript
// sign-up.js - User self-registration
import { signUp, confirmSignUp } from 'aws-amplify/auth';

async function registerUser(email, password, name) {
  try {
    const result = await signUp({
      username: email,
      password: password,
      options: {
        userAttributes: {
          email: email,
          name: name,
          'custom:organization': 'default'
        }
      }
    });

    console.log('Sign-up successful, confirmation needed:', result.isSignUpComplete);
    // User will receive a verification code via email
    return result;
  } catch (error) {
    console.error('Sign-up error:', error.message);
    throw error;
  }
}

// Confirm the sign-up with the verification code
async function confirmRegistration(email, code) {
  try {
    const result = await confirmSignUp({
      username: email,
      confirmationCode: code
    });

    console.log('Confirmation successful:', result.isSignUpComplete);
    return result;
  } catch (error) {
    console.error('Confirmation error:', error.message);
    throw error;
  }
}
```

Without Amplify, using the AWS SDK directly:

```javascript
// sign-up-sdk.js - Using AWS SDK v3 directly
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

async function registerUser(email, password) {
  const command = new SignUpCommand({
    ClientId: 'your-app-client-id',
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: 'John Doe' }
    ]
  });

  const response = await client.send(command);
  console.log('User sub:', response.UserSub);
  return response;
}

async function confirmUser(email, code) {
  const command = new ConfirmSignUpCommand({
    ClientId: 'your-app-client-id',
    Username: email,
    ConfirmationCode: code
  });

  return await client.send(command);
}
```

## Sign-In Configuration

Sign-in supports several authentication flows:

```hcl
# App client with authentication flows configured
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Authentication flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",         # Secure Remote Password (recommended)
    "ALLOW_REFRESH_TOKEN_AUTH",     # Token refresh
    "ALLOW_USER_PASSWORD_AUTH",     # Simple username/password (less secure)
    "ALLOW_CUSTOM_AUTH"             # Custom challenge flows
  ]

  # Token validity
  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}
```

## Implementing Sign-In

Here's the sign-in flow using Amplify:

```javascript
// sign-in.js - User authentication
import { signIn, signOut, getCurrentUser } from 'aws-amplify/auth';

async function loginUser(email, password) {
  try {
    const result = await signIn({
      username: email,
      password: password
    });

    // Check if additional steps are needed
    switch (result.nextStep.signInStep) {
      case 'CONFIRM_SIGN_UP':
        console.log('User needs to verify their email');
        break;
      case 'DONE':
        console.log('Sign-in complete');
        break;
      case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
        console.log('User needs to set a new password');
        break;
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        console.log('User needs to enter MFA code');
        break;
      default:
        console.log('Next step:', result.nextStep);
    }

    return result;
  } catch (error) {
    console.error('Sign-in error:', error.message);
    throw error;
  }
}

// Check if user is already signed in
async function checkAuthState() {
  try {
    const user = await getCurrentUser();
    console.log('Current user:', user.username);
    return user;
  } catch {
    console.log('No user signed in');
    return null;
  }
}

// Sign out
async function logoutUser() {
  await signOut();
  console.log('Signed out');
}
```

## Admin-Created Users

For admin-managed accounts, users receive a temporary password and must change it on first sign-in:

```javascript
// admin-create-user.js - Admin creates user accounts
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

async function createUser(email, temporaryPassword) {
  const command = new AdminCreateUserCommand({
    UserPoolId: 'us-east-1_XXXXXXXXX',
    Username: email,
    TemporaryPassword: temporaryPassword,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' }
    ],
    DesiredDeliveryMediums: ['EMAIL']
  });

  const response = await client.send(command);
  console.log('User created:', response.User.Username);
  return response;
}

// Set a permanent password (skipping the temp password flow)
async function setUserPassword(email, password) {
  const command = new AdminSetUserPasswordCommand({
    UserPoolId: 'us-east-1_XXXXXXXXX',
    Username: email,
    Password: password,
    Permanent: true
  });

  return await client.send(command);
}
```

## Handling the New Password Challenge

When admin-created users sign in with their temporary password, they hit the NEW_PASSWORD_REQUIRED challenge:

```javascript
// handle-new-password.js
import { signIn, confirmSignIn } from 'aws-amplify/auth';

async function handleFirstLogin(email, temporaryPassword, newPassword) {
  // First sign-in with temporary password
  const signInResult = await signIn({
    username: email,
    password: temporaryPassword
  });

  if (signInResult.nextStep.signInStep ===
      'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {

    // Respond with the new permanent password
    const confirmResult = await confirmSignIn({
      challengeResponse: newPassword
    });

    console.log('Password changed, sign-in complete:', confirmResult);
    return confirmResult;
  }
}
```

## Password Recovery

Users will forget passwords. Set up the recovery flow:

```javascript
// password-recovery.js
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';

// Step 1: Request a password reset
async function requestPasswordReset(email) {
  const result = await resetPassword({ username: email });
  console.log('Reset code sent to:', result.nextStep.codeDeliveryDetails);
  return result;
}

// Step 2: Confirm with code and new password
async function confirmPasswordReset(email, code, newPassword) {
  await confirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword: newPassword
  });
  console.log('Password reset successful');
}
```

## Sign-Up Pre-Validation

You can validate sign-up data before Cognito processes it using a Pre Sign-Up Lambda trigger. This lets you block certain email domains, enforce custom rules, or auto-confirm users:

```hcl
# Attach a Lambda trigger for pre sign-up validation
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  lambda_config {
    pre_sign_up = aws_lambda_function.pre_signup.arn
  }
}
```

For details on Lambda triggers, check out [using Cognito Lambda triggers for pre sign-up](https://oneuptime.com/blog/post/cognito-lambda-triggers-pre-sign-up/view).

## Rate Limiting

Cognito has built-in rate limits for sign-up and sign-in operations. For most accounts, the default limits are:

- Sign-up: 50 requests per second
- Sign-in: 200 requests per second
- Token refresh: 200 requests per second

If you're building a high-traffic application, request limit increases through AWS Support before launch.

## Summary

Cognito's sign-up and sign-in flows are flexible enough to handle most authentication patterns. Self-registration works well for consumer apps, admin creation suits enterprise scenarios, and custom auth flows handle everything else. The key is choosing the right authentication flows in your app client configuration and implementing proper error handling for each step of the authentication process. Start with the SRP auth flow - it's the most secure option for username/password authentication.
