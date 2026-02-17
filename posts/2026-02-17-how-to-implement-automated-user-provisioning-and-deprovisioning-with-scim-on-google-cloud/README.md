# How to Implement Automated User Provisioning and Deprovisioning with SCIM on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, SCIM, User Provisioning, Identity Management, Cloud Identity

Description: Learn how to implement automated user provisioning and deprovisioning using SCIM protocol integration with Google Cloud Identity for streamlined identity lifecycle management.

---

Managing user accounts manually does not scale. When someone joins the company, they need accounts in Google Workspace, access to specific GCP projects, membership in the right groups, and the correct IAM roles. When they leave, all of that needs to be revoked - quickly. SCIM (System for Cross-domain Identity Management) automates this lifecycle by connecting your identity provider to Google Cloud Identity.

This guide covers implementing SCIM-based provisioning so that user accounts and group memberships in Google Cloud stay in sync with your authoritative identity source.

## How SCIM Works with Google Cloud

SCIM is a REST API standard for managing user identities across systems. Your identity provider (like Okta, Azure AD, OneLogin, or Ping Identity) acts as the SCIM client. Google Cloud Identity acts as the SCIM server. When a user is created, updated, or deleted in the identity provider, the SCIM client sends the corresponding API call to Google Cloud Identity, and the change is reflected immediately.

The main benefits are that account creation is instant when someone joins, account deactivation happens automatically when someone leaves, group memberships stay synchronized with your HR system or identity provider, and there is a single source of truth for identity.

## Step 1: Set Up Google Cloud Identity

If you do not already have Cloud Identity set up, start there.

```bash
# Verify your Cloud Identity configuration
gcloud organizations list

# Check the directory API is accessible
gcloud identity groups list \
  --organization=ORG_ID \
  --format="table(displayName,email)"
```

## Step 2: Configure SCIM in Your Identity Provider

The exact steps depend on your identity provider. I will cover the general approach and then show Okta as a specific example.

### General SCIM Configuration

Every SCIM integration needs a SCIM endpoint URL (provided by Google), an authentication token or OAuth credentials, attribute mappings between your IdP schema and Google's schema, and provisioning rules for when to create, update, or deactivate accounts.

### Okta Example

```bash
# In Okta, the SCIM connector for Google Cloud Identity is pre-built
# You need:
# 1. A Google Cloud Identity admin account
# 2. API access enabled for your domain

# Generate SCIM credentials using the Admin SDK
# The service account needs Directory API access
gcloud iam service-accounts create scim-provisioning \
  --display-name="SCIM Provisioning Service" \
  --project=PROJECT_ID

# Grant domain-wide delegation
gcloud iam service-accounts keys create scim-key.json \
  --iam-account=scim-provisioning@PROJECT_ID.iam.gserviceaccount.com
```

## Step 3: Build a Custom SCIM Bridge (If Needed)

If your identity provider does not have a native Google Cloud Identity connector, build a SCIM bridge using Cloud Run.

```python
# scim_bridge/main.py
import json
import os
from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)

# Initialize the Google Admin SDK client
SCOPES = [
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.directory.group',
]

credentials = service_account.Credentials.from_service_account_file(
    'service-account-key.json',
    scopes=SCOPES,
    subject='admin@yourdomain.com',  # Domain admin to impersonate
)

directory_service = build('admin', 'directory_v1', credentials=credentials)

# SCIM Bearer token for authentication
SCIM_TOKEN = os.environ.get("SCIM_BEARER_TOKEN")

def authenticate(f):
    """Verify the SCIM bearer token."""
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer ") or auth[7:] != SCIM_TOKEN:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@app.route("/scim/v2/Users", methods=["POST"])
@authenticate
def create_user():
    """SCIM endpoint to create a new user."""
    scim_user = request.get_json()

    # Map SCIM attributes to Google Directory API format
    google_user = {
        "primaryEmail": scim_user["userName"],
        "name": {
            "givenName": scim_user.get("name", {}).get("givenName", ""),
            "familyName": scim_user.get("name", {}).get("familyName", ""),
        },
        "password": generate_temp_password(),
        "changePasswordAtNextLogin": True,
        "orgUnitPath": map_department_to_ou(
            scim_user.get("urn:ietf:params:scim:schemas:extension:enterprise:2.0:User", {}).get("department", "")
        ),
    }

    try:
        result = directory_service.users().insert(body=google_user).execute()
        # Return SCIM-formatted response
        return jsonify(format_as_scim_user(result)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/scim/v2/Users/<user_id>", methods=["PUT"])
@authenticate
def update_user(user_id):
    """SCIM endpoint to update an existing user."""
    scim_user = request.get_json()

    google_update = {
        "name": {
            "givenName": scim_user.get("name", {}).get("givenName", ""),
            "familyName": scim_user.get("name", {}).get("familyName", ""),
        },
        "suspended": not scim_user.get("active", True),
    }

    try:
        result = directory_service.users().update(
            userKey=user_id, body=google_update
        ).execute()
        return jsonify(format_as_scim_user(result)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/scim/v2/Users/<user_id>", methods=["DELETE"])
@authenticate
def delete_user(user_id):
    """SCIM endpoint to deactivate (suspend) a user."""
    # Instead of deleting, suspend the account
    # This preserves data and allows for recovery
    try:
        directory_service.users().update(
            userKey=user_id,
            body={"suspended": True},
        ).execute()
        return "", 204
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/scim/v2/Groups", methods=["POST"])
@authenticate
def create_group():
    """SCIM endpoint to create a new group."""
    scim_group = request.get_json()

    google_group = {
        "email": scim_group["displayName"].lower().replace(" ", "-") + "@yourdomain.com",
        "name": scim_group["displayName"],
        "description": scim_group.get("description", ""),
    }

    try:
        result = directory_service.groups().insert(body=google_group).execute()
        # Add members
        for member in scim_group.get("members", []):
            directory_service.members().insert(
                groupKey=result["email"],
                body={"email": member["value"], "role": "MEMBER"},
            ).execute()
        return jsonify(format_as_scim_group(result)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def map_department_to_ou(department):
    """Map IdP department to Google Workspace organizational unit."""
    ou_mapping = {
        "Engineering": "/Engineering",
        "Sales": "/Sales",
        "Marketing": "/Marketing",
        "Finance": "/Finance",
        "HR": "/Human Resources",
    }
    return ou_mapping.get(department, "/")

def format_as_scim_user(google_user):
    """Convert Google Directory user to SCIM format."""
    return {
        "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
        "id": google_user["id"],
        "userName": google_user["primaryEmail"],
        "name": {
            "givenName": google_user["name"]["givenName"],
            "familyName": google_user["name"]["familyName"],
        },
        "active": not google_user.get("suspended", False),
        "emails": [
            {"value": google_user["primaryEmail"], "primary": True}
        ],
    }
```

## Step 4: Automate GCP IAM Provisioning

SCIM handles Cloud Identity accounts, but you also need to grant GCP IAM roles based on the user's role or group membership.

```python
from google.cloud import resourcemanager_v3

def sync_gcp_iam_from_groups(project_id):
    """Sync GCP IAM roles based on Cloud Identity group membership."""
    rm_client = resourcemanager_v3.ProjectsClient()

    # Define which groups map to which IAM roles
    group_role_mapping = {
        "gcp-developers@yourdomain.com": [
            "roles/editor",
            "roles/container.developer",
        ],
        "gcp-viewers@yourdomain.com": [
            "roles/viewer",
        ],
        "gcp-admins@yourdomain.com": [
            "roles/owner",
        ],
        "data-engineers@yourdomain.com": [
            "roles/bigquery.dataEditor",
            "roles/storage.objectAdmin",
        ],
    }

    # Get the current IAM policy
    policy = rm_client.get_iam_policy(
        request={"resource": f"projects/{project_id}"}
    )

    # Update bindings based on group mapping
    for group_email, roles in group_role_mapping.items():
        member = f"group:{group_email}"
        for role in roles:
            # Check if binding already exists
            binding_exists = False
            for binding in policy.bindings:
                if binding.role == role and member in binding.members:
                    binding_exists = True
                    break

            if not binding_exists:
                # Add the binding
                from google.iam.v1 import policy_pb2
                new_binding = policy_pb2.Binding()
                new_binding.role = role
                new_binding.members.append(member)
                policy.bindings.append(new_binding)

    # Apply the updated policy
    rm_client.set_iam_policy(
        request={
            "resource": f"projects/{project_id}",
            "policy": policy,
        }
    )
    print(f"IAM policy updated for {project_id}")
```

## Step 5: Handle Deprovisioning Safely

When a user leaves, you need to revoke access quickly but also preserve their data for business continuity.

```python
def deprovision_user(user_email, org_id):
    """Complete deprovisioning workflow for a departing user."""
    # Step 1: Suspend the account immediately
    directory_service.users().update(
        userKey=user_email,
        body={"suspended": True},
    ).execute()
    print(f"Suspended account: {user_email}")

    # Step 2: Transfer ownership of documents and resources
    transfer_drive_ownership(user_email, "manager@yourdomain.com")

    # Step 3: Revoke all OAuth tokens and app passwords
    directory_service.tokens().list(userKey=user_email).execute()

    # Step 4: Remove from all groups
    groups_response = directory_service.groups().list(
        userKey=user_email
    ).execute()

    for group in groups_response.get("groups", []):
        directory_service.members().delete(
            groupKey=group["email"],
            memberKey=user_email,
        ).execute()
        print(f"Removed from group: {group['email']}")

    # Step 5: Log the deprovisioning for audit
    log_deprovisioning_event(user_email, org_id)

    # Step 6: Schedule account deletion after retention period
    schedule_account_deletion(user_email, days=30)

    print(f"Deprovisioning complete for {user_email}")
```

## Step 6: Monitor Provisioning Health

Set up monitoring to ensure the SCIM sync is working correctly and catch issues early.

```python
from google.cloud import monitoring_v3

def report_provisioning_metrics(project_id, users_synced, errors):
    """Report SCIM provisioning metrics to Cloud Monitoring."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    # Report successful syncs
    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/scim/users_synced"
    series.resource.type = "global"
    point = monitoring_v3.Point()
    point.value.int64_value = users_synced
    now = time.time()
    point.interval.end_time.seconds = int(now)
    series.points = [point]

    client.create_time_series(name=project_name, time_series=[series])
```

Automated user provisioning with SCIM eliminates one of the biggest security risks in any organization - orphaned accounts. When the identity provider is the single source of truth and SCIM keeps Google Cloud in sync, you can be confident that when someone leaves, their access is revoked immediately and completely. The initial setup takes some work, but the ongoing operational savings and security improvements are well worth it.
