# How to Create WAF Rules with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, WAF, Security

Description: Deploy AWS WAF web ACLs and rules using CDK to protect your applications from common web exploits, bots, and DDoS attacks.

---

AWS WAF sits in front of your CloudFront distributions, ALBs, and API Gateways, inspecting requests and blocking the bad ones. It's your first line of defense against SQL injection, cross-site scripting, brute force attacks, and various bot shenanigans. The CDK support for WAF is primarily through L1 constructs (CloudFormation resources), which means you're working a bit closer to the metal than with most CDK services. But it's still way better than writing CloudFormation YAML by hand.

Let's build out a comprehensive WAF configuration with managed rules, custom rules, rate limiting, and IP-based access control.

## Basic Web ACL with Managed Rules

AWS provides managed rule groups that cover common attack patterns. These are the easiest way to get started:

```typescript
// lib/waf-stack.ts - WAF Web ACL with managed rules
import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class WafStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      name: 'production-web-acl',
      description: 'WAF rules for production applications',
      scope: 'REGIONAL', // Use 'CLOUDFRONT' for CloudFront distributions
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'production-web-acl',
        sampledRequestsEnabled: true,
      },
      rules: [
        // AWS Managed Rules - Common Rule Set
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [
                { name: 'SizeRestrictions_BODY' }, // Exclude if you accept large payloads
              ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        // AWS Managed Rules - Known Bad Inputs
        {
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputs',
            sampledRequestsEnabled: true,
          },
        },
        // AWS Managed Rules - SQL Injection Protection
        {
          name: 'AWS-AWSManagedRulesSQLiRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'SQLiRuleSet',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });
  }
}
```

A few important things to understand here. The `scope` must be `CLOUDFRONT` for CloudFront distributions (and the stack must be in us-east-1), or `REGIONAL` for ALBs and API Gateways. The `defaultAction` is `allow`, meaning requests that don't match any rule pass through. Individual rules block matching requests.

The `overrideAction: { none: {} }` on managed rule groups means "use the rule group's built-in actions." If you want to start in count-only mode (log but don't block), change this to `{ count: {} }`.

## Rate Limiting

Rate limiting prevents abuse by capping how many requests a single IP can make:

```typescript
// Rate limiting rule - block IPs that exceed the threshold
{
  name: 'RateLimitRule',
  priority: 10,
  action: { block: {} },
  statement: {
    rateBasedStatement: {
      limit: 2000, // Max requests per 5-minute window
      aggregateKeyType: 'IP',
    },
  },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'RateLimitRule',
    sampledRequestsEnabled: true,
  },
}
```

The limit is per 5-minute window, which is fixed by AWS. A limit of 2000 means roughly 6-7 requests per second sustained. Adjust based on your application's expected traffic patterns.

You can also rate limit more granularly by combining with scope-down statements:

```typescript
// Rate limit only on the login endpoint
{
  name: 'LoginRateLimit',
  priority: 11,
  action: { block: {} },
  statement: {
    rateBasedStatement: {
      limit: 100,
      aggregateKeyType: 'IP',
      scopeDownStatement: {
        byteMatchStatement: {
          searchString: '/api/login',
          fieldToMatch: { uriPath: {} },
          textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
          positionalConstraint: 'STARTS_WITH',
        },
      },
    },
  },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'LoginRateLimit',
    sampledRequestsEnabled: true,
  },
}
```

## IP-Based Rules

Block known bad IPs or allow only trusted ones:

```typescript
// Create an IP set for blocked addresses
const blockedIpSet = new wafv2.CfnIPSet(this, 'BlockedIPs', {
  name: 'blocked-ips',
  scope: 'REGIONAL',
  ipAddressVersion: 'IPV4',
  addresses: [
    '192.0.2.0/24',
    '198.51.100.0/24',
  ],
});

// Create an IP set for allowed addresses (office IPs, etc.)
const allowedIpSet = new wafv2.CfnIPSet(this, 'AllowedIPs', {
  name: 'allowed-ips',
  scope: 'REGIONAL',
  ipAddressVersion: 'IPV4',
  addresses: [
    '203.0.113.0/24', // Office IP range
  ],
});

// Block rule using the IP set
{
  name: 'BlockBadIPs',
  priority: 0, // Highest priority - check first
  action: { block: {} },
  statement: {
    ipSetReferenceStatement: {
      arn: blockedIpSet.attrArn,
    },
  },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'BlockBadIPs',
    sampledRequestsEnabled: true,
  },
}
```

## Geo-Blocking

Restrict access to specific countries:

```typescript
// Block requests from specific countries
{
  name: 'GeoBlockRule',
  priority: 5,
  action: { block: {} },
  statement: {
    geoMatchStatement: {
      countryCodes: ['CN', 'RU', 'KP'], // Block China, Russia, North Korea
    },
  },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'GeoBlock',
    sampledRequestsEnabled: true,
  },
}
```

## Custom String Match Rules

Block requests with suspicious patterns in headers or body:

```typescript
// Block requests with suspicious User-Agent strings
{
  name: 'BlockBadUserAgents',
  priority: 15,
  action: { block: {} },
  statement: {
    orStatement: {
      statements: [
        {
          byteMatchStatement: {
            searchString: 'sqlmap',
            fieldToMatch: {
              singleHeader: { name: 'user-agent' },
            },
            textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
            positionalConstraint: 'CONTAINS',
          },
        },
        {
          byteMatchStatement: {
            searchString: 'nikto',
            fieldToMatch: {
              singleHeader: { name: 'user-agent' },
            },
            textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
            positionalConstraint: 'CONTAINS',
          },
        },
      ],
    },
  },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'BadUserAgents',
    sampledRequestsEnabled: true,
  },
}
```

## Associating the Web ACL

After creating the web ACL, attach it to your resources:

```typescript
// Associate WAF with an ALB
new wafv2.CfnWebACLAssociation(this, 'ALBAssociation', {
  resourceArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123',
  webAclArn: this.webAcl.attrArn,
});

// Associate WAF with an API Gateway stage
new wafv2.CfnWebACLAssociation(this, 'ApiGatewayAssociation', {
  resourceArn: `arn:aws:apigateway:us-east-1::/restapis/${restApi.restApiId}/stages/prod`,
  webAclArn: this.webAcl.attrArn,
});
```

For CloudFront, you set the web ACL ARN directly on the distribution rather than using an association resource.

## Logging WAF Requests

Enable logging to understand what WAF is blocking:

```typescript
// Enable WAF logging to CloudWatch Logs
import * as logs from 'aws-cdk-lib/aws-logs';

const wafLogGroup = new logs.LogGroup(this, 'WafLogs', {
  logGroupName: 'aws-waf-logs-production', // Must start with 'aws-waf-logs-'
  retention: logs.RetentionDays.ONE_MONTH,
});

new wafv2.CfnLoggingConfiguration(this, 'WafLogging', {
  resourceArn: this.webAcl.attrArn,
  logDestinationConfigs: [wafLogGroup.logGroupArn],
  loggingFilter: {
    defaultBehavior: 'DROP',
    filters: [
      {
        behavior: 'KEEP',
        conditions: [
          { actionCondition: { action: 'BLOCK' } },
        ],
        requirement: 'MEETS_ANY',
      },
    ],
  },
});
```

The logging filter above only logs blocked requests, which keeps costs down while still giving you visibility into what's being blocked. The log group name must start with `aws-waf-logs-`.

## Testing in Count Mode

Before deploying blocking rules to production, run them in count mode first:

```typescript
// Count mode for testing - logs but doesn't block
{
  name: 'TestNewRule',
  priority: 20,
  action: { count: {} }, // Count instead of block
  statement: {
    byteMatchStatement: {
      searchString: '/admin',
      fieldToMatch: { uriPath: {} },
      textTransformations: [{ priority: 0, type: 'NONE' }],
      positionalConstraint: 'STARTS_WITH',
    },
  },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'TestAdminBlock',
    sampledRequestsEnabled: true,
  },
}
```

Watch the CloudWatch metrics for a few days, verify the rule matches what you expect, then switch to `block`.

For integrating WAF with your CDN layer, check out [CloudFront distributions with CDK](https://oneuptime.com/blog/post/cloudfront-distributions-cdk/view). For the SSL certificates that go alongside WAF protection, see [ACM certificates with CDK](https://oneuptime.com/blog/post/acm-certificates-cdk/view).

## Wrapping Up

WAF is essential for any internet-facing application, and CDK lets you manage it as code alongside everything else. Start with the AWS managed rule groups - they cover the most common attacks with zero configuration. Add rate limiting for your authentication endpoints, geo-blocking if you know your user base, and custom rules for application-specific patterns. Always test in count mode first, and keep logging enabled so you can tune your rules over time.
