# How to Use Azure Active Directory Authentication in a React Application with MSAL.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Active Directory, React, MSAL.js, Authentication, OAuth, Security

Description: Implement Azure Active Directory authentication in a React application using MSAL.js for secure single sign-on and API access.

---

If your application serves enterprise users, chances are their organization already uses Azure Active Directory (now called Microsoft Entra ID) for identity management. Integrating with it means your users get single sign-on - they log in once with their work account and your app just works. MSAL.js (Microsoft Authentication Library) is the official library for handling this integration in JavaScript applications. It manages tokens, handles refresh logic, and supports both popup and redirect authentication flows.

This guide walks through adding Azure AD authentication to a React application using the `@azure/msal-react` library.

## Prerequisites

- Node.js 18 or later
- An Azure AD tenant (every Azure subscription comes with one)
- Access to register applications in Azure AD
- Basic React knowledge

## Registering the Application in Azure AD

Before writing any code, you need to register your application in Azure AD. This tells Azure AD about your application and what permissions it needs.

```bash
# Register a new application in Azure AD
az ad app create \
  --display-name "React MSAL Demo" \
  --web-redirect-uris "http://localhost:3000" "https://your-production-domain.com" \
  --enable-id-token-issuance true \
  --enable-access-token-issuance true

# Note the application (client) ID from the output
# Also note your tenant ID:
az account show --query tenantId --output tsv
```

You can also do this through the Azure Portal under "App registrations" in Azure Active Directory. The key values you need are:

- **Application (client) ID**: The unique identifier for your registered app
- **Directory (tenant) ID**: Your Azure AD tenant identifier
- **Redirect URIs**: Where Azure AD sends users after authentication

## Setting Up the React Project

```bash
# Create a React app with TypeScript
npx create-react-app react-msal-demo --template typescript
cd react-msal-demo

# Install MSAL libraries
npm install @azure/msal-browser @azure/msal-react
```

## Configuring MSAL

Create a configuration file for MSAL:

```typescript
// src/auth/authConfig.ts - MSAL configuration
import { Configuration, LogLevel } from '@azure/msal-browser';

// MSAL configuration object
export const msalConfig: Configuration = {
  auth: {
    // Your app's client ID from Azure AD registration
    clientId: 'YOUR_CLIENT_ID',
    // Your Azure AD tenant authority URL
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    // Where to redirect after login
    redirectUri: window.location.origin,
    // Where to redirect after logout
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    // Store tokens in localStorage for persistence across tabs
    cacheLocation: 'localStorage',
    // Set to true for IE11 compatibility
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

// Scopes to request during login
export const loginRequest = {
  scopes: ['User.Read'],
};

// Scopes for calling Microsoft Graph API
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  scopes: ['User.Read', 'Mail.Read'],
};
```

## Wrapping the Application with MSAL Provider

Update your application entry point to wrap everything in the MSAL provider:

```typescript
// src/index.tsx - Application entry point with MSAL provider
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './auth/authConfig';
import App from './App';

// Create the MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Handle redirect promise on page load
msalInstance.initialize().then(() => {
  // Set the active account after redirect
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Listen for login events to set the active account
  msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const account = (event.payload as any).account;
      msalInstance.setActiveAccount(account);
    }
  });

  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
});
```

## Building Authentication Components

Create a sign-in button component:

```typescript
// src/components/SignInButton.tsx - Sign-in button with popup/redirect option
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/authConfig';

export function SignInButton() {
  const { instance } = useMsal();

  // Handle login with popup window
  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
      // Fall back to redirect if popup is blocked
      instance.loginRedirect(loginRequest);
    }
  };

  return (
    <button onClick={handleLogin} className="btn-signin">
      Sign in with Microsoft
    </button>
  );
}
```

Create a sign-out button:

```typescript
// src/components/SignOutButton.tsx - Sign-out button
import { useMsal } from '@azure/msal-react';

export function SignOutButton() {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutPopup({
      // Return to the home page after logout
      postLogoutRedirectUri: '/',
    });
  };

  return (
    <button onClick={handleLogout} className="btn-signout">
      Sign out
    </button>
  );
}
```

## Using Authentication State

The `@azure/msal-react` library provides components and hooks for conditional rendering based on authentication state:

```typescript
// src/App.tsx - Main application with auth-aware rendering
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { SignInButton } from './components/SignInButton';
import { SignOutButton } from './components/SignOutButton';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  const { accounts } = useMsal();

  return (
    <div className="app">
      <header>
        <h1>React MSAL Demo</h1>
        <nav>
          {/* Show sign-in button only when not authenticated */}
          <UnauthenticatedTemplate>
            <SignInButton />
          </UnauthenticatedTemplate>

          {/* Show user info and sign-out when authenticated */}
          <AuthenticatedTemplate>
            <span>Welcome, {accounts[0]?.name}</span>
            <SignOutButton />
          </AuthenticatedTemplate>
        </nav>
      </header>

      <main>
        <UnauthenticatedTemplate>
          <div className="landing">
            <h2>Welcome</h2>
            <p>Please sign in with your Microsoft account to continue.</p>
            <SignInButton />
          </div>
        </UnauthenticatedTemplate>

        <AuthenticatedTemplate>
          <ProfilePage />
        </AuthenticatedTemplate>
      </main>
    </div>
  );
}

export default App;
```

## Calling Microsoft Graph API

Once authenticated, you can call APIs on behalf of the user. Here is how to call Microsoft Graph to get the user profile:

```typescript
// src/services/graphService.ts - Microsoft Graph API calls
import { AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
import { graphConfig } from '../auth/authConfig';

// Fetch user profile from Microsoft Graph
export async function getGraphProfile(
  instance: any,
  account: AccountInfo
): Promise<any> {
  // Silently acquire a token for Graph API
  const tokenResponse = await instance.acquireTokenSilent({
    scopes: graphConfig.scopes,
    account: account,
  }).catch(async (error: any) => {
    // If silent acquisition fails, fall back to interactive
    if (error instanceof InteractionRequiredAuthError) {
      return instance.acquireTokenPopup({
        scopes: graphConfig.scopes,
      });
    }
    throw error;
  });

  // Call the Graph API with the access token
  const response = await fetch(graphConfig.graphMeEndpoint, {
    headers: {
      Authorization: `Bearer ${tokenResponse.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API call failed: ${response.status}`);
  }

  return response.json();
}
```

Build a profile page that displays the Graph data:

```typescript
// src/pages/ProfilePage.tsx - User profile from Microsoft Graph
import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { getGraphProfile } from '../services/graphService';

interface GraphProfile {
  displayName: string;
  mail: string;
  jobTitle: string;
  officeLocation: string;
  businessPhones: string[];
}

export function ProfilePage() {
  const { instance, accounts } = useMsal();
  const [profile, setProfile] = useState<GraphProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accounts[0]) {
      getGraphProfile(instance, accounts[0])
        .then(setProfile)
        .catch((err) => console.error('Failed to load profile:', err))
        .finally(() => setLoading(false));
    }
  }, [instance, accounts]);

  if (loading) return <div>Loading profile...</div>;
  if (!profile) return <div>Failed to load profile</div>;

  return (
    <div className="profile">
      <h2>{profile.displayName}</h2>
      <div className="profile-details">
        <p><strong>Email:</strong> {profile.mail}</p>
        <p><strong>Job Title:</strong> {profile.jobTitle || 'Not set'}</p>
        <p><strong>Office:</strong> {profile.officeLocation || 'Not set'}</p>
        <p><strong>Phone:</strong> {profile.businessPhones?.[0] || 'Not set'}</p>
      </div>
    </div>
  );
}
```

## Protecting API Calls

When calling your own backend API, include the access token in the request:

```typescript
// src/services/apiService.ts - Authenticated API calls
import { useMsal } from '@azure/msal-react';

// Custom hook for making authenticated API calls
export function useAuthenticatedFetch() {
  const { instance, accounts } = useMsal();

  async function authFetch(url: string, options: RequestInit = {}) {
    // Get a token for your backend API
    const tokenResponse = await instance.acquireTokenSilent({
      scopes: ['api://YOUR_API_CLIENT_ID/.default'],
      account: accounts[0],
    });

    // Add the token to the request headers
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${tokenResponse.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  return authFetch;
}
```

## Wrapping Up

MSAL.js and the `@azure/msal-react` wrapper make Azure AD authentication in React straightforward. The library handles token acquisition, caching, refresh, and the OAuth flow complexity. The `AuthenticatedTemplate` and `UnauthenticatedTemplate` components make conditional rendering clean, and the `useMsal` hook gives you direct access to accounts and the MSAL instance when you need more control. For enterprise applications where users already have Microsoft accounts, this is the right way to handle authentication - it gives users single sign-on and gives you a proven identity platform without building auth from scratch.
