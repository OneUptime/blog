# Validation Summary: How to Set Up Multi-Factor Authentication for MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (cloud database platform)
- Multi-Factor Authentication (MFA/2FA)
- TOTP (Time-based One-Time Password)
- WebAuthn/FIDO2 security keys
- Atlas CLI (`atlas` command-line tool)
- Atlas Admin API v2 (REST API with Digest authentication)
- jq (JSON processing)

## Sources Consulted
- MongoDB Atlas documentation on Multi-Factor Authentication: https://www.mongodb.com/docs/atlas/security-multi-factor-authentication/
- MongoDB Atlas Admin API v2 documentation (Organizations / Users): https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas CLI documentation (`atlas organizations apiKeys`): https://www.mongodb.com/docs/atlas/cli/current/command/atlas-organizations-apiKeys-create/
- MongoDB Atlas CLI documentation (`atlas organizations apiKeys accessLists`): https://www.mongodb.com/docs/atlas/cli/current/command/atlas-organizations-apiKeys-accessLists-create/

## Issues Found

### 1. SMS MFA listed as a supported method (incorrect)
- **What was wrong:** The post listed "SMS one-time password" as one of Atlas's supported MFA methods. MongoDB Atlas does not support SMS-based MFA. Atlas uses Okta-based authentication and supports TOTP apps, push notifications (via Okta Verify), and security keys (WebAuthn/FIDO2).
- **What was changed:** Replaced the SMS entry with "Push notification via Okta Verify" which is an actual supported method.
- **Why:** Listing an unsupported MFA method would confuse readers who try to find it in the Atlas UI and could undermine trust in the article.

### 2. UI label "Two-Factor Authentication" (inaccurate)
- **What was wrong:** The post referred to the Atlas account settings section as "Two-Factor Authentication." MongoDB Atlas uses the term "Multi-Factor Authentication" in its UI and documentation.
- **What was changed:** Updated the label from "Two-Factor Authentication" to "Multi-Factor Authentication."
- **Why:** Using the correct label helps readers locate the setting in the actual Atlas UI.

## Review Notes
- The `mfaActive` field referenced in the jq filter for the Admin API user listing is not clearly documented in the Atlas Admin API v2 user resource schema. The API may not return this exact field, or the field name may differ. Readers should verify the actual response schema against the current API documentation before relying on this query.
- The claim of "10 single-use recovery codes" is a specific number that may vary. This is a common default across many services but readers should note the actual count provided during their own setup.
- The Atlas CLI subcommand casing (`apikeys` vs `apiKeys`) works because the CLI is case-insensitive for subcommands, but official documentation uses camelCase (`apiKeys`, `accessLists`).
- The overall flow and concepts (per-user MFA setup, org-level enforcement, API key separation from MFA, IP access lists for API keys) are all accurate and well-explained.
