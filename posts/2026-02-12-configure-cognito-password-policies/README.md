# How to Configure Cognito Password Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Security, Authentication

Description: Configure strong password policies in Amazon Cognito User Pools including complexity requirements, temporary passwords, and custom validation with Lambda triggers.

---

Password policies are your first line of defense in any authentication system. Cognito gives you built-in controls for password complexity, but there's more to a solid password policy than just requiring uppercase letters and symbols. This post covers everything from basic Cognito settings to advanced custom validation.

## Default Password Policy

Out of the box, Cognito requires passwords to be at least 8 characters with uppercase, lowercase, numbers, and special characters. That's a decent starting point, but you'll probably want to customize it.

## Configuring Password Requirements

Here's the Terraform configuration for password policies:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  password_policy {
    # Minimum length (6-99 characters)
    minimum_length = 12

    # Character requirements
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true

    # Temporary password expiration (1-365 days)
    temporary_password_validity_days = 3
  }
}
```

Through the AWS CLI:

```bash
# Update password policy
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true,
      "TemporaryPasswordValidityDays": 3
    }
  }'
```

## Choosing the Right Minimum Length

There's an ongoing debate about password complexity vs. length. Modern guidance from NIST (SP 800-63B) favors longer passwords over complex ones. A 16-character passphrase like "correct-horse-battery-staple" is stronger than "P@ss1234" even though the short one has more character variety.

Cognito lets you set minimum length from 6 to 99 characters. Here's a practical approach:

```hcl
password_policy {
  # Favor length over complexity
  minimum_length    = 12
  require_lowercase = true
  require_uppercase = false  # Don't force unnecessary complexity
  require_numbers   = false
  require_symbols   = false

  temporary_password_validity_days = 7
}
```

If compliance requirements mandate character variety, keep those settings on. But if you have flexibility, a longer minimum with fewer complexity rules leads to better passwords in practice.

## Temporary Password Settings

When administrators create user accounts, Cognito generates a temporary password. The user must change it on first sign-in. The `temporary_password_validity_days` setting controls how long that temporary password works.

```hcl
password_policy {
  minimum_length = 12

  # Temporary passwords expire after 3 days
  temporary_password_validity_days = 3
}
```

If a temporary password expires, the admin needs to create a new one:

```javascript
// Reset an expired temporary password
import {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

async function resetTemporaryPassword(username) {
  const command = new AdminSetUserPasswordCommand({
    UserPoolId: 'us-east-1_XXXXXXXXX',
    Username: username,
    Password: 'NewTempPass123!',
    Permanent: false  // Still temporary - user must change it
  });

  await client.send(command);
  console.log('Temporary password reset for:', username);
}
```

## Custom Password Validation with Lambda

Cognito's built-in rules cover basic complexity, but you might need custom validation. Common requirements include:

- Blocking commonly breached passwords
- Preventing passwords that contain the username
- Enforcing organization-specific rules

Use a Pre Sign-Up Lambda trigger for custom validation:

```javascript
// password-validation-lambda.js
// Custom password policy enforcement

// Top 1000 most common passwords (abbreviated)
const commonPasswords = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', 'master', 'dragon', 'login', 'princess',
  'football', 'shadow', 'sunshine', 'trustno1', 'iloveyou'
  // ... add the full list in production
]);

export const handler = async (event) => {
  const { userAttributes } = event.request;
  const password = event.request.password || '';
  const email = userAttributes.email || '';

  // Check against common passwords
  if (commonPasswords.has(password.toLowerCase())) {
    throw new Error('Password is too common. Please choose a more unique password.');
  }

  // Check if password contains the email username
  const emailUsername = email.split('@')[0].toLowerCase();
  if (emailUsername.length > 2 && password.toLowerCase().includes(emailUsername)) {
    throw new Error('Password cannot contain your email address.');
  }

  // Check for sequential characters
  if (hasSequentialChars(password, 4)) {
    throw new Error('Password cannot contain sequential characters like "abcd" or "1234".');
  }

  // Check for repeated characters
  if (hasRepeatedChars(password, 3)) {
    throw new Error('Password cannot contain three or more repeated characters.');
  }

  return event;
};

function hasSequentialChars(password, length) {
  for (let i = 0; i <= password.length - length; i++) {
    let isSequential = true;
    for (let j = 1; j < length; j++) {
      if (password.charCodeAt(i + j) !== password.charCodeAt(i + j - 1) + 1) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) return true;
  }
  return false;
}

function hasRepeatedChars(password, count) {
  const regex = new RegExp(`(.)\\1{${count - 1},}`);
  return regex.test(password);
}
```

Wire the Lambda trigger to your User Pool:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  lambda_config {
    pre_sign_up = aws_lambda_function.password_validation.arn
  }
}

resource "aws_lambda_function" "password_validation" {
  filename         = "password-validation.zip"
  function_name    = "cognito-password-validation"
  role             = aws_iam_role.lambda_role.arn
  handler          = "password-validation-lambda.handler"
  runtime          = "nodejs20.x"
  timeout          = 5
}

# Allow Cognito to invoke the Lambda
resource "aws_lambda_permission" "cognito" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.password_validation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
```

## Password Change and Reset Policies

Configure how users change and reset passwords:

```javascript
// password-change.js - User-initiated password change
import { updatePassword, resetPassword, confirmResetPassword } from 'aws-amplify/auth';

// Change password (user is signed in)
async function changePassword(oldPassword, newPassword) {
  try {
    await updatePassword({
      oldPassword: oldPassword,
      newPassword: newPassword
    });
    console.log('Password changed successfully');
  } catch (error) {
    if (error.name === 'InvalidPasswordException') {
      console.error('New password does not meet requirements');
    } else if (error.name === 'NotAuthorizedException') {
      console.error('Current password is incorrect');
    }
    throw error;
  }
}

// Forgot password flow
async function forgotPassword(email) {
  const result = await resetPassword({ username: email });
  console.log('Reset code sent:', result.nextStep);
  return result;
}

async function confirmForgotPassword(email, code, newPassword) {
  await confirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword: newPassword
  });
  console.log('Password reset complete');
}
```

## Admin Password Operations

Admins can force password changes and set passwords directly:

```javascript
// admin-password-ops.js
import {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
  AdminResetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// Set a permanent password for a user
async function adminSetPassword(username, newPassword) {
  const command = new AdminSetUserPasswordCommand({
    UserPoolId: 'us-east-1_XXXXXXXXX',
    Username: username,
    Password: newPassword,
    Permanent: true
  });

  await client.send(command);
}

// Force a password reset - sends verification code
async function adminForceReset(username) {
  const command = new AdminResetUserPasswordCommand({
    UserPoolId: 'us-east-1_XXXXXXXXX',
    Username: username
  });

  await client.send(command);
  console.log('Password reset initiated for:', username);
}
```

## Client-Side Validation

Always validate passwords on the client side before sending to Cognito. This gives users immediate feedback:

```javascript
// password-validator.js - Client-side password validation
function validatePassword(password, policy) {
  const errors = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  if (policy.requireSymbols && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Usage
const policy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true
};

const result = validatePassword('MyP@ssw0rd!23', policy);
console.log(result.valid ? 'Password is valid' : result.errors.join(', '));
```

## Compliance Considerations

Different compliance frameworks have specific password requirements:

- **PCI DSS**: Minimum 7 characters, numeric and alphabetic
- **HIPAA**: Doesn't specify exact requirements, but references NIST guidelines
- **SOC 2**: Password complexity appropriate to the risk
- **NIST 800-63B**: Minimum 8 characters, check against breached password lists, no complexity rules required

Cognito's built-in policy covers most of these. For breach-checking, you'll need the Lambda trigger approach shown above. For more on securing your Cognito setup, see [enabling MFA in Cognito User Pools](https://oneuptime.com/blog/post/2026-02-12-enable-mfa-cognito-user-pools/view).

## Summary

A good password policy balances security with usability. Cognito's built-in settings handle basic complexity, but custom Lambda validation lets you block common passwords, prevent username-based passwords, and enforce organization-specific rules. Favor longer minimum lengths over excessive complexity requirements, and always implement client-side validation for a better user experience. And don't forget - passwords are just one layer. MFA is what really protects accounts.
