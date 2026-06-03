# Validation Summary: How to Decode and Validate Cognito JWT Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito user pools
- JSON Web Tokens (JWT)
- JSON Web Key Sets (JWKS)
- Node.js
- jsonwebtoken
- jwks-rsa
- Express
- Python
- python-jose
- requests

## Sources Consulted
- Amazon Cognito: Verifying JSON web tokens - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- Amazon Cognito: Understanding the access token - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- RFC 7519: JSON Web Token (JWT) - https://datatracker.ietf.org/doc/html/rfc7519
- RFC 7517: JSON Web Key (JWK) - https://datatracker.ietf.org/doc/html/rfc7517
- jsonwebtoken README - https://github.com/auth0/node-jsonwebtoken/blob/master/README.md
- jwks-rsa README - https://github.com/auth0/node-jwks-rsa
- python-jose documentation/source reference - https://python-jose.readthedocs.io/ and https://sources.debian.org/src/python-jose/3.3.0%2Bdfsg-4/jose/jwt.py/
- Requests documentation - https://requests.readthedocs.io/

## Issues Found
- The decoded token example was fenced as `json` but included comments, which is not valid JSON. Changed the fence to `jsonc`.
- The post described access tokens as using `scope` and `client_id` instead of user attributes, but Cognito access tokens can also include group membership and can include `aud` for resource-bound access tokens. Updated the wording to match AWS documentation.
- The validation flow and checklist implied that all tokens should validate `aud` against the app client ID. Updated this to distinguish ID token `aud` validation from access token `client_id` validation.
- The Node.js example used `maxAge: '1h'`, which could reject valid Cognito tokens because Cognito token lifetimes are configurable. Removed the hard-coded age limit and added `clockTolerance`.
- The Node.js example did not pass the ID token audience into `jwt.verify`. Added `audience` for ID-token validation while keeping manual `client_id` validation for access tokens.
- The Python example passed `audience=None` for access-token validation while audience verification remains enabled by default in python-jose. Added `verify_aud: False` for access tokens and kept app-client audience validation for ID tokens.
- The Python JWKS fetch did not check HTTP errors before parsing. Added `response.raise_for_status()`.
- The Python example did not apply clock skew even though the article recommends it. Added a 30-second `leeway`.

## Review Notes
- AWS currently recommends `aws-jwt-verify` for Node.js Cognito token validation. The `jsonwebtoken` plus `jwks-rsa` approach remains viable when configured correctly, so the article now describes it as a common approach rather than the most common one.
- For APIs that use Cognito resource binding, access-token `aud` should also be validated against the expected API/resource URL in addition to validating `client_id`.
