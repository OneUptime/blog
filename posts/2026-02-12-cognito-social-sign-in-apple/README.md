# How to Set Up Cognito Social Sign-In with Apple

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Apple, Authentication, OAuth

Description: Configure Sign in with Apple as an identity provider in Amazon Cognito for iOS apps and web applications that need Apple authentication.

---

If your app is available on iOS, Apple requires you to offer Sign in with Apple whenever you provide any social sign-in option. Even if it's not required for your case, Apple sign-in is a solid option - users trust it, and Apple's privacy relay feature lets users hide their real email address.

Setting up Apple as a Cognito identity provider is a bit more involved than Google or Facebook because Apple uses a client secret that you generate from a private key, not a static string.

## How Apple Sign-In Differs

Apple's OAuth implementation has some unique characteristics:

- The client secret is a JWT you generate and sign with a private key
- The secret expires (max 6 months) and needs regular rotation
- Apple only sends the user's name on the first sign-in - you must capture it then
- Users can choose to hide their real email using Apple's relay service

## Step 1: Apple Developer Configuration

In the Apple Developer portal (developer.apple.com):

1. Register a new App ID if you don't have one
2. Enable "Sign in with Apple" capability
3. Create a Services ID (this becomes your client_id for web)
4. Register your Cognito callback URL as a return URL

The callback URL format:

```
https://your-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

Next, create a private key for Sign in with Apple:

1. Go to Keys in the developer portal
2. Create a new key
3. Enable "Sign in with Apple"
4. Download the .p8 key file (you can only download this once)

Note these values:
- **Team ID**: Your Apple Developer Team ID (top right of developer portal)
- **Key ID**: The ID of the key you just created
- **Services ID**: The identifier for your Services ID (this is your client_id)
- **Private Key**: The .p8 file contents

## Step 2: Generate the Client Secret

Apple's client secret is a JWT signed with your private key. Here's a Node.js script to generate it:

```javascript
// generate-apple-secret.js
import jwt from 'jsonwebtoken';
import fs from 'fs';

function generateAppleClientSecret() {
  const privateKey = fs.readFileSync('./AuthKey_XXXXXXXXXX.p8', 'utf8');

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: 'YOUR_TEAM_ID',          // Apple Developer Team ID
    iat: now,
    exp: now + (86400 * 180),      // 180 days (max allowed)
    aud: 'https://appleid.apple.com',
    sub: 'com.yourapp.service'     // Your Services ID
  };

  const secret = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: 'YOUR_KEY_ID'           // Key ID from Apple Developer portal
  });

  console.log('Client Secret:', secret);
  return secret;
}

generateAppleClientSecret();
```

You'll need to regenerate this secret before it expires. Automate it with a Lambda function or CI job.

## Step 3: Configure Apple in Cognito

Using Terraform:

```hcl
# Apple identity provider
resource "aws_cognito_identity_provider" "apple" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "SignInWithApple"
  provider_type = "SignInWithApple"

  provider_details = {
    client_id                = "com.yourapp.service"  # Services ID
    team_id                  = "YOUR_TEAM_ID"
    key_id                   = "YOUR_KEY_ID"
    private_key              = file("AuthKey.p8")     # Or use a secret
    authorize_scopes         = "email name"
    oidc_issuer              = "https://appleid.apple.com"

    # These are set automatically but can be explicit
    authorize_url            = "https://appleid.apple.com/auth/authorize"
    token_url                = "https://appleid.apple.com/auth/token"
    attributes_url_add_attributes = "false"
    token_request_method     = "POST"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }
}
```

For storing the private key securely, use AWS Secrets Manager:

```hcl
# Store the Apple private key in Secrets Manager
resource "aws_secretsmanager_secret" "apple_key" {
  name = "cognito/apple-sign-in-key"
}

resource "aws_secretsmanager_secret_version" "apple_key" {
  secret_id     = aws_secretsmanager_secret.apple_key.id
  secret_string = file("AuthKey.p8")
}
```

Via the AWS CLI:

```bash
# Create Apple identity provider
aws cognito-idp create-identity-provider \
  --user-pool-id us-east-1_XXXXXXXXX \
  --provider-name SignInWithApple \
  --provider-type SignInWithApple \
  --provider-details '{
    "client_id": "com.yourapp.service",
    "team_id": "YOUR_TEAM_ID",
    "key_id": "YOUR_KEY_ID",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----",
    "authorize_scopes": "email name"
  }' \
  --attribute-mapping '{
    "email": "email",
    "username": "sub",
    "name": "name"
  }'
```

## Step 4: Update the App Client

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  supported_identity_providers = [
    "SignInWithApple",
    "Google",
    "Facebook",
    "COGNITO"
  ]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  callback_urls = [
    "https://myapp.com/auth/callback",
    "http://localhost:3000/auth/callback"
  ]

  logout_urls = [
    "https://myapp.com/",
    "http://localhost:3000/"
  ]
}
```

## Step 5: Implement Sign-In

Using Amplify:

```javascript
// apple-sign-in.js
import { signInWithRedirect } from 'aws-amplify/auth';

async function signInWithApple() {
  try {
    await signInWithRedirect({
      provider: 'Apple'
    });
  } catch (error) {
    console.error('Apple sign-in error:', error);
  }
}
```

For iOS native apps, use Apple's AuthenticationServices framework and then pass the token to Cognito:

```swift
// AppleSignIn.swift - iOS native implementation
import AuthenticationServices
import AWSCognitoIdentityProvider

class AppleSignInManager: NSObject, ASAuthorizationControllerDelegate {

    func startSignIn() {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email, .fullName]

        let controller = ASAuthorizationController(
            authorizationRequests: [request]
        )
        controller.delegate = self
        controller.performRequests()
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential
            as? ASAuthorizationAppleIDCredential,
              let identityToken = credential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8)
        else { return }

        // Pass the Apple token to Cognito
        // Use the federated sign-in flow
        print("Apple token received: \(tokenString)")

        // Capture the name here - Apple only sends it once
        let fullName = credential.fullName
        let email = credential.email
        print("Name: \(fullName?.givenName ?? "N/A")")
        print("Email: \(email ?? "Private relay")")
    }
}
```

## Handling Apple's Private Email Relay

When users choose "Hide My Email," Apple generates a unique relay address like `abc123@privaterelay.appleid.com`. Emails sent to this address get forwarded to the user's real email.

To send emails to relay addresses, register your domain in the Apple Developer portal under "Sign in with Apple for Email Communication."

```hcl
# Your email configuration must support relay addresses
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  email_configuration {
    email_sending_account  = "DEVELOPER"
    source_arn             = aws_ses_email_identity.auth.arn
    from_email_address     = "noreply@myapp.com"
  }
}
```

Register `myapp.com` in Apple's developer portal so emails from your domain can reach relay addresses.

## The Name Problem

Apple only sends the user's name on the very first authentication. If you don't capture it then, it's gone. Handle this in a Pre Sign-Up Lambda:

```javascript
// capture-apple-name.js
export const handler = async (event) => {
  if (event.triggerSource === 'PreSignUp_ExternalProvider') {
    const providerName = event.userName.split('_')[0];

    if (providerName === 'SignInWithApple') {
      // Store the name if provided (first sign-in only)
      const name = event.request.userAttributes.name;
      if (name) {
        console.log('Captured Apple user name:', name);
        // Name is automatically saved to the user profile
      }
    }

    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
};
```

## Automating Secret Rotation

Since Apple client secrets expire, automate the rotation:

```javascript
// rotate-apple-secret.js - Lambda for rotating the client secret
import jwt from 'jsonwebtoken';
import {
  CognitoIdentityProviderClient,
  UpdateIdentityProviderCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from '@aws-sdk/client-secrets-manager';

const cognitoClient = new CognitoIdentityProviderClient({});
const secretsClient = new SecretsManagerClient({});

export const handler = async () => {
  // Get the private key from Secrets Manager
  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: 'cognito/apple-sign-in-key' })
  );
  const privateKey = secretResponse.SecretString;

  // Generate new client secret
  const now = Math.floor(Date.now() / 1000);
  const clientSecret = jwt.sign(
    {
      iss: process.env.TEAM_ID,
      iat: now,
      exp: now + (86400 * 180),
      aud: 'https://appleid.apple.com',
      sub: process.env.CLIENT_ID
    },
    privateKey,
    { algorithm: 'ES256', keyid: process.env.KEY_ID }
  );

  // Update the Cognito identity provider
  await cognitoClient.send(new UpdateIdentityProviderCommand({
    UserPoolId: process.env.USER_POOL_ID,
    ProviderName: 'SignInWithApple',
    ProviderDetails: {
      client_secret: clientSecret
    }
  }));

  console.log('Apple client secret rotated successfully');
};
```

Schedule this with EventBridge to run every 5 months (before the 6-month expiry).

For setting up other social providers, see [Cognito social sign-in with Google](https://oneuptime.com/blog/post/cognito-social-sign-in-google/view) and [Cognito social sign-in with Facebook](https://oneuptime.com/blog/post/cognito-social-sign-in-facebook/view).

## Summary

Apple sign-in has more moving parts than Google or Facebook - the key-based client secret, the name capture limitation, and the private relay emails all require special handling. But it's worth getting right, especially if you're on iOS where Apple mandates it for apps with social sign-in. Automate the secret rotation early so you don't get caught by a surprise expiration in production.
