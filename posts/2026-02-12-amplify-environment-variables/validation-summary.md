# Validation Summary: How to Configure Amplify Environment Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Hosting
- AWS Amplify Gen 1 Functions
- AWS Amplify Gen 2 Functions
- AWS Lambda environment variables
- AWS Systems Manager Parameter Store
- AWS CDK
- AWS SDK for JavaScript v3
- Next.js
- Create React App
- Vite
- YAML build specifications

## Sources Consulted
- AWS Amplify Hosting: Setting environment variables: https://docs.aws.amazon.com/amplify/latest/userguide/setting-env-vars.html
- AWS Amplify Hosting: Using environment variables in an Amplify application: https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
- AWS Amplify Hosting: Making environment variables accessible to server-side runtimes: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
- AWS Amplify Gen 1 Functions: Environment variables: https://docs.amplify.aws/gen1/react/build-a-backend/functions/environment-variables/
- AWS Amplify Gen 1 Functions: Access secret values: https://docs.amplify.aws/gen1/react/build-a-backend/functions/secrets/
- AWS Amplify Gen 2 Functions: Environment variables and secrets: https://docs.amplify.aws/react/build-a-backend/functions/environment-variables-and-secrets/
- AWS Amplify Gen 2 Functions: Modify Amplify-generated Lambda resources with CDK: https://docs.amplify.aws/javascript/build-a-backend/functions/modify-resources-with-cdk/
- AWS CLI Command Reference: ssm put-parameter: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS Systems Manager User Guide: Creating Parameter Store parameters with the AWS CLI: https://docs.aws.amazon.com/systems-manager/latest/userguide/param-create-cli.html
- AWS CDK API Reference: aws_ssm.StringParameter: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ssm.StringParameter.html
- AWS CDK API Reference: aws_lambda.Function addEnvironment: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html
- Next.js environment variables documentation: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- Create React App environment variables documentation: https://create-react-app.dev/docs/adding-custom-environment-variables/
- Vite environment variables and modes documentation: https://vite.dev/guide/env-and-mode.html

## Issues Found
- The post described Lambda function environment variables as securely stored and then used secret-looking values in Lambda environment variable examples. Updated the wording to distinguish non-sensitive Lambda environment variables from secrets, and changed the Amplify Gen 2 function example to use `secret('STRIPE_API_KEY')`, matching Amplify Gen 2 guidance that secrets should not be stored as plaintext environment values.
- The Amplify Gen 1 example showed a commented JSON `parameters.json` file with secret values. That snippet was both invalid JSON and not the documented way to configure Gen 1 Lambda environment variables. Replaced it with the documented `amplify add function` advanced settings flow, while keeping the existing `amplify update function` command.
- The Gen 2 SSM example imported an SSM SecureString parameter and granted read permission, but did not pass the parameter name to the Lambda function or otherwise make the value available at runtime. Updated the snippet to define a parameter name variable, grant read access, and add `STRIPE_KEY_PARAM_NAME` to the Lambda environment so the handler can fetch the parameter.

## Review Notes
Create React App's `REACT_APP_` behavior is still correct for react-scripts projects, but Create React App itself is no longer the preferred choice for new React applications. The post is accurate as a framework-specific reference, but a future update could mention that caveat.
