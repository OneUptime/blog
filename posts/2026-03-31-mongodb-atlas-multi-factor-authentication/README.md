# How to Set Up Multi-Factor Authentication for MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, MFA, Security, Authentication

Description: Enable and enforce multi-factor authentication for MongoDB Atlas accounts to protect against credential theft and unauthorized access to your clusters.

---

## Overview

Multi-factor authentication (MFA) adds a second verification step beyond a password when logging into the MongoDB Atlas UI. Enabling MFA is one of the most effective controls against account compromise, especially for accounts with cluster or billing access.

## Enabling MFA for Your Account

MFA is configured per-user in the Atlas account settings.

1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com).
2. Click your username in the top-right corner and select **Account**.
3. Under **Security** > **Multi-Factor Authentication**, click **Enable**.
4. Choose an authenticator method.

Atlas supports the following MFA methods:
- **TOTP authenticator app** (Google Authenticator, Authy, 1Password) - recommended
- **Push notification via Okta Verify** - convenient tap-to-approve on your mobile device
- **Security key (WebAuthn/FIDO2)** - hardware keys like YubiKey for highest security

## Setting Up TOTP with an Authenticator App

```text
1. Select "Authenticator App" during MFA setup.
2. Atlas displays a QR code.
3. Open your authenticator app and scan the QR code.
4. Enter the 6-digit TOTP code from the app to confirm setup.
5. Save the provided backup codes in a secure location (password manager).
```

## Enforcing MFA at the Organization Level

Organization owners can require all members to have MFA enabled before they can access the organization.

```text
1. In Atlas, go to Organization Settings.
2. Under Security, enable "Require Multi-Factor Authentication".
3. Members without MFA will be prompted to enable it on their next login.
```

This setting prevents anyone from accessing your Atlas organization without a second factor, including members who may have joined before MFA was enforced.

## Using the Admin API with MFA-Protected Accounts

The Atlas Admin API uses API keys rather than username/password, so MFA does not apply to API operations. API key credentials are separate from Atlas UI credentials.

```bash
# Generate an API key (does not require MFA setup on the API key itself)
atlas organizations apikeys create \
  --desc "CI/CD pipeline key" \
  --role ORG_READ_ONLY \
  --orgId <ORG_ID>
```

However, you should still protect API keys with IP allowlists to limit where they can be used from.

```bash
# Restrict an API key to specific IP addresses
atlas organizations apikeys accesslists create \
  --apiKey <API_KEY_ID> \
  --cidr "203.0.113.0/24" \
  --orgId <ORG_ID>
```

## Verifying MFA Status Across the Organization

Use the Admin API to audit which members have MFA enabled.

```bash
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/orgs/${ORG_ID}/users" \
  | jq '.results[] | {username: .username, mfaActive: .mfaActive}'
```

This returns a list of org members with a boolean indicating whether MFA is active on their account.

## Recovery Codes and Account Recovery

When setting up MFA, Atlas provides 10 single-use recovery codes. Store them in a secure location such as a team password manager.

```text
Recovery codes example format:
  xxxx-xxxx-xxxx
  yyyy-yyyy-yyyy
  (10 codes total)

Use a recovery code to log in if you lose access to your MFA device.
Each code can be used only once.
```

## Summary

Enable MFA for all Atlas accounts by configuring TOTP or a security key in account settings. Enforce org-level MFA enforcement to prevent any member from accessing the organization without a second factor. Audit MFA status via the Admin API, store recovery codes securely, and protect API keys with IP access list restrictions since they are not subject to MFA.
