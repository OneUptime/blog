# How to Use API Gateway Custom Domain Names

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Route 53, SSL, DNS

Description: Learn how to configure custom domain names for API Gateway so your APIs use professional, branded URLs instead of the default AWS-generated endpoints.

---

Nobody wants to share an API endpoint like `https://a1b2c3d4e5.execute-api.us-east-1.amazonaws.com/prod` with their users. It's ugly, hard to remember, and screams "I didn't finish setting this up." Custom domain names let you map a clean URL like `https://api.example.com` to your API Gateway deployment, complete with your own SSL certificate.

Setting this up involves a few moving parts - ACM certificates, DNS records, and API mappings - but once it's done, you've got a professional API endpoint that your team and customers can actually remember.

## Prerequisites

Before you start, you'll need:

1. A registered domain name
2. Access to your DNS provider (Route 53 or external)
3. An existing API Gateway API (REST or HTTP)
4. AWS Certificate Manager (ACM) for SSL certificates

## Step 1: Request an SSL Certificate

API Gateway requires an SSL certificate from ACM. For REST APIs using edge-optimized endpoints, the certificate must be in `us-east-1`. For regional endpoints and HTTP APIs, the certificate must be in the same region as your API.

Request the certificate using the AWS CLI.

This command requests a certificate for your API domain with DNS validation:

```bash
# Request a certificate for your API domain
aws acm request-certificate \
  --domain-name api.example.com \
  --validation-method DNS \
  --region us-east-1 \
  --subject-alternative-names "*.api.example.com"
```

After requesting, you need to validate ownership by creating a DNS record. ACM will give you a CNAME record to add.

This command retrieves the DNS validation records you need to create:

```bash
# Get the certificate details for DNS validation
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Create the CNAME record in your DNS provider. If you're using Route 53, you can do this directly:

```bash
# Create the validation record in Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_abc123.api.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_def456.acm-validations.aws."}]
      }
    }]
  }'
```

Wait for the certificate to be validated. This usually takes a few minutes but can take up to 30 minutes.

## Step 2: Create the Custom Domain Name

Once your certificate is validated, create the custom domain in API Gateway.

This command creates a regional custom domain name with your ACM certificate:

```bash
# For a regional endpoint (recommended for most use cases)
aws apigateway create-domain-name \
  --domain-name api.example.com \
  --regional-certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --endpoint-configuration types=REGIONAL
```

For edge-optimized endpoints (uses CloudFront under the hood):

```bash
# For an edge-optimized endpoint
aws apigateway create-domain-name \
  --domain-name api.example.com \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123
```

## Step 3: Create the Base Path Mapping

The base path mapping connects your custom domain to a specific API and stage.

This command maps the root path of your custom domain to your API's prod stage:

```bash
# Map the custom domain to your API
aws apigateway create-base-path-mapping \
  --domain-name api.example.com \
  --rest-api-id a1b2c3d4e5 \
  --stage prod \
  --base-path "(none)"
```

You can also map specific paths to different APIs:

```bash
# Map /v1 to one API
aws apigateway create-base-path-mapping \
  --domain-name api.example.com \
  --rest-api-id a1b2c3d4e5 \
  --stage prod \
  --base-path v1

# Map /v2 to another API
aws apigateway create-base-path-mapping \
  --domain-name api.example.com \
  --rest-api-id f6g7h8i9j0 \
  --stage prod \
  --base-path v2
```

This gives you `api.example.com/v1/*` pointing to one API and `api.example.com/v2/*` pointing to another. It's a clean way to handle API versioning.

## Step 4: Create the DNS Record

Point your domain to the API Gateway custom domain target.

This command gets the target domain name you need for your DNS record:

```bash
# Get the target domain for DNS
aws apigateway get-domain-name \
  --domain-name api.example.com \
  --query 'regionalDomainName'
```

For Route 53, create an alias record:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "d-abc123.execute-api.us-east-1.amazonaws.com",
          "HostedZoneId": "Z1UJRXOUMOOFQ8",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

The `HostedZoneId` for API Gateway varies by region. Check the AWS documentation for your specific region's hosted zone ID.

## Doing It All with CDK

CDK makes this entire process much cleaner. Here's the complete setup.

This CDK stack handles certificate creation, custom domain, DNS, and API mapping in one deployment:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class CustomDomainApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Look up the hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'example.com',
    });

    // Create the SSL certificate
    const certificate = new acm.Certificate(this, 'ApiCert', {
      domainName: 'api.example.com',
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Create the Lambda handler
    const handler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/api'),
    });

    // Create the API
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'My Service',
      domainName: {
        domainName: 'api.example.com',
        certificate: certificate,
        endpointType: apigateway.EndpointType.REGIONAL,
      },
    });

    api.root.addResource('items').addMethod(
      'GET',
      new apigateway.LambdaIntegration(handler)
    );

    // Create the DNS record
    new route53.ARecord(this, 'ApiDns', {
      zone: hostedZone,
      recordName: 'api',
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGateway(api)
      ),
    });

    // Output the custom domain URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://api.example.com`,
    });
  }
}
```

CDK handles the certificate validation, domain mapping, and DNS record creation automatically. It's by far the easiest way to set this up.

## Custom Domains for HTTP APIs

HTTP APIs (API Gateway v2) use a slightly different configuration.

This CDK configuration sets up a custom domain for an HTTP API:

```typescript
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';

// Create the custom domain for HTTP API
const domainName = new apigatewayv2.DomainName(this, 'ApiDomain', {
  domainName: 'api.example.com',
  certificate: certificate,
});

// Create the HTTP API
const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
  defaultDomainMapping: {
    domainName: domainName,
  },
});

// Create the DNS record
new route53.ARecord(this, 'ApiDns', {
  zone: hostedZone,
  recordName: 'api',
  target: route53.RecordTarget.fromAlias(
    new targets.ApiGatewayv2DomainProperties(
      domainName.regionalDomainName,
      domainName.regionalHostedZoneId
    )
  ),
});
```

## Mutual TLS (mTLS) with Custom Domains

For APIs that need extra security, you can enable mutual TLS on your custom domain. This requires clients to present a certificate, adding another layer of authentication.

```bash
# Upload a truststore to S3 first
aws s3 cp truststore.pem s3://my-bucket/truststore.pem

# Create domain with mTLS
aws apigateway create-domain-name \
  --domain-name api.example.com \
  --regional-certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --endpoint-configuration types=REGIONAL \
  --mutual-tls-authentication truststoreUri=s3://my-bucket/truststore.pem
```

## Edge-Optimized vs. Regional: Which to Choose

**Edge-optimized** endpoints route traffic through CloudFront edge locations. Choose this if your API consumers are globally distributed. The downside is that you can't put your own CloudFront distribution in front of it.

**Regional** endpoints are the better default choice. They're simpler, support mutual TLS, and you can put your own CloudFront distribution in front if you want to customize caching behavior. They also work with AWS WAF directly.

For a related topic on CloudFront integration, check out our post on [CloudFront Functions vs Lambda@Edge](https://oneuptime.com/blog/post/cloudfront-functions-vs-lambda-edge/view).

## Troubleshooting

**Certificate stuck in "Pending validation"** - Make sure the CNAME validation record is correct. It can take up to 30 minutes for DNS propagation.

**403 Forbidden after setup** - Check that the base path mapping is correct and that your API has been deployed to the mapped stage.

**DNS not resolving** - DNS changes can take up to 48 hours to propagate, though it's usually much faster. Use `dig api.example.com` to check.

**"Certificate not found" error** - For edge-optimized endpoints, the certificate must be in us-east-1, regardless of where your API lives.

## Wrapping Up

Custom domain names turn your API Gateway endpoints from forgettable AWS URLs into professional, branded endpoints. The setup involves a few steps - certificate, domain, mapping, DNS - but with CDK, it's a single deployment. Once configured, your APIs look like they belong to your organization, not to AWS.
