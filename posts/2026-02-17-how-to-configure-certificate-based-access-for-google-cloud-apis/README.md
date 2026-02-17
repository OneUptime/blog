# How to Configure Certificate-Based Access for Google Cloud APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Certificate-Based Access, mTLS, API Security, Zero Trust

Description: Learn how to configure certificate-based access (CBA) for Google Cloud APIs to enforce mutual TLS authentication and strengthen your zero-trust security posture.

---

Passwords and API keys can be stolen. OAuth tokens can be intercepted. But a client certificate bound to a specific device is much harder to compromise because the private key never leaves the device. Certificate-based access (CBA) for Google Cloud APIs adds this extra layer of authentication by requiring that API requests come from devices with a valid client certificate.

This is a key component of Google's BeyondCorp zero-trust model. Instead of trusting anyone who has valid credentials, CBA also verifies that the request originates from a trusted device with an enrolled certificate.

## How Certificate-Based Access Works

When CBA is enabled, every API request to Google Cloud must include a client certificate during the TLS handshake. Google's API endpoint performs mutual TLS (mTLS) authentication - it verifies the client's certificate against your trusted CA, and the client verifies Google's server certificate. Only if both sides trust each other does the request proceed.

This means even if an attacker steals a user's OAuth token, they cannot use it from an unauthorized device because they do not have the device certificate.

## Prerequisites

You need an enterprise certificate authority (CA) that issues device certificates, Google Workspace or Cloud Identity Premium, BeyondCorp Enterprise license, and the Endpoint Verification Chrome extension deployed to managed devices.

## Step 1: Set Up Your Certificate Authority

If you do not have an existing enterprise CA, you can use Google Cloud's Certificate Authority Service.

```bash
# Enable Certificate Authority Service
gcloud services enable privateca.googleapis.com

# Create a CA pool
gcloud privateca pools create device-cert-pool \
  --location=us-central1 \
  --tier=enterprise

# Create a root CA for device certificates
gcloud privateca roots create device-root-ca \
  --pool=device-cert-pool \
  --location=us-central1 \
  --subject="CN=Device Root CA, O=My Organization" \
  --key-algorithm=ec-p256-sha256 \
  --max-chain-length=1

# Enable the CA
gcloud privateca roots enable device-root-ca \
  --pool=device-cert-pool \
  --location=us-central1
```

## Step 2: Configure Certificate Issuance

Set up a certificate template and issuance policy for device certificates.

```bash
# Create a certificate template for device certs
gcloud privateca templates create device-cert-template \
  --location=us-central1 \
  --predefined-values-from-file=device-cert-config.yaml \
  --identity-cel-expression="subject.common_name == request.cert_name"
```

```yaml
# device-cert-config.yaml
# Template for device certificates
keyUsage:
  baseKeyUsage:
    digitalSignature: true
    keyEncipherment: true
  extendedKeyUsage:
    clientAuth: true

caOptions:
  isCa: false

subjectConfig:
  subject:
    organization: "My Organization"
```

```python
from google.cloud import security_privateca_v1

def issue_device_certificate(project_id, location, pool_id, device_id, csr_pem):
    """Issue a certificate for a managed device."""
    client = security_privateca_v1.CertificateAuthorityServiceClient()
    parent = f"projects/{project_id}/locations/{location}/caPools/{pool_id}"

    certificate = security_privateca_v1.Certificate()
    certificate.pem_csr = csr_pem
    certificate.lifetime = {"seconds": 31536000}  # 1 year

    # Use the device cert template
    certificate.certificate_template = (
        f"projects/{project_id}/locations/{location}"
        f"/certificateTemplates/device-cert-template"
    )

    # Labels to track which device owns this cert
    certificate.labels = {
        "device_id": device_id,
        "issued_by": "automated-provisioning",
    }

    response = client.create_certificate(
        parent=parent,
        certificate=certificate,
        certificate_id=f"device-{device_id}",
    )

    print(f"Certificate issued: {response.name}")
    return response.pem_certificate, response.pem_certificate_chain
```

## Step 3: Upload Your CA Certificate to Access Context Manager

Google needs to know which CAs to trust for mTLS authentication.

```bash
# Export the root CA certificate
gcloud privateca roots describe device-root-ca \
  --pool=device-cert-pool \
  --location=us-central1 \
  --format="value(pemCaCertificates[0])" > root-ca.pem

# Upload the trusted CA certificate to Access Context Manager
gcloud access-context-manager trust-configs create device-trust \
  --location=global \
  --trust-store="trust-anchors=root-ca.pem"
```

## Step 4: Create an Access Level Requiring Certificates

Create an access level in Access Context Manager that requires a valid device certificate.

```yaml
# cert-access-level.yaml
# Require both a valid certificate and a managed device
- devicePolicy:
    requireScreenlock: true
    requireCorpOwned: true
    osConstraints:
      - osType: DESKTOP_CHROME_OS
      - osType: DESKTOP_MAC
      - osType: DESKTOP_WINDOWS
  regions:
    - "US"
    - "EU"
```

```bash
# Create the access level
gcloud access-context-manager levels create cert-required-access \
  --policy=$POLICY_ID \
  --title="Certificate-Based Access Required" \
  --basic-level-spec=cert-access-level.yaml

# Update your VPC Service Controls perimeter to use this access level
gcloud access-context-manager perimeters update my-perimeter \
  --policy=$POLICY_ID \
  --add-access-levels="accessPolicies/$POLICY_ID/accessLevels/cert-required-access"
```

## Step 5: Enable CBA for Google Cloud APIs

Configure BeyondCorp Enterprise to enforce certificate-based access for API calls.

```bash
# Enable CBA enforcement for the organization
gcloud beyondcorp client-connector services create cba-service \
  --project=PROJECT_ID \
  --location=us-central1 \
  --display-name="Certificate-Based API Access"
```

You can also configure CBA enforcement through organization policies:

```python
from google.cloud import orgpolicy_v2

def enforce_cba_policy(org_id):
    """Enforce certificate-based access at the organization level."""
    client = orgpolicy_v2.OrgPolicyClient()

    policy = orgpolicy_v2.Policy()
    policy.name = f"organizations/{org_id}/policies/iam.allowedPolicyMemberDomains"

    # Create a rule that enforces CBA
    rule = orgpolicy_v2.PolicyRule()
    rule.enforce = True

    policy.spec = orgpolicy_v2.PolicySpec()
    policy.spec.rules = [rule]

    client.create_policy(
        parent=f"organizations/{org_id}",
        policy=policy,
    )
    print("CBA policy enforced")
```

## Step 6: Configure Client-Side Certificate Usage

Users' devices need to present their certificates when connecting to Google Cloud APIs.

### For gcloud CLI

```bash
# Configure gcloud to use the device certificate for mTLS
gcloud config set context_aware/use_client_certificate true

# The certificate location depends on your deployment method
# For enterprise-managed certificates on macOS:
gcloud config set context_aware/auto_discovery_client_certificate_url \
  "https://certificatemanager.internal/cert"

# Test the connection with mTLS
gcloud compute instances list --project=PROJECT_ID
```

### For Application Default Credentials

```python
# Python applications can use certificate-based credentials
import google.auth
import google.auth.transport.mtls

def get_mtls_credentials():
    """Get credentials with mTLS certificate attached."""
    # Check if mTLS is available on this device
    has_cert = google.auth.transport.mtls.has_default_client_cert_source()

    if has_cert:
        # Get the client certificate source
        cert_source = google.auth.transport.mtls.default_client_cert_source()

        # Use it for API requests
        credentials, project = google.auth.default()
        return credentials, cert_source
    else:
        raise RuntimeError(
            "No device certificate found. "
            "Ensure Endpoint Verification is installed."
        )
```

## Step 7: Monitor Certificate-Based Access

Track CBA usage and catch unauthorized access attempts.

```bash
# Query audit logs for mTLS-related events
gcloud logging read '
  protoPayload.requestMetadata.destinationAttributes.certificateInfo!=""
  AND timestamp>="2026-02-10T00:00:00Z"
' --project=PROJECT_ID --limit=50 --format=json

# Find requests that were rejected due to missing certificates
gcloud logging read '
  protoPayload.status.code=7
  AND protoPayload.status.message:"certificate"
  AND timestamp>="2026-02-10T00:00:00Z"
' --project=PROJECT_ID --limit=50 --format=json
```

## Step 8: Handle Certificate Rotation

Certificates expire and need regular rotation. Automate this process.

```python
from google.cloud import security_privateca_v1
from datetime import datetime, timedelta

def find_expiring_certificates(project_id, location, pool_id, days_until_expiry=30):
    """Find device certificates that will expire soon."""
    client = security_privateca_v1.CertificateAuthorityServiceClient()
    parent = f"projects/{project_id}/locations/{location}/caPools/{pool_id}"

    expiry_threshold = datetime.utcnow() + timedelta(days=days_until_expiry)

    expiring = []
    for cert in client.list_certificates(parent=parent):
        if cert.certificate_description:
            not_after = cert.certificate_description.subject_description.not_after_time
            if not_after and not_after.timestamp() < expiry_threshold.timestamp():
                expiring.append({
                    "name": cert.name,
                    "device_id": cert.labels.get("device_id", "unknown"),
                    "expires": str(not_after),
                })

    return expiring
```

Certificate-based access closes a significant gap in cloud API security. By requiring a device certificate in addition to user credentials, you ensure that API access can only come from managed, trusted devices. Combined with VPC Service Controls and context-aware access policies, CBA gives you a robust zero-trust architecture for your Google Cloud environment.
