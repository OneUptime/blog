# How to Use Microsoft Graph API with Azure AD App Registrations for Delegated Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Graph API, Azure AD, Delegated Permissions, App Registration, OAuth 2.0, Microsoft 365, Authentication

Description: Configure Azure AD app registrations with delegated permissions to call Microsoft Graph API on behalf of signed-in users securely.

---

When your application needs to access Microsoft 365 data on behalf of a signed-in user, you use delegated permissions. Unlike application permissions where the app acts as itself, delegated permissions mean the app can only access what the signed-in user can access. This is the right model for web apps, mobile apps, and single-page applications where a real person is interacting with the system.

This guide covers setting up the Azure AD app registration, configuring delegated permissions, implementing the OAuth 2.0 authorization code flow, and making Graph API calls on behalf of users.

## Delegated vs Application Permissions

Understanding the difference is critical:

**Delegated permissions**: The app acts on behalf of the signed-in user. The effective permissions are the intersection of what the app is allowed to do and what the user is allowed to do. If the app has `Mail.Read` delegated permission but the user has no mailbox, the app cannot read mail.

**Application permissions**: The app acts as itself with no signed-in user. The app can access data for any user in the tenant. This is for background services and daemons.

For user-facing applications, delegated permissions are almost always what you want.

## Step 1: Register the Application

1. Go to Azure portal > Azure Active Directory > App registrations > New registration.
2. Name it (e.g., "My Graph App").
3. Set the supported account types:
   - Single tenant: Only users in your Azure AD tenant.
   - Multi-tenant: Users from any Azure AD tenant.
   - Multi-tenant + personal: Azure AD users plus personal Microsoft accounts.
4. Set the Redirect URI based on your app type:
   - Web app: `https://yourapp.com/auth/callback`
   - Single-page app: `https://yourapp.com` (with SPA platform)
   - Mobile/desktop: `https://login.microsoftonline.com/common/oauth2/nativeclient`
5. Click Register.

## Step 2: Configure Delegated Permissions

1. Go to API permissions > Add a permission > Microsoft Graph.
2. Select **Delegated permissions** (not Application permissions).
3. Add the permissions your app needs:

Common delegated permissions:

| Permission | What it allows |
|---|---|
| `User.Read` | Read the signed-in user's profile |
| `User.ReadBasic.All` | Read basic profiles of all users |
| `Mail.Read` | Read the user's mail |
| `Mail.Send` | Send mail as the user |
| `Calendars.ReadWrite` | Read and write the user's calendar |
| `Files.ReadWrite` | Read and write the user's OneDrive files |
| `Sites.Read.All` | Read SharePoint sites the user has access to |
| `Teams.ReadBasic.All` | Read the user's Teams memberships |

4. Click Add permissions.

### Admin Consent vs User Consent

Some permissions require admin consent (an admin must approve the permission for the whole tenant). Others allow user consent (each user can approve when they first use the app).

Permissions that access other users' data or organizational resources typically need admin consent. Permissions that access only the signed-in user's own data usually allow user consent.

Check the "Admin consent required" column in the Azure portal when adding permissions.

To grant admin consent:
1. On the API permissions page, click "Grant admin consent for [tenant name]".
2. Confirm.

## Step 3: Create a Client Secret or Certificate

### Client Secret (for web apps)

1. Go to Certificates & secrets > New client secret.
2. Add a description and set expiration.
3. Copy the value.

Store this securely. Never commit it to source control.

### Certificate (more secure alternative)

1. Generate a certificate:

```bash
# Generate a self-signed certificate for app authentication
# Valid for 1 year - rotate before expiration
openssl req -x509 -newkey rsa:2048 \
    -keyout private.pem -out certificate.pem \
    -days 365 -nodes \
    -subj "/CN=MyGraphApp"
```

2. Upload the public certificate (.cer or .pem) to the app registration under Certificates & secrets.
3. Use the private key in your application.

## Step 4: Implement the Authorization Code Flow

This is the standard OAuth 2.0 flow for web applications. Here is the implementation in Node.js using MSAL:

```javascript
// Express.js application using MSAL for Graph API authentication
// Implements the authorization code flow for delegated permissions
const express = require('express');
const msal = require('@azure/msal-node');

const app = express();

// MSAL configuration matching your app registration
const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET
    }
};

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

// The scopes your app needs - must match delegated permissions
const SCOPES = [
    'User.Read',
    'Mail.Read',
    'Calendars.ReadWrite'
];

// Step 1: Redirect user to Azure AD login page
app.get('/auth/login', async (req, res) => {
    const authUrl = await msalClient.getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri: process.env.REDIRECT_URI
    });
    res.redirect(authUrl);
});

// Step 2: Handle the callback from Azure AD
app.get('/auth/callback', async (req, res) => {
    try {
        // Exchange the authorization code for tokens
        const tokenResponse = await msalClient.acquireTokenByCode({
            code: req.query.code,
            scopes: SCOPES,
            redirectUri: process.env.REDIRECT_URI
        });

        // Store the tokens in session
        req.session.accessToken = tokenResponse.accessToken;
        req.session.userId = tokenResponse.account.homeAccountId;

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Auth callback error:', error);
        res.status(500).send('Authentication failed');
    }
});
```

## Step 5: Call Microsoft Graph API

With the access token, make Graph API calls on behalf of the user:

```javascript
// Helper function to make authenticated Graph API calls
// Uses the access token from the user's session
const { Client } = require('@microsoft/microsoft-graph-client');

function getGraphClient(accessToken) {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });
}

// Read the user's profile
app.get('/api/me', async (req, res) => {
    const client = getGraphClient(req.session.accessToken);

    try {
        // This returns only the signed-in user's profile
        // because we are using delegated permissions
        const user = await client.api('/me')
            .select('displayName,mail,jobTitle,department')
            .get();

        res.json(user);
    } catch (error) {
        if (error.statusCode === 401) {
            // Token expired - redirect to login
            res.redirect('/auth/login');
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Read the user's recent emails
app.get('/api/messages', async (req, res) => {
    const client = getGraphClient(req.session.accessToken);

    try {
        const messages = await client.api('/me/messages')
            .top(10)
            .select('subject,from,receivedDateTime,isRead')
            .orderby('receivedDateTime desc')
            .get();

        res.json(messages.value);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Read the user's calendar events for this week
app.get('/api/events', async (req, res) => {
    const client = getGraphClient(req.session.accessToken);

    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
        const events = await client.api('/me/calendarView')
            .query({
                startDateTime: now.toISOString(),
                endDateTime: weekLater.toISOString()
            })
            .select('subject,start,end,location,organizer')
            .orderby('start/dateTime')
            .top(20)
            .get();

        res.json(events.value);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send an email on behalf of the user
app.post('/api/send-mail', async (req, res) => {
    const client = getGraphClient(req.session.accessToken);

    const message = {
        message: {
            subject: req.body.subject,
            body: {
                contentType: 'Text',
                content: req.body.body
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: req.body.to
                    }
                }
            ]
        }
    };

    try {
        // This sends the email FROM the signed-in user
        await client.api('/me/sendMail').post(message);
        res.json({ status: 'Email sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Step 6: Handle Token Refresh

Access tokens expire after about 1 hour. Use the refresh token to get a new access token without making the user sign in again:

```javascript
// Middleware that checks token expiration and refreshes if needed
// MSAL handles refresh tokens internally through the token cache
async function ensureAuthenticated(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }

    try {
        // MSAL silently acquires a new token using the cached refresh token
        const account = await msalClient
            .getTokenCache()
            .getAccountByHomeId(req.session.userId);

        const tokenResponse = await msalClient.acquireTokenSilent({
            account: account,
            scopes: SCOPES
        });

        // Update the session with the fresh token
        req.session.accessToken = tokenResponse.accessToken;
        next();
    } catch (error) {
        // Silent acquisition failed - user needs to sign in again
        res.redirect('/auth/login');
    }
}

// Apply the middleware to all API routes
app.use('/api', ensureAuthenticated);
```

## Step 7: Implement Incremental Consent

Sometimes you want to start with minimal permissions and request more as the user accesses new features. This is called incremental consent.

```javascript
// Request additional permissions when the user accesses a new feature
// For example, request Mail.Send only when they try to send an email
app.get('/auth/consent-mail', async (req, res) => {
    const authUrl = await msalClient.getAuthCodeUrl({
        scopes: ['User.Read', 'Mail.Read', 'Mail.Send'],  // Add new scope
        redirectUri: process.env.REDIRECT_URI,
        // Prompt consent to request the new permission
        prompt: 'consent'
    });
    res.redirect(authUrl);
});
```

## Common Pitfalls

**Insufficient permissions error**: The app does not have the required delegated permission, or admin consent has not been granted. Check the error message - it usually tells you which permission is missing.

**Token audience mismatch**: Make sure the scopes you request match the API you are calling. For Graph API, scopes should be `https://graph.microsoft.com/.default` or specific permissions like `User.Read`.

**Consent prompt keeps appearing**: This happens when the app requests different scopes each time. Keep the scope list consistent across requests.

**Cross-tenant issues**: If your app is multi-tenant, users from other tenants need to consent. Handle the consent flow gracefully with clear messaging about what permissions the app needs.

**CORS issues in SPAs**: Single-page applications cannot securely store client secrets. Use the authorization code flow with PKCE instead of the implicit flow.

## Security Best Practices

- Always use HTTPS for redirect URIs.
- Validate the `state` parameter in the OAuth callback to prevent CSRF attacks.
- Store tokens securely (encrypted session storage, not local storage in SPAs).
- Request the minimum scopes needed for each feature.
- Implement proper session management with timeouts.
- Log all authentication events for audit purposes.

## Wrapping Up

Using Microsoft Graph API with delegated permissions through Azure AD app registrations lets your application access Microsoft 365 data on behalf of signed-in users. The setup involves registering the app, configuring delegated permissions, implementing the authorization code flow, and making Graph API calls with the user's access token. The main considerations are choosing the right permissions (user consent vs admin consent), handling token refresh, implementing incremental consent for progressive feature access, and following security best practices for token storage and session management.
