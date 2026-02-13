# How to Invoke Lambda Functions with AWS SDK for JavaScript v3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, JavaScript, Node.js, Serverless

Description: A practical guide to invoking AWS Lambda functions from Node.js using the AWS SDK for JavaScript v3, covering sync and async invocations, error handling, and best practices.

---

Invoking Lambda functions from your Node.js code is a bread-and-butter operation in serverless architectures. You might have a microservice calling another Lambda, an API gateway handler dispatching work to background processors, or an orchestration layer coordinating multiple functions. The v3 SDK makes this clean and efficient. Let's cover all the patterns.

## Basic Synchronous Invocation

The default invocation waits for the Lambda function to finish and returns the result.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const response = await lambda.send(new InvokeCommand({
    FunctionName: 'my-data-processor',
    Payload: JSON.stringify({
        user_id: 'user-123',
        action: 'generate_report'
    })
}));

// Decode the response payload
const result = JSON.parse(Buffer.from(response.Payload).toString());
console.log('Result:', result);
console.log('Status code:', response.StatusCode);
```

## Asynchronous (Fire-and-Forget) Invocation

When you don't need the response, use the `Event` invocation type. Lambda queues the event and returns immediately.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const response = await lambda.send(new InvokeCommand({
    FunctionName: 'email-sender',
    InvocationType: 'Event',
    Payload: JSON.stringify({
        to: 'user@example.com',
        subject: 'Your report is ready',
        templateId: 'report-notification'
    })
}));

// Status 202 means the event was accepted
console.log(`Async invocation accepted: ${response.StatusCode}`);
```

With async invocation, Lambda automatically retries twice if the function fails. You can configure a dead-letter queue or destination for failed events.

## Dry Run

Validate permissions without actually executing the function.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const response = await lambda.send(new InvokeCommand({
    FunctionName: 'my-processor',
    InvocationType: 'DryRun',
    Payload: JSON.stringify({ test: true })
}));

// 204 means the dry run succeeded (you have permission)
console.log(`Dry run status: ${response.StatusCode}`);
```

## Invoking Specific Versions and Aliases

Target specific function versions or aliases for deployment strategies like blue-green or canary.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

// Invoke a specific version
const versionResponse = await lambda.send(new InvokeCommand({
    FunctionName: 'my-processor',
    Qualifier: '42',  // version number
    Payload: JSON.stringify({ data: 'test' })
}));

// Invoke an alias (e.g., 'production', 'staging')
const aliasResponse = await lambda.send(new InvokeCommand({
    FunctionName: 'my-processor',
    Qualifier: 'production',
    Payload: JSON.stringify({ data: 'test' })
}));
```

## Handling Function Errors

A critical detail: when a Lambda function throws an error, the invocation API still returns HTTP 200. You need to check the `FunctionError` field in the response.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const response = await lambda.send(new InvokeCommand({
    FunctionName: 'my-processor',
    Payload: JSON.stringify({ input: 'bad-data' })
}));

// Check for function-level errors
if (response.FunctionError) {
    const errorPayload = JSON.parse(
        Buffer.from(response.Payload).toString()
    );
    console.error(`Function error type: ${response.FunctionError}`);
    console.error(`Error message: ${errorPayload.errorMessage}`);
    console.error(`Error type: ${errorPayload.errorType}`);

    if (errorPayload.stackTrace) {
        console.error('Stack trace:');
        errorPayload.stackTrace.forEach(line => console.error(`  ${line}`));
    }
} else {
    const result = JSON.parse(Buffer.from(response.Payload).toString());
    console.log('Success:', result);
}
```

## Robust Invocation Wrapper

For production code, wrap the invocation logic in a function that handles retries, errors, and logging.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

async function invokeLambda(functionName, payload, options = {}) {
    const {
        async: isAsync = false,
        qualifier,
        maxRetries = 3,
        retryDelay = 1000
    } = options;

    const params = {
        FunctionName: functionName,
        InvocationType: isAsync ? 'Event' : 'RequestResponse',
        Payload: JSON.stringify(payload)
    };

    if (qualifier) {
        params.Qualifier = qualifier;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await lambda.send(new InvokeCommand(params));

            // Async invocation - just check status
            if (isAsync) {
                if (response.StatusCode === 202) {
                    return { success: true, async: true };
                }
                throw new Error(`Unexpected status: ${response.StatusCode}`);
            }

            // Check for function errors
            if (response.FunctionError) {
                const errorPayload = JSON.parse(
                    Buffer.from(response.Payload).toString()
                );
                throw new Error(
                    `Lambda error (${response.FunctionError}): ` +
                    `${errorPayload.errorMessage || 'Unknown error'}`
                );
            }

            const result = JSON.parse(
                Buffer.from(response.Payload).toString()
            );
            return { success: true, data: result };

        } catch (error) {
            const isThrottled = error.name === 'TooManyRequestsException';
            const isServiceError = error.name === 'ServiceException';

            if ((isThrottled || isServiceError) && attempt < maxRetries) {
                const delay = retryDelay * Math.pow(2, attempt - 1);
                console.warn(
                    `Attempt ${attempt} failed (${error.name}), ` +
                    `retrying in ${delay}ms...`
                );
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            throw error;
        }
    }
}

// Usage
const result = await invokeLambda('my-processor', { user_id: '123' });
console.log(result.data);

// Async invocation
await invokeLambda('email-sender', { to: 'user@example.com' }, { async: true });

// Invoke specific version
await invokeLambda('my-processor', { data: 'test' }, { qualifier: 'v2' });
```

## Fan-Out Pattern

Invoke multiple Lambda functions in parallel and collect results. This pattern is useful for map-reduce style workloads.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

async function fanOut(functionName, payloads, concurrency = 10) {
    const results = [];

    // Process in batches to control concurrency
    for (let i = 0; i < payloads.length; i += concurrency) {
        const batch = payloads.slice(i, i + concurrency);

        const batchResults = await Promise.allSettled(
            batch.map(async (payload, index) => {
                const response = await lambda.send(new InvokeCommand({
                    FunctionName: functionName,
                    Payload: JSON.stringify(payload)
                }));

                if (response.FunctionError) {
                    throw new Error(
                        JSON.parse(Buffer.from(response.Payload).toString())
                            .errorMessage
                    );
                }

                return JSON.parse(Buffer.from(response.Payload).toString());
            })
        );

        results.push(...batchResults);
        console.log(`Completed batch ${Math.floor(i / concurrency) + 1}`);
    }

    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    console.log(`Results: ${succeeded.length} succeeded, ${failed.length} failed`);
    return { succeeded, failed };
}

// Process a list of items in parallel
const items = Array.from({ length: 50 }, (_, i) => ({ item_id: i + 1 }));
const { succeeded, failed } = await fanOut('item-processor', items, 10);
```

## Getting Execution Logs

Include the function's execution log in the response for debugging.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const response = await lambda.send(new InvokeCommand({
    FunctionName: 'my-processor',
    Payload: JSON.stringify({ debug: true }),
    LogType: 'Tail'  // include the execution log
}));

// Decode the base64-encoded log
const logs = Buffer.from(response.LogResult, 'base64').toString('utf-8');
console.log('Execution log:');
console.log(logs);
```

## Listing Functions

Discover available Lambda functions in your account.

```javascript
import { LambdaClient, paginateListFunctions } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const paginator = paginateListFunctions({ client: lambda }, {});

for await (const page of paginator) {
    for (const func of page.Functions) {
        console.log(
            `${func.FunctionName} | ${func.Runtime} | ` +
            `${func.MemorySize}MB | ${func.CodeSize} bytes`
        );
    }
}
```

## Best Practices

- **Use async invocation** when you don't need the result. It reduces latency for the caller and Lambda handles retries.
- **Always check FunctionError** in synchronous responses. A 200 status code doesn't mean the function succeeded.
- **Set up dead-letter queues** for async invocations to capture failed events.
- **Control concurrency in fan-out patterns.** Invoking hundreds of Lambdas simultaneously can trigger throttling.
- **Store function names in environment variables** for portability across environments.
- **Reuse the Lambda client instance.** Create it once at module level.

For the Python equivalent of these patterns, see [invoking Lambda with Boto3](https://oneuptime.com/blog/post/2026-02-12-invoke-lambda-functions-boto3/view). And for testing Lambda invocations locally, check out the guide on [LocalStack](https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view).
