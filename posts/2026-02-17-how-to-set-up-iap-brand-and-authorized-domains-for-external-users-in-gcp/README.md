# How to Set Up IAP Brand and Authorized Domains for External Users in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAP, OAuth, External Users, Brand Configuration, Security

Description: A guide to configuring the IAP brand and authorized domains in GCP for external user access, including OAuth consent screen setup, domain verification, and app publishing.

---

When your IAP-protected application needs to be accessible to users outside your organization - partners, contractors, customers, or users with personal Google accounts - you need to configure the IAP brand for external access. This involves setting up the OAuth consent screen as an external app, verifying your domains, and understanding Google's app verification requirements.

Getting this wrong means external users see scary warning screens, hit authorization errors, or cannot access your application at all. Let me walk through the complete setup.

## Internal vs External: What Changes

When your IAP brand is set to "Internal," only users in your Google Workspace organization can sign in. When set to "External," anyone with a Google account can potentially authenticate - though IAP still enforces your IAM policies to control who actually gets access.

The key differences:

| Aspect | Internal | External |
|--------|----------|----------|
| Who can sign in | Org users only | Any Google account |
| Consent screen | Minimal | Full consent screen |
| App verification | Not required | May be required |
| Test user limit | N/A | 100 users in testing mode |
| Publishing | Not needed | Required for unrestricted access |

## Step 1: Create the IAP Brand

The brand is the OAuth consent screen configuration. You can create it through the console or the CLI.

```bash
# Create an IAP brand for external users
gcloud iap oauth-brands create \
    --application_title="My Partner Portal" \
    --support_email="support@company.com" \
    --project=my-project-id
```

Note: Only one brand can exist per project. If a brand already exists, you need to update it rather than create a new one.

```bash
# List existing brands
gcloud iap oauth-brands list --project=my-project-id
```

## Step 2: Configure the OAuth Consent Screen

The consent screen configuration needs more attention for external apps. Go to the Google Cloud Console, navigate to APIs & Services, then OAuth consent screen.

Fill in these required fields:

- **App name**: What users see when they are asked to grant access
- **User support email**: Where users can reach you if they have issues
- **App logo**: Optional but recommended for a professional appearance
- **Application home page**: Your application's main URL
- **Application privacy policy link**: Required for production external apps
- **Application terms of service link**: Required for production external apps
- **Authorized domains**: The domains your application uses
- **Developer contact email**: Where Google reaches you about app status

## Step 3: Add Authorized Domains

Authorized domains tell Google which domains are legitimate for your application. This prevents phishing attacks where someone tries to redirect OAuth flows to a malicious domain.

### Adding Domains in the Console

In the OAuth consent screen settings, add your domains in the "Authorized domains" section. You need to add:

1. Your application's domain (e.g., `partner-portal.company.com`)
2. Your company's top-level domain (e.g., `company.com`)

### Domain Verification

Google requires you to verify ownership of the authorized domains. You do this through the Google Search Console or by adding a DNS TXT record.

```bash
# Verify domain ownership via DNS TXT record
# Add this TXT record to your domain's DNS:
# google-site-verification=YOUR_VERIFICATION_CODE

# After adding the DNS record, verify it
gcloud domains verify company.com
```

Alternatively, verify through the Google Search Console at `https://search.google.com/search-console`.

## Step 4: Create an IAP OAuth Client

Create the OAuth client that IAP will use for authentication.

```bash
# Get the brand name
BRAND_NAME=$(gcloud iap oauth-brands list \
    --project=my-project-id \
    --format="value(name)")

# Create an OAuth client for IAP
gcloud iap oauth-clients create "$BRAND_NAME" \
    --display_name="Partner Portal IAP Client" \
    --project=my-project-id
```

## Step 5: Enable IAP on Your Backend Service

Use the OAuth client credentials to enable IAP.

```bash
# Enable IAP with the OAuth client credentials
gcloud compute backend-services update partner-portal-backend \
    --iap=enabled,oauth2-client-id=CLIENT_ID,oauth2-client-secret=CLIENT_SECRET \
    --global \
    --project=my-project-id
```

## Step 6: Grant Access to External Users

Grant external users the `iap.httpsResourceAccessor` role. You can grant access to individual Google accounts, Google Groups that include external members, or entire domains.

```bash
# Grant access to a specific external user
gcloud iap web add-iam-policy-binding \
    --resource-type=backend-services \
    --service=partner-portal-backend \
    --member="user:partner@external-company.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --project=my-project-id

# Grant access to a Google Group (can include external members)
gcloud iap web add-iam-policy-binding \
    --resource-type=backend-services \
    --service=partner-portal-backend \
    --member="group:partners@company.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --project=my-project-id
```

## App Testing Mode vs Production Mode

### Testing Mode (Default)

When you first create an external OAuth consent screen, it is in testing mode. In this mode:

- Only users explicitly added as test users can sign in
- Maximum 100 test users
- Tokens expire after 7 days
- No app verification needed

Add test users in the OAuth consent screen settings under "Test users."

### Publishing to Production

To remove the test user restriction and allow any authorized Google account to sign in, publish the app.

In the Google Cloud Console:
1. Go to APIs & Services then OAuth consent screen
2. Click "Publish App"
3. Confirm the publishing

After publishing:
- Any Google account user can complete the sign-in flow (IAP still checks IAM)
- Token expiration follows normal rules
- Google may require app verification if you use sensitive scopes

## Google App Verification

If your external app requests sensitive or restricted OAuth scopes, Google requires you to go through app verification. IAP typically uses only the `email`, `profile`, and `openid` scopes, which are not considered sensitive. This means most IAP setups do not need verification.

However, if you see a "This app has not been verified" warning when external users try to sign in, you may need to:

1. Submit your app for verification through the OAuth consent screen settings
2. Provide the privacy policy and terms of service URLs
3. Demonstrate legitimate use of the requested scopes

For IAP with standard scopes, you can usually skip this by publishing the app and ensuring users trust the domain.

## Managing External User Lifecycle

External users should be managed through Google Groups for scalability.

```bash
# Create a Google Group for partners (done in Google Admin or via API)
# Then add the group to IAP access

gcloud iap web add-iam-policy-binding \
    --resource-type=backend-services \
    --service=partner-portal-backend \
    --member="group:active-partners@company.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --project=my-project-id
```

When a partner relationship ends, remove them from the group. Their IAP access is revoked immediately without changing any IAM bindings.

## Terraform Configuration

```hcl
# IAP brand for external users
resource "google_iap_brand" "external" {
  support_email     = "support@company.com"
  application_title = "Partner Portal"
  project           = var.project_number
}

# IAP OAuth client
resource "google_iap_client" "external" {
  display_name = "Partner Portal IAP Client"
  brand        = google_iap_brand.external.name
}

# Backend service with IAP
resource "google_compute_backend_service" "partner_portal" {
  name        = "partner-portal-backend"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  backend {
    group = google_compute_instance_group_manager.app.instance_group
  }

  health_checks = [google_compute_health_check.app.id]

  iap {
    oauth2_client_id     = google_iap_client.external.client_id
    oauth2_client_secret = google_iap_client.external.secret
  }
}

# Grant access to the partners group
resource "google_iap_web_backend_service_iam_member" "partners" {
  project             = var.project_id
  web_backend_service = google_compute_backend_service.partner_portal.name
  role                = "roles/iap.httpsResourceAccessor"
  member              = "group:active-partners@company.com"
}
```

## Troubleshooting External User Access

**"This app is not yet verified" warning**: This appears when the app is in testing mode or uses sensitive scopes. Publish the app and ensure you are using standard scopes only.

**"You do not have access" after sign-in**: The user authenticated but does not have the `iap.httpsResourceAccessor` role. Add them to an authorized group or grant individual access.

**"Error 400: redirect_uri_mismatch"**: The OAuth client's redirect URI configuration does not match. For IAP-created clients, this is managed automatically. For manually created clients, add the correct redirect URI.

**External user cannot see the sign-in page**: If the app is in testing mode, the user must be in the test users list. Publish the app or add them as a test user.

**"Access blocked: This app's request is invalid"**: Usually caused by a missing or incorrect authorized domain. Make sure your application's domain is listed in the authorized domains.

## Security Considerations for External Access

1. **Use groups for access management**: Do not grant access to individual external users - manage them through groups.
2. **Implement session timeouts**: Configure session duration limits in the IAP settings.
3. **Monitor external access**: Set up alerts for new external user sign-ins.
4. **Combine with context-aware access**: Use access levels to restrict external access to specific networks or device types.
5. **Regular access reviews**: Periodically review who has access and remove stale accounts.

## Summary

Setting up IAP for external users requires configuring the OAuth consent screen as an external app, verifying your domains, and managing the app's publishing state. Start in testing mode with a small group of test users, verify everything works, then publish to production. Use Google Groups to manage external user access at scale, and combine with context-aware access policies for additional security layers. The authorized domains configuration is critical for preventing OAuth redirect attacks, so make sure every domain your application uses is properly verified and listed.
