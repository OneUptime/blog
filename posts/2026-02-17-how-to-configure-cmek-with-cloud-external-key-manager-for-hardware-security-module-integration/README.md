# How to Configure CMEK with Cloud External Key Manager for Hardware Security Module Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud EKM, CMEK, Hardware Security Module, Cloud KMS, Encryption

Description: Learn how to integrate external hardware security modules with Google Cloud services using Cloud External Key Manager for the highest level of encryption key control.

---

Customer-Managed Encryption Keys (CMEK) with Cloud KMS give you control over encryption keys, but the keys still reside within Google's infrastructure. For organizations that require keys to remain outside of Google Cloud entirely - often driven by regulatory requirements or sovereignty mandates - Cloud External Key Manager (Cloud EKM) is the answer. It lets you use encryption keys stored in an external key management system, including on-premises hardware security modules (HSMs), while still encrypting Google Cloud resources.

This guide covers how Cloud EKM works, how to set it up with supported external key managers, and the practical considerations you need to account for.

## How Cloud EKM Works

Cloud EKM creates a bridge between Cloud KMS and your external key management system. When a Google Cloud service needs to encrypt or decrypt data, Cloud KMS sends the request to your external key manager over a secure connection. The actual cryptographic operations happen outside of Google Cloud.

The architecture looks like this:

```mermaid
graph LR
    A[Google Cloud Service] --> B[Cloud KMS]
    B --> C[Cloud EKM]
    C --> D[VPC Network]
    D --> E[External Key Manager / HSM]
    style E fill:#4dabf7,color:#fff
    style B fill:#69db7c,color:#000
```

There are two connectivity options:

1. **Internet-based** - Cloud EKM communicates with your external key manager over the internet using TLS
2. **VPC-based** - Cloud EKM communicates through a VPC network using Private Service Connect, keeping traffic off the public internet

VPC-based EKM is the recommended approach for production workloads because it offers better reliability and security.

## Supported External Key Managers

Cloud EKM works with several third-party key management systems:

- Thales CipherTrust Manager
- Fortanix Data Security Manager
- Futurex KMES
- Atos Trustway
- Securosys Primus

Each provider implements the Cloud EKM API endpoints that Cloud KMS uses to perform key operations. You need to set up the external key manager and configure it to accept requests from Google Cloud before configuring the Cloud EKM side.

## Setting Up VPC-Based Cloud EKM

VPC-based EKM provides a private connection between Cloud KMS and your external key manager. Here is how to set it up.

### Step 1: Create a VPC Service Connection

First, set up the networking components that allow Cloud EKM to reach your external key manager.

```bash
# Create a VPC network for EKM connectivity
gcloud compute networks create ekm-network \
  --project=my-kms-project \
  --subnet-mode=custom

# Create a subnet in the region where your EKM endpoint will be
gcloud compute networks subnets create ekm-subnet \
  --network=ekm-network \
  --region=us-central1 \
  --range=10.0.1.0/24 \
  --project=my-kms-project

# Set up Cloud VPN or Interconnect to reach your on-premises HSM
# This example uses a VPN tunnel
gcloud compute vpn-tunnels create ekm-vpn-tunnel \
  --region=us-central1 \
  --peer-address=203.0.113.1 \
  --shared-secret=YOUR_SHARED_SECRET \
  --ike-version=2 \
  --target-vpn-gateway=ekm-gateway \
  --project=my-kms-project
```

### Step 2: Create an EKM Connection

The EKM connection defines how Cloud KMS reaches your external key manager.

```bash
# Create an EKM connection for VPC-based access
gcloud kms ekm-connections create my-ekm-connection \
  --location=us-central1 \
  --project=my-kms-project \
  --service-resolvers="hostname=ekm.mycompany.internal,server-certificates=@server-cert.pem,service-directory-service=projects/my-kms-project/locations/us-central1/namespaces/ekm-namespace/services/ekm-service,endpoint-filter=ip_address=10.0.1.50"
```

### Step 3: Register Your External Key Manager in Service Directory

Cloud EKM uses Service Directory to resolve the address of your external key manager.

```bash
# Create a Service Directory namespace for EKM
gcloud service-directory namespaces create ekm-namespace \
  --location=us-central1 \
  --project=my-kms-project

# Create a service entry pointing to your EKM endpoint
gcloud service-directory services create ekm-service \
  --namespace=ekm-namespace \
  --location=us-central1 \
  --project=my-kms-project

# Add an endpoint with the IP of your external key manager
gcloud service-directory endpoints create ekm-endpoint \
  --service=ekm-service \
  --namespace=ekm-namespace \
  --location=us-central1 \
  --address=10.0.1.50 \
  --port=443 \
  --project=my-kms-project
```

## Creating an External Key

Once the connection is established, create a Cloud KMS key that references your external key material.

```bash
# Create a key ring for external keys
gcloud kms keyrings create external-keyring \
  --location=us-central1 \
  --project=my-kms-project

# Create an external key linked to a key in your HSM
gcloud kms keys create external-data-key \
  --keyring=external-keyring \
  --location=us-central1 \
  --purpose=encryption \
  --protection-level=external-vpc \
  --skip-initial-version-creation \
  --project=my-kms-project

# Create a key version that references the external key URI
gcloud kms keys versions create \
  --key=external-data-key \
  --keyring=external-keyring \
  --location=us-central1 \
  --external-key-uri="vpc://my-ekm-connection?path=/v1/keys/my-hsm-key-id" \
  --project=my-kms-project
```

## Using External Keys with Google Cloud Services

External keys work with the same Google Cloud services that support CMEK. The service does not know or care whether the key is internal or external - it just uses the Cloud KMS key reference.

This example creates a Cloud Storage bucket encrypted with an external key.

```bash
# Grant the Cloud Storage service agent access to the external key
GCS_SA="service-$(gcloud projects describe my-data-project --format='value(projectNumber)')@gs-project-accounts.iam.gserviceaccount.com"

gcloud kms keys add-iam-policy-binding external-data-key \
  --keyring=external-keyring \
  --location=us-central1 \
  --project=my-kms-project \
  --member="serviceAccount:${GCS_SA}" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Create a bucket using the external key
gcloud storage buckets create gs://my-ekm-encrypted-bucket \
  --location=us-central1 \
  --default-encryption-key=projects/my-kms-project/locations/us-central1/keyRings/external-keyring/cryptoKeys/external-data-key
```

## Terraform Configuration for Cloud EKM

Here is a complete Terraform configuration for setting up Cloud EKM with VPC connectivity.

```hcl
# Service Directory entries for EKM endpoint resolution
resource "google_service_directory_namespace" "ekm" {
  provider     = google-beta
  namespace_id = "ekm-namespace"
  location     = "us-central1"
  project      = "my-kms-project"
}

resource "google_service_directory_service" "ekm" {
  provider   = google-beta
  service_id = "ekm-service"
  namespace  = google_service_directory_namespace.ekm.id
}

resource "google_service_directory_endpoint" "ekm" {
  provider    = google-beta
  endpoint_id = "ekm-endpoint"
  service     = google_service_directory_service.ekm.id
  address     = "10.0.1.50"
  port        = 443
}

# EKM connection configuration
resource "google_kms_ekm_connection" "main" {
  name     = "my-ekm-connection"
  location = "us-central1"
  project  = "my-kms-project"

  service_resolvers {
    hostname                      = "ekm.mycompany.internal"
    service_directory_service     = google_service_directory_service.ekm.id
    server_certificates {
      raw_der = filebase64("certs/ekm-server.der")
    }
  }
}

# Key ring and external key
resource "google_kms_key_ring" "external" {
  name     = "external-keyring"
  location = "us-central1"
  project  = "my-kms-project"
}

resource "google_kms_crypto_key" "external" {
  name     = "external-data-key"
  key_ring = google_kms_key_ring.external.id
  purpose  = "ENCRYPT_DECRYPT"

  version_template {
    protection_level = "EXTERNAL_VPC"
    algorithm        = "EXTERNAL_SYMMETRIC_ENCRYPTION"
  }

  skip_initial_version_creation = true
}
```

## Key Accessibility and Availability

The most important operational consideration with Cloud EKM is availability. Since encryption and decryption requests are forwarded to your external key manager, your data becomes inaccessible if the external system goes down.

This differs from standard CMEK, where keys in Cloud KMS inherit Google's availability guarantees. With EKM, you own the availability of your key manager.

Plan for this by:

1. **Running your external key manager in HA mode** - at least two nodes in active/active or active/passive configuration
2. **Monitoring key operation latency** - EKM operations are inherently slower than Cloud KMS operations
3. **Testing failover** - regularly verify that your HSM failover works and data remains accessible
4. **Setting up alerts** - monitor for EKM operation failures in Cloud Monitoring

```bash
# Create an alert for EKM operation failures
gcloud monitoring policies create \
  --display-name="EKM Operation Failures" \
  --condition-display-name="High EKM error rate" \
  --condition-filter='resource.type="cloudkms.googleapis.com/CryptoKeyVersion" AND metric.type="cloudkms.googleapis.com/ekm/operation_count" AND metric.labels.status!="OK"' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s \
  --notification-channels=projects/my-kms-project/notificationChannels/CHANNEL_ID
```

## Performance Considerations

Cloud EKM adds latency to every encryption and decryption operation because the request must travel to your external key manager. This matters most for:

- **High-throughput workloads** - services that perform many small encrypt/decrypt operations per second
- **Latency-sensitive applications** - where added milliseconds on data access affect user experience
- **Batch processing** - jobs that process large volumes of encrypted data

For most use cases, the added latency is acceptable. But measure it in your specific environment before committing to EKM for performance-sensitive workloads.

## When to Use Cloud EKM vs Standard CMEK

Use standard CMEK (Cloud KMS) when you need key control but are comfortable with keys residing in Google's infrastructure. Use Cloud EKM when:

- Regulations require keys to remain outside of cloud provider infrastructure
- Your organization mandates that key material never leaves specific physical boundaries
- You need a "kill switch" to immediately revoke Google's access to your data by shutting down the external key manager
- Data sovereignty requirements prevent any key material in specific jurisdictions

Cloud EKM is the strongest form of encryption key control available on Google Cloud. It comes with operational complexity and availability dependencies, so use it where the compliance or sovereignty requirements justify the overhead.
