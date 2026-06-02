# Validation Summary: How to Import External SSL Certificates into ACM

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- AWS CLI
- Amazon CloudFront
- Amazon CloudWatch
- AWS Config
- Terraform AWS Provider
- AWS Secrets Manager
- OpenSSL
- Python / boto3
- Let’s Encrypt certificate chains

## Sources Consulted
- AWS Certificate Manager User Guide: Import certificates into ACM - https://docs.aws.amazon.com/acm/latest/userguide/import-certificate.html
- AWS Certificate Manager User Guide: Import a certificate with AWS CLI - https://docs.aws.amazon.com/acm/latest/userguide/import-certificate-api-cli.html
- AWS Certificate Manager User Guide: Certificate and key format for importing - https://docs.aws.amazon.com/acm/latest/userguide/import-certificate-format.html
- AWS Certificate Manager User Guide: Prerequisites for importing ACM certificates - https://docs.aws.amazon.com/acm/latest/userguide/import-certificate-prerequisites.html
- AWS Certificate Manager User Guide: Reimport a certificate - https://docs.aws.amazon.com/acm/latest/userguide/import-reimport.html
- AWS CLI Command Reference: acm import-certificate - https://docs.aws.amazon.com/cli/latest/reference/acm/import-certificate.html
- Amazon CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS Certificate Manager User Guide: Supported CloudWatch metrics - https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- AWS Config Developer Guide: acm-certificate-expiration-check - https://docs.aws.amazon.com/config/latest/developerguide/acm-certificate-expiration-check.html
- Terraform AWS Provider documentation: aws_acm_certificate resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS Provider documentation: aws_secretsmanager_secret_version ephemeral resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version
- AWS Prescriptive Guidance: Using Secrets Manager and Terraform - https://docs.aws.amazon.com/prescriptive-guidance/latest/secure-sensitive-data-secrets-manager-terraform/using-secrets-manager-and-terraform.html
- OpenSSL documentation: openssl-pkey - https://docs.openssl.org/3.1/man1/openssl-pkey/
- OpenSSL documentation: openssl-verify - https://docs.openssl.org/3.1/man1/openssl-verify/
- Let’s Encrypt Chains of Trust - https://letsencrypt.org/certificates/

## Issues Found
- The introduction referenced EV certificates as a reason to get a "green address bar." Modern browser UI no longer reliably displays EV certificates that way, so the wording was changed to organization validation or compliance requirements.
- The import-vs-request list suggested importing into ACM for a service that does not integrate with ACM, such as direct EC2 use. ACM-imported certificates are useful for ACM-integrated services, so the bullet was corrected to describe using an existing certificate with an ACM-integrated service while also using it elsewhere.
- The private key requirement did not explicitly say the key must be unencrypted. AWS requires an unencrypted PEM private key, so that was added.
- OpenSSL examples used RSA-only modulus checks and `openssl rsa`. ACM supports RSA and ECDSA imported certificates, so the verification and DER key conversion commands were updated to use `openssl pkey` and public-key SHA-256 comparison.
- Chain verification used `-CAfile chain.pem`, which treats the supplied chain as trusted certificates rather than intermediate certificates. The examples and Python script now use `openssl verify -untrusted chain.pem cert.pem`.
- The Terraform "safer approach" used a normal Secrets Manager data source, which can still place secret values in Terraform state. The example now uses the AWS provider ephemeral Secrets Manager resource with the ACM resource's write-only `private_key_wo` argument.
- The Let’s Encrypt R3 intermediate example was outdated for 2026. It was replaced with a current Let’s Encrypt R12 intermediate URL.
- The chain-building text said to never include the root certificate. CloudFront public certificate chains should not include the root, but AWS ACM documentation says private certificate chains should include the root certificate last. The text now reflects both cases.

## Review Notes
The AWS CLI, CloudFront region requirement, ACM reimport behavior, CloudWatch `DaysToExpiry` metric, AWS Config managed rule identifier, and boto3 `import_certificate` API usage were consistent with current official documentation.
