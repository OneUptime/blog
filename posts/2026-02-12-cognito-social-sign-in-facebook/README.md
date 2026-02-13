# How to Set Up Cognito Social Sign-In with Facebook

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Facebook, OAuth, Authentication

Description: Configure Facebook Login as a social identity provider in Amazon Cognito so users can sign in with their Facebook accounts.

---

Facebook Login is one of the most widely recognized social sign-in options. Adding it to your Cognito-powered app lets users authenticate with their existing Facebook account instead of creating a new one. The setup involves creating a Facebook app, configuring Cognito, and wiring up the OAuth redirect flow.

## Prerequisites

Before starting, you'll need:

- An Amazon Cognito User Pool with a domain configured
- A Facebook developer account (developers.facebook.com)
- A registered Facebook app

## Step 1: Create a Facebook App

Go to developers.facebook.com and create a new app:

1. Click "Create App"
2. Select "Consumer" as the app type
3. Name your app and create it
4. In the app dashboard, go to "Add Product" and select "Facebook Login"
5. Choose "Web" as the platform

In the Facebook Login settings, add the Cognito callback URL as a valid OAuth redirect URI:

```
https://your-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

Note the App ID and App Secret from the app's Settings > Basic page.

## Step 2: Configure Facebook in Cognito

Using Terraform:

```hcl
# Facebook identity provider
resource "aws_cognito_identity_provider" "facebook" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Facebook"
  provider_type = "Facebook"

  provider_details = {
    client_id        = "your-facebook-app-id"
    client_secret    = "your-facebook-app-secret"
    authorize_scopes = "public_profile,email"
    api_version      = "v18.0"

    # Facebook-specific endpoints
    attributes_url                = "https://graph.facebook.com/v18.0/me?fields="
    attributes_url_add_attributes = "true"
    authorize_url                 = "https://www.facebook.com/v18.0/dialog/oauth"
    token_url                     = "https://graph.facebook.com/v18.0/oauth/access_token"
    token_request_method          = "GET"
  }

  # Map Facebook attributes to Cognito attributes
  attribute_mapping = {
    email    = "email"
    username = "id"
    name     = "name"
  }
}
```

Using the AWS CLI:

```bash
# Create the Facebook identity provider
aws cognito-idp create-identity-provider \
  --user-pool-id us-east-1_XXXXXXXXX \
  --provider-name Facebook \
  --provider-type Facebook \
  --provider-details '{
    "client_id": "your-facebook-app-id",
    "client_secret": "your-facebook-app-secret",
    "authorize_scopes": "public_profile,email",
    "api_version": "v18.0"
  }' \
  --attribute-mapping '{
    "email": "email",
    "username": "id",
    "name": "name"
  }'
```

## Step 3: Update the App Client

Add Facebook to the supported identity providers:

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Include Facebook as a provider
  supported_identity_providers = ["Facebook", "Google", "COGNITO"]

  # OAuth settings
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

## Step 4: Implement Facebook Sign-In

Using Amplify:

```javascript
// facebook-sign-in.js
import { signInWithRedirect } from 'aws-amplify/auth';

// Trigger Facebook sign-in
async function signInWithFacebook() {
  try {
    await signInWithRedirect({
      provider: 'Facebook'
    });
  } catch (error) {
    console.error('Facebook sign-in error:', error);
  }
}
```

For a manual OAuth implementation without Amplify:

```javascript
// facebook-oauth.js - Manual OAuth flow
const COGNITO_DOMAIN = 'your-domain.auth.us-east-1.amazoncognito.com';
const CLIENT_ID = 'your-cognito-app-client-id';
const REDIRECT_URI = encodeURIComponent('http://localhost:3000/auth/callback');

// Build the authorization URL
function getFacebookSignInUrl() {
  return `https://${COGNITO_DOMAIN}/oauth2/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `response_type=code&` +
    `scope=openid+email+profile&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `identity_provider=Facebook`;
}

// Handle the callback - exchange code for tokens
async function handleCallback(code) {
  const response = await fetch(
    `https://${COGNITO_DOMAIN}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code: code,
        redirect_uri: decodeURIComponent(REDIRECT_URI)
      })
    }
  );

  const tokens = await response.json();
  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token
  };
}
```

## Facebook Data Permissions

Facebook's API requires specific permissions for different user data. The most common ones for authentication:

```hcl
provider_details = {
  # Basic profile and email - sufficient for most apps
  authorize_scopes = "public_profile,email"
}
```

Available scopes include:

- `public_profile` - name, profile picture, age range, gender, locale
- `email` - user's email address
- `user_birthday` - date of birth (requires app review)
- `user_location` - current city (requires app review)

For basic authentication, `public_profile` and `email` are usually enough. Additional permissions require Facebook's app review process.

## Attribute Mapping

Facebook provides these attributes that you can map to Cognito:

```hcl
attribute_mapping = {
  email       = "email"
  username    = "id"
  name        = "name"
  given_name  = "first_name"
  family_name = "last_name"
  picture     = "picture"
  gender      = "gender"
  locale      = "locale"
}
```

Custom attributes work too:

```hcl
attribute_mapping = {
  email                    = "email"
  username                 = "id"
  name                     = "name"
  "custom:facebook_id"     = "id"
}
```

## Handling Users Without Email

Some Facebook accounts don't have an email address (or the user hasn't shared it). If your User Pool requires email, these users will fail to sign up. Handle this in a Pre Sign-Up Lambda trigger:

```javascript
// handle-missing-email.js
export const handler = async (event) => {
  if (event.triggerSource === 'PreSignUp_ExternalProvider') {
    const email = event.request.userAttributes.email;

    if (!email) {
      // Generate a placeholder email or reject the sign-up
      throw new Error(
        'An email address is required. Please update your Facebook ' +
        'email settings and try again.'
      );
    }

    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
};
```

## Facebook App Review

For development, your Facebook app works in "Development" mode. Only developers and test users listed in the app can sign in. Before going to production, you need to:

1. Submit your app for Facebook's App Review
2. Provide details about how you use Facebook Login
3. Add a privacy policy URL
4. Complete the Data Use Checkup

The review process typically takes a few business days.

## Testing with Test Users

During development, create test users in the Facebook developer console:

1. Go to your app settings
2. Navigate to Roles, then Test Users
3. Create test users with specific permissions

These test users can sign in to your app without passing app review.

## React Component Example

Here's a complete React component with both Google and Facebook sign-in buttons:

```jsx
// SocialSignIn.jsx
import { signInWithRedirect } from 'aws-amplify/auth';

function SocialSignIn() {
  const handleSocialSignIn = async (provider) => {
    try {
      await signInWithRedirect({ provider });
    } catch (error) {
      console.error(`${provider} sign-in failed:`, error);
    }
  };

  return (
    <div className="social-sign-in">
      <button
        onClick={() => handleSocialSignIn('Google')}
        className="social-btn google"
      >
        Continue with Google
      </button>

      <button
        onClick={() => handleSocialSignIn('Facebook')}
        className="social-btn facebook"
      >
        Continue with Facebook
      </button>

      <div className="divider">
        <span>or</span>
      </div>

      {/* Email/password form below */}
    </div>
  );
}

export default SocialSignIn;
```

## Troubleshooting

**"URL Blocked" error from Facebook** - Your redirect URI doesn't match what's configured in the Facebook app settings. Make sure the Cognito callback URL is added exactly.

**"Can't Load URL" error** - The app domains in Facebook settings don't include your Cognito domain. Add it under Settings > Basic > App Domains.

**No email in user profile** - The user's Facebook account doesn't have a verified email. Handle this case in your Pre Sign-Up trigger.

For setting up additional social providers, see [Cognito social sign-in with Apple](https://oneuptime.com/blog/post/2026-02-12-cognito-social-sign-in-apple/view) and [Cognito social sign-in with Google](https://oneuptime.com/blog/post/2026-02-12-cognito-social-sign-in-google/view).

## Summary

Facebook Login integration with Cognito follows the same OAuth pattern as Google, with Facebook-specific details around API versioning and permissions. The biggest difference is Facebook's app review process - plan for that before your production launch. Keep your requested permissions minimal (just public_profile and email) to simplify the review and reduce data handling obligations.
