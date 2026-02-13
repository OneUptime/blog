# How to Create Route 53 Records with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Route 53, DNS

Description: Learn how to manage Route 53 DNS records using AWS CDK, including A records, CNAME records, alias records, and weighted routing policies.

---

DNS management is one of those things that should be simple but ends up being surprisingly fiddly. Typos in record values, wrong TTLs, forgetting to update records when infrastructure changes - it all adds up. Managing Route 53 records through CDK eliminates most of these problems because your DNS records live alongside the infrastructure they point to.

Let's walk through creating various types of Route 53 records with CDK, from basic A records to advanced routing policies.

## Looking Up Existing Hosted Zones

Most of the time, your hosted zone already exists. You'll import it rather than create it:

```typescript
// lib/dns-stack.ts - Route 53 DNS records
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

export class DnsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Look up an existing hosted zone by domain name
    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'example.com',
    });

    // Or import by hosted zone ID if you know it
    const zoneById = route53.HostedZone.fromHostedZoneAttributes(this, 'ZoneById', {
      hostedZoneId: 'Z1234567890',
      zoneName: 'example.com',
    });
  }
}
```

The `fromLookup` method queries your AWS account at synth time to find the zone. This requires valid AWS credentials during `cdk synth`. If you're in a CI/CD pipeline where synth happens without credentials, use `fromHostedZoneAttributes` instead.

## Basic Record Types

Here are the most common record types you'll create:

```typescript
// A record pointing to an IP address
new route53.ARecord(this, 'ApiRecord', {
  zone: zone,
  recordName: 'api',
  target: route53.RecordTarget.fromIpAddresses('203.0.113.10', '203.0.113.11'),
  ttl: cdk.Duration.minutes(5),
});

// AAAA record for IPv6
new route53.AaaaRecord(this, 'ApiIpv6Record', {
  zone: zone,
  recordName: 'api',
  target: route53.RecordTarget.fromIpAddresses('2001:db8::1'),
  ttl: cdk.Duration.minutes(5),
});

// CNAME record
new route53.CnameRecord(this, 'BlogRecord', {
  zone: zone,
  recordName: 'blog',
  domainName: 'my-blog.netlify.app',
  ttl: cdk.Duration.hours(1),
});

// MX record for email
new route53.MxRecord(this, 'MailRecord', {
  zone: zone,
  values: [
    { priority: 10, hostName: 'mail1.example.com' },
    { priority: 20, hostName: 'mail2.example.com' },
  ],
  ttl: cdk.Duration.hours(1),
});

// TXT record for domain verification
new route53.TxtRecord(this, 'VerificationRecord', {
  zone: zone,
  recordName: '_verification',
  values: ['google-site-verification=abc123def456'],
  ttl: cdk.Duration.hours(1),
});
```

## Alias Records

Alias records are Route 53's superpower. They work like CNAME records but at the zone apex (root domain), and they're free - no query charges. Use them whenever you're pointing to an AWS resource.

```typescript
// Alias to CloudFront distribution
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

const distribution = cloudfront.Distribution.fromDistributionAttributes(
  this, 'Distribution', {
    distributionId: 'E1234567890',
    domainName: 'd111111abcdef8.cloudfront.net',
  }
);

new route53.ARecord(this, 'CloudFrontAlias', {
  zone: zone,
  recordName: 'www',
  target: route53.RecordTarget.fromAlias(
    new route53targets.CloudFrontTarget(distribution)
  ),
});

// Alias to Application Load Balancer
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

const alb = elbv2.ApplicationLoadBalancer.fromLookup(this, 'ALB', {
  loadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123',
});

new route53.ARecord(this, 'ALBAlias', {
  zone: zone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(
    new route53targets.LoadBalancerTarget(alb)
  ),
});

// Alias to API Gateway
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// Assuming you have an API Gateway rest API
new route53.ARecord(this, 'ApiGatewayAlias', {
  zone: zone,
  target: route53.RecordTarget.fromAlias(
    new route53targets.ApiGateway(restApi)
  ),
});

// Alias to S3 website endpoint
import * as s3 from 'aws-cdk-lib/aws-s3';

const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
  bucketName: 'example.com',
  websiteIndexDocument: 'index.html',
});

new route53.ARecord(this, 'S3Alias', {
  zone: zone,
  target: route53.RecordTarget.fromAlias(
    new route53targets.BucketWebsiteTarget(websiteBucket)
  ),
});
```

## Weighted Routing

Distribute traffic across multiple endpoints with weighted routing. This is great for blue/green deployments and A/B testing:

```typescript
// Weighted routing between two ALBs for gradual rollout
new route53.ARecord(this, 'WeightedBlue', {
  zone: zone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(
    new route53targets.LoadBalancerTarget(blueAlb)
  ),
  weight: 90,
  setIdentifier: 'blue',
});

new route53.ARecord(this, 'WeightedGreen', {
  zone: zone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(
    new route53targets.LoadBalancerTarget(greenAlb)
  ),
  weight: 10,
  setIdentifier: 'green',
});
```

When you use routing policies (weighted, latency, failover), every record with the same name and type needs a unique `setIdentifier`.

## Latency-Based Routing

Route users to the closest AWS region:

```typescript
// Latency-based routing across regions
new route53.ARecord(this, 'LatencyUSEast', {
  zone: zone,
  recordName: 'api',
  target: route53.RecordTarget.fromIpAddresses('10.0.1.1'),
  region: 'us-east-1',
  setIdentifier: 'us-east-1',
});

new route53.ARecord(this, 'LatencyEUWest', {
  zone: zone,
  recordName: 'api',
  target: route53.RecordTarget.fromIpAddresses('10.0.2.1'),
  region: 'eu-west-1',
  setIdentifier: 'eu-west-1',
});
```

## Failover Routing

Set up active-passive failover with health checks:

```typescript
// Health check for the primary endpoint
const healthCheck = new route53.CfnHealthCheck(this, 'PrimaryHealthCheck', {
  healthCheckConfig: {
    type: 'HTTPS',
    fullyQualifiedDomainName: 'primary.example.com',
    port: 443,
    resourcePath: '/health',
    requestInterval: 30,
    failureThreshold: 3,
  },
});

// Primary record with health check
new route53.ARecord(this, 'FailoverPrimary', {
  zone: zone,
  recordName: 'app',
  target: route53.RecordTarget.fromIpAddresses('10.0.1.1'),
  setIdentifier: 'primary',
  failover: route53.Failover.PRIMARY,
  healthCheck: route53.HealthCheck.fromHealthCheckId(
    this, 'HC', healthCheck.attrHealthCheckId
  ),
});

// Secondary record - no health check needed
new route53.ARecord(this, 'FailoverSecondary', {
  zone: zone,
  recordName: 'app',
  target: route53.RecordTarget.fromIpAddresses('10.0.2.1'),
  setIdentifier: 'secondary',
  failover: route53.Failover.SECONDARY,
});
```

## Creating a Hosted Zone

If you're creating a new zone (maybe for a subdomain delegated from another account):

```typescript
// Create a new hosted zone for a subdomain
const subdomainZone = new route53.HostedZone(this, 'SubdomainZone', {
  zoneName: 'staging.example.com',
});

// Output the NS records so you can add them to the parent zone
new cdk.CfnOutput(this, 'NameServers', {
  value: cdk.Fn.join(', ', subdomainZone.hostedZoneNameServers!),
  description: 'Add these NS records to the parent zone',
});
```

For SSL certificates to use with your domains, check out [creating ACM certificates with CDK](https://oneuptime.com/blog/post/2026-02-12-acm-certificates-cdk/view). If you're setting up CloudFront distributions that need DNS records, see [CloudFront distributions with CDK](https://oneuptime.com/blog/post/2026-02-12-cloudfront-distributions-cdk/view).

## Wrapping Up

Managing DNS records through CDK means your records are versioned, reviewed, and deployed alongside the infrastructure they reference. No more logging into the console to manually update an IP address. Start with alias records for your AWS resources, add health checks for critical endpoints, and use weighted routing when you need gradual rollouts. The safety of infrastructure-as-code is especially valuable for DNS, where a mistake can take down your entire application.
