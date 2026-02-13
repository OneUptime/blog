# How to Import External SSL Certificates into ACM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ACM, SSL, Certificates, Security

Description: Learn how to import third-party SSL/TLS certificates into AWS Certificate Manager, handle certificate chains, manage renewals, and automate the import process.

---

ACM's free certificates are great, but sometimes you need to use an externally-issued certificate. Maybe you have an Extended Validation (EV) certificate for the green address bar. Maybe you've got a certificate from a specific CA that your organization mandates. Or perhaps you're migrating from another platform and want to keep your existing certificates until they expire.

Whatever the reason, ACM supports importing external certificates. The process is straightforward, but getting the certificate chain right can be tricky. Let's walk through it.

## When to Import vs Request

You should **request from ACM** when:
- You need a standard DV (Domain Validated) certificate
- You're using it with CloudFront, ALB, or API Gateway
- You want automatic renewal

You should **import** when:
- You need an EV or OV certificate (ACM only issues DV)
- Your organization requires certificates from a specific CA
- You have an existing certificate you want to use temporarily
- You need a certificate for a service that doesn't integrate with ACM (like EC2 directly)

The biggest downside of imported certificates: **they don't auto-renew.** You're responsible for replacing them before expiration.

## Preparing Your Certificate Files

You'll need three things to import a certificate:

1. **Certificate body** - The PEM-encoded certificate itself
2. **Certificate private key** - The PEM-encoded private key
3. **Certificate chain** - The PEM-encoded intermediate certificates (optional but recommended)

These files should look like this:

```
-----BEGIN CERTIFICATE-----
MIIFkTCCBHmgAwIBAgISA3j...
(base64 encoded data)
...aBc123==
-----END CERTIFICATE-----
```

If your certificate was issued in a different format, you'll need to convert it.

Common conversions with OpenSSL:

```bash
# Convert PKCS#12 (.pfx/.p12) to PEM
openssl pkcs12 -in certificate.pfx -out certificate.pem -nodes

# Extract the certificate
openssl pkcs12 -in certificate.pfx -out cert.pem -clcerts -nokeys

# Extract the private key
openssl pkcs12 -in certificate.pfx -out key.pem -nocerts -nodes

# Extract the chain
openssl pkcs12 -in certificate.pfx -out chain.pem -cacerts -nokeys

# Convert DER to PEM
openssl x509 -in certificate.der -inform DER -out certificate.pem -outform PEM

# Convert key from DER to PEM
openssl rsa -in key.der -inform DER -out key.pem -outform PEM
```

## Verifying Your Files

Before importing, verify that your certificate, key, and chain are correct and match each other.

```bash
# Check the certificate details
openssl x509 -in cert.pem -text -noout | head -20

# Verify the key matches the certificate
CERT_MD5=$(openssl x509 -noout -modulus -in cert.pem | openssl md5)
KEY_MD5=$(openssl rsa -noout -modulus -in key.pem | openssl md5)

if [ "$CERT_MD5" = "$KEY_MD5" ]; then
  echo "Certificate and key match"
else
  echo "ERROR: Certificate and key do NOT match!"
fi

# Verify the chain
openssl verify -CAfile chain.pem cert.pem
```

## Importing the Certificate

Once your files are ready, import via the CLI.

```bash
# Import a certificate
aws acm import-certificate \
  --certificate fileb://cert.pem \
  --private-key fileb://key.pem \
  --certificate-chain fileb://chain.pem \
  --tags '[
    {"Key": "Source", "Value": "external-ca"},
    {"Key": "Environment", "Value": "production"},
    {"Key": "ExpirationDate", "Value": "2027-01-15"}
  ]'
```

Note the `fileb://` prefix - this tells the CLI to read binary file content, which is required for PEM files.

The command returns a certificate ARN that you can use with any ACM-integrated service.

## Importing for CloudFront

Remember, CloudFront requires certificates in us-east-1.

```bash
# Import in us-east-1 for CloudFront use
aws acm import-certificate \
  --region us-east-1 \
  --certificate fileb://cert.pem \
  --private-key fileb://key.pem \
  --certificate-chain fileb://chain.pem
```

## Updating an Imported Certificate

When your certificate is renewed by the external CA, you can reimport it using the same ARN. This updates the certificate in place without disrupting services that use it.

```bash
# Re-import (update) an existing certificate
aws acm import-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def-456" \
  --certificate fileb://new-cert.pem \
  --private-key fileb://new-key.pem \
  --certificate-chain fileb://new-chain.pem
```

Services using this ARN will start serving the new certificate within a few minutes. No configuration changes needed.

## Terraform Configuration

```hcl
# Import an external certificate
resource "aws_acm_certificate" "imported" {
  private_key       = file("${path.module}/certs/key.pem")
  certificate_body  = file("${path.module}/certs/cert.pem")
  certificate_chain = file("${path.module}/certs/chain.pem")

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Source     = "external-ca"
    ManagedBy  = "terraform"
  }
}
```

**Warning:** Storing private keys in your Terraform codebase is a security risk. Consider using Terraform's `sops` provider or fetching the key from a secrets manager at apply time.

```hcl
# Safer approach: read key from Secrets Manager
data "aws_secretsmanager_secret_version" "cert_key" {
  secret_id = "production/certificates/key"
}

resource "aws_acm_certificate" "imported" {
  private_key       = data.aws_secretsmanager_secret_version.cert_key.secret_string
  certificate_body  = file("${path.module}/certs/cert.pem")
  certificate_chain = file("${path.module}/certs/chain.pem")
}
```

## Automating Renewal Reminders

Since imported certificates don't auto-renew, you need monitoring to avoid expiration surprises.

ACM publishes the `DaysToExpiry` metric for all certificates, including imported ones.

```bash
# Set up expiration monitoring
aws cloudwatch put-metric-alarm \
  --alarm-name "imported-cert-expiring-soon" \
  --namespace "AWS/CertificateManager" \
  --metric-name "DaysToExpiry" \
  --dimensions Name=CertificateArn,Value="arn:aws:acm:us-east-1:123456789012:certificate/abc-123" \
  --statistic Minimum \
  --period 86400 \
  --threshold 30 \
  --comparison-operator LessThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

You can also use AWS Config to catch imported certificates nearing expiration across all your accounts.

```bash
# Config rule for certificate expiration
aws configservice put-config-rule \
  --config-rule '{
    "ConfigRuleName": "acm-certificate-expiration-check",
    "Source": {
      "Owner": "AWS",
      "SourceIdentifier": "ACM_CERTIFICATE_EXPIRATION_CHECK"
    },
    "InputParameters": "{\"daysToExpiration\": \"30\"}"
  }'
```

## Automating Import with a Script

For organizations that regularly receive renewed certificates from an external CA, here's a script that validates and imports them.

```python
import boto3
import subprocess
import sys

acm = boto3.client('acm', region_name='us-east-1')


def validate_cert_files(cert_path, key_path, chain_path):
    """Validate that certificate, key, and chain are consistent."""
    # Check cert-key match
    cert_mod = subprocess.run(
        ['openssl', 'x509', '-noout', '-modulus', '-in', cert_path],
        capture_output=True, text=True
    ).stdout.strip()

    key_mod = subprocess.run(
        ['openssl', 'rsa', '-noout', '-modulus', '-in', key_path],
        capture_output=True, text=True
    ).stdout.strip()

    if cert_mod != key_mod:
        raise ValueError("Certificate and private key do not match!")

    # Verify chain
    result = subprocess.run(
        ['openssl', 'verify', '-CAfile', chain_path, cert_path],
        capture_output=True, text=True
    )

    if result.returncode != 0:
        raise ValueError(f"Chain verification failed: {result.stderr}")

    print("Certificate files validated successfully")


def import_certificate(cert_path, key_path, chain_path, existing_arn=None):
    """Import or re-import a certificate into ACM."""
    with open(cert_path, 'rb') as f:
        cert_body = f.read()
    with open(key_path, 'rb') as f:
        private_key = f.read()
    with open(chain_path, 'rb') as f:
        chain = f.read()

    params = {
        'Certificate': cert_body,
        'PrivateKey': private_key,
        'CertificateChain': chain,
    }

    if existing_arn:
        params['CertificateArn'] = existing_arn

    response = acm.import_certificate(**params)
    return response['CertificateArn']


if __name__ == '__main__':
    cert_file = sys.argv[1]
    key_file = sys.argv[2]
    chain_file = sys.argv[3]
    existing = sys.argv[4] if len(sys.argv) > 4 else None

    validate_cert_files(cert_file, key_file, chain_file)
    arn = import_certificate(cert_file, key_file, chain_file, existing)
    print(f"Certificate imported: {arn}")
```

## Building the Certificate Chain

Getting the chain right is the most common issue. The chain should include all intermediate certificates but NOT the root CA certificate. Order matters: the certificate that signed your cert comes first, then the one that signed that, and so on.

```bash
# Download intermediate certificates if you don't have them
# (example for Let's Encrypt)
curl -o intermediate.pem https://letsencrypt.org/certs/lets-encrypt-r3.pem

# Build the chain by concatenating intermediates
cat intermediate1.pem intermediate2.pem > chain.pem

# Verify the full chain
openssl verify -verbose -CAfile chain.pem cert.pem
```

If you're getting "unable to get local issuer certificate" errors, your chain is missing an intermediate certificate.

## Wrapping Up

Importing external certificates into ACM is straightforward once you've got your PEM files in order. The main things to remember: verify your certificate and key match before importing, build the chain correctly, and set up expiration monitoring since imported certificates don't auto-renew. When it's time to renew, reimport to the same ARN for a seamless update. And whenever possible, consider switching to ACM-issued certificates to eliminate the renewal burden entirely. For more on ACM certificates, see our guide on [requesting and managing certificates](https://oneuptime.com/blog/post/2026-02-12-request-manage-ssl-tls-certificates-acm/view).
