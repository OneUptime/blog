# How to Implement Cognito Authentication in Angular

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Angular, Authentication

Description: A complete guide to implementing AWS Cognito authentication in an Angular application with services, guards, interceptors, and reactive state management.

---

Angular's opinionated structure actually makes Cognito integration cleaner than in most frameworks. Services handle the auth logic, guards protect routes, interceptors attach tokens to HTTP requests, and observables manage auth state reactively. Let's put all those pieces together into a working Cognito auth system.

## Setting Up the Project

Start with a new Angular project and install the necessary packages.

Install dependencies:

```bash
ng new cognito-angular-app --routing --style=scss
cd cognito-angular-app

# Install the AWS Cognito SDK
npm install @aws-sdk/client-cognito-identity-provider

# Install jwt-decode for reading token claims
npm install jwt-decode
```

Create an environment configuration for your Cognito settings:

```typescript
// src/environments/environment.ts
export const environment = {
    production: false,
    cognito: {
        region: 'us-east-1',
        userPoolId: 'us-east-1_XXXXXXXXX',
        clientId: 'your-app-client-id'
    }
};
```

## Auth Service

The auth service is the core of the integration. It wraps Cognito SDK calls and manages token state.

Here's the complete auth service:

```typescript
// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    SignUpCommand,
    ConfirmSignUpCommand,
    GlobalSignOutCommand,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

export interface AuthUser {
    sub: string;
    email: string;
    name: string;
    groups: string[];
}

interface AuthTokens {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private client: CognitoIdentityProviderClient;
    private userSubject = new BehaviorSubject<AuthUser | null>(null);
    private loadingSubject = new BehaviorSubject<boolean>(true);

    user$: Observable<AuthUser | null> = this.userSubject.asObservable();
    isLoading$: Observable<boolean> = this.loadingSubject.asObservable();

    constructor() {
        this.client = new CognitoIdentityProviderClient({
            region: environment.cognito.region
        });
        this.loadStoredSession();
    }

    get isAuthenticated(): boolean {
        return this.userSubject.value !== null;
    }

    get currentUser(): AuthUser | null {
        return this.userSubject.value;
    }

    async signUp(email: string, password: string, name: string): Promise<void> {
        await this.client.send(new SignUpCommand({
            ClientId: environment.cognito.clientId,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'name', Value: name }
            ]
        }));
    }

    async confirmSignUp(email: string, code: string): Promise<void> {
        await this.client.send(new ConfirmSignUpCommand({
            ClientId: environment.cognito.clientId,
            Username: email,
            ConfirmationCode: code
        }));
    }

    async signIn(email: string, password: string): Promise<void> {
        const response = await this.client.send(new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: environment.cognito.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        }));

        const result = response.AuthenticationResult;
        if (!result?.IdToken || !result?.AccessToken || !result?.RefreshToken) {
            throw new Error('Incomplete authentication response');
        }

        const tokens: AuthTokens = {
            idToken: result.IdToken,
            accessToken: result.AccessToken,
            refreshToken: result.RefreshToken,
            expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000
        };

        this.storeTokens(tokens);
        this.setUserFromToken(tokens.idToken);
    }

    async signOut(): Promise<void> {
        const tokens = this.getStoredTokens();
        if (tokens?.accessToken) {
            try {
                await this.client.send(new GlobalSignOutCommand({
                    AccessToken: tokens.accessToken
                }));
            } catch (e) {
                // Continue with local sign out
            }
        }
        this.clearSession();
    }

    async refreshSession(): Promise<string | null> {
        const tokens = this.getStoredTokens();
        if (!tokens?.refreshToken) return null;

        try {
            const response = await this.client.send(new InitiateAuthCommand({
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                ClientId: environment.cognito.clientId,
                AuthParameters: {
                    REFRESH_TOKEN: tokens.refreshToken
                }
            }));

            const result = response.AuthenticationResult;
            if (result?.IdToken && result?.AccessToken) {
                const updated: AuthTokens = {
                    ...tokens,
                    idToken: result.IdToken,
                    accessToken: result.AccessToken,
                    expiresAt: Date.now() + (result.ExpiresIn || 3600) * 1000
                };
                this.storeTokens(updated);
                this.setUserFromToken(updated.idToken);
                return updated.accessToken;
            }
        } catch (e) {
            this.clearSession();
        }
        return null;
    }

    getAccessToken(): string | null {
        const tokens = this.getStoredTokens();
        if (!tokens) return null;

        // Check if token is about to expire (within 5 minutes)
        if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
            this.refreshSession(); // Refresh in background
        }
        return tokens.accessToken;
    }

    private setUserFromToken(idToken: string): void {
        try {
            const decoded: any = jwtDecode(idToken);
            this.userSubject.next({
                sub: decoded.sub,
                email: decoded.email,
                name: decoded.name || decoded['cognito:username'],
                groups: decoded['cognito:groups'] || []
            });
        } catch {
            this.userSubject.next(null);
        }
    }

    private storeTokens(tokens: AuthTokens): void {
        localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }

    private getStoredTokens(): AuthTokens | null {
        const stored = localStorage.getItem('auth_tokens');
        return stored ? JSON.parse(stored) : null;
    }

    private loadStoredSession(): void {
        const tokens = this.getStoredTokens();
        if (tokens?.idToken) {
            const decoded: any = jwtDecode(tokens.idToken);
            if (decoded.exp * 1000 > Date.now()) {
                this.setUserFromToken(tokens.idToken);
            } else if (tokens.refreshToken) {
                this.refreshSession();
            } else {
                this.clearSession();
            }
        }
        this.loadingSubject.next(false);
    }

    private clearSession(): void {
        localStorage.removeItem('auth_tokens');
        this.userSubject.next(null);
    }
}
```

## Auth Guard

Protect routes with an Angular guard that checks authentication state.

Here's the route guard:

```typescript
// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(): boolean | UrlTree {
        if (this.authService.isAuthenticated) {
            return true;
        }
        return this.router.createUrlTree(['/login']);
    }
}

// Role-based guard
@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(): boolean | UrlTree {
        const user = this.authService.currentUser;
        if (user && user.groups.includes('Admins')) {
            return true;
        }
        return this.router.createUrlTree(['/unauthorized']);
    }
}
```

Set up routes with guards:

```typescript
// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, AdminGuard } from './guards/auth.guard';

const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'login', loadComponent: () => import('./pages/login/login.component') },
    { path: 'register', loadComponent: () => import('./pages/register/register.component') },
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component'),
        canActivate: [AuthGuard]
    },
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin.component'),
        canActivate: [AuthGuard, AdminGuard]
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
```

## HTTP Interceptor

The interceptor automatically attaches the access token to outgoing API requests and handles 401 responses.

Here's the auth interceptor:

```typescript
// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, from, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Skip auth for public endpoints
        if (request.url.includes('/public/')) {
            return next.handle(request);
        }

        const token = this.authService.getAccessToken();

        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    // Try to refresh the token
                    return from(this.authService.refreshSession()).pipe(
                        switchMap((newToken) => {
                            if (newToken) {
                                // Retry the request with the new token
                                const retryRequest = request.clone({
                                    setHeaders: {
                                        Authorization: `Bearer ${newToken}`
                                    }
                                });
                                return next.handle(retryRequest);
                            }
                            // Refresh failed - redirect to login
                            this.router.navigate(['/login']);
                            return throwError(() => error);
                        })
                    );
                }
                return throwError(() => error);
            })
        );
    }
}
```

Register the interceptor in your app module:

```typescript
// src/app/app.module.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            multi: true
        }
    ]
})
export class AppModule {}
```

## Login Component

Here's a standalone login component:

```typescript
// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="login-container">
            <h2>Sign In</h2>
            <div *ngIf="error" class="error">{{ error }}</div>
            <form (ngSubmit)="onSubmit()">
                <input [(ngModel)]="email" name="email" type="email"
                       placeholder="Email" required>
                <input [(ngModel)]="password" name="password" type="password"
                       placeholder="Password" required>
                <button type="submit" [disabled]="loading">
                    {{ loading ? 'Signing in...' : 'Sign In' }}
                </button>
            </form>
            <p>No account? <a routerLink="/register">Register here</a></p>
        </div>
    `
})
export default class LoginComponent {
    email = '';
    password = '';
    error = '';
    loading = false;

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    async onSubmit() {
        this.loading = true;
        this.error = '';
        try {
            await this.authService.signIn(this.email, this.password);
            this.router.navigate(['/dashboard']);
        } catch (err: any) {
            this.error = err.message || 'Sign in failed';
        } finally {
            this.loading = false;
        }
    }
}
```

For more on securing your API calls with Cognito tokens, see [integrating Cognito with API Gateway for authorization](https://oneuptime.com/blog/post/2026-02-12-cognito-api-gateway-authorization/view). If you want to use Amplify instead of the raw SDK, check out [using Amplify Authentication with Cognito](https://oneuptime.com/blog/post/2026-02-12-amplify-authentication-cognito/view).

## Wrapping Up

Angular's architecture of services, guards, and interceptors maps perfectly to authentication concerns. The auth service manages Cognito interactions and token state, guards protect routes based on auth status and group membership, and the interceptor handles token attachment and refresh transparently. This gives you a clean separation of concerns where your components don't need to know anything about JWTs or Cognito - they just inject the auth service and check if the user is logged in.
