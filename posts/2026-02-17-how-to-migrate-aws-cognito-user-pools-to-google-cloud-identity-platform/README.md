# How to Migrate AWS Cognito User Pools to Google Cloud Identity Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Identity Platform, AWS Cognito, Authentication, Cloud Migration

Description: A detailed guide to migrating user authentication from AWS Cognito User Pools to Google Cloud Identity Platform, including user data export and auth flow conversion.

---

Migrating your authentication system is one of the more delicate parts of a cloud migration. Users expect to log in the same way they always have, and any disruption directly impacts your customers. AWS Cognito User Pools and Google Cloud Identity Platform (built on Firebase Auth) both provide managed authentication, but the user migration process requires careful planning.

The biggest challenge is that you cannot export password hashes from Cognito. This means you either need to force a password reset for all users or use a lazy migration approach where passwords are verified against Cognito on first login and then stored in Identity Platform.

## Service Comparison

| Feature | AWS Cognito User Pools | Google Cloud Identity Platform |
|---------|----------------------|-------------------------------|
| User storage | Managed user directory | Managed user directory |
| Social login | Facebook, Google, Amazon, Apple | Google, Facebook, Apple, Twitter, GitHub, Microsoft |
| SAML/OIDC | Yes | Yes |
| MFA | SMS, TOTP | SMS, TOTP, Phone |
| Custom auth flows | Lambda triggers | Blocking functions |
| Email/SMS | SES/SNS integration | Built-in or custom SMTP |
| Pricing | Per MAU | Per MAU (free tier: 50K) |
| SDK | AWS Amplify / Cognito SDK | Firebase Auth SDK |

## Step 1: Export Users from Cognito

Cognito lets you export user data (but not password hashes). Export all user profiles.

```bash
# List users in the Cognito User Pool
aws cognito-idp list-users \
  --user-pool-id us-east-1_abc123 \
  --limit 60 \
  --query 'Users[*].{
    Username:Username,
    Email:Attributes[?Name==`email`].Value|[0],
    EmailVerified:Attributes[?Name==`email_verified`].Value|[0],
    Phone:Attributes[?Name==`phone_number`].Value|[0],
    Status:UserStatus,
    Created:UserCreateDate
  }' \
  --output table
```

For a full export, use a script to paginate through all users:

```python
import boto3
import json

# Export all Cognito users to a JSON file
cognito = boto3.client('cognito-idp')
user_pool_id = 'us-east-1_abc123'

users = []
pagination_token = None

while True:
    # Build request with optional pagination token
    params = {
        'UserPoolId': user_pool_id,
        'Limit': 60
    }
    if pagination_token:
        params['PaginationToken'] = pagination_token

    response = cognito.list_users(**params)

    for user in response['Users']:
        # Extract user attributes into a flat dictionary
        attrs = {attr['Name']: attr['Value'] for attr in user['Attributes']}
        users.append({
            'uid': user['Username'],
            'email': attrs.get('email', ''),
            'email_verified': attrs.get('email_verified', 'false') == 'true',
            'phone': attrs.get('phone_number', ''),
            'display_name': attrs.get('name', ''),
            'created': str(user['UserCreateDate']),
            'status': user['UserStatus']
        })

    pagination_token = response.get('PaginationToken')
    if not pagination_token:
        break

print(f"Exported {len(users)} users")

with open('cognito-users.json', 'w') as f:
    json.dump(users, f, indent=2)
```

## Step 2: Set Up Identity Platform

Enable Identity Platform and configure your authentication providers.

```bash
# Enable the Identity Platform API
gcloud services enable identitytoolkit.googleapis.com

# Enable multi-tenancy if needed (equivalent to multiple Cognito User Pools)
gcloud identity-platform config update \
  --enable-multi-tenancy

# Configure email/password sign-in
gcloud identity-platform config update \
  --enable-email-sign-in
```

Configure additional identity providers through the Cloud Console or using the Admin SDK.

## Step 3: Import Users to Identity Platform

Use the Firebase Admin SDK to import users. Since you cannot get password hashes from Cognito, import users without passwords.

```python
import firebase_admin
from firebase_admin import credentials, auth
import json

# Initialize Firebase Admin with service account credentials
cred = credentials.Certificate('service-account.json')
firebase_admin.initialize_app(cred)

# Load exported Cognito users
with open('cognito-users.json', 'r') as f:
    cognito_users = json.load(f)

# Import users in batches of 1000 (Firebase limit)
batch = []
for user in cognito_users:
    if not user['email']:
        continue

    # Create ImportUserRecord without password hash
    import_user = auth.ImportUserRecord(
        uid=user['uid'],
        email=user['email'],
        email_verified=user['email_verified'],
        display_name=user.get('display_name', ''),
        phone_number=user.get('phone') if user.get('phone') else None,
        disabled=user['status'] != 'CONFIRMED'
    )
    batch.append(import_user)

    # Import in batches of 1000
    if len(batch) >= 1000:
        result = auth.import_users(batch)
        print(f"Imported batch: {result.success_count} success, {result.failure_count} failures")
        batch = []

# Import remaining users
if batch:
    result = auth.import_users(batch)
    print(f"Final batch: {result.success_count} success, {result.failure_count} failures")
```

## Step 4: Implement Lazy Password Migration

Since you cannot export password hashes, implement a "lazy migration" pattern. When a user logs in for the first time on the new system, verify their credentials against Cognito and then set their password in Identity Platform.

```python
# Cloud Function that acts as a custom authentication handler
import functions_framework
import boto3
import firebase_admin
from firebase_admin import auth

firebase_admin.initialize_app()
cognito = boto3.client('cognito-idp', region_name='us-east-1')

CLIENT_ID = 'your-cognito-app-client-id'

@functions_framework.http
def lazy_migrate_password(request):
    """Verify password against Cognito and set it in Identity Platform."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    try:
        # Try to authenticate against Cognito
        response = cognito.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password
            }
        )

        # If authentication succeeds, update the password in Identity Platform
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=password)

        return {'status': 'migrated', 'uid': user.uid}, 200

    except cognito.exceptions.NotAuthorizedException:
        return {'status': 'invalid_credentials'}, 401
    except Exception as e:
        return {'status': 'error', 'message': str(e)}, 500
```

## Step 5: Convert Authentication Client Code

Update your frontend code from the Cognito SDK to the Firebase Auth SDK.

JavaScript migration:

```javascript
// Old Cognito authentication code
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'us-east-1_abc123',
  ClientId: 'your-client-id'
};
const userPool = new CognitoUserPool(poolData);

function signIn(email, password) {
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password
  });
  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => resolve(result.getIdToken().getJwtToken()),
      onFailure: (err) => reject(err)
    });
  });
}

// New Firebase Auth code
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Initialize Firebase with your GCP project config
const firebaseConfig = {
  apiKey: 'your-api-key',
  authDomain: 'my-project.firebaseapp.com',
  projectId: 'my-project'
};
const app = initializeApp(firebaseConfig);
const authInstance = getAuth(app);

async function signIn(email, password) {
  try {
    // Sign in with email and password
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    const token = await userCredential.user.getIdToken();
    return token;
  } catch (error) {
    // If user has not been password-migrated, try lazy migration
    if (error.code === 'auth/wrong-password') {
      const migrated = await lazyMigratePassword(email, password);
      if (migrated) {
        return signIn(email, password);
      }
    }
    throw error;
  }
}
```

## Step 6: Migrate Cognito Lambda Triggers

Cognito uses Lambda triggers for custom authentication flows. Identity Platform uses Blocking Functions.

| Cognito Trigger | Identity Platform Equivalent |
|----------------|------------------------------|
| Pre Sign-up | beforeCreate blocking function |
| Post Confirmation | Cloud Function triggered by auth event |
| Pre Authentication | beforeSignIn blocking function |
| Post Authentication | Cloud Function triggered by auth event |
| Custom Message | Custom SMTP/SMS provider |
| Pre Token Generation | beforeSignIn blocking function (custom claims) |

```python
# Identity Platform blocking function (equivalent to Cognito Pre Sign-up trigger)
from firebase_admin import auth
from firebase_functions import identity_fn

@identity_fn.before_user_created()
def validate_new_user(event):
    """Block sign-ups from non-company email domains."""
    email = event.data.email
    if email and not email.endswith('@company.com'):
        raise identity_fn.HttpsError(
            code='invalid-argument',
            message='Only company.com emails are allowed'
        )
    return event
```

## Step 7: Validate the Migration

After importing users and setting up the new auth flow:

```bash
# Verify user count in Identity Platform
# Use the Firebase Admin SDK
python3 -c "
import firebase_admin
from firebase_admin import credentials, auth

cred = credentials.Certificate('service-account.json')
firebase_admin.initialize_app(cred)

# Count all users
count = 0
for user in auth.list_users().iterate_all():
    count += 1
print(f'Total users in Identity Platform: {count}')
"
```

Test the authentication flow end-to-end:
1. Sign in with an existing user (triggers lazy password migration)
2. Sign up a new user
3. Test social login providers
4. Verify MFA works if enabled
5. Test password reset flow

## Timeline and Cutover Strategy

Run both authentication systems in parallel during the migration window:

1. Week 1-2: Import users, deploy lazy migration function
2. Week 3-4: Update frontend to use Firebase Auth, keep Cognito as fallback
3. Week 5-8: Monitor lazy migration progress, track how many users have migrated
4. Week 9+: Force password reset for remaining non-migrated users, decommission Cognito

## Summary

The Cognito to Identity Platform migration is primarily complicated by the inability to export password hashes. The lazy migration pattern solves this gracefully for most users, but you will need a plan for users who do not log in during the migration window. Start early, run both systems in parallel, and track your migration progress by monitoring how many users have successfully authenticated through the new system.
