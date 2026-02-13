# How to Create CloudFront Distributions with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, CloudFront, Networking

Description: Deploy Amazon CloudFront distributions using AWS CDK with TypeScript, covering S3 origins, custom origins, caching behaviors, and SSL certificates.

---

CloudFront is AWS's content delivery network, and it's one of those services where the configuration options can feel overwhelming. There are origins, behaviors, cache policies, SSL certificates, WAF integrations, and more. Setting this up through the console is tedious and error-prone. CDK makes it much more manageable by giving you typed constructs and sensible defaults.

Let's build out CloudFront distributions for the most common use cases - static websites, API gateways, and multi-origin setups.

## S3 Static Website Distribution

The bread-and-butter CloudFront use case is serving a static website from S3:

```typescript
// lib/cloudfront-stack.ts - CloudFront distribution for static website
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export class CloudFrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for website content
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: 'my-static-website-assets',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // CloudFront distribution with Origin Access Control
    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    // Output the distribution URL
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
```

The `S3BucketOrigin.withOriginAccessControl` method is the modern way to give CloudFront access to your bucket. It replaces the older Origin Access Identity (OAI) approach. CDK automatically creates the bucket policy that allows CloudFront to read objects.

The error responses section is important for single-page applications (React, Vue, Angular). When someone navigates directly to a deep route like `/dashboard/settings`, S3 returns a 404 because there's no corresponding file. The error response redirects to `index.html` and lets the client-side router handle it.

## Custom Domain with SSL

To use your own domain name, you'll need an ACM certificate and DNS records:

```typescript
// CloudFront with custom domain and SSL certificate
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';

// Import the hosted zone (must exist already)
const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
  domainName: 'example.com',
});

// Certificate must be in us-east-1 for CloudFront
const certificate = new acm.Certificate(this, 'SiteCert', {
  domainName: 'www.example.com',
  subjectAlternativeNames: ['example.com'],
  validation: acm.CertificateValidation.fromDns(hostedZone),
});

const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  domainNames: ['www.example.com', 'example.com'],
  certificate: certificate,
  defaultRootObject: 'index.html',
});

// Route 53 alias record pointing to CloudFront
new route53.ARecord(this, 'SiteAlias', {
  zone: hostedZone,
  recordName: 'www',
  target: route53.RecordTarget.fromAlias(
    new route53targets.CloudFrontTarget(distribution)
  ),
});
```

One critical thing: the ACM certificate must be in `us-east-1`, regardless of where your stack deploys. If your stack is in another region, you'll need a cross-region reference or a separate stack for the certificate.

## Multiple Origins and Behaviors

Real-world distributions often serve content from multiple sources. API requests go to one origin, static files to another:

```typescript
// Multi-origin distribution with path-based routing
const apiBehavior: cloudfront.BehaviorOptions = {
  origin: new origins.HttpOrigin('api.example.com', {
    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    customHeaders: {
      'X-Custom-Header': 'my-secret-value',
    },
  }),
  viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
  cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
  originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
  allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
};

const distribution = new cloudfront.Distribution(this, 'MultiOrigin', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
  additionalBehaviors: {
    '/api/*': apiBehavior,
    '/graphql': apiBehavior,
  },
});
```

Notice that the API behavior has caching disabled. You typically don't want CloudFront to cache API responses. The `ALL_VIEWER_EXCEPT_HOST_HEADER` origin request policy forwards query strings, cookies, and headers to your API while letting CloudFront set the Host header correctly.

## Custom Cache Policies

When the built-in cache policies don't fit, create your own:

```typescript
// Custom cache policy for specific caching requirements
const customCachePolicy = new cloudfront.CachePolicy(this, 'CustomCache', {
  cachePolicyName: 'CustomStaticAssets',
  comment: 'Cache policy for versioned static assets',
  defaultTtl: cdk.Duration.days(30),
  minTtl: cdk.Duration.days(1),
  maxTtl: cdk.Duration.days(365),
  cookieBehavior: cloudfront.CacheCookieBehavior.none(),
  headerBehavior: cloudfront.CacheHeaderBehavior.none(),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList('v', 'version'),
  enableAcceptEncodingGzip: true,
  enableAcceptEncodingBrotli: true,
});

// Use the custom policy for static asset paths
const distribution = new cloudfront.Distribution(this, 'CachedSite', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  additionalBehaviors: {
    '/static/*': {
      origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
      cachePolicy: customCachePolicy,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
  },
});
```

## CloudFront Functions for Edge Logic

For simple request/response manipulation, CloudFront Functions run at the edge with sub-millisecond latency:

```typescript
// CloudFront Function for URL rewrites
const urlRewriteFunction = new cloudfront.Function(this, 'UrlRewrite', {
  code: cloudfront.FunctionCode.fromInline(`
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Add index.html to directory requests
      if (uri.endsWith('/')) {
        request.uri += 'index.html';
      } else if (!uri.includes('.')) {
        request.uri += '/index.html';
      }

      return request;
    }
  `),
  functionName: 'url-rewrite',
});

// Attach to the distribution behavior
const distribution = new cloudfront.Distribution(this, 'FunctionDist', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    functionAssociations: [
      {
        function: urlRewriteFunction,
        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
      },
    ],
  },
});
```

CloudFront Functions are much cheaper than Lambda@Edge and have no cold start. The trade-off is they're limited to JavaScript, can't make network calls, and have a 1ms execution time limit.

## WAF Integration

Protect your distribution with AWS WAF:

```typescript
// Attach a WAF web ACL to CloudFront
const distribution = new cloudfront.Distribution(this, 'ProtectedDist', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  webAclId: 'arn:aws:wafv2:us-east-1:123456789012:global/webacl/my-web-acl/abc123',
});
```

For more on setting up WAF rules, see our post on [creating WAF rules with CDK](https://oneuptime.com/blog/post/2026-02-12-waf-rules-cdk/view). And if you need to manage the DNS records for your distribution, check out [Route 53 records with CDK](https://oneuptime.com/blog/post/2026-02-12-route-53-records-cdk/view).

## Wrapping Up

CloudFront distributions have a lot of configuration surface area, but CDK keeps it manageable. The key decisions are: which origin type (S3, HTTP, or both), what caching behavior you need, and whether you want custom domains with SSL. Start with the S3 static website pattern, add custom domains when you're ready, and layer on edge functions and WAF as your security requirements grow.
