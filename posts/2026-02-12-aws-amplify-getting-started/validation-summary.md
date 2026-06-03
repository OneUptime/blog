# Validation Summary: How to Get Started with AWS Amplify

## Status
validated

## Post Type
Tutorial / getting-started guide

## Technologies Covered
- AWS Amplify
- Amplify CLI
- Amplify JavaScript libraries
- Amplify UI React
- React
- Amazon Cognito
- Amazon API Gateway
- AWS Lambda
- AWS AppSync
- Amazon S3
- Amazon DynamoDB
- Amplify Hosting
- AWS CloudFormation

## Sources Consulted
- AWS Amplify Gen 1 React introduction: https://docs.amplify.aws/gen1/react/start/getting-started/introduction/
- AWS Amplify Gen 1 React CLI setup: https://docs.amplify.aws/gen1/react/start/getting-started/installation/
- AWS Amplify Gen 1 React fullstack setup: https://docs.amplify.aws/gen1/react/start/getting-started/setup/
- AWS Amplify Gen 1 React authentication setup: https://docs.amplify.aws/gen1/react/start/getting-started/auth/
- AWS Amplify Gen 1 JavaScript REST API setup and usage: https://docs.amplify.aws/gen1/javascript/build-a-backend/restapi/set-up-rest-api/
- AWS Amplify Gen 1 JavaScript REST API configuration: https://docs.amplify.aws/gen1/javascript/build-a-backend/restapi/configure-rest-api/
- AWS Amplify Gen 1 React Storage upload documentation: https://docs.amplify.aws/gen1/react/build-a-backend/storage/upload/
- AWS Amplify Gen 1 React Storage download/getUrl documentation: https://docs.amplify.aws/gen1/react/build-a-backend/storage/download/
- AWS Amplify Gen 1 React Storage list documentation: https://docs.amplify.aws/gen1/react/build-a-backend/storage/list/
- AWS Amplify Gen 1 React local hosting deployment documentation: https://docs.amplify.aws/gen1/react/deploy-and-host/deployment/deploy-static-site-locally/
- AWS Amplify Hosting user guide: https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html
- OneUptime linked related posts were checked for existence under the referenced URLs.

## Issues Found
- The React project creation command used `npx create-react-app`, but Create React App is deprecated and current Amplify React getting-started docs use Vite. Updated the command to `npm create vite@latest my-amplify-app -- --template react` and added `npm install`.
- The Amplify configuration example referenced `src/index.js`, which does not match the current Vite React entry point used in the setup command. Updated it to `src/main.jsx`.
- The `withAuthenticator` example accessed `user.attributes.email`. Current Amplify UI examples only rely on the provided `user.username`, while user attributes should be fetched through Auth APIs when needed. Removed the unsafe email attribute line.
- The text referred to the lower-level `Auth` API, which can be read as the old namespaced API style. Updated it to refer to the modular Auth APIs from `aws-amplify/auth`.
- The Storage example used `key` and `prefix`. Current Amplify JS Storage docs recommend `path` for versions above 6.2.0 and mark the `key` form as deprecated. Updated `uploadData`, `getUrl`, and `list` examples to use `path`.
- The upload progress example divided by `totalBytes` without checking that it exists. Updated the callback to guard on `totalBytes`, matching the official documentation pattern.
- The upload result logged `result.key`; with the current `path` API the result field is `path`. Updated the log statement.

## Review Notes
The article uses the Amplify Gen 1 CLI workflow. That workflow is still documented, but AWS positions Amplify Gen 2 as the newer experience for new full-stack TypeScript projects. A future editorial pass could explicitly label the guide as a Gen 1 CLI guide or add a Gen 2 comparison, but the reviewed commands and examples are valid for the Gen 1 workflow after the fixes above.
