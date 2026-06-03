# Validation Summary: How to Use Amplify Gen 2 for Full-Stack Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Gen 2
- TypeScript
- AWS CDK
- AWS CloudFormation
- AWS Lambda
- AWS AppSync
- Amazon DynamoDB
- Amazon Cognito
- Amplify Data
- Amplify Auth
- Amplify Hosting
- React

## Sources Consulted
- AWS Amplify Gen 2 manual installation: https://docs.amplify.aws/javascript/start/manual-installation/
- AWS Amplify Gen 2 CLI commands reference: https://docs.amplify.aws/vue/reference/cli-commands/
- AWS Amplify Gen 2 data modeling: https://docs.amplify.aws/react/build-a-backend/data/data-modeling/
- AWS Amplify Gen 2 relationships: https://docs.amplify.aws/react/build-a-backend/data/data-modeling/relationships/
- AWS Amplify Gen 2 custom queries and mutations: https://docs.amplify.aws/react-native/build-a-backend/data/custom-business-logic/
- AWS Amplify Gen 2 Auth setup: https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/
- AWS Amplify Gen 2 email customization: https://docs.amplify.aws/angular/build-a-backend/auth/customize-auth-lifecycle/email-customization/
- AWS Amplify Gen 2 external identity providers: https://docs.amplify.aws/angular/build-a-backend/auth/concepts/external-identity-providers/
- AWS Amplify Gen 2 user attributes: https://docs.amplify.aws/react/build-a-backend/auth/concepts/user-attributes/
- AWS Amplify Gen 2 function configuration: https://docs.amplify.aws/react/build-a-backend/functions/configure-functions/
- AWS Amplify Gen 2 function environment variables: https://docs.amplify.aws/react/build-a-backend/functions/environment-variables-and-secrets/
- AWS Amplify Gen 2 cloud sandbox setup: https://docs.amplify.aws/nextjs/deploy-and-host/sandbox-environments/setup/
- AWS Amplify Gen 2 sandbox features: https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/features/
- AWS Amplify Gen 2 fullstack branch deployments: https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/branch-deployments/
- AWS Amplify Gen 2 custom pipelines: https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/custom-pipelines/
- AWS Amplify Gen 2 fullstack previews: https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/pr-previews/

## Issues Found
- The setup comment said `npm create amplify@latest` creates a new Next.js app. Updated it to say the command scaffolds Amplify Gen 2 backend files in a project, which matches the official setup flow.
- The manual dependency install command omitted `--save-dev`, current package versions, and TypeScript. Updated the command to the official documented form.
- The `Category`/`Todo` relationship used `a.hasMany('Todo', 'categoryId')` without defining the `categoryId` reference field and `belongsTo` relationship on `Todo`. Added both fields.
- The verification email template treated the code argument as a string. Updated it to call the code factory function with `createCode()`, as required by Amplify Auth.
- The social sign-in example used literal Google OAuth credentials and did not import `secret`. Updated it to use `secret('GOOGLE_CLIENT_ID')` and `secret('GOOGLE_CLIENT_SECRET')`.
- The Lambda handler example accessed `event.arguments`, which is only appropriate for specific AppSync-backed handlers, while the function was shown as a standalone Lambda. Updated it to use a typed Lambda event payload.
- The sandbox section described every data-model save as updating resources within seconds. Updated the wording to reflect supported changes and CDK hot swapping where possible.
- The sandbox command block included undocumented `npx ampx sandbox list`. Replaced it with documented output generation and kept the documented sandbox deletion command.
- The custom query example used an inline `a.customType()` return value and `a.handler.function('getTodoStats')`, which refers to an existing external Lambda by name. Updated it to define a managed function with `defineFunction`, define a named `TodoStats` custom type, return `a.ref('TodoStats')`, and pass the function reference to `a.handler.function()`.
- The production deploy command omitted the required `--app-id` option. Added `--app-id <your-amplify-app-id>`.

## Review Notes
- The remaining examples are illustrative and assume the usual Amplify project setup, generated `amplify_outputs.json`, and installed frontend dependencies such as `aws-amplify`.
- For production use, OAuth provider secrets must be configured with `ampx sandbox secret` for sandboxes or in the Amplify Console for branch deployments.
