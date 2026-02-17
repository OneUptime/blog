# How to Study Security and Compliance Topics for the GCP Professional Cloud Architect Certification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security, Compliance, Certification, Professional Cloud Architect, IAM, Encryption

Description: Comprehensive study guide for security and compliance topics on the Google Cloud Professional Cloud Architect certification exam covering encryption, IAM, network security, and regulatory compliance.

---

Security and compliance make up about 18% of the Professional Cloud Architect exam, but security considerations bleed into almost every other question too. When you are designing an architecture, the exam expects you to consider security at every layer - network, identity, data, and application. If two options are functionally equivalent but one is more secure, the more secure option is almost always the correct answer.

This guide covers the security and compliance topics you need to know, organized by the areas that appear most frequently on the exam.

## Encryption

### Encryption at Rest

GCP encrypts all data at rest by default using Google-managed encryption keys. For the exam, know the three levels:

**Google-managed encryption keys (default)**: Google handles everything. You do not manage keys. This is the default for all GCP services.

**Customer-managed encryption keys (CMEK)**: You create and manage the keys in Cloud KMS. GCP uses your keys to encrypt the data. You control key rotation, can disable keys, and can audit key usage.

**Customer-supplied encryption keys (CSEK)**: You provide the encryption key with each API call. GCP never stores your key. Only works with Compute Engine and Cloud Storage. If you lose the key, the data is unrecoverable.

When the exam asks about compliance requirements around key management, the answer is usually CMEK:

```bash
# Create a key ring and key in Cloud KMS
gcloud kms keyrings create my-keyring \
  --location=us-central1

gcloud kms keys create my-key \
  --keyring=my-keyring \
  --location=us-central1 \
  --purpose=encryption \
  --rotation-period=90d \
  --next-rotation-time=2026-05-01T00:00:00Z

# Use the key with Cloud Storage
gsutil kms authorize -p my-project -k \
  projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key

gsutil mb -l us-central1 \
  -b on \
  --default-kms-key=projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key \
  gs://encrypted-bucket
```

### Encryption in Transit

All GCP service-to-service communication is encrypted. For customer-facing traffic:

- **HTTPS with Google-managed certificates**: Free, auto-renewed SSL certificates for HTTP(S) load balancers.
- **HTTPS with customer-managed certificates**: Bring your own certificates for specific compliance requirements.
- **mTLS**: Mutual TLS between services using Anthos Service Mesh or Certificate Authority Service.

## Identity and Access Management (Advanced)

The PCA exam goes deeper into IAM than the ACE:

### Organization Policy Service

Organization policies restrict what can be done across the entire organization, overriding IAM permissions. Key constraints to know:

```bash
# Restrict VM creation to specific regions
gcloud resource-manager org-policies set-policy policy.yaml \
  --organization=123456789

# Example policy.yaml content:
# constraint: constraints/compute.locations
# listPolicy:
#   allowedValues:
#     - us-central1
#     - us-east1
```

Common organization policy constraints:
- `compute.locations`: Restrict resource creation to specific regions
- `iam.allowedPolicyMemberDomains`: Restrict IAM members to specific domains
- `compute.requireOsLogin`: Enforce OS Login for SSH access
- `storage.uniformBucketLevelAccess`: Require uniform access control on buckets

### Workload Identity Federation

Allows external workloads (AWS, Azure, on-premises) to access GCP resources without service account keys. The exam expects you to recommend this over service account keys for cross-cloud access.

```bash
# Create a workload identity pool
gcloud iam workload-identity-pools create my-pool \
  --location=global \
  --display-name="External Workloads"

# Add an AWS provider
gcloud iam workload-identity-pools providers create-aws aws-provider \
  --location=global \
  --workload-identity-pool=my-pool \
  --account-id=123456789012
```

### VPC Service Controls

VPC Service Controls create a security perimeter around GCP services to prevent data exfiltration. This is a critical exam topic.

```bash
# Create an access policy
gcloud access-context-manager policies create \
  --organization=123456789 \
  --title="My Policy"

# Create a service perimeter
gcloud access-context-manager perimeters create my-perimeter \
  --title="Production Perimeter" \
  --resources="projects/12345" \
  --restricted-services="storage.googleapis.com,bigquery.googleapis.com" \
  --policy=POLICY_ID
```

Key concepts:
- **Service perimeter**: Defines which projects and services are protected
- **Access levels**: Conditions under which the perimeter can be crossed (IP ranges, device attributes)
- **Ingress/Egress rules**: Allow specific traffic in or out of the perimeter
- **Bridge perimeters**: Connect two perimeters so they can share data

### Practice Scenario

"A healthcare company needs to ensure that patient data stored in BigQuery cannot be copied to a project outside the approved environment, even by users with BigQuery Admin role."

Answer: VPC Service Controls. Create a service perimeter around the projects containing patient data. Even if a user has the BigQuery Admin role, they cannot copy data to projects outside the perimeter.

## Network Security

### Cloud Armor

Web application firewall (WAF) and DDoS protection for HTTP(S) load balancers:

```bash
# Create a Cloud Armor security policy
gcloud compute security-policies create web-policy \
  --description="WAF and DDoS protection"

# Add a rule to block traffic from a specific country
gcloud compute security-policies rules create 1000 \
  --security-policy=web-policy \
  --expression="origin.region_code == 'CN'" \
  --action=deny-403

# Add a rate limiting rule
gcloud compute security-policies rules create 2000 \
  --security-policy=web-policy \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600

# Apply to a backend service
gcloud compute backend-services update web-backend \
  --security-policy=web-policy \
  --global
```

### Private Connectivity

Know when to use each approach:

- **Private Google Access**: VMs without external IPs can access Google APIs
- **Private Service Connect**: Private endpoints for Google APIs and partner services within your VPC
- **Cloud NAT**: Outbound internet access without external IPs (one-way - no inbound access)

### Identity-Aware Proxy (IAP)

IAP controls access to applications running on GCP without a VPN. Users authenticate through Google's identity system, and IAP checks their IAM permissions before forwarding the request to the application.

```bash
# Enable IAP on a backend service
gcloud compute backend-services update web-backend \
  --iap=enabled \
  --global

# Grant access through IAP
gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@company.com" \
  --role="roles/iap.httpsResourceAccessor"
```

## Security Command Center

Security Command Center (SCC) is the centralized security management platform for GCP. For the exam, know the features:

- **Security Health Analytics**: Automatic vulnerability detection (public buckets, overly permissive firewall rules)
- **Event Threat Detection**: Real-time detection of threats (suspicious login patterns, cryptocurrency mining)
- **Container Threat Detection**: Detects threats in GKE containers (modified binaries, reverse shells)
- **Web Security Scanner**: Scans App Engine, GKE, and Compute Engine web apps for vulnerabilities

## Compliance Frameworks

The exam tests your awareness of compliance, not deep regulatory knowledge. Know which GCP features support each framework:

**HIPAA (Healthcare)**:
- Business Associate Agreement (BAA) with Google
- CMEK for encryption key management
- VPC Service Controls for data isolation
- Cloud Audit Logs for access tracking
- Only use HIPAA-covered services

**PCI DSS (Payment Card Industry)**:
- Network segmentation with VPC and firewall rules
- Cloud Armor for WAF
- CMEK for key management
- Regular vulnerability scanning

**GDPR (Data Protection)**:
- Data residency controls with organization policies
- Cloud DLP for discovering and classifying sensitive data
- Data deletion capabilities
- Encryption at rest and in transit

### Data Residency

For compliance requirements around data location:

```bash
# Use organization policy to restrict data to specific regions
gcloud resource-manager org-policies set-policy \
  --organization=123456789 << EOF
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:europe-locations
EOF
```

## Secret Management

Use Secret Manager for API keys, passwords, certificates, and other secrets:

```bash
# Create a secret
echo -n "my-database-password" | \
  gcloud secrets create db-password \
  --data-file=- \
  --replication-policy=user-managed \
  --locations=us-central1

# Access the secret in your application
gcloud secrets versions access latest --secret=db-password

# Grant access to a service account
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:my-app@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Exam Strategy for Security Questions

1. **Default to the most restrictive option**: If two answers both solve the problem, pick the one with tighter security controls.
2. **Avoid service account keys**: Any answer involving downloading key files is usually wrong. Prefer Workload Identity, attached service accounts, or Workload Identity Federation.
3. **Know the depth of defense layers**: Network (firewall, Cloud Armor), Identity (IAM, IAP), Data (encryption, DLP), Application (vulnerability scanning).
4. **VPC Service Controls come up frequently**: If the question mentions preventing data exfiltration or data loss prevention at the infrastructure level, VPC Service Controls is likely the answer.
5. **CMEK is the default compliance answer**: When a question mentions key management requirements or regulatory compliance, CMEK with Cloud KMS is almost always correct.

## Wrapping Up

Security on the PCA exam is about designing secure architectures from the ground up. Focus on understanding the layered security model (network, identity, data, application), know when to use each encryption option, get comfortable with VPC Service Controls and Cloud Armor, and understand how organization policies enforce security at scale. The exam rewards answers that implement defense in depth - if you can explain why each security layer exists and when to apply it, you will handle the security questions well.
