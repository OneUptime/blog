# Validation Summary: How to Deploy a Node.js Express App to AWS

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS EC2
- Amazon Linux 2023
- Node.js
- Express
- PM2
- Nginx
- AWS Elastic Beanstalk
- Docker
- Amazon ECR
- Amazon ECS with Fargate
- AWS Lambda
- Amazon API Gateway HTTP API
- AWS SAM
- CloudWatch Logs

## Sources Consulted
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Elastic Beanstalk supported platforms: https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html
- AWS Elastic Beanstalk Node.js platform documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs.container.html
- Amazon Linux 2023 Node.js documentation: https://docs.aws.amazon.com/linux/al2023/ug/nodejs.html
- Amazon ECS container health check documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS log configuration documentation: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html
- Amazon ECS Fargate task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definition_parameters.html
- AWS CLI ECS create-service command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- Amazon ECR CLI getting started documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html
- AWS SAM HttpApi documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html
- AWS SAM deploy documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-deploy.html
- Node.js release schedule: https://github.com/nodejs/Release
- Express application API documentation: https://expressjs.com/en/5x/api/application/
- Express 5 release/LTS announcement: https://expressjs.com/en/blog/2025-03-31-v5-1-latest-release/
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci
- Dockerfile HEALTHCHECK reference: https://docs.docker.com/reference/builder/#healthcheck
- Node Docker Official Image documentation: https://hub.docker.com/_/node

## Issues Found
- The sample Express app always called `app.listen()`, which would also run when `lambda.js` imports the app for `serverless-http`. Added an `AWS_LAMBDA_FUNCTION_NAME` guard so the HTTP listener starts on EC2, Elastic Beanstalk, and ECS, but not inside Lambda.
- The post used Node.js 20 in EC2, Docker, and Lambda examples. Node.js 20 reached upstream end of life on April 30, 2026, and AWS Lambda lists `nodejs20.x` under deprecated runtimes as of the validation date. Updated the examples to Node.js 24, which is supported by Amazon Linux 2023, Elastic Beanstalk, Docker official images, and Lambda.
- The `package.json` example used Express 4.18.2. Express 5 is the current active release line, while Express 4 is in maintenance. Updated the dependency to `^5.2.1`; the sample APIs are compatible with Express 5.
- The EC2 install commands used the external NodeSource Node.js 20 setup script. Replaced them with Amazon Linux 2023 namespaced Node.js 24 packages and an `alternatives` selection command, matching Amazon Linux 2023 documentation.
- The npm install examples used the older production flag form. Replaced `--production` with `--omit=dev`, matching current npm documentation.
- The Elastic Beanstalk `.ebextensions` example used the legacy `NodeCommand` option while also providing a `Procfile`. Removed `NodeCommand` and kept the `Procfile` startup path documented by AWS.
- The ECS task definition referenced a CloudWatch Logs group without creating it. Added an `aws logs create-log-group` command before registering the task definition.
- The health check language said health checks are required by, or used by, every AWS service. Narrowed the wording to load balancers and container services, which is technically accurate for the deployment paths discussed.

## Review Notes
The ECS example still intentionally uses placeholder account IDs, subnet IDs, security group IDs, and a pre-existing ECS task execution role. In a future expansion, the guide could add IAM role creation, security group ingress rules, and ALB setup, but those omissions do not make the existing commands syntactically incorrect.
