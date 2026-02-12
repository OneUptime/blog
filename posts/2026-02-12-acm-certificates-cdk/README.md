# How to Create ACM Certificates with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, ACM, SSL, Security

Description: Provision and manage SSL/TLS certificates with AWS Certificate Manager using CDK, including DNS validation, wildcard certs, and cross-region deployments.

---

SSL/TLS certificates used to be a pain - buying them, installing them, remembering to renew them. AWS Certificate Manager (ACM) makes this mostly painless by providing free public certificates that auto-renew. With CDK, you can provision certificates as part of your infrastructure stack and automatically wire them to your load balancers, CloudFront distributions, and API gateways.

Let's cover the different ways to create and use ACM certificates with CDK.

## Basic DNS-Validated Certificate

DNS validation is the recommended approach. ACM gives you a CNAME record to add to your DNS, and once it's there, the certificate gets validated automatically. With CDK, if your hosted zone is in the same account, the entire process is automated:

```typescript
// lib/certificate-stack.ts - ACM certificate with DNS validation
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class CertificateStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Look up the hosted zone
    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'example.com',
    });

    // Create a certificate with automatic DNS validation
    this.certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: 'example.com',
      subjectAlternativeNames: ['www.example.com'],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Output the certificate ARN
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ARN of the SSL certificate',
    });
  }
}
```

When you pass the hosted zone to `CertificateValidation.fromDns()`, CDK creates the DNS validation records automatically. The stack will wait for the certificate to be validated before proceeding, which usually takes a few minutes.

## Wildcard Certificates

Wildcard certificates cover all subdomains at one level. They're handy when you don't know all your subdomains upfront:

```typescript
// Wildcard certificate covering all subdomains
const wildcardCert = new acm.Certificate(this, 'WildcardCert', {
  domainName: 'example.com',
  subjectAlternativeNames: ['*.example.com'],
  validation: acm.CertificateValidation.fromDns(zone),
});
```

This certificate covers `example.com`, `api.example.com`, `app.example.com`, and any other single-level subdomain. It doesn't cover deeper subdomains like `api.staging.example.com` - for those you'd need a separate wildcard or an explicit SAN entry.

## Multi-Domain Certificates

You can cover multiple domains with different hosted zones in a single certificate:

```typescript
// Certificate spanning multiple domains with different hosted zones
const primaryZone = route53.HostedZone.fromLookup(this, 'PrimaryZone', {
  domainName: 'example.com',
});

const secondaryZone = route53.HostedZone.fromLookup(this, 'SecondaryZone', {
  domainName: 'example.org',
});

const multiDomainCert = new acm.Certificate(this, 'MultiDomainCert', {
  domainName: 'example.com',
  subjectAlternativeNames: [
    'www.example.com',
    'example.org',
    'www.example.org',
  ],
  validation: acm.CertificateValidation.fromDnsMultiZone({
    'example.com': primaryZone,
    'www.example.com': primaryZone,
    'example.org': secondaryZone,
    'www.example.org': secondaryZone,
  }),
});
```

The `fromDnsMultiZone` method takes a map of domain names to hosted zones, so CDK knows where to create each validation record.

## Cross-Region Certificates for CloudFront

CloudFront requires certificates to be in `us-east-1`, regardless of where your stack lives. If your main stack is in another region, you've got a couple of options.

Option 1: Deploy a separate stack in us-east-1:

```typescript
// bin/app.ts - Deploy certificate stack in us-east-1
const app = new cdk.App();

// Certificate stack must be in us-east-1 for CloudFront
const certStack = new CertificateStack(app, 'CertStack', {
  env: { account: '123456789012', region: 'us-east-1' },
  crossRegionReferences: true,
});

// Main stack in your preferred region
const mainStack = new MainStack(app, 'MainStack', {
  env: { account: '123456789012', region: 'eu-west-1' },
  crossRegionReferences: true,
  certificate: certStack.certificate,
});

// Make the main stack depend on the cert stack
mainStack.addDependency(certStack);
```

Option 2: Use the `DnsValidatedCertificate` construct (note: this is being phased out but still works):

```typescript
// Cross-region certificate using DnsValidatedCertificate
const crossRegionCert = new acm.DnsValidatedCertificate(this, 'CrossRegionCert', {
  domainName: 'example.com',
  subjectAlternativeNames: ['*.example.com'],
  hostedZone: zone,
  region: 'us-east-1', // Force creation in us-east-1
});
```

## Using Certificates with Resources

Once you have a certificate, attaching it to resources is straightforward:

```typescript
// Attach certificate to an Application Load Balancer
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
  vpc: vpc,
  internetFacing: true,
});

const httpsListener = alb.addListener('HTTPS', {
  port: 443,
  certificates: [certificate],
  defaultAction: elbv2.ListenerAction.forward([targetGroup]),
});

// Redirect HTTP to HTTPS
alb.addListener('HTTP', {
  port: 80,
  defaultAction: elbv2.ListenerAction.redirect({
    protocol: 'HTTPS',
    port: '443',
    permanent: true,
  }),
});
```

```typescript
// Attach certificate to CloudFront distribution
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  domainNames: ['example.com', 'www.example.com'],
  certificate: certificate,
});
```

```typescript
// Attach certificate to API Gateway custom domain
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const customDomain = new apigateway.DomainName(this, 'ApiDomain', {
  domainName: 'api.example.com',
  certificate: certificate,
  securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
});
```

## Importing Existing Certificates

If the certificate already exists (maybe it was created manually or by another stack):

```typescript
// Import an existing certificate by ARN
const existingCert = acm.Certificate.fromCertificateArn(
  this,
  'ExistingCert',
  'arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456'
);
```

## Email Validation

While DNS validation is preferred, you might occasionally need email validation:

```typescript
// Email-validated certificate (less common, use DNS validation when possible)
const emailCert = new acm.Certificate(this, 'EmailCert', {
  domainName: 'example.com',
  validation: acm.CertificateValidation.fromEmail({
    'example.com': 'admin@example.com',
  }),
});
```

Email validation sends an approval email to domain-specific addresses. It's slower and doesn't auto-renew as smoothly as DNS validation, so avoid it when you can.

## Certificate Transparency Logging

All public ACM certificates are logged to Certificate Transparency logs by default. You can opt out if needed:

```typescript
// Disable Certificate Transparency logging
const privateCert = new acm.Certificate(this, 'NoCTCert', {
  domainName: 'internal.example.com',
  validation: acm.CertificateValidation.fromDns(zone),
  transparencyLoggingEnabled: false,
});
```

Only disable CT logging if you have a specific reason, like hiding internal domain names.

## Monitoring Certificate Expiry

Even though ACM certificates auto-renew, it's good to monitor them. Renewal can fail if DNS validation records get deleted:

```typescript
// CloudWatch alarm for certificate approaching expiry
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const expiryAlarm = new cloudwatch.Alarm(this, 'CertExpiryAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/CertificateManager',
    metricName: 'DaysToExpiry',
    dimensionsMap: {
      CertificateArn: certificate.certificateArn,
    },
    statistic: 'Minimum',
    period: cdk.Duration.days(1),
  }),
  threshold: 30,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  alarmDescription: 'Certificate expires in less than 30 days',
});
```

For setting up the DNS records your certificates need, see [Route 53 records with CDK](https://oneuptime.com/blog/post/route-53-records-cdk/view). If you're using certificates with CloudFront, our post on [CloudFront distributions with CDK](https://oneuptime.com/blog/post/cloudfront-distributions-cdk/view) covers that integration in detail.

## Wrapping Up

ACM certificates with CDK are about as close to "set it and forget it" as you can get in the security world. DNS validation with automatic record creation means certificates provision themselves, and auto-renewal means you never deal with expiry emergencies. The main thing to remember is the us-east-1 requirement for CloudFront - plan for that with either a cross-region stack or a dedicated certificate stack, and you'll be in good shape.
