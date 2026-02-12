# How to Enable MFA in Cognito User Pools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, MFA, Security

Description: Enable and configure multi-factor authentication in Amazon Cognito User Pools using TOTP authenticator apps and SMS-based verification codes.

---

Passwords alone aren't enough to protect user accounts. Multi-factor authentication adds a second verification step that makes compromised passwords far less dangerous. Cognito supports two MFA methods - TOTP (authenticator apps like Google Authenticator) and SMS codes. This post covers setting up both.

## MFA Modes in Cognito

Cognito offers three MFA modes:

- **Off**: No MFA. Only password authentication.
- **Optional**: Users can enable MFA but aren't required to. Good for consumer apps where you want to offer it.
- **Required**: All users must set up MFA. Best for enterprise and high-security applications.

Once you set MFA to "Required," you can't change it back to "Off" without creating a new User Pool. "Optional" gives you more flexibility.

## Enabling MFA with Terraform

Here's the full configuration:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  # MFA configuration
  mfa_configuration = "OPTIONAL"  # or "ON" for required

  # Enable TOTP (authenticator apps)
  software_token_mfa_configuration {
    enabled = true
  }

  # Enable SMS MFA (requires SNS configuration)
  sms_configuration {
    external_id    = "cognito-sms-external"
    sns_caller_arn = aws_iam_role.cognito_sms.arn
    sns_region     = "us-east-1"
  }

  # SMS authentication message
  sms_authentication_message = "Your sign-in code for MyApp is {####}"

  # Username and password settings
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }
}

# IAM role for SMS sending
resource "aws_iam_role" "cognito_sms" {
  name = "cognito-sms-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "cognito-idp.amazonaws.com"
      }
      Action = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "sts:ExternalId" = "cognito-sms-external"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "cognito_sms" {
  name = "cognito-sms-publish"
  role = aws_iam_role.cognito_sms.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sns:Publish"
      Resource = "*"
    }]
  })
}
```

Using the AWS CLI:

```bash
# Enable optional MFA with TOTP
aws cognito-idp set-user-pool-mfa-config \
  --user-pool-id us-east-1_XXXXXXXXX \
  --mfa-configuration OPTIONAL \
  --software-token-mfa-configuration Enabled=true \
  --sms-mfa-configuration "SmsAuthenticationMessage='Your code is {####}',SmsConfiguration={SnsCallerArn=arn:aws:iam::111111111111:role/cognito-sms-role,ExternalId=cognito-sms-external}"
```

## Setting Up TOTP MFA

TOTP (Time-based One-Time Password) uses authenticator apps like Google Authenticator, Authy, or 1Password. It's the preferred MFA method because it doesn't depend on phone service and has no per-use cost.

Here's the setup flow:

```javascript
// totp-setup.js - Set up TOTP MFA for a signed-in user
import { setUpTOTP, verifyTOTPSetup, updateMFAPreference } from 'aws-amplify/auth';

// Step 1: Get the TOTP setup details
async function initiateTOTPSetup() {
  const totpSetupDetails = await setUpTOTP();

  // Get the setup URI for QR code generation
  const setupUri = totpSetupDetails.getSetupUri(
    'MyApp',              // App name shown in authenticator
    'user@example.com'    // Account identifier
  );

  console.log('TOTP Setup URI:', setupUri.toString());
  // Use this URI to generate a QR code
  // The user scans this with their authenticator app
  return setupUri;
}

// Step 2: Verify the TOTP code from the authenticator app
async function verifyTOTP(code) {
  try {
    await verifyTOTPSetup({ code });
    console.log('TOTP verified successfully');

    // Step 3: Set TOTP as the preferred MFA method
    await updateMFAPreference({
      totp: 'PREFERRED'
    });
    console.log('TOTP set as preferred MFA');
  } catch (error) {
    console.error('TOTP verification failed:', error.message);
    throw error;
  }
}
```

Generating a QR code from the setup URI:

```javascript
// qr-code.js - Generate QR code for TOTP setup
import QRCode from 'qrcode';

async function generateTOTPQRCode(setupUri) {
  // Generate a data URL for the QR code
  const qrDataUrl = await QRCode.toDataURL(setupUri.toString());

  // Use in an img tag: <img src={qrDataUrl} />
  return qrDataUrl;
}
```

## Handling MFA During Sign-In

When MFA is enabled, the sign-in flow has an additional step:

```javascript
// mfa-sign-in.js - Handle MFA challenge during sign-in
import { signIn, confirmSignIn } from 'aws-amplify/auth';

async function signInWithMFA(email, password) {
  // Step 1: Initial sign-in
  const signInResult = await signIn({
    username: email,
    password: password
  });

  // Step 2: Check if MFA is required
  if (signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
    console.log('TOTP code required');
    // Prompt user for their authenticator code
    return { requiresMFA: true, mfaType: 'TOTP' };
  }

  if (signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
    console.log('SMS code sent to:', signInResult.nextStep.codeDeliveryDetails);
    return { requiresMFA: true, mfaType: 'SMS' };
  }

  // No MFA required
  console.log('Sign-in complete');
  return { requiresMFA: false };
}

// Step 3: Confirm MFA code
async function confirmMFACode(code) {
  try {
    const result = await confirmSignIn({
      challengeResponse: code
    });

    if (result.isSignedIn) {
      console.log('MFA verification successful, signed in');
    }
    return result;
  } catch (error) {
    console.error('MFA verification failed:', error.message);
    throw error;
  }
}
```

## SMS MFA Setup

SMS MFA sends a code via text message. It's less secure than TOTP (susceptible to SIM-swapping attacks) but more familiar to users:

```javascript
// sms-mfa-setup.js
import { updateMFAPreference } from 'aws-amplify/auth';

// Set SMS as the MFA method
async function enableSMSMFA() {
  await updateMFAPreference({
    sms: 'PREFERRED'
  });
  console.log('SMS MFA enabled');
}

// Or enable both and let user choose
async function enableBothMFA() {
  await updateMFAPreference({
    sms: 'ENABLED',
    totp: 'PREFERRED'  // TOTP takes priority when both are enabled
  });
}
```

## MFA Selection for Users

When both TOTP and SMS are available, users can choose their preferred method:

```javascript
// mfa-preference.js
import {
  fetchMFAPreference,
  updateMFAPreference
} from 'aws-amplify/auth';

async function getMFAPreference() {
  const preference = await fetchMFAPreference();
  console.log('Enabled methods:', preference.enabled);
  console.log('Preferred method:', preference.preferred);
  return preference;
}

async function setMFAPreference(preferTotp) {
  if (preferTotp) {
    await updateMFAPreference({
      totp: 'PREFERRED',
      sms: 'ENABLED'
    });
  } else {
    await updateMFAPreference({
      sms: 'PREFERRED',
      totp: 'ENABLED'
    });
  }
}
```

## Admin MFA Operations

Admins can manage MFA settings for users:

```javascript
// admin-mfa.js
import {
  CognitoIdentityProviderClient,
  AdminSetUserMFAPreferenceCommand,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });

// Check if user has MFA configured
async function checkUserMFA(username) {
  const command = new AdminGetUserCommand({
    UserPoolId: 'us-east-1_XXXXXXXXX',
    Username: username
  });

  const response = await client.send(command);
  console.log('MFA options:', response.MFAOptions);
  console.log('Preferred MFA:', response.PreferredMfaSetting);
  return response;
}

// Reset user's MFA preference
async function resetUserMFA(username) {
  const command = new AdminSetUserMFAPreferenceCommand({
    UserPoolId: 'us-east-1_XXXXXXXXX',
    Username: username,
    SoftwareTokenMfaSettings: {
      Enabled: false,
      PreferredMfa: false
    },
    SMSMfaSettings: {
      Enabled: false,
      PreferredMfa: false
    }
  });

  await client.send(command);
  console.log('MFA reset for:', username);
}
```

## Device Remembering

Cognito can remember trusted devices to reduce MFA fatigue. Once a device is remembered, the user can skip MFA on subsequent sign-ins from that device:

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  device_configuration {
    challenge_required_on_new_device      = true
    device_only_remembered_on_user_prompt = true
  }
}
```

For a broader look at securing the authentication flow, see [configuring Cognito password policies](https://oneuptime.com/blog/post/configure-cognito-password-policies/view).

## Summary

TOTP should be your default MFA recommendation - it's free, works offline, and isn't vulnerable to SIM-swapping. SMS MFA is a reasonable fallback for users who aren't comfortable with authenticator apps. Start with "Optional" MFA to let users adopt it gradually, then consider moving to "Required" once your user base is comfortable with the flow. The combination of strong passwords and MFA makes account compromise significantly harder.
