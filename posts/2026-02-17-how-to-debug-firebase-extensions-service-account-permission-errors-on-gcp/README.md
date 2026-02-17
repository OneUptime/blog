# How to Debug Firebase Extensions Service Account Permission Errors on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Extensions, IAM, Troubleshooting

Description: A practical guide to diagnosing and fixing service account permission errors when installing or running Firebase Extensions on Google Cloud Platform.

---

Firebase Extensions are supposed to make life easier. Install one, configure a few parameters, and you get prebuilt functionality like image resizing, email sending, or Firestore backups. But when things go wrong with permissions, the error messages can be cryptic and the debugging process frustrating. I have dealt with this enough times to have a reliable troubleshooting playbook.

## Understanding How Extensions Use Service Accounts

Before diving into fixes, it helps to understand the underlying mechanics. Every Firebase Extension runs as a Cloud Function, and every Cloud Function runs under a service account. When you install an extension, Firebase creates (or uses) a service account and assigns it the IAM roles the extension needs.

The default service account for Cloud Functions is typically:

```
PROJECT_ID@appspot.gserviceaccount.com
```

Some extensions create their own dedicated service account with a naming pattern like:

```
ext-EXTENSION_INSTANCE_ID@PROJECT_ID.iam.gserviceaccount.com
```

When permissions go wrong, it is usually because this service account lacks the roles it needs to interact with other GCP services.

## Common Error Patterns

Here are the most frequent permission errors you will encounter.

### Error: "Permission denied" During Installation

This typically looks like:

```
Error: Missing permissions required to install this extension.
The service account does not have permission to create resources.
```

The installation process itself requires elevated permissions. The account running the install (usually your user account or a CI/CD service account) needs the following roles:

- Firebase Extensions Admin
- Cloud Functions Developer
- Service Account User
- IAM Service Account Admin (if the extension creates its own SA)

### Error: Runtime Permission Denied

After a successful install, the extension starts failing with errors like:

```
Error: 7 PERMISSION_DENIED: The caller does not have permission
```

This means the extension's service account lacks permissions for what the extension is trying to do at runtime, like writing to Firestore or accessing Cloud Storage.

### Error: "iam.serviceAccounts.actAs" Denied

This is particularly common and confusing:

```
Error: Permission 'iam.serviceAccounts.actAs' denied on service account
```

This means the deployer does not have permission to deploy a function under the target service account.

## Step 1 - Identify the Service Account

First, figure out which service account the extension is using. You can find this in the Firebase Console or through the CLI.

This command lists the installed extensions and their configuration:

```bash
# List installed extensions
firebase ext:list --project YOUR_PROJECT_ID
```

For more detail, check the GCP Console. Navigate to IAM and Admin, then Service Accounts. Look for accounts matching the extension naming pattern.

You can also use gcloud to find the relevant service account:

```bash
# List all service accounts in the project
gcloud iam service-accounts list --project YOUR_PROJECT_ID

# Look for entries like:
# ext-firestore-bigquery-export@your-project.iam.gserviceaccount.com
```

## Step 2 - Check Current IAM Bindings

Once you know the service account, check what roles it actually has.

This command shows all IAM bindings for your project, filtered to the extension's service account:

```bash
# Get the IAM policy and filter for the extension SA
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:ext-YOUR_EXTENSION@YOUR_PROJECT.iam.gserviceaccount.com"
```

## Step 3 - Compare Against Required Roles

Each extension declares the roles it needs in its `extension.yaml` file. You can find this in the extension's source code (most are open source on GitHub) or in the Firebase documentation for that specific extension.

For example, the Firestore BigQuery Export extension needs:

- `roles/bigquery.dataEditor` - to write to BigQuery
- `roles/datastore.user` - to read from Firestore

The Resize Images extension typically needs:

- `roles/storage.admin` - to read and write to Cloud Storage

Compare the required roles against what the service account actually has from the previous step. Any missing roles are your culprit.

## Step 4 - Grant Missing Permissions

Once you identify the gap, grant the missing roles.

This command adds a specific IAM role to the extension's service account:

```bash
# Grant a role to the extension's service account
gcloud projects add-iam-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ext-YOUR_EXTENSION@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
```

For multiple roles, you can script it:

```bash
# Grant multiple roles at once
ROLES=(
  "roles/bigquery.dataEditor"
  "roles/datastore.user"
  "roles/logging.logWriter"
)

SA="ext-your-extension@your-project.iam.gserviceaccount.com"

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-binding YOUR_PROJECT_ID \
    --member="serviceAccount:$SA" \
    --role="$ROLE"
  echo "Granted $ROLE"
done
```

## Step 5 - Fix the "actAs" Permission Issue

The `iam.serviceAccounts.actAs` error requires special handling. This permission is needed by the account deploying the function, not by the function's runtime account.

Grant the deployer the Service Account User role on the target service account:

```bash
# Grant the deployer permission to act as the extension's service account
gcloud iam service-accounts add-iam-policy-binding \
  ext-YOUR_EXTENSION@YOUR_PROJECT.iam.gserviceaccount.com \
  --member="user:your-email@domain.com" \
  --role="roles/iam.serviceAccountUser"
```

If you are using a CI/CD pipeline, the CI service account needs this permission instead:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  ext-YOUR_EXTENSION@YOUR_PROJECT.iam.gserviceaccount.com \
  --member="serviceAccount:ci-sa@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Step 6 - Check Cloud Functions Logs

Sometimes the error messages from the Firebase CLI are not specific enough. The actual Cloud Functions logs give you more detail.

This command tails the logs for your extension's Cloud Function:

```bash
# View logs for the extension's functions
gcloud functions logs read \
  --filter="labels.firebase-extensions-instance=YOUR_EXTENSION_INSTANCE" \
  --limit=50 \
  --project YOUR_PROJECT_ID
```

You can also view these in the GCP Console under Cloud Functions, then select the function and check its Logs tab.

## Step 7 - Handle Organization Policy Constraints

In enterprise GCP environments, organization policies can block certain operations regardless of IAM roles. Common constraints that affect extensions include:

- `constraints/iam.disableServiceAccountCreation` - blocks creating new SAs
- `constraints/cloudfunctions.allowedIngressSettings` - restricts function ingress
- `constraints/compute.trustedImageProjects` - can affect function deployment

Check if any org policies are in play:

```bash
# List effective organization policies
gcloud resource-manager org-policies list --project YOUR_PROJECT_ID
```

If org policies are blocking you, you will need to work with your organization admin to create exceptions for Firebase Extensions.

## Step 8 - Reinstall if Needed

Sometimes the cleanest fix after correcting permissions is to uninstall and reinstall the extension. This lets Firebase set up the service account fresh.

```bash
# Uninstall the extension
firebase ext:uninstall YOUR_EXTENSION_INSTANCE --project YOUR_PROJECT_ID

# Reinstall it
firebase ext:install PUBLISHER/EXTENSION_NAME --project YOUR_PROJECT_ID
```

Be aware that uninstalling does not delete data created by the extension (like BigQuery datasets or Firestore collections), but it does remove the Cloud Functions and potentially the service account.

## Prevention Tips

A few habits that help avoid permission errors in the first place:

1. **Review extension requirements before installing.** Read the extension's documentation and IAM requirements upfront.
2. **Use a project with sufficient permissions for installation.** Ideally, the installer should have Owner or Editor role.
3. **Test in a staging project first.** Install extensions in a non-production project to catch permission issues early.
4. **Monitor extension health.** Set up alerts in Cloud Monitoring for extension function errors so you catch permission problems quickly after deployment.

## Summary

Firebase Extensions permission errors boil down to the right service account having the right IAM roles. Start by identifying which service account the extension uses, compare its current roles against what the extension needs, and fill in the gaps. For deployment-time errors, check the deployer's permissions separately from the runtime permissions. When in doubt, the Cloud Functions logs have the specific details you need to pinpoint the problem.
