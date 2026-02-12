# How to Implement API Rate Limiting with API Gateway and WAF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, WAF, Rate Limiting, Security

Description: Implement API rate limiting on AWS using API Gateway usage plans, throttling, and WAF rate-based rules to protect your APIs from abuse and overload.

---

Without rate limiting, a single misbehaving client can bring down your entire API. Maybe it's a bug in their code causing a retry storm. Maybe it's a deliberate attack. Either way, you need to limit how many requests any single client can make. AWS gives you multiple layers of rate limiting through API Gateway and WAF.

Let's set up both.

## API Gateway Throttling

API Gateway has built-in throttling at multiple levels: account-wide, per-stage, per-method, and per-client (using API keys and usage plans).

### Stage-Level Throttling

Every API Gateway stage has a default throttle that applies to all requests.

```typescript
// CDK: API with stage-level throttling
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class RateLimitStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const api = new apigateway.RestApi(this, 'RateLimitedApi', {
      restApiName: 'Rate Limited API',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,   // 1000 requests per second
        throttlingBurstLimit: 2000,  // Allow bursts up to 2000
      },
    });
  }
}
```

The rate limit uses the token bucket algorithm. The burst limit is the bucket size, and the rate limit is the refill rate. So with 1000 rate and 2000 burst, you can handle a short burst of 2000 requests but sustained traffic can't exceed 1000 per second.

### Method-Level Throttling

Different endpoints might need different limits. A login endpoint should be more restrictive than a read endpoint.

```typescript
// Method-level throttle overrides
const deployment = new apigateway.Deployment(this, 'Deployment', { api });

const stage = new apigateway.Stage(this, 'ProdStage', {
  deployment,
  stageName: 'prod',
  throttlingRateLimit: 1000,
  throttlingBurstLimit: 2000,
  methodOptions: {
    // Stricter limits on the login endpoint
    'POST/auth/login': {
      throttlingRateLimit: 10,
      throttlingBurstLimit: 20,
    },
    // Higher limits for read-only endpoints
    'GET/products': {
      throttlingRateLimit: 5000,
      throttlingBurstLimit: 10000,
    },
  },
});
```

## Usage Plans and API Keys

Usage plans let you create tiers with different rate limits for different clients. This is useful for public APIs where you want free-tier and paid-tier access levels.

```typescript
// Create API keys and usage plans
const api = new apigateway.RestApi(this, 'Api', {
  restApiName: 'Tiered API',
  apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
});

// Require API key on endpoints
const products = api.root.addResource('products');
products.addMethod('GET', new apigateway.LambdaIntegration(handler), {
  apiKeyRequired: true,
});

// Free tier usage plan
const freePlan = api.addUsagePlan('FreePlan', {
  name: 'Free',
  description: 'Free tier - limited access',
  throttle: {
    rateLimit: 10,       // 10 requests per second
    burstLimit: 20,
  },
  quota: {
    limit: 1000,         // 1000 requests per day
    period: apigateway.Period.DAY,
  },
});

// Pro tier usage plan
const proPlan = api.addUsagePlan('ProPlan', {
  name: 'Pro',
  description: 'Pro tier - higher limits',
  throttle: {
    rateLimit: 100,
    burstLimit: 200,
  },
  quota: {
    limit: 100000,       // 100K requests per day
    period: apigateway.Period.DAY,
  },
});

// Enterprise tier
const enterprisePlan = api.addUsagePlan('EnterprisePlan', {
  name: 'Enterprise',
  description: 'Enterprise - generous limits',
  throttle: {
    rateLimit: 1000,
    burstLimit: 5000,
  },
  quota: {
    limit: 10000000,     // 10M requests per day
    period: apigateway.Period.DAY,
  },
});

// Create API keys and assign to plans
const freeKey = api.addApiKey('FreeCustomerKey', {
  apiKeyName: 'free-customer-001',
});

const proKey = api.addApiKey('ProCustomerKey', {
  apiKeyName: 'pro-customer-001',
});

freePlan.addApiKey(freeKey);
proPlan.addApiKey(proKey);

// Associate usage plans with the API stage
freePlan.addApiStage({ stage: api.deploymentStage });
proPlan.addApiStage({ stage: api.deploymentStage });
enterprisePlan.addApiStage({ stage: api.deploymentStage });
```

## WAF Rate-Based Rules

API Gateway throttling is per-API-key. WAF rate limiting is per-IP address. Use WAF when you need to rate limit by IP, protect against DDoS, or block specific patterns.

```typescript
// WAF with rate-based rules
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

const webAcl = new wafv2.CfnWebACL(this, 'ApiWaf', {
  defaultAction: { allow: {} },
  scope: 'REGIONAL', // Use REGIONAL for API Gateway
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'api-waf-metrics',
    sampledRequestsEnabled: true,
  },
  rules: [
    // Rule 1: Global rate limit per IP
    {
      name: 'RateLimitPerIP',
      priority: 1,
      action: { block: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'rate-limit-per-ip',
        sampledRequestsEnabled: true,
      },
      statement: {
        rateBasedStatement: {
          limit: 2000,              // Max 2000 requests per 5-minute window per IP
          aggregateKeyType: 'IP',
        },
      },
    },
    // Rule 2: Stricter rate limit on authentication endpoints
    {
      name: 'AuthRateLimit',
      priority: 2,
      action: { block: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'auth-rate-limit',
        sampledRequestsEnabled: true,
      },
      statement: {
        rateBasedStatement: {
          limit: 100,               // Max 100 auth requests per 5-minute window
          aggregateKeyType: 'IP',
          scopeDownStatement: {
            byteMatchStatement: {
              fieldToMatch: { uriPath: {} },
              positionalConstraint: 'STARTS_WITH',
              searchString: '/auth/',
              textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
            },
          },
        },
      },
    },
    // Rule 3: Block known bad user agents
    {
      name: 'BlockBadBots',
      priority: 3,
      action: { block: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'blocked-bots',
        sampledRequestsEnabled: true,
      },
      statement: {
        byteMatchStatement: {
          fieldToMatch: {
            singleHeader: { name: 'user-agent' },
          },
          positionalConstraint: 'CONTAINS',
          searchString: 'BadBot',
          textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
        },
      },
    },
  ],
});

// Associate WAF with API Gateway
new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
  resourceArn: api.deploymentStage.stageArn,
  webAclArn: webAcl.attrArn,
});
```

## Custom Rate Limiting with Lambda

For more sophisticated rate limiting (per user, per tenant, sliding windows), implement it in a Lambda authorizer.

```javascript
// lambda/rate-limiter-authorizer.js
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({});
const RATE_LIMIT = 100;    // Requests per minute
const WINDOW_SIZE = 60;     // Window in seconds

exports.handler = async (event) => {
  const apiKey = event.headers?.['x-api-key'];
  const userId = event.requestContext?.authorizer?.claims?.sub;
  const identifier = userId || apiKey || event.requestContext.identity.sourceIp;

  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${identifier}:${Math.floor(now / WINDOW_SIZE)}`;

  try {
    // Atomic increment in DynamoDB
    const result = await client.send(new UpdateItemCommand({
      TableName: 'RateLimits',
      Key: { id: { S: windowKey } },
      UpdateExpression: 'ADD requestCount :inc SET expiresAt = if_not_exists(expiresAt, :ttl)',
      ExpressionAttributeValues: {
        ':inc': { N: '1' },
        ':ttl': { N: String(now + WINDOW_SIZE + 60) }, // TTL for auto-cleanup
      },
      ReturnValues: 'ALL_NEW',
    }));

    const count = parseInt(result.Attributes.requestCount.N);

    if (count > RATE_LIMIT) {
      console.log(`Rate limit exceeded for ${identifier}: ${count}/${RATE_LIMIT}`);
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    // Include rate limit headers in the response
    const policy = generatePolicy('user', 'Allow', event.methodArn);
    policy.context = {
      'X-RateLimit-Limit': String(RATE_LIMIT),
      'X-RateLimit-Remaining': String(Math.max(0, RATE_LIMIT - count)),
      'X-RateLimit-Reset': String((Math.floor(now / WINDOW_SIZE) + 1) * WINDOW_SIZE),
    };
    return policy;
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open - allow the request if rate limiting is broken
    return generatePolicy('user', 'Allow', event.methodArn);
  }
};

function generatePolicy(principalId, effect, resource) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      }],
    },
  };
}
```

## Returning Rate Limit Headers

Good APIs tell clients their rate limit status through response headers.

```javascript
// Gateway response mapping for rate limit headers
const integration = new apigateway.LambdaIntegration(handler, {
  integrationResponses: [{
    statusCode: '200',
    responseParameters: {
      'method.response.header.X-RateLimit-Limit': 'context.authorizer.X-RateLimit-Limit',
      'method.response.header.X-RateLimit-Remaining': 'context.authorizer.X-RateLimit-Remaining',
    },
  }],
});
```

## Monitoring Rate Limiting

Track how often rate limits are hit to understand usage patterns and adjust limits.

```typescript
// CloudWatch alarm for high rate limit hits
new cloudwatch.Alarm(this, 'RateLimitAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/WAFV2',
    metricName: 'BlockedRequests',
    dimensionsMap: {
      WebACL: 'api-waf',
      Rule: 'RateLimitPerIP',
    },
    period: cdk.Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 1000,
  evaluationPeriods: 1,
  alarmDescription: 'High number of rate-limited requests',
});
```

For a complete observability setup, see our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view).

## Summary

Rate limiting on AWS works best as a layered approach. API Gateway throttling handles per-API and per-client limits. WAF rate-based rules handle per-IP limits and pattern-based blocking. Custom Lambda authorizers handle sophisticated per-user or per-tenant limits. Use all three layers together for robust protection - WAF catches broad abuse, API Gateway enforces per-client quotas, and custom logic handles your specific business rules.
