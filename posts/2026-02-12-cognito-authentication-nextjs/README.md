# How to Implement Cognito Authentication in Next.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Next.js, Authentication, React

Description: A step-by-step guide to implementing AWS Cognito authentication in a Next.js application with sign-up, sign-in, token management, and protected routes using both client and server components.

---

Next.js is a popular choice for full-stack React applications, and pairing it with Cognito for authentication makes sense if you're already in the AWS ecosystem. But Next.js has some unique challenges - server-side rendering, API routes, middleware, and the App Router all need different approaches to authentication. Let's build a complete Cognito auth integration that handles all of these.

## Project Setup

Start with a Next.js project and install the AWS SDK packages you'll need.

Install the required dependencies:

```bash
npx create-next-app@latest my-cognito-app --typescript --app
cd my-cognito-app

# Install Cognito client SDK
npm install @aws-sdk/client-cognito-identity-provider

# Install JWT verification for server-side
npm install jsonwebtoken jwks-rsa

# Install cookies library for token storage
npm install cookies-next
```

Set up your environment variables:

```bash
# .env.local
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-app-client-id
COGNITO_REGION=us-east-1
```

## Cognito Auth Service

Create a service that wraps the Cognito SDK calls. This keeps auth logic in one place.

Here's the auth service with sign-up, sign-in, and token refresh:

```typescript
// lib/cognito.ts
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    SignUpCommand,
    ConfirmSignUpCommand,
    GlobalSignOutCommand,
    GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION || 'us-east-1',
});

const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

export async function signUp(email: string, password: string, name: string) {
    const response = await client.send(new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name },
        ],
    }));

    return response;
}

export async function confirmSignUp(email: string, code: string) {
    return client.send(new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
    }));
}

export async function signIn(email: string, password: string) {
    const response = await client.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    }));

    return {
        idToken: response.AuthenticationResult?.IdToken,
        accessToken: response.AuthenticationResult?.AccessToken,
        refreshToken: response.AuthenticationResult?.RefreshToken,
        expiresIn: response.AuthenticationResult?.ExpiresIn,
    };
}

export async function refreshTokens(refreshToken: string) {
    const response = await client.send(new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
            REFRESH_TOKEN: refreshToken,
        },
    }));

    return {
        idToken: response.AuthenticationResult?.IdToken,
        accessToken: response.AuthenticationResult?.AccessToken,
        expiresIn: response.AuthenticationResult?.ExpiresIn,
    };
}

export async function signOut(accessToken: string) {
    return client.send(new GlobalSignOutCommand({
        AccessToken: accessToken,
    }));
}
```

## Token Storage with HTTP-Only Cookies

For Next.js, storing tokens in HTTP-only cookies is the most secure approach. It works with both server components and API routes.

Create a token management utility:

```typescript
// lib/auth-cookies.ts
import { cookies } from 'next/headers';

const TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
};

export function setAuthCookies(tokens: {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
}) {
    const cookieStore = cookies();

    if (tokens.idToken) {
        cookieStore.set('id_token', tokens.idToken, {
            ...TOKEN_COOKIE_OPTIONS,
            maxAge: tokens.expiresIn || 3600,
        });
    }

    if (tokens.accessToken) {
        cookieStore.set('access_token', tokens.accessToken, {
            ...TOKEN_COOKIE_OPTIONS,
            maxAge: tokens.expiresIn || 3600,
        });
    }

    if (tokens.refreshToken) {
        cookieStore.set('refresh_token', tokens.refreshToken, {
            ...TOKEN_COOKIE_OPTIONS,
            maxAge: 30 * 24 * 3600, // 30 days
        });
    }
}

export function getAuthCookies() {
    const cookieStore = cookies();
    return {
        idToken: cookieStore.get('id_token')?.value,
        accessToken: cookieStore.get('access_token')?.value,
        refreshToken: cookieStore.get('refresh_token')?.value,
    };
}

export function clearAuthCookies() {
    const cookieStore = cookies();
    cookieStore.delete('id_token');
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
}
```

## Server Actions for Auth

Next.js Server Actions let you handle authentication without separate API routes.

Create server actions for sign-in and sign-up:

```typescript
// app/actions/auth.ts
'use server';

import { signIn, signUp, confirmSignUp, signOut } from '@/lib/cognito';
import { setAuthCookies, clearAuthCookies, getAuthCookies } from '@/lib/auth-cookies';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        const tokens = await signIn(email, password);
        setAuthCookies(tokens);
    } catch (error: any) {
        return { error: error.message || 'Login failed' };
    }

    redirect('/dashboard');
}

export async function registerAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    try {
        await signUp(email, password, name);
        return { success: true, message: 'Check your email for a verification code' };
    } catch (error: any) {
        return { error: error.message || 'Registration failed' };
    }
}

export async function confirmAction(formData: FormData) {
    const email = formData.get('email') as string;
    const code = formData.get('code') as string;

    try {
        await confirmSignUp(email, code);
    } catch (error: any) {
        return { error: error.message || 'Confirmation failed' };
    }

    redirect('/login');
}

export async function logoutAction() {
    const { accessToken } = getAuthCookies();
    if (accessToken) {
        try {
            await signOut(accessToken);
        } catch (e) {
            // Continue with local logout even if global signout fails
        }
    }
    clearAuthCookies();
    redirect('/login');
}
```

## Login Page Component

Here's a login form that uses the server action:

```tsx
// app/login/page.tsx
'use client';

import { loginAction } from '@/app/actions/auth';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending}>
            {pending ? 'Signing in...' : 'Sign In'}
        </button>
    );
}

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        const result = await loginAction(formData);
        if (result?.error) {
            setError(result.error);
        }
    }

    return (
        <div>
            <h1>Sign In</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form action={handleSubmit}>
                <input name="email" type="email" placeholder="Email" required />
                <input name="password" type="password" placeholder="Password" required />
                <SubmitButton />
            </form>
            <p>
                Don't have an account? <a href="/register">Sign up</a>
            </p>
        </div>
    );
}
```

## Middleware for Route Protection

Next.js middleware runs before every request and is perfect for protecting routes.

Create middleware that checks authentication and refreshes tokens:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/profile', '/settings'];
const AUTH_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;

    const isProtectedPath = PROTECTED_PATHS.some(p => pathname.startsWith(p));
    const isAuthPath = AUTH_PATHS.some(p => pathname.startsWith(p));

    // If accessing a protected route without tokens, redirect to login
    if (isProtectedPath && !accessToken && !refreshToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If accessing login/register while already authenticated, redirect to dashboard
    if (isAuthPath && accessToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*', '/login', '/register'],
};
```

## Server-Side User Data

In server components, you can read the token from cookies and decode user information.

Here's a helper to get the current user in server components:

```typescript
// lib/get-user.ts
import { getAuthCookies } from './auth-cookies';
import jwt from 'jsonwebtoken';

export interface CognitoUser {
    sub: string;
    email: string;
    name: string;
    groups: string[];
}

export function getCurrentUser(): CognitoUser | null {
    const { idToken } = getAuthCookies();
    if (!idToken) return null;

    try {
        // Decode without verification for server components
        // The middleware and API routes handle full verification
        const decoded = jwt.decode(idToken) as any;

        if (!decoded || decoded.exp * 1000 < Date.now()) {
            return null;
        }

        return {
            sub: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded['cognito:username'],
            groups: decoded['cognito:groups'] || [],
        };
    } catch {
        return null;
    }
}
```

Use it in a server component:

```tsx
// app/dashboard/page.tsx
import { getCurrentUser } from '@/lib/get-user';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';

export default function DashboardPage() {
    const user = getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome, {user.name}!</p>
            <p>Email: {user.email}</p>
            {user.groups.includes('Admins') && (
                <div>
                    <h2>Admin Panel</h2>
                    <p>You have admin access.</p>
                </div>
            )}
            <form action={logoutAction}>
                <button type="submit">Sign Out</button>
            </form>
        </div>
    );
}
```

For more details on JWT validation, see [decoding and validating Cognito JWT tokens](https://oneuptime.com/blog/post/decode-validate-cognito-jwt-tokens/view). And for a deployment approach using Amplify Hosting, check out [setting up Amplify Hosting for a Next.js app](https://oneuptime.com/blog/post/amplify-hosting-nextjs-app/view).

## Wrapping Up

Integrating Cognito with Next.js requires handling both client-side and server-side concerns. The approach we've built here uses HTTP-only cookies for secure token storage, Server Actions for authentication flows, and middleware for route protection. This gives you a solid foundation that works with server components, client components, and API routes alike. From here, you can add features like social login, forgot password flows, and more granular role-based access using Cognito groups.
