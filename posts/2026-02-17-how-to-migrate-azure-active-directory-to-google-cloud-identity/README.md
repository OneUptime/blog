# How to Migrate Azure Active Directory to Google Cloud Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Identity, Azure Active Directory, Identity Management, Cloud Migration

Description: A comprehensive guide to migrating identity management from Azure Active Directory to Google Cloud Identity, covering user provisioning, group migration, and SSO configuration.

---

Migrating identity management from Azure Active Directory (now Microsoft Entra ID) to Google Cloud Identity is one of the most impactful parts of a cloud migration. Your identity provider touches everything - user authentication, application access, device management, and security policies. This migration requires careful planning because a misstep can lock people out of their work.

The good news is that you do not have to do it all at once. You can federate between Azure AD and Cloud Identity during the transition, keeping both systems operational.

## Understanding the Migration Options

There are three main approaches:

1. **Full migration**: Move all users and groups from Azure AD to Cloud Identity. Use Cloud Identity as the primary IdP.
2. **Federation**: Keep Azure AD as the IdP and federate it with Google Cloud. Users log into GCP using their Azure AD credentials.
3. **Hybrid**: Migrate some users to Cloud Identity, keep others in Azure AD, and federate between them.

For a full migration to GCP, option 1 is the end goal. Option 2 is a practical stepping stone during the transition.

## Service Comparison

| Feature | Azure Active Directory | Google Cloud Identity |
|---------|----------------------|---------------------|
| User management | Azure AD users | Cloud Identity users |
| Group types | Security, M365, distribution | Google Groups |
| MFA | Azure MFA | Google 2-Step Verification |
| Conditional access | Conditional Access policies | Context-Aware Access |
| SSO | Azure AD SSO | Google SSO / SAML |
| Device management | Intune | Google Endpoint Management |
| Directory sync | Azure AD Connect | Google Cloud Directory Sync (GCDS) |
| B2B collaboration | Azure AD B2B | Google Groups external members |

## Step 1: Set Up Cloud Identity

If you do not already have a Cloud Identity domain, set one up.

```bash
# Verify domain ownership for Cloud Identity
# This is done through the Google Admin Console
# You need to add a TXT record to your DNS

# After domain verification, enable Cloud Identity APIs
gcloud services enable cloudidentity.googleapis.com
gcloud services enable admin.googleapis.com
```

Navigate to admin.google.com to complete the initial setup, including verifying your domain ownership.

## Step 2: Export Users from Azure AD

Export your user data from Azure AD.

```bash
# List all users in Azure AD
az ad user list \
  --query '[*].{
    UPN:userPrincipalName,
    DisplayName:displayName,
    Email:mail,
    Department:department,
    JobTitle:jobTitle,
    Enabled:accountEnabled
  }' \
  --output table > azure-ad-users.txt

# Export to JSON for scripted migration
az ad user list --output json > azure-ad-users.json

# Export groups
az ad group list \
  --query '[*].{
    Name:displayName,
    Description:description,
    ID:id
  }' \
  --output json > azure-ad-groups.json

# Export group memberships
for group_id in $(az ad group list --query '[*].id' -o tsv); do
  group_name=$(az ad group show --group $group_id --query 'displayName' -o tsv)
  echo "Group: $group_name"
  az ad group member list --group $group_id \
    --query '[*].userPrincipalName' -o tsv
done > azure-ad-memberships.txt
```

## Step 3: Provision Users in Cloud Identity

Use the Google Admin SDK or Google Cloud Directory Sync (GCDS) to create users.

### Option A: Using GCDS for Automated Sync

GCDS can sync users from Azure AD (via LDAP) or from a CSV export.

```bash
# Download GCDS from Google
# Configure it to sync from your Azure AD export

# GCDS configuration steps:
# 1. Set up LDAP connection to Azure AD (or use CSV import)
# 2. Map user attributes
# 3. Configure group sync
# 4. Run a simulated sync first
# 5. Execute the actual sync
```

### Option B: Using the Admin SDK Directly

```python
# Create users in Cloud Identity using the Admin SDK
from googleapiclient.discovery import build
from google.oauth2 import service_account
import json

# Authenticate with a service account that has admin privileges
creds = service_account.Credentials.from_service_account_file(
    'admin-sa.json',
    scopes=['https://www.googleapis.com/auth/admin.directory.user',
            'https://www.googleapis.com/auth/admin.directory.group'],
    subject='admin@example.com'  # Admin user to impersonate
)

service = build('admin', 'directory_v1', credentials=creds)

# Load exported Azure AD users
with open('azure-ad-users.json', 'r') as f:
    azure_users = json.load(f)

for user in azure_users:
    if not user.get('mail'):
        continue

    # Create user in Cloud Identity
    user_body = {
        'primaryEmail': user['mail'],
        'name': {
            'givenName': user.get('givenName', ''),
            'familyName': user.get('surname', '')
        },
        'orgUnitPath': '/',
        'password': 'TempPassword123!',  # Force password change on first login
        'changePasswordAtNextLogin': True,
        'organizations': [{
            'title': user.get('jobTitle', ''),
            'department': user.get('department', '')
        }]
    }

    try:
        result = service.users().insert(body=user_body).execute()
        print(f"Created user: {user['mail']}")
    except Exception as e:
        print(f"Failed to create {user['mail']}: {e}")
```

## Step 4: Migrate Groups

Create Google Groups that match your Azure AD groups.

```python
# Create groups and add members
with open('azure-ad-groups.json', 'r') as f:
    azure_groups = json.load(f)

for group in azure_groups:
    group_email = group['displayName'].lower().replace(' ', '-') + '@example.com'

    # Create the group
    group_body = {
        'email': group_email,
        'name': group['displayName'],
        'description': group.get('description', '')
    }

    try:
        result = service.groups().insert(body=group_body).execute()
        print(f"Created group: {group_email}")

        # Add members to the group
        members = get_azure_group_members(group['id'])  # Your function to get members
        for member_email in members:
            member_body = {
                'email': member_email,
                'role': 'MEMBER'
            }
            service.members().insert(
                groupKey=group_email,
                body=member_body
            ).execute()

    except Exception as e:
        print(f"Failed: {group['displayName']} - {e}")
```

## Step 5: Set Up Federation (Transition Period)

During the migration, federate Azure AD with Google Cloud so users can log in with their Azure AD credentials while you transition.

Configure SAML SSO in the Google Admin Console:

1. In Azure AD, register Google Cloud as an enterprise application
2. Configure SAML SSO settings

```bash
# Azure AD side: Register Google as a SAML application
# SSO URL: https://accounts.google.com/o/saml2/acs
# Entity ID: google.com/a/example.com
# Reply URL: https://accounts.google.com/o/saml2/acs

az ad app create \
  --display-name "Google Cloud SAML SSO" \
  --identifier-uris "google.com/a/example.com" \
  --reply-urls "https://accounts.google.com/o/saml2/acs"
```

On the Google Admin Console side:
1. Go to Security > Authentication > SSO with third-party IdP
2. Enable SSO
3. Upload the Azure AD IdP metadata or configure manually
4. Set the sign-in page URL to your Azure AD login URL
5. Upload the Azure AD signing certificate

## Step 6: Migrate Conditional Access to Context-Aware Access

Azure AD Conditional Access policies map to Google's Context-Aware Access.

```bash
# Create an access level based on device and location
gcloud access-context-manager levels create corporate-network \
  --title="Corporate Network" \
  --basic-level-spec=level-spec.yaml \
  --policy=POLICY_ID
```

Level spec example:

```yaml
# Access level definition - equivalent to Azure AD Conditional Access
conditions:
  - ipSubnetworks:
      - "203.0.113.0/24"  # Corporate network CIDR
      - "198.51.100.0/24"  # VPN range
  - devicePolicy:
      requireScreenlock: true
      osConstraints:
        - osType: DESKTOP_CHROME_OS
          minimumVersion: "100.0"
        - osType: DESKTOP_WINDOWS
          minimumVersion: "10.0"
        - osType: DESKTOP_MAC
          minimumVersion: "12.0"
```

```bash
# Apply the access level to a GCP resource
gcloud access-context-manager perimeters create my-perimeter \
  --title="Production Access" \
  --resources="projects/12345" \
  --restricted-services="storage.googleapis.com,bigquery.googleapis.com" \
  --access-levels="accessPolicies/POLICY_ID/accessLevels/corporate-network" \
  --policy=POLICY_ID
```

## Step 7: Configure MFA

Set up Google 2-Step Verification (equivalent to Azure MFA).

```bash
# Using the Admin SDK to enforce 2-step verification
# This is typically configured in the Google Admin Console under:
# Security > Authentication > 2-Step Verification

# To enforce via API:
# Set the organization policy to require 2-step verification
```

In the Admin Console:
1. Go to Security > 2-Step Verification
2. Allow users to turn on 2-Step Verification
3. Set enforcement - choose "On" for the entire organization
4. Set enrollment period (give users time to set up)
5. Choose allowed verification methods (Security Key, Google Prompt, etc.)

## Step 8: Validate and Cut Over

Test the migration thoroughly before switching your primary IdP.

```bash
# Verify user count matches
# Google Admin SDK
python3 -c "
from googleapiclient.discovery import build
from google.oauth2 import service_account

creds = service_account.Credentials.from_service_account_file(
    'admin-sa.json',
    scopes=['https://www.googleapis.com/auth/admin.directory.user'],
    subject='admin@example.com'
)
service = build('admin', 'directory_v1', credentials=creds)

results = service.users().list(
    domain='example.com',
    maxResults=1,
    orderBy='email'
).execute()
print(f'Total users: {results.get(\"totalResults\", 0)}')
"
```

Validation checklist:
- All users can authenticate
- Group memberships are correct
- SSO works for all configured applications
- MFA is enforced and working
- Conditional access policies are equivalent
- Service accounts and API access work correctly

## Summary

Migrating from Azure AD to Cloud Identity is best done in phases. Start with federation so users can authenticate to GCP resources using their Azure AD credentials. Then gradually migrate users, groups, and policies to Cloud Identity. The federation period gives you a safety net - if anything goes wrong, users can still authenticate through Azure AD. Plan for a generous transition period (weeks to months depending on organization size) and communicate clearly with your users about password changes and MFA enrollment.
