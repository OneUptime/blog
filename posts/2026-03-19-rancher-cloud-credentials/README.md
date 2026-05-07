# How to Create Cloud Credential Sets in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cloud Credentials

Description: Learn how to create and manage cloud credential sets in Rancher for secure and centralized cloud provider authentication.

Cloud credentials in Rancher provide a centralized and secure way to store authentication details for cloud providers. They are used when provisioning nodes, creating clusters, and managing cloud resources. This guide covers creating and managing credentials for AWS, Azure, GCP, and other providers. The credential types available in Rancher depend on the enabled integrations and active node drivers in your installation.

## Prerequisites

- A supported Rancher release
- Admin or standard user access to Rancher
- Cloud provider account credentials with appropriate permissions
- Understanding of IAM roles and permissions for your cloud provider

## Why Use Cloud Credentials

Cloud credentials in Rancher centralize authentication management. Instead of entering cloud provider keys every time you create a cluster or machine pool, you configure credentials once and reference them across multiple resources. This improves security by reducing key sprawl and simplifies credential rotation.

## Step 1: Access Cloud Credentials

Navigate to the cloud credentials section:

1. Log in to Rancher.
2. Click **☰ > Cluster Management**.
3. Select **Cloud Credentials**.

## Step 2: Create AWS Credentials

Set up Amazon Web Services credentials:

1. Click **Create**.
2. Select **Amazon** as the cloud credential type.
3. Enter the credential details.

```plaintext
Name: aws-production
Description: Production AWS account credentials

Access Key: AKIAIOSFODNN7EXAMPLE
Secret Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default Region: us-east-1
```

For better security, create an IAM user with least-privilege permissions. For Amazon EC2 machine provisioning, Rancher documents an IAM policy like this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VisualEditor0",
      "Effect": "Allow",
      "Action": [
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:Describe*",
        "ec2:ImportKeyPair",
        "ec2:CreateKeyPair",
        "ec2:CreateSecurityGroup",
        "ec2:CreateTags",
        "ec2:DeleteKeyPair",
        "ec2:ModifyInstanceMetadataOptions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "VisualEditor1",
      "Effect": "Allow",
      "Action": [
        "ec2:RunInstances"
      ],
      "Resource": [
        "arn:aws:ec2:REGION::image/ami-*",
        "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:instance/*",
        "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:placement-group/*",
        "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:volume/*",
        "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:subnet/*",
        "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:key-pair/*",
        "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:network-interface/*",
        "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:security-group/*"
      ]
    },
    {
      "Sid": "VisualEditor2",
      "Effect": "Allow",
      "Action": [
        "ec2:RebootInstances",
        "ec2:TerminateInstances",
        "ec2:StartInstances",
        "ec2:StopInstances"
      ],
      "Resource": "arn:aws:ec2:REGION:AWS_ACCOUNT_ID:instance/*"
    }
  ]
}
```

## Step 3: Create Azure Credentials

Set up Microsoft Azure credentials:

1. Click **Create**.
2. Select **Azure** as the cloud credential type.
3. Enter the Azure service principal details.

```plaintext
Name: azure-production
Description: Production Azure subscription credentials
Subscription ID: 12345678-1234-1234-1234-123456789012
Client ID: 87654321-4321-4321-4321-210987654321
Client Secret: your-client-secret
Tenant ID: 11111111-2222-3333-4444-555555555555
Environment: AzurePublicCloud
```

Create a service principal with the required permissions using the Azure CLI:

```bash
# Create a service principal

az ad sp create-for-rbac \
  --name "rancher-node-provisioner" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>

# The output provides the required credentials
# {
#   "appId": "client-id",
#   "displayName": "rancher-node-provisioner",
#   "password": "client-secret",
#   "tenant": "tenant-id"
# }
```

## Step 4: Create GCP Credentials

Set up Google Cloud Platform credentials:

1. Click **Create**.
2. Select **Google** as the cloud credential type.
3. Upload or paste the service account JSON key.

If you are using the credential for Google GCE machine provisioning, create a service account in GCP with the documented Rancher roles:

```bash
# Create a service account
gcloud iam service-accounts create rancher-provisioner \
  --display-name="Rancher Node Provisioner"

# Grant required roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:rancher-provisioner@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:rancher-provisioner@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:rancher-provisioner@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/viewer"

# Create and download the key
gcloud iam service-accounts keys create rancher-gcp-key.json \
  --iam-account=rancher-provisioner@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Then paste the contents of `rancher-gcp-key.json` into the Rancher credential form. If you are using the credential for GKE instead, Rancher documents a different role set: Compute Viewer, Project Viewer, Kubernetes Engine Admin, and Service Account User.

## Step 5: Create vSphere Credentials

Set up VMware vSphere credentials:

1. Click **Create**.
2. Select **VMware vSphere** as the cloud credential type.
3. Enter the vCenter details.

```plaintext
Name: vsphere-datacenter
Description: vSphere datacenter credentials
vCenter Server: vcenter.example.com
vCenter Port: 443
Username: rancher-svc@vsphere.local
Password: your-vcenter-password
```

Ensure the vSphere user has the documented Rancher permissions:

- `Cns Privileges`: Searchable
- `Content library`: Read Storage when deploying from a content library
- `Cryptographic operations`: Direct Access
- `Datastore`: AllocateSpace, Browse, FileManagement, UpdateVirtualMachineFiles, UpdateVirtualMachineMetadata
- `Global`: Set custom attribute
- `Network`: Assign
- `Resource`: AssignVMToPool
- `Virtual Machine`: Config (All), GuestOperations (All), Interact (All), Inventory (All), Provisioning (All)
- `vSphere Tagging`: Assign or Unassign vSphere Tag, Assign or Unassign vSphere Tag on Object

## Step 6: Create DigitalOcean Credentials

Set up DigitalOcean credentials:

1. Click **Create**.
2. Select **DigitalOcean** as the cloud credential type.
3. Enter the API token.

```plaintext
Name: digitalocean-production
Description: DigitalOcean production account
Access Token: dop_v1_your-personal-access-token
```

Generate a token in the DigitalOcean console under **API** with **Full Access** or custom scopes that allow Rancher to create and manage the DigitalOcean resources you plan to use.

## Step 7: Manage Credential Access

Cloud credentials are owned by the creating user by default. In current Rancher releases, non-admin users cannot share cloud credentials with other non-admin users, while admins can view and manage other users' cloud credentials.

## Step 8: Rotate Credentials

Regularly rotate your cloud credentials:

1. Generate new credentials in your cloud provider console.
2. In Rancher, navigate to **☰ > Cluster Management > Cloud Credentials**.
3. Click the three-dot menu on the credential and select **Edit Config**.
4. Update the keys or secrets.
5. Click **Save**.

The updated credential is then available for subsequent provisioning operations that reference it.

## Step 9: Audit Credential Usage

Track which clusters, machine pools, or legacy node templates reference each credential before rotating or deleting it.

## Step 10: Delete Unused Credentials

Clean up credentials that are no longer in use:

1. Verify no machine pools, clusters, or legacy node templates reference the credential.
2. Navigate to **☰ > Cluster Management > Cloud Credentials**.
3. Click the three-dot menu and select **Delete**.

## Best Practices

- **Use service accounts**: Never use personal credentials. Create dedicated service accounts or IAM users for Rancher.
- **Apply least privilege**: Grant only the minimum permissions required for node provisioning.
- **Rotate regularly**: Set a schedule to rotate credentials at least every 90 days.
- **Separate by environment**: Use different credentials for production, staging, and development environments.
- **Monitor usage**: Audit cloud credential usage regularly and remove unused credentials promptly.

## Conclusion

Cloud credentials in Rancher provide a secure, centralized way to manage cloud provider authentication. By following the principle of least privilege, rotating credentials regularly, and maintaining clear separation between environments, you can ensure that your Kubernetes infrastructure provisioning is both secure and efficient. Take the time to set up proper IAM roles and service accounts before creating your credentials, and your Rancher deployment will be more resilient and easier to manage.
