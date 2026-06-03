# Validation Summary: How to Build a Serverless Discord Bot on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon API Gateway HTTP APIs
- AWS CLI
- Discord Interactions API
- Discord application commands
- Node.js
- discord-interactions npm package
- CloudWatch

## Sources Consulted
- Discord Interactions Overview: https://docs.discord.com/developers/interactions/overview
- Discord Receiving and Responding to Interactions: https://docs.discord.com/developers/interactions/receiving-and-responding
- Discord Application Commands: https://docs.discord.com/developers/interactions/application-commands
- discord-interactions npm package and README: https://www.npmjs.com/package/discord-interactions
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda create-function CLI reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS Lambda add-permission CLI reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- API Gateway HTTP API Lambda proxy integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- API Gateway create-api CLI reference: https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-api.html
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/

## Issues Found
- The tutorial used the `nodejs18.x` Lambda runtime and listed Node.js 18+ as the local prerequisite. AWS now lists Node.js 18 as a deprecated Lambda runtime, so the post was updated to use Node.js 22+ and `nodejs22.x`.
- The Lambda handler assumed `event.body` was always plain text and did not account for API Gateway's `isBase64Encoded` flag. The handler now decodes base64-encoded bodies before verifying the Discord signature.
- The Lambda handler did not explicitly return `Content-Type: application/json`. Discord requires a valid content type when acknowledging PING requests, so JSON headers were added to the handler responses.
- The Lambda handler accessed request headers without checking whether they existed. The code now handles missing signature headers or missing public key configuration with a 401 response instead of throwing.
- The API Gateway Lambda ARN hard-coded `us-east-1`, which could mislead readers deploying in another region. It now uses `YOUR_REGION`.
- The deferred-response explanation said to call the Discord webhook URL to send the actual response. Discord's documented options after deferral are to edit the original response or send a follow-up message, so the wording was corrected.
- The Lambda cost calculation was incorrect. 10,000 requests at 100ms and 128MB is 125 GB-seconds, not 1,000 GB-seconds.

## Review Notes
- The main JavaScript examples were syntax-checked with Node.js 22.
- The AWS CLI was not installed in the local environment, so CLI syntax was validated against official AWS CLI documentation instead of local `aws --help` output.
- The broad `lambda add-permission` example works but could be tightened in the future with a `--source-arn` scoped to the specific API Gateway API.
