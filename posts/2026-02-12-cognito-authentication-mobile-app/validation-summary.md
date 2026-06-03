# Validation Summary: How to Implement Cognito Authentication in a Mobile App

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS SDK for JavaScript v3
- Amazon Cognito user pools
- React Native
- TypeScript
- react-native-keychain
- jwt-decode
- CocoaPods

## Sources Consulted
- React Native "Get Started Without a Framework": https://reactnative.dev/docs/getting-started-without-a-framework
- React Native "Using TypeScript": https://reactnative.dev/docs/typescript
- React Native 0.75 release notes for init command changes: https://reactnative.dev/blog/2024/08/12/release-0.75
- AWS SDK for JavaScript v3 "Getting started in React Native": https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started-react-native.html
- AWS SDK for JavaScript v3 CognitoIdentityProvider InitiateAuthCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/command/InitiateAuthCommand/
- Amazon Cognito "Authentication with user pools": https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html
- Amazon Cognito "Authorization models for API and SDK authentication": https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flows-public-server-side.html
- react-native-keychain setGenericPassword API: https://oblador.github.io/react-native-keychain/docs/api/functions/setGenericPassword/
- react-native-keychain ACCESS_CONTROL enum: https://oblador.github.io/react-native-keychain/docs/api/enumerations/ACCESS_CONTROL/
- react-native-keychain ACCESSIBLE enum: https://oblador.github.io/react-native-keychain/docs/api/enumerations/ACCESSIBLE/
- react-native-keychain getSupportedBiometryType API: https://oblador.github.io/react-native-keychain/docs/api/functions/getSupportedBiometryType/
- jwt-decode package documentation: https://www.npmjs.com/package/jwt-decode

## Issues Found
- The React Native project creation command used the deprecated `npx react-native init` path and a deprecated TypeScript template. Updated it to the current React Native Community CLI command; new React Native projects target TypeScript by default.
- The setup omitted React Native polyfills commonly required by AWS SDK v3 packages. Added `react-native-get-random-values` and `react-native-url-polyfill` installation and imports before the AWS SDK imports.
- The iOS pod installation command used plain `pod install`. Updated it to `bundle exec pod install`, matching current React Native setup guidance for generated projects.
- The Cognito configuration did not state the required app client flow settings for the sample's `USER_PASSWORD_AUTH` and refresh-token calls. Added a comment that the public app client must enable `ALLOW_USER_PASSWORD_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`.
- The secure storage explanation said to use the device's secure enclave. That was too specific because `react-native-keychain` maps to platform secure storage APIs, while hardware-backed storage depends on device/platform capabilities. Changed the wording to "secure storage APIs."
- The auth service imported unused Cognito commands and used `NodeJS.Timeout`, which can fail in React Native TypeScript projects without Node types. Removed unused imports and changed the timer type to `ReturnType<typeof setTimeout>`.

## Review Notes
The code intentionally uses `USER_PASSWORD_AUTH`, which sends the password to Cognito over TLS. For a production mobile app, SRP, managed login, OAuth/OIDC flows, MFA challenge handling, and biometric retrieval prompts may be worth expanding in a future article, but the corrected sample is technically consistent with the SDK APIs it demonstrates.
