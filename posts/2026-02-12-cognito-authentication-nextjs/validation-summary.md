# Validation Summary: How to Implement Cognito Authentication in Next.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Next.js App Router
- React Server Actions
- AWS Cognito User Pools
- AWS SDK for JavaScript v3
- HTTP-only cookies
- JWT verification

## Sources Consulted
- Next.js cookies API: https://nextjs.org/docs/app/api-reference/functions/cookies
- Next.js forms and Server Actions guide: https://nextjs.org/docs/guides/building-forms
- Next.js create-next-app CLI: https://nextjs.org/docs/pages/api-reference/cli/create-next-app
- AWS SDK for JavaScript v3 Cognito Identity Provider examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_cognito-identity-provider_code_examples.html
- Amazon Cognito InitiateAuth API reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html
- Amazon Cognito JWT verification guide: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html

## Issues Found
- The post used the synchronous `cookies()` API from `next/headers`. Current Next.js documentation defines `cookies()` as asynchronous, with synchronous access retained only for backward compatibility in Next.js 15 and marked for future deprecation. Updated the cookie helper functions to use `await cookies()`, made the affected helpers asynchronous, and updated callers and the dashboard server component accordingly.
- The post installed `jsonwebtoken` and `jwks-rsa`, then decoded Cognito ID tokens without signature verification while using token claims for user and group information. Amazon Cognito documentation states applications must verify JWT signatures and recommends `aws-jwt-verify` for Node.js. Replaced the dependency and helper snippet with `CognitoJwtVerifier` verification before claims are trusted.
- The Cognito service imported `GetUserCommand` but never used it. Removed the unused import from the snippet.
- The middleware section said the middleware refreshed tokens, but the shown middleware only checked for cookie presence and redirected. Updated the surrounding sentence to match the actual code.

## Review Notes
- The `USER_PASSWORD_AUTH` flow is valid for Cognito app clients that have that explicit auth flow enabled. A future revision could mention this Cognito app client setting.
- The middleware intentionally performs only a coarse cookie-presence check after the correction. Authorization decisions should continue to rely on verified token claims in server code or route handlers.
