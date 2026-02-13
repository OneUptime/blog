# How to Use Amplify Authentication with Cognito

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amplify, Cognito, Authentication, React

Description: Learn how to implement authentication in your application using AWS Amplify's Auth module with Cognito, covering sign-up, sign-in, social login, MFA, and custom UI components.

---

Amplify's Auth module is a higher-level wrapper around Cognito that simplifies common authentication tasks. Instead of working with the Cognito SDK directly - managing token refresh, handling challenge flows, and dealing with JWKS validation - you get clean, promise-based APIs that handle the complexity for you.

If you've set up Cognito the manual way before (and dealt with all the token management headaches), Amplify Auth will feel like a breath of fresh air. Let's implement a complete auth system.

## Setting Up Auth

First, add authentication to your Amplify project.

Configure auth with the CLI:

```bash
amplify add auth

# Choose the configuration:
# ? Default configuration vs Manual? Default configuration
# ? How do you want users to sign in? Email
# ? Do you want to configure advanced settings? Yes
# ? What attributes are required for signing up? Email, Name
# ? Do you want to enable any of the following capabilities? (none for now)

amplify push
```

Install the client libraries:

```bash
npm install aws-amplify
```

Configure Amplify in your app entry point:

```javascript
// src/main.js or src/index.js
import { Amplify } from 'aws-amplify';
import config from './amplifyconfiguration.json';

Amplify.configure(config);
```

## Sign Up

The sign-up flow creates a new user and sends a verification code.

Here's how to implement sign-up:

```javascript
import { signUp, confirmSignUp, autoSignIn } from 'aws-amplify/auth';

async function handleSignUp(email, password, name) {
    try {
        const { isSignUpComplete, userId, nextStep } = await signUp({
            username: email,
            password,
            options: {
                userAttributes: {
                    email,
                    name,
                },
                // Auto sign-in after confirmation
                autoSignIn: true,
            },
        });

        console.log('Sign up result:', { isSignUpComplete, userId, nextStep });

        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
            // User needs to verify their email
            return { requiresConfirmation: true, userId };
        }

        return { requiresConfirmation: false, userId };
    } catch (error) {
        if (error.name === 'UsernameExistsException') {
            throw new Error('An account with this email already exists');
        }
        throw error;
    }
}

async function handleConfirmSignUp(email, code) {
    try {
        const { isSignUpComplete } = await confirmSignUp({
            username: email,
            confirmationCode: code,
        });

        if (isSignUpComplete) {
            // If autoSignIn was enabled, call autoSignIn
            const signInResult = await autoSignIn();
            console.log('Auto sign-in complete:', signInResult);
        }

        return isSignUpComplete;
    } catch (error) {
        if (error.name === 'CodeMismatchException') {
            throw new Error('Invalid verification code');
        }
        if (error.name === 'ExpiredCodeException') {
            throw new Error('Verification code has expired. Please request a new one.');
        }
        throw error;
    }
}
```

## Sign In

Amplify handles the entire sign-in flow including SRP, challenge responses, and token management.

Implement sign-in:

```javascript
import { signIn, confirmSignIn } from 'aws-amplify/auth';

async function handleSignIn(email, password) {
    try {
        const { isSignedIn, nextStep } = await signIn({
            username: email,
            password,
        });

        if (isSignedIn) {
            console.log('Signed in successfully');
            return { success: true };
        }

        // Handle additional challenges
        switch (nextStep.signInStep) {
            case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
                return { challenge: 'TOTP', message: 'Enter your authenticator code' };

            case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
                return { challenge: 'SMS', message: 'Enter the code sent to your phone' };

            case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
                return { challenge: 'NEW_PASSWORD', message: 'Please set a new password' };

            case 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE':
                return { challenge: 'CUSTOM', message: 'Complete the custom challenge' };

            default:
                throw new Error(`Unexpected sign-in step: ${nextStep.signInStep}`);
        }
    } catch (error) {
        if (error.name === 'NotAuthorizedException') {
            throw new Error('Incorrect email or password');
        }
        if (error.name === 'UserNotConfirmedException') {
            throw new Error('Please verify your email first');
        }
        throw error;
    }
}

// Handle MFA challenge response
async function handleMFAChallenge(code) {
    try {
        const { isSignedIn } = await confirmSignIn({
            challengeResponse: code,
        });
        return isSignedIn;
    } catch (error) {
        if (error.name === 'CodeMismatchException') {
            throw new Error('Invalid code. Please try again.');
        }
        throw error;
    }
}
```

## Session Management

Amplify manages tokens automatically - you don't need to handle refresh tokens yourself.

Work with the current session:

```javascript
import {
    getCurrentUser,
    fetchAuthSession,
    fetchUserAttributes,
    signOut,
} from 'aws-amplify/auth';

// Get the current authenticated user
async function getUser() {
    try {
        const user = await getCurrentUser();
        return {
            userId: user.userId,
            username: user.username,
            signInDetails: user.signInDetails,
        };
    } catch {
        return null; // Not authenticated
    }
}

// Get the JWT tokens (automatically refreshed if expired)
async function getTokens() {
    const session = await fetchAuthSession();
    return {
        idToken: session.tokens?.idToken?.toString(),
        accessToken: session.tokens?.accessToken?.toString(),
    };
}

// Get user attributes
async function getUserAttributes() {
    const attributes = await fetchUserAttributes();
    return {
        email: attributes.email,
        name: attributes.name,
        sub: attributes.sub,
    };
}

// Sign out
async function handleSignOut(global = false) {
    await signOut({ global }); // global: true signs out from all devices
}
```

## Using the Pre-Built Authenticator Component

Amplify provides a drop-in UI component that handles the entire auth flow.

Use the Authenticator component in React:

```jsx
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

function App() {
    return (
        <Authenticator
            signUpAttributes={['email', 'name']}
            loginMechanisms={['email']}
            formFields={{
                signUp: {
                    name: {
                        order: 1,
                        placeholder: 'Enter your full name',
                        label: 'Full Name',
                        isRequired: true,
                    },
                    email: {
                        order: 2,
                    },
                    password: {
                        order: 3,
                    },
                    confirm_password: {
                        order: 4,
                    },
                },
            }}
        >
            {({ signOut, user }) => (
                <main>
                    <h1>Welcome, {user?.signInDetails?.loginId}</h1>
                    <button onClick={signOut}>Sign Out</button>
                </main>
            )}
        </Authenticator>
    );
}

export default App;
```

## Social Sign-In

Amplify supports social login providers. Add them to your auth configuration.

Configure social providers:

```bash
amplify update auth

# Select: Apply head-to-head changes
# Add social providers: Google, Facebook, Apple
# Provide OAuth credentials for each provider
amplify push
```

Use social sign-in in your app:

```javascript
import { signInWithRedirect } from 'aws-amplify/auth';

// Sign in with Google
async function signInWithGoogle() {
    await signInWithRedirect({
        provider: 'Google',
    });
}

// Sign in with Facebook
async function signInWithFacebook() {
    await signInWithRedirect({
        provider: 'Facebook',
    });
}

// Sign in with Apple
async function signInWithApple() {
    await signInWithRedirect({
        provider: 'Apple',
    });
}
```

## Setting Up TOTP MFA

Enable time-based one-time password MFA:

```javascript
import { setUpTOTP, verifyTOTPSetup, updateMFAPreference } from 'aws-amplify/auth';

// Set up TOTP for the current user
async function setupMFA() {
    const totpSetup = await setUpTOTP();

    // Get the QR code URI for authenticator apps
    const qrCodeUri = totpSetup.getSetupUri('MyApp');
    console.log('Scan this QR code:', qrCodeUri.toString());

    return qrCodeUri;
}

// Verify the TOTP setup with a code from the authenticator app
async function verifyMFA(code) {
    await verifyTOTPSetup({ code });

    // Enable TOTP as preferred MFA method
    await updateMFAPreference({
        totp: 'PREFERRED',
    });

    console.log('MFA enabled successfully');
}
```

## React Auth Context

Build a React context for app-wide auth state:

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, fetchUserAttributes, Hub } from 'aws-amplify/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function checkUser() {
        try {
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();
            setUser({ ...currentUser, attributes });
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        checkUser();

        // Listen for auth events
        const hubListener = Hub.listen('auth', ({ payload }) => {
            switch (payload.event) {
                case 'signedIn':
                    checkUser();
                    break;
                case 'signedOut':
                    setUser(null);
                    break;
                case 'tokenRefresh':
                    console.log('Tokens refreshed');
                    break;
                case 'tokenRefresh_failure':
                    console.error('Token refresh failed');
                    setUser(null);
                    break;
            }
        });

        return () => hubListener();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser: checkUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
```

For framework-specific implementations, see [Cognito authentication in Next.js](https://oneuptime.com/blog/post/2026-02-12-cognito-authentication-nextjs/view), [in Angular](https://oneuptime.com/blog/post/2026-02-12-cognito-authentication-angular/view), or [in Vue.js](https://oneuptime.com/blog/post/2026-02-12-cognito-authentication-vuejs/view).

## Wrapping Up

Amplify Auth abstracts away the complexity of Cognito while keeping you in control. Token refresh, challenge flows, social login, and MFA all work through clean APIs. The pre-built Authenticator component saves you from building sign-up/sign-in UI from scratch, and the Hub event system keeps your app state in sync with auth changes. Start with the Authenticator component for rapid prototyping, then switch to the lower-level APIs when you need custom UI or behavior.
