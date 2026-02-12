# How to Use a Custom Domain for Cognito Hosted UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, DNS, Authentication

Description: Set up a custom domain like auth.yourapp.com for your Cognito hosted UI instead of the default amazoncognito.com URL for a professional sign-in experience.

---

The default Cognito domain looks like `my-app-auth.auth.us-east-1.amazoncognito.com`. It works, but it screams "third-party service" to your users. A custom domain like `auth.yourapp.com` makes the sign-in page feel like part of your application. It also helps with cookie management and security policies.

## Prerequisites

Before setting up a custom domain, you need:

- A Cognito User Pool with a working hosted UI
- A domain name you control
- An SSL/TLS certificate in AWS Certificate Manager (ACM) - must be in **us-east-1** regardless of your User Pool's region
- DNS access to create CNAME or alias records

## Step 1: Create the ACM Certificate

The certificate **must** be in us-east-1. This is a hard requirement because Cognito uses CloudFront behind the scenes, and CloudFront only uses certificates from us-east-1.

```hcl
# ACM certificate - must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "auth" {
  provider          = aws.us_east_1
  domain_name       = "auth.myapp.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "auth-domain-cert"
  }
}

# DNS validation record
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.auth.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Wait for validation
resource "aws_acm_certificate_validation" "auth" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.auth.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

Using the CLI:

```bash
# Request a certificate in us-east-1
aws acm request-certificate \
  --region us-east-1 \
  --domain-name auth.myapp.com \
  --validation-method DNS
```

## Step 2: Configure the Custom Domain in Cognito

```hcl
# Custom domain for the hosted UI
resource "aws_cognito_user_pool_domain" "custom" {
  domain          = "auth.myapp.com"
  certificate_arn = aws_acm_certificate_validation.auth.certificate_arn
  user_pool_id    = aws_cognito_user_pool.main.id
}
```

With the CLI:

```bash
# Set the custom domain
aws cognito-idp create-user-pool-domain \
  --user-pool-id us-east-1_XXXXXXXXX \
  --domain auth.myapp.com \
  --custom-domain-config CertificateArn=arn:aws:acm:us-east-1:111111111111:certificate/xxxxx
```

After creating the domain, Cognito returns a CloudFront distribution domain name. You need this for the DNS record.

## Step 3: Get the CloudFront Distribution

Cognito creates a CloudFront distribution for your custom domain. Retrieve its DNS name:

```bash
# Get the CloudFront distribution domain
aws cognito-idp describe-user-pool-domain \
  --domain auth.myapp.com \
  --query 'DomainDescription.CloudFrontDistribution' \
  --output text
```

This returns something like `d1234abcde.cloudfront.net`.

## Step 4: Create the DNS Record

Point your custom domain to the CloudFront distribution:

```hcl
# DNS record pointing to the Cognito CloudFront distribution
resource "aws_route53_record" "auth" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "auth.myapp.com"
  type    = "A"

  alias {
    name                   = aws_cognito_user_pool_domain.custom.cloudfront_distribution
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront's hosted zone ID (constant)
    evaluate_target_health = false
  }
}
```

If you're not using Route 53, create a CNAME record at your DNS provider:

```
CNAME  auth.myapp.com  -->  d1234abcde.cloudfront.net
```

Note: CNAME records don't work at the zone apex (e.g., `myapp.com`). Use a subdomain like `auth.myapp.com`.

## Step 5: Update App Client Callback URLs

Make sure your app client's callback URLs use the new domain:

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app"
  user_pool_id = aws_cognito_user_pool.main.id

  callback_urls = [
    "https://myapp.com/auth/callback"
  ]

  logout_urls = [
    "https://myapp.com/"
  ]

  # Other settings remain the same
  supported_identity_providers         = ["COGNITO", "Google"]
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
}
```

## Step 6: Update Your Application

Update the Amplify configuration to use the custom domain:

```javascript
// Update Amplify config with custom domain
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_XXXXXXXXX',
      userPoolClientId: 'your-client-id',
      loginWith: {
        oauth: {
          // Use the custom domain instead of the Cognito domain
          domain: 'auth.myapp.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: ['https://myapp.com/auth/callback'],
          redirectSignOut: ['https://myapp.com/'],
          responseType: 'code'
        }
      }
    }
  }
});
```

## Step 7: Update Identity Provider Callback URLs

If you have social or enterprise identity providers, update the callback URLs in their configurations:

**Google OAuth**: Update the authorized redirect URI to:
```
https://auth.myapp.com/oauth2/idpresponse
```

**Facebook**: Update the valid OAuth redirect URI to:
```
https://auth.myapp.com/oauth2/idpresponse
```

**SAML providers**: Update the ACS URL to:
```
https://auth.myapp.com/saml2/idpresponse
```

## Complete Terraform Configuration

Here's the full setup in one place:

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ACM Certificate
resource "aws_acm_certificate" "auth" {
  provider          = aws.us_east_1
  domain_name       = "auth.myapp.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.auth.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "auth" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.auth.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Custom domain
resource "aws_cognito_user_pool_domain" "custom" {
  domain          = "auth.myapp.com"
  certificate_arn = aws_acm_certificate_validation.auth.certificate_arn
  user_pool_id    = aws_cognito_user_pool.main.id
}

# DNS alias record
resource "aws_route53_record" "auth" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "auth.myapp.com"
  type    = "A"

  alias {
    name                   = aws_cognito_user_pool_domain.custom.cloudfront_distribution
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

data "aws_route53_zone" "main" {
  name = "myapp.com"
}
```

## Troubleshooting

**"Certificate must be in us-east-1"** - Even if your User Pool is in another region, the ACM certificate must be in us-east-1.

**Domain creation takes a long time** - CloudFront distribution creation can take 15-40 minutes. Be patient.

**"Domain already exists"** - Each custom domain can only be used by one User Pool. If you're migrating, delete the old domain first.

**SSL errors after setup** - DNS propagation can take up to 48 hours. Check with `dig auth.myapp.com` to verify the CNAME is resolving.

For styling the hosted UI pages themselves, see [customizing the Cognito hosted UI](https://oneuptime.com/blog/post/customize-cognito-hosted-ui/view).

## Summary

A custom domain takes your Cognito hosted UI from functional to professional. The setup involves an ACM certificate in us-east-1, a Cognito domain configuration, and a DNS record. The whole process takes about 30 minutes of configuration time plus up to 40 minutes for CloudFront distribution creation. Don't forget to update all your identity provider callback URLs after switching domains.
