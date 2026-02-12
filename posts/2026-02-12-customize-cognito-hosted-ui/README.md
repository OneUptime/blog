# How to Customize the Cognito Hosted UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, UI, Authentication

Description: Customize the Amazon Cognito hosted UI with your brand colors, logo, and CSS to create a polished sign-in experience without building your own auth pages.

---

Cognito's hosted UI gives you a complete sign-in page out of the box - sign-up, sign-in, password reset, MFA, and social login all handled. The default look is functional but generic. Customizing it to match your brand takes the experience from "obviously a third-party page" to something that looks like it belongs to your app.

## What the Hosted UI Provides

The hosted UI handles several pages:

- Sign-in page with username/password
- Sign-up page with attribute collection
- Password reset flow
- MFA code entry
- Social provider buttons (Google, Facebook, Apple, etc.)
- SAML/OIDC redirect initiation
- Consent page for OAuth scopes

All of these are customizable through the Cognito console or API.

## Setting Up the Hosted UI

First, make sure you have a domain configured:

```hcl
# Cognito-provided domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "my-app-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

# The hosted UI is available at:
# https://my-app-auth.auth.us-east-1.amazoncognito.com/login
```

The hosted UI URL format:

```
https://{domain}/login?client_id={clientId}&response_type=code&scope=openid+email+profile&redirect_uri={redirectUri}
```

## Basic Customization

Cognito lets you customize the hosted UI through CSS and image uploads:

```hcl
resource "aws_cognito_user_pool_ui_customization" "main" {
  user_pool_id = aws_cognito_user_pool.main.id

  # Custom CSS (max 131072 characters)
  css = file("cognito-custom.css")

  # Logo image (max 100KB, JPG or PNG)
  image_file = filebase64("logo.png")

  # Apply to all clients (use client_id for client-specific styling)
  # client_id = aws_cognito_user_pool_client.app.id
}
```

## CSS Customization

The hosted UI uses specific CSS classes you can override. Here's a comprehensive custom stylesheet:

```css
/* cognito-custom.css */

/* Page background */
.banner-customizable {
  background-color: #1a1a2e;
  padding: 25px 0;
}

/* Logo container */
.logo-customizable {
  max-width: 200px;
  max-height: 80px;
}

/* Main form container */
.modal-content {
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

/* Form background */
.modalCustomizable {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 30px;
}

/* Submit button */
.submitButton-customizable {
  background-color: #4361ee;
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submitButton-customizable:hover {
  background-color: #3a56d4;
}

/* Input fields */
.inputField-customizable {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  color: #333333;
  font-size: 14px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}

.inputField-customizable:focus {
  border-color: #4361ee;
  outline: none;
}

/* Labels */
.label-customizable {
  color: #333333;
  font-weight: 600;
  font-size: 14px;
}

/* Links */
.textDescription-customizable {
  color: #4361ee;
}

.anchor-customizable {
  color: #4361ee;
  text-decoration: none;
}

.anchor-customizable:hover {
  text-decoration: underline;
}

/* Social sign-in buttons */
.socialButton-customizable {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}

.socialButton-customizable:hover {
  border-color: #4361ee;
}

/* Divider between social and password sign-in */
.legalText-customizable {
  color: #666666;
}

/* Error messages */
.errorMessage-customizable {
  color: #e74c3c;
  border-left: 3px solid #e74c3c;
  padding-left: 10px;
  margin: 10px 0;
}

/* Tab bar for sign-in / sign-up toggle */
.tabBar-customizable {
  border-bottom: 2px solid #e0e0e0;
}

.tab-customizable {
  color: #666666;
  font-weight: 600;
}

.tab-customizable:hover {
  color: #4361ee;
}

/* Page footer */
.footer-customizable {
  color: #999999;
  font-size: 12px;
}

/* Background color for the entire page */
body {
  background-color: #f5f5f5;
}

/* Password requirements hint */
.password-requirements-customizable {
  color: #888;
  font-size: 12px;
}
```

## Applying Customization via CLI

```bash
# Upload CSS and logo
aws cognito-idp set-ui-customization \
  --user-pool-id us-east-1_XXXXXXXXX \
  --css "$(cat cognito-custom.css)" \
  --image-file fileb://logo.png
```

## Per-Client Customization

Different app clients can have different branding:

```hcl
# Customization for the main web app
resource "aws_cognito_user_pool_ui_customization" "web" {
  user_pool_id = aws_cognito_user_pool.main.id
  client_id    = aws_cognito_user_pool_client.web_app.id
  css          = file("web-custom.css")
  image_file   = filebase64("web-logo.png")
}

# Different branding for the partner portal
resource "aws_cognito_user_pool_ui_customization" "partner" {
  user_pool_id = aws_cognito_user_pool.main.id
  client_id    = aws_cognito_user_pool_client.partner_app.id
  css          = file("partner-custom.css")
  image_file   = filebase64("partner-logo.png")
}
```

## Customizing Email Templates

Beyond the sign-in page, customize the verification and reset email templates:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  # Verification email
  verification_message_template {
    default_email_option  = "CONFIRM_WITH_CODE"
    email_subject         = "Verify your MyApp account"
    email_message         = <<-EOT
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4361ee; padding: 20px; text-align: center;">
          <h1 style="color: white;">MyApp</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Verify your email</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 15px; text-align: center;
                      font-size: 24px; font-weight: bold; letter-spacing: 3px;">
            {####}
          </div>
          <p style="color: #666; margin-top: 20px;">
            This code expires in 24 hours.
          </p>
        </div>
      </body>
      </html>
    EOT
  }

  # Admin invitation email
  admin_create_user_config {
    invite_message_template {
      email_subject = "Welcome to MyApp"
      email_message = <<-EOT
        <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Welcome to MyApp!</h2>
          <p>An account has been created for you.</p>
          <p>Username: {username}</p>
          <p>Temporary password: {####}</p>
          <p>Please sign in and change your password.</p>
        </body>
        </html>
      EOT
      sms_message = "Your MyApp username is {username} and temporary password is {####}"
    }
  }
}
```

## Advanced Customization with Lambda

For full control over email messages, use the Custom Message Lambda trigger:

```javascript
// custom-message.js
export const handler = async (event) => {
  const { triggerSource, request, response } = event;

  // Common styles
  const styles = `
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
  `;

  switch (triggerSource) {
    case 'CustomMessage_SignUp':
      response.emailSubject = 'Verify your MyApp account';
      response.emailMessage = `
        <div style="${styles}">
          <h2>Almost there!</h2>
          <p>Enter this code to verify your email: <strong>${request.codeParameter}</strong></p>
        </div>
      `;
      break;

    case 'CustomMessage_ForgotPassword':
      response.emailSubject = 'Reset your MyApp password';
      response.emailMessage = `
        <div style="${styles}">
          <h2>Password Reset</h2>
          <p>Your reset code: <strong>${request.codeParameter}</strong></p>
        </div>
      `;
      break;

    case 'CustomMessage_AdminCreateUser':
      response.emailSubject = 'Your MyApp account is ready';
      response.emailMessage = `
        <div style="${styles}">
          <h2>Welcome!</h2>
          <p>Username: ${request.usernameParameter}</p>
          <p>Temporary password: ${request.codeParameter}</p>
        </div>
      `;
      break;
  }

  return event;
};
```

For the complete Lambda trigger setup, see [using Cognito Lambda triggers for custom messages](https://oneuptime.com/blog/post/cognito-lambda-triggers-custom-message/view).

## Hosted UI Limitations

The hosted UI has some constraints you should know about:

- CSS changes are limited to predefined classes - you can't restructure the HTML
- Maximum CSS size is 131,072 characters
- Logo images must be under 100KB
- You can't add custom JavaScript
- The layout and flow sequence are fixed

If these limitations are too restrictive, building a custom UI with Amplify or the AWS SDK gives you complete control. The trade-off is maintaining the UI yourself.

## Using a Custom Domain

For a polished experience, use your own domain instead of the Cognito-generated one. See [using a custom domain for Cognito hosted UI](https://oneuptime.com/blog/post/custom-domain-cognito-hosted-ui/view) for the full setup.

## Summary

Cognito's hosted UI customization strikes a balance between convenience and flexibility. The CSS-based approach lets you match your brand without building authentication pages from scratch. For most applications, custom colors, fonts, a logo, and styled buttons are enough to create a professional sign-in experience. When you need more control, the Lambda Custom Message trigger extends the customization to emails, and you can always build a fully custom UI using the Cognito APIs directly.
