# How to Handle IPv6 in OAuth2 Redirect URIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OAuth2, IPv6, Security, Authentication, Authorization

Description: Configure OAuth2 redirect URIs with IPv6 addresses, handle IP-literal URIs in authorization servers, and troubleshoot common IPv6 URI issues.

## IPv6 in OAuth2 Redirect URIs

OAuth2 redirect URIs with IPv6 addresses follow RFC 3986 URI syntax, requiring brackets around the IPv6 address:

```text
http://[::1]:8080/callback
https://[2001:db8::1]:8443/auth/callback
```

## Registering IPv6 Redirect URIs in Common Providers

### Keycloak

```bash
# Register a client with IPv6 redirect URI in Keycloak

curl -X POST \
  http://[keycloak-ip]:8080/admin/realms/myrealm/clients \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "myapp",
    "redirectUris": [
      "http://[::1]:3000/callback",
      "https://[2001:db8::1]:3000/callback",
      "https://app.example.com/callback"
    ],
    "webOrigins": [
      "http://[::1]:3000",
      "https://[2001:db8::1]:3000"
    ]
  }'
```

### Auth0

```json
// Auth0 Application Settings (Dashboard)
{
  "allowed_callback_urls": [
    "http://[::1]:3000/callback",
    "https://myapp.example.com/callback"
  ],
  "allowed_origins": [
    "http://[::1]:3000"
  ]
}
```

## Node.js OAuth2 Client with IPv6

```javascript
// oauth2-client.js
const { Issuer, generators } = require('openid-client');

async function setupOAuth2Client() {
    // Discover OAuth2/OIDC provider (can be over IPv6)
    const issuer = await Issuer.discover('https://[2001:db8::1]:8080/realms/myrealm');

    const client = new issuer.Client({
        client_id: 'myapp',
        client_secret: 'mysecret',
        redirect_uris: ['http://[::1]:3000/callback'],
        response_types: ['code'],
    });

    return client;
}

// Express callback handler
const express = require('express');
const app = express();

app.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    // Validate redirect URI - must exactly match registered URI
    // IPv6 URIs must include brackets
    const callbackUrl = `http://[${req.socket.localAddress}]:3000/callback`;

    try {
        const tokenSet = await client.callback(callbackUrl, { code, state });
        res.json({ access_token: tokenSet.access_token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, '::', () => {
    console.log('OAuth2 callback server on [::]:3000');
});
```

## Handling IPv6 in Authorization Requests

```python
# oauth2_ipv6.py
from authlib.integrations.flask_client import OAuth
from flask import Flask, redirect, request, session

app = Flask(__name__)
oauth = OAuth(app)

# Configure OAuth2 client
oauth.register(
    name='provider',
    client_id='myapp',
    client_secret='secret',
    # Provider endpoint over IPv6
    access_token_url='https://[2001:db8::1]:8080/token',
    authorize_url='https://[2001:db8::1]:8080/authorize',
    # Redirect URI with IPv6
    redirect_uri='http://[::1]:5000/callback',
    client_kwargs={'scope': 'openid profile email'},
)

@app.route('/login')
def login():
    # Generate the authorization URL with IPv6 redirect URI
    return oauth.provider.authorize_redirect(
        redirect_uri='http://[::1]:5000/callback'
    )

@app.route('/callback')
def callback():
    token = oauth.provider.authorize_access_token()
    return str(token)

if __name__ == '__main__':
    # Run on IPv6
    app.run(host='::', port=5000)
```

## Common IPv6 OAuth2 Issues

```bash
# Issue 1: Redirect URI mismatch
# Error: "redirect_uri_mismatch"
# Cause: Registered http://[::1]:3000/callback but sending http://localhost:3000/callback
# Fix: Use consistent IPv6 URI format

# Issue 2: Invalid redirect URI
# Error: "invalid_request"
# Cause: IPv6 address without brackets in URI
# Wrong: http://::1:3000/callback
# Correct: http://[::1]:3000/callback

# Issue 3: CORS issue with IPv6
# Error: "CORS error" in browser
# Fix: Register IPv6 origin in provider's allowed origins list
# e.g., http://[::1]:3000
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your OAuth2 authorization server's availability over IPv6. Configure HTTP monitors to check the discovery endpoint (`/.well-known/openid-configuration`) from IPv6 addresses.

## Conclusion

OAuth2 redirect URIs with IPv6 addresses require square brackets around the address. Register exact IPv6 URIs in your authorization server, and ensure your OAuth2 client uses the same bracketed format when redirecting. Use the same URI consistently throughout the authorization flow.
