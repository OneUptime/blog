# Validation Summary: How to Use Authentication Triggers on User Sign-Up in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas App Services
- Atlas Authentication Triggers
- Atlas Functions (server-side JavaScript)
- Email/Password authentication (local-userpass provider)
- Google OAuth (oauth2-google provider)

## Sources Consulted
- MongoDB Atlas App Services Authentication Triggers documentation (https://www.mongodb.com/docs/atlas/app-services/triggers/authentication-triggers/)
- MongoDB Atlas App Services User Objects documentation (https://www.mongodb.com/docs/atlas/app-services/users/)
- MongoDB Atlas App Services Functions documentation (https://www.mongodb.com/docs/atlas/app-services/functions/)
- MongoDB Atlas App Services Authentication Providers documentation (https://www.mongodb.com/docs/atlas/app-services/authentication/)

## Issues Found

1. **Incorrect provider type identifier `"email/password"` in trigger configuration JSON**: The trigger config used `"email/password"` as the provider name, but Atlas App Services uses the internal identifier `"local-userpass"` for the email/password authentication provider. Changed to `"local-userpass"` in the trigger config JSON.

2. **Incorrect provider type identifier `"email/password"` in authEvent structure**: The authEvent example showed `providers: ["email/password"]` but the actual event uses the internal identifier `"local-userpass"`. Changed to `providers: ["local-userpass"]`.

3. **Incorrect property name `providerType` in identity object**: The authEvent structure example and onboarding function code used `providerType` (camelCase) for the identity property, but Atlas App Services uses `provider_type` (snake_case) in the user identity object. Changed `providerType` to `provider_type` in both the authEvent structure and the `onUserSignup` function code.

## Review Notes
- The `authEvent` object structure example omits the `time` field, which is also part of the event payload. This is not incorrect since the example doesn't claim to be exhaustive, but readers should be aware that a `time` (Date) property is also available on the event.
- The `providerData` field shown in the identity object within the authEvent example may not be present in all event payloads; its inclusion is acceptable for illustrative purposes but readers should test against actual events.
- The post correctly uses `exports = async function(...)` syntax which is the standard for Atlas Functions (not `module.exports`).
- The code patterns (idempotent profile creation, archiving before deletion, parallel cleanup with `Promise.all`) are well-structured and follow good practices for trigger functions.
