# How to Use Cognito Lambda Triggers (Custom Message)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Lambda, Email, Serverless

Description: Implement the Cognito Custom Message Lambda trigger to fully customize verification emails, password reset messages, MFA codes, and admin invitation emails.

---

Cognito's built-in email templates are limited. You get basic text placeholders, but no HTML templates, no dynamic content, and no per-tenant branding. The Custom Message Lambda trigger gives you full control over every email and SMS message Cognito sends. You can use HTML templates, personalize content, add marketing footers, and change messages based on user attributes.

## When the Trigger Fires

The Custom Message trigger fires whenever Cognito needs to send a message. Each scenario has a different trigger source:

| Trigger Source | When It Fires |
|---|---|
| CustomMessage_SignUp | Sign-up verification code |
| CustomMessage_AdminCreateUser | Admin-created user invitation |
| CustomMessage_ResendCode | User requests a new verification code |
| CustomMessage_ForgotPassword | Password reset code |
| CustomMessage_UpdateUserAttribute | Attribute change verification |
| CustomMessage_VerifyUserAttribute | Attribute verification request |
| CustomMessage_Authentication | MFA authentication code |

## Basic Setup

```hcl
resource "aws_lambda_function" "custom_message" {
  filename         = data.archive_file.custom_message.output_path
  source_code_hash = data.archive_file.custom_message.output_base64sha256
  function_name    = "cognito-custom-message"
  role             = aws_iam_role.custom_message_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5

  environment {
    variables = {
      APP_NAME = "MyApp"
      APP_URL  = "https://myapp.com"
    }
  }
}

resource "aws_lambda_permission" "cognito_custom_message" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.custom_message.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  lambda_config {
    custom_message = aws_lambda_function.custom_message.arn
  }
}
```

## The Event Object

```javascript
{
  "version": "1",
  "triggerSource": "CustomMessage_SignUp",
  "region": "us-east-1",
  "userPoolId": "us-east-1_XXXXXXXXX",
  "userName": "abc123",
  "callerContext": {
    "awsSdkVersion": "aws-sdk-nodejs-3.x",
    "clientId": "your-app-client-id"
  },
  "request": {
    "userAttributes": {
      "sub": "abc123-def456",
      "email": "user@example.com",
      "name": "Jane Doe"
    },
    "codeParameter": "{####}",
    "linkParameter": "{##Click Here##}",
    "usernameParameter": "user@example.com"
  },
  "response": {
    "smsMessage": null,
    "emailMessage": null,
    "emailSubject": null
  }
}
```

Important: `codeParameter` is a placeholder string `{####}` - you must include it in your message for Cognito to replace it with the actual code.

## Complete Custom Message Handler

Here's a full implementation covering all trigger sources:

```javascript
// custom-message.mjs
const APP_NAME = process.env.APP_NAME || 'MyApp';
const APP_URL = process.env.APP_URL || 'https://myapp.com';

export const handler = async (event) => {
  const { triggerSource, request, response } = event;
  const name = request.userAttributes.name || 'there';
  const code = request.codeParameter;       // {####} placeholder
  const link = request.linkParameter;        // {##Click Here##} placeholder
  const username = request.usernameParameter;

  switch (triggerSource) {
    case 'CustomMessage_SignUp':
      response.emailSubject = `Verify your ${APP_NAME} account`;
      response.emailMessage = buildVerificationEmail(name, code);
      response.smsMessage = `Your ${APP_NAME} code is ${code}`;
      break;

    case 'CustomMessage_AdminCreateUser':
      response.emailSubject = `You've been invited to ${APP_NAME}`;
      response.emailMessage = buildInvitationEmail(name, username, code);
      response.smsMessage = `Welcome to ${APP_NAME}! Username: ${username}, temporary password: ${code}`;
      break;

    case 'CustomMessage_ResendCode':
      response.emailSubject = `Your new ${APP_NAME} verification code`;
      response.emailMessage = buildResendCodeEmail(name, code);
      response.smsMessage = `Your ${APP_NAME} code is ${code}`;
      break;

    case 'CustomMessage_ForgotPassword':
      response.emailSubject = `Reset your ${APP_NAME} password`;
      response.emailMessage = buildPasswordResetEmail(name, code);
      response.smsMessage = `Your ${APP_NAME} password reset code is ${code}`;
      break;

    case 'CustomMessage_UpdateUserAttribute':
    case 'CustomMessage_VerifyUserAttribute':
      response.emailSubject = `Verify your updated email for ${APP_NAME}`;
      response.emailMessage = buildAttributeVerificationEmail(name, code);
      response.smsMessage = `Your ${APP_NAME} verification code is ${code}`;
      break;

    case 'CustomMessage_Authentication':
      response.emailSubject = `Your ${APP_NAME} sign-in code`;
      response.emailMessage = buildMFAEmail(name, code);
      response.smsMessage = `Your ${APP_NAME} sign-in code is ${code}`;
      break;

    default:
      console.log('Unhandled trigger source:', triggerSource);
  }

  return event;
};
```

## Email Templates

Build reusable HTML email templates:

```javascript
// email-templates.mjs
const APP_NAME = process.env.APP_NAME || 'MyApp';
const APP_URL = process.env.APP_URL || 'https://myapp.com';
const BRAND_COLOR = '#4361ee';

function baseTemplate(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: ${BRAND_COLOR}; padding: 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${APP_NAME}</h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 32px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 16px 32px; background-color: #f9f9f9; text-align: center;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    This email was sent by ${APP_NAME}. If you didn't request this, you can safely ignore it.
                  </p>
                  <p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">
                    <a href="${APP_URL}" style="color: ${BRAND_COLOR}; text-decoration: none;">${APP_URL}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function codeBlock(code) {
  return `
    <div style="background-color: #f0f0f0; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #333;">${code}</span>
    </div>
  `;
}

function buildVerificationEmail(name, code) {
  return baseTemplate(`
    <h2 style="color: #333; margin: 0 0 16px 0;">Verify your email</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.5;">
      Hi ${name}, welcome to ${APP_NAME}! Enter this verification code to complete your registration:
    </p>
    ${codeBlock(code)}
    <p style="color: #888; font-size: 14px;">
      This code expires in 24 hours. If you didn't create an account, no action is needed.
    </p>
  `);
}

function buildInvitationEmail(name, username, tempPassword) {
  return baseTemplate(`
    <h2 style="color: #333; margin: 0 0 16px 0;">You're invited!</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.5;">
      Hi ${name}, an account has been created for you on ${APP_NAME}.
    </p>
    <div style="background-color: #f0f0f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #555;"><strong>Username:</strong> ${username}</p>
      <p style="margin: 0; color: #555;"><strong>Temporary password:</strong> ${tempPassword}</p>
    </div>
    <p style="color: #555; font-size: 16px;">
      You'll be asked to set a new password when you first sign in.
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${APP_URL}/login" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Sign In
      </a>
    </div>
  `);
}

function buildPasswordResetEmail(name, code) {
  return baseTemplate(`
    <h2 style="color: #333; margin: 0 0 16px 0;">Password Reset</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.5;">
      Hi ${name}, we received a request to reset your password. Use this code:
    </p>
    ${codeBlock(code)}
    <p style="color: #888; font-size: 14px;">
      This code expires in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
    </p>
  `);
}

function buildResendCodeEmail(name, code) {
  return baseTemplate(`
    <h2 style="color: #333; margin: 0 0 16px 0;">New Verification Code</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.5;">
      Hi ${name}, here's your new verification code:
    </p>
    ${codeBlock(code)}
    <p style="color: #888; font-size: 14px;">
      This code expires in 24 hours.
    </p>
  `);
}

function buildAttributeVerificationEmail(name, code) {
  return baseTemplate(`
    <h2 style="color: #333; margin: 0 0 16px 0;">Verify Your Email Change</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.5;">
      Hi ${name}, please verify your updated email address with this code:
    </p>
    ${codeBlock(code)}
  `);
}

function buildMFAEmail(name, code) {
  return baseTemplate(`
    <h2 style="color: #333; margin: 0 0 16px 0;">Sign-In Verification</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.5;">
      Hi ${name}, your sign-in verification code is:
    </p>
    ${codeBlock(code)}
    <p style="color: #888; font-size: 14px;">
      This code expires in 3 minutes. If you didn't attempt to sign in, please change your password.
    </p>
  `);
}

export {
  buildVerificationEmail,
  buildInvitationEmail,
  buildPasswordResetEmail,
  buildResendCodeEmail,
  buildAttributeVerificationEmail,
  buildMFAEmail
};
```

## Per-Tenant Branding

For multi-tenant SaaS apps, customize messages based on the user's organization:

```javascript
// tenant-branding.mjs
const tenantBranding = {
  'acme': {
    name: 'Acme Portal',
    color: '#e74c3c',
    logo: 'https://cdn.acme.com/logo.png'
  },
  'bigcorp': {
    name: 'BigCorp Platform',
    color: '#2ecc71',
    logo: 'https://cdn.bigcorp.com/logo.png'
  },
  'default': {
    name: 'MyApp',
    color: '#4361ee',
    logo: 'https://cdn.myapp.com/logo.png'
  }
};

export const handler = async (event) => {
  const org = event.request.userAttributes['custom:organization'] || 'default';
  const branding = tenantBranding[org] || tenantBranding['default'];

  const { triggerSource, request, response } = event;
  const name = request.userAttributes.name || 'there';
  const code = request.codeParameter;

  if (triggerSource === 'CustomMessage_SignUp') {
    response.emailSubject = `Verify your ${branding.name} account`;
    response.emailMessage = `
      <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif;">
        <div style="background: ${branding.color}; padding: 20px; text-align: center;">
          <img src="${branding.logo}" alt="${branding.name}" style="max-height: 50px;" />
        </div>
        <div style="padding: 30px;">
          <h2>Welcome to ${branding.name}!</h2>
          <p>Hi ${name}, your verification code is:</p>
          <div style="background: #f0f0f0; padding: 15px; text-align: center;
                      font-size: 28px; font-weight: bold; letter-spacing: 4px;">
            ${code}
          </div>
        </div>
      </div>
    `;
  }

  return event;
};
```

## Localization

Support multiple languages based on user locale:

```javascript
// localized-messages.mjs
const translations = {
  en: {
    verifySubject: 'Verify your email',
    verifyBody: 'Your verification code is:',
    resetSubject: 'Reset your password',
    resetBody: 'Your password reset code is:'
  },
  es: {
    verifySubject: 'Verifica tu correo',
    verifyBody: 'Tu codigo de verificacion es:',
    resetSubject: 'Restablecer tu contrasena',
    resetBody: 'Tu codigo para restablecer es:'
  },
  fr: {
    verifySubject: 'Verifiez votre email',
    verifyBody: 'Votre code de verification est:',
    resetSubject: 'Reinitialiser le mot de passe',
    resetBody: 'Votre code de reinitialisation est:'
  }
};

export const handler = async (event) => {
  const locale = event.request.userAttributes.locale || 'en';
  const t = translations[locale] || translations['en'];
  const code = event.request.codeParameter;

  switch (event.triggerSource) {
    case 'CustomMessage_SignUp':
      event.response.emailSubject = t.verifySubject;
      event.response.emailMessage = `<p>${t.verifyBody}</p><strong>${code}</strong>`;
      break;
    case 'CustomMessage_ForgotPassword':
      event.response.emailSubject = t.resetSubject;
      event.response.emailMessage = `<p>${t.resetBody}</p><strong>${code}</strong>`;
      break;
  }

  return event;
};
```

## Important Rules

There are a few rules the Custom Message trigger must follow:

1. **Include the code placeholder**: Your email/SMS must contain `{####}` (the `codeParameter`) or `{##link text##}` (the `linkParameter`). Cognito replaces these with actual values. If you forget them, the message won't contain the code.

2. **Return the event**: Always return the modified event object.

3. **Keep it fast**: This trigger runs synchronously in the user's flow. Slow responses delay the email delivery.

4. **Email size limits**: SES has a 10MB email size limit, but keep it reasonable for email clients. Under 100KB is a good target.

For other Lambda triggers in the Cognito lifecycle, see [Pre Sign-Up triggers](https://oneuptime.com/blog/post/cognito-lambda-triggers-pre-sign-up/view) and [Post Confirmation triggers](https://oneuptime.com/blog/post/cognito-lambda-triggers-post-confirmation/view).

## Summary

The Custom Message trigger transforms Cognito's basic emails into branded, professional communications. Build a base HTML template, create message functions for each trigger source, and add tenant-specific or language-specific variations as needed. The key constraint is including the code or link placeholder in every message - forget that and users won't receive their verification codes. For the best results, combine this trigger with SES for production email delivery and test every trigger source before going live.
