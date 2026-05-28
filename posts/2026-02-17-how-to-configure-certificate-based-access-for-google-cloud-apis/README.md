# How to Configure Certificate-Based Access for Google Cloud APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Certificate-Based Access, mTLS, API Security, Zero Trust

Description: Learn how to configure certificate-based access (CBA) for Google Cloud APIs to enforce mutual TLS authentication and strengthen your zero-trust security posture.

---

Passwords and API keys can be stolen. OAuth tokens can be intercepted. But a client certificate bound to a specific device is much harder to compromise because the private key never leaves the device. Certificate-based access (CBA) for Google Cloud APIs adds this extra layer of authentication by requiring that API requests come from devices with a valid client certificate.

This is a key component of Google's BeyondCorp zero-trust model. Instead of trusting anyone who has valid credentials, CBA also verifies that the request originates from a trusted device with an enrolled certificate.

## How Certificate-Based Access Works

When CBA is enabled, requests to protected Google Cloud resources must use an mTLS-specific Google API endpoint and include a client certificate during the TLS handshake. Google's API endpoint verifies that the client possesses the private key for the certificate, and the CBA access level checks that the presented certificate matches the enrolled device certificate.

This means even if an attacker steals a user's OAuth token, they cannot use it from an unauthorized device because they do not have the device certificate.

## Prerequisites

You need an enterprise certificate authority (CA) that issues device certificates, Chrome Enterprise Premium with Context-Aware Access, and the Endpoint Verification Chrome extension and helper app deployed to managed devices. CBA for workload or web applications can use other certificate deployment methods and does not require Endpoint Verification.

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
  --predefined-values-file=device-cert-config.yaml \
  --copy-subject \
  --copy-sans \
  --identity-cel-expression="subject.common_name.startsWith('device-')"
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

## Step 3: Upload Your CA Certificate to the Admin Console

Endpoint Verification needs the trust anchors for the enterprise certificate chain so it can collect and validate the device certificate.

```bash
# Export the root CA certificate
gcloud privateca roots describe device-root-ca \
  --pool=device-cert-pool \
  --location=us-central1 \
  --format="value(pemCaCertificates[0])" > root-ca.pem
```

In the Google Admin console, go to Devices > Networks > Certificates, add the root CA certificate, enable the Endpoint Verification checkbox, and make sure the certificate is applied to the organizational unit that contains your users.

## Step 4: Create an Access Level Requiring Certificates

Create a custom access level in Access Context Manager that requires the certificate presented at request time to match a certificate registered for the enrolled device.

```yaml
# cert-access-level.yaml
expression: "certificateBindingState(origin, device) == CertificateBindingState.CERT_MATCHES_EXISTING_DEVICE"
```

```bash
# Create the access level
gcloud access-context-manager levels create cert_required_access \
  --policy=$POLICY_ID \
  --title="Certificate-Based Access Required" \
  --custom-level-spec=cert-access-level.yaml

# Update your VPC Service Controls perimeter to use this access level
gcloud access-context-manager perimeters update my-perimeter \
  --policy=$POLICY_ID \
  --add-access-levels="accessPolicies/$POLICY_ID/accessLevels/cert_required_access"
```

## Step 5: Enforce CBA for a User Group

To restrict all Google Cloud services for a set of users, bind the CBA access level to a Google group.

```bash
gcloud access-context-manager cloud-bindings create \
  --group-key=GROUP_KEY \
  --organization=ORG_ID \
  --level=accessPolicies/POLICY_ID/accessLevels/cert_required_access
```

## Step 6: Configure Client-Side Certificate Usage

Users' devices need to present their certificates when connecting to Google Cloud APIs.

### For gcloud CLI

```bash
# Configure gcloud to use the device certificate for mTLS
gcloud config set context_aware/use_client_certificate true

# Test the connection with mTLS
gcloud compute instances list --project=PROJECT_ID
```

### For Application Default Credentials

```python
# Python applications can opt in to client certificates
import google.auth
import google.auth.transport.mtls
import os

def get_mtls_credentials():
    """Get ADC credentials after enabling client certificate use."""
    os.environ["GOOGLE_API_USE_CLIENT_CERTIFICATE"] = "1"

    # Check if mTLS is available on this device
    has_cert = google.auth.transport.mtls.has_default_client_cert_source()

    if has_cert:
        # Get the client certificate source
        cert_source = google.auth.transport.mtls.default_client_cert_source()

        # Use it for API requests
        credentials, project = google.auth.default()
        return credentials, project, cert_source
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
