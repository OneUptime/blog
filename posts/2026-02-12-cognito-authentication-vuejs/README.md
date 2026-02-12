# How to Implement Cognito Authentication in Vue.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Vue.js, Authentication

Description: A practical guide to implementing AWS Cognito authentication in a Vue.js 3 application using the Composition API, Pinia for state management, and Vue Router for protected routes.

---

Vue.js 3 with the Composition API makes building a Cognito auth integration straightforward. Composables handle the auth logic, Pinia stores manage token state, and Vue Router navigation guards protect routes. Let's build a complete authentication system that covers sign-up, sign-in, token refresh, and role-based access.

## Project Setup

Start with a new Vue project and install what you need.

Create the project and install dependencies:

```bash
npm create vue@latest cognito-vue-app -- --typescript --router --pinia
cd cognito-vue-app

# Install Cognito SDK and JWT decoder
npm install @aws-sdk/client-cognito-identity-provider jwt-decode
```

Create a config file for your Cognito settings:

```typescript
// src/config/cognito.ts
export const cognitoConfig = {
    region: 'us-east-1',
    userPoolId: 'us-east-1_XXXXXXXXX',
    clientId: 'your-app-client-id'
};
```

## Auth Store with Pinia

Pinia is the recommended state management for Vue 3. It's a natural fit for auth state.

Here's the auth store:

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    SignUpCommand,
    ConfirmSignUpCommand,
    GlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { jwtDecode } from 'jwt-decode';
import { cognitoConfig } from '@/config/cognito';

export interface AuthUser {
    sub: string;
    email: string;
    name: string;
    groups: string[];
}

interface StoredTokens {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export const useAuthStore = defineStore('auth', () => {
    const client = new CognitoIdentityProviderClient({
        region: cognitoConfig.region
    });

    // State
    const user = ref<AuthUser | null>(null);
    const isLoading = ref(true);

    // Getters
    const isAuthenticated = computed(() => user.value !== null);
    const userGroups = computed(() => user.value?.groups || []);
    const isAdmin = computed(() => userGroups.value.includes('Admins'));

    // Token management
    function storeTokens(tokens: StoredTokens) {
        localStorage.setItem('cognito_tokens', JSON.stringify(tokens));
    }

    function getStoredTokens(): StoredTokens | null {
        const raw = localStorage.getItem('cognito_tokens');
        return raw ? JSON.parse(raw) : null;
    }

    function clearTokens() {
        localStorage.removeItem('cognito_tokens');
        user.value = null;
    }

    function parseUserFromToken(idToken: string): AuthUser | null {
        try {
            const decoded: any = jwtDecode(idToken);
            return {
                sub: decoded.sub,
                email: decoded.email,
                name: decoded.name || decoded['cognito:username'],
                groups: decoded['cognito:groups'] || []
            };
        } catch {
            return null;
        }
    }

    // Actions
    async function signUp(email: string, password: string, name: string) {
        await client.send(new SignUpCommand({
            ClientId: cognitoConfig.clientId,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'name', Value: name }
            ]
        }));
    }

    async function confirmSignUp(email: string, code: string) {
        await client.send(new ConfirmSignUpCommand({
            ClientId: cognitoConfig.clientId,
            Username: email,
            ConfirmationCode: code
        }));
    }

    async function signIn(email: string, password: string) {
        const response = await client.send(new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: cognitoConfig.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        }));

        const result = response.AuthenticationResult;
        if (!result?.IdToken || !result?.AccessToken || !result?.RefreshToken) {
            throw new Error('Authentication incomplete');
        }

        const tokens: StoredTokens = {
            idToken: result.IdToken,
            accessToken: result.AccessToken,
            refreshToken: result.RefreshToken,
            expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000
        };

        storeTokens(tokens);
        user.value = parseUserFromToken(tokens.idToken);
    }

    async function signOut() {
        const tokens = getStoredTokens();
        if (tokens?.accessToken) {
            try {
                await client.send(new GlobalSignOutCommand({
                    AccessToken: tokens.accessToken
                }));
            } catch {
                // Continue with local sign out
            }
        }
        clearTokens();
    }

    async function refreshSession(): Promise<string | null> {
        const tokens = getStoredTokens();
        if (!tokens?.refreshToken) return null;

        try {
            const response = await client.send(new InitiateAuthCommand({
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                ClientId: cognitoConfig.clientId,
                AuthParameters: {
                    REFRESH_TOKEN: tokens.refreshToken
                }
            }));

            const result = response.AuthenticationResult;
            if (result?.IdToken && result?.AccessToken) {
                const updated: StoredTokens = {
                    ...tokens,
                    idToken: result.IdToken,
                    accessToken: result.AccessToken,
                    expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000
                };
                storeTokens(updated);
                user.value = parseUserFromToken(updated.idToken);
                return updated.accessToken;
            }
        } catch {
            clearTokens();
        }
        return null;
    }

    function getAccessToken(): string | null {
        const tokens = getStoredTokens();
        if (!tokens) return null;

        if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
            refreshSession();
        }
        return tokens.accessToken;
    }

    // Initialize - check for stored session
    function init() {
        const tokens = getStoredTokens();
        if (tokens?.idToken) {
            const decoded: any = jwtDecode(tokens.idToken);
            if (decoded.exp * 1000 > Date.now()) {
                user.value = parseUserFromToken(tokens.idToken);
            } else if (tokens.refreshToken) {
                refreshSession();
            }
        }
        isLoading.value = false;
    }

    return {
        user,
        isLoading,
        isAuthenticated,
        userGroups,
        isAdmin,
        signUp,
        confirmSignUp,
        signIn,
        signOut,
        refreshSession,
        getAccessToken,
        init
    };
});
```

Initialize the store in your main app:

```typescript
// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Initialize auth state before mounting
const authStore = useAuthStore();
authStore.init();

app.mount('#app');
```

## Router Guards

Set up navigation guards to protect routes:

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: () => import('@/views/LoginView.vue'),
            meta: { requiresGuest: true }
        },
        {
            path: '/register',
            name: 'Register',
            component: () => import('@/views/RegisterView.vue'),
            meta: { requiresGuest: true }
        },
        {
            path: '/dashboard',
            name: 'Dashboard',
            component: () => import('@/views/DashboardView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/admin',
            name: 'Admin',
            component: () => import('@/views/AdminView.vue'),
            meta: { requiresAuth: true, requiredGroup: 'Admins' }
        }
    ]
});

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next({ name: 'Login', query: { redirect: to.fullPath } });
    } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
        next({ name: 'Dashboard' });
    } else if (to.meta.requiredGroup) {
        const required = to.meta.requiredGroup as string;
        if (!authStore.userGroups.includes(required)) {
            next({ name: 'Dashboard' });
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;
```

## Login View

Here's the login page using the Composition API:

```vue
<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
    loading.value = true;
    error.value = '';

    try {
        await authStore.signIn(email.value, password.value);
        const redirect = (route.query.redirect as string) || '/dashboard';
        router.push(redirect);
    } catch (err: any) {
        error.value = err.message || 'Login failed. Please try again.';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="login-page">
        <h1>Sign In</h1>
        <div v-if="error" class="error-message">{{ error }}</div>
        <form @submit.prevent="handleLogin">
            <div class="form-group">
                <label for="email">Email</label>
                <input id="email" v-model="email" type="email" required
                       placeholder="your@email.com" />
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input id="password" v-model="password" type="password"
                       required placeholder="Your password" />
            </div>
            <button type="submit" :disabled="loading">
                {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
        </form>
        <p>Need an account? <router-link to="/register">Register</router-link></p>
    </div>
</template>
```

## Axios Interceptor Composable

Create a composable that configures Axios with automatic token attachment:

```typescript
// src/composables/useApi.ts
import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

export function useApi(): AxiosInstance {
    const authStore = useAuthStore();
    const router = useRouter();

    const api = axios.create({
        baseURL: import.meta.env.VITE_API_URL
    });

    // Attach token to requests
    api.interceptors.request.use((config) => {
        const token = authStore.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // Handle 401 responses
    api.interceptors.response.use(
        (response) => response,
        async (error) => {
            if (error.response?.status === 401 && !error.config._retry) {
                error.config._retry = true;
                const newToken = await authStore.refreshSession();
                if (newToken) {
                    error.config.headers.Authorization = `Bearer ${newToken}`;
                    return api(error.config);
                }
                router.push('/login');
            }
            return Promise.reject(error);
        }
    );

    return api;
}
```

For more on how Cognito tokens work and how to validate them on the server side, see [decoding and validating Cognito JWT tokens](https://oneuptime.com/blog/post/decode-validate-cognito-jwt-tokens/view). If you prefer a higher-level abstraction, check out [using Amplify Authentication with Cognito](https://oneuptime.com/blog/post/amplify-authentication-cognito/view).

## Wrapping Up

Vue 3's Composition API and Pinia make Cognito integration clean and maintainable. The Pinia store acts as your single source of truth for auth state, computed properties derive authentication status, and router guards enforce access control declaratively. The reactive nature of Vue means your UI updates automatically when auth state changes - no manual subscriptions needed. Start with the basic sign-in/sign-up flow, then layer in token refresh and role-based access as your app grows.
