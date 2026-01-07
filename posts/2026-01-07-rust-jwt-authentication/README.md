# How to Implement JWT Authentication Securely in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, JWT, Authentication, Security, axum, jsonwebtoken, OAuth, Refresh Tokens

Description: Learn how to implement secure JWT authentication in Rust applications. This guide covers token generation, validation, refresh tokens, secure storage patterns, and common security pitfalls to avoid.

---

> Authentication is the front door to your application. Get it wrong, and nothing else matters. This guide shows you how to implement JWT authentication in Rust that's both secure and practical for production use.

JWTs (JSON Web Tokens) provide stateless authentication, but they come with security considerations that are easy to get wrong. We'll cover the right way to handle tokens, refresh flows, and security best practices.

---

## Understanding JWT Security

Before implementing, understand what JWTs can and cannot do:

**JWTs provide:**
- Stateless authentication (no session storage needed)
- Tamper-proof claims (cryptographically signed)
- Self-contained user information

**JWTs do NOT provide:**
- Encryption (claims are base64-encoded, not encrypted)
- Revocation (tokens are valid until expiry)
- Protection against stolen tokens

---

## Dependencies

```toml
[dependencies]
# JWT handling
jsonwebtoken = "9"

# Web framework
axum = { version = "0.7", features = ["macros"] }
axum-extra = { version = "0.9", features = ["typed-header"] }
tokio = { version = "1", features = ["full"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Password hashing
argon2 = "0.5"
rand = "0.8"

# Utilities
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "1"
```

---

## JWT Token Structure

```rust
// src/auth/claims.rs
// JWT claims structure

use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Access token claims
#[derive(Debug, Serialize, Deserialize)]
pub struct AccessClaims {
    /// Subject (user ID)
    pub sub: Uuid,
    /// Expiration time (Unix timestamp)
    pub exp: i64,
    /// Issued at (Unix timestamp)
    pub iat: i64,
    /// Token type
    pub typ: String,
    /// User email
    pub email: String,
    /// User roles for authorization
    pub roles: Vec<String>,
}

impl AccessClaims {
    /// Create new access token claims
    pub fn new(user_id: Uuid, email: String, roles: Vec<String>, expires_in: Duration) -> Self {
        let now = Utc::now();

        Self {
            sub: user_id,
            exp: (now + expires_in).timestamp(),
            iat: now.timestamp(),
            typ: "access".to_string(),
            email,
            roles,
        }
    }

    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        Utc::now().timestamp() > self.exp
    }
}

/// Refresh token claims (minimal - just for re-authentication)
#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshClaims {
    /// Subject (user ID)
    pub sub: Uuid,
    /// Expiration time
    pub exp: i64,
    /// Issued at
    pub iat: i64,
    /// Token type
    pub typ: String,
    /// Token family ID (for rotation detection)
    pub family: Uuid,
}

impl RefreshClaims {
    pub fn new(user_id: Uuid, expires_in: Duration) -> Self {
        let now = Utc::now();

        Self {
            sub: user_id,
            exp: (now + expires_in).timestamp(),
            iat: now.timestamp(),
            typ: "refresh".to_string(),
            family: Uuid::new_v4(),
        }
    }
}
```

---

## Token Service

```rust
// src/auth/token_service.rs
// JWT generation and validation

use jsonwebtoken::{
    decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation,
};
use thiserror::Error;
use uuid::Uuid;

use crate::auth::claims::{AccessClaims, RefreshClaims};
use crate::config::AuthConfig;

#[derive(Error, Debug)]
pub enum TokenError {
    #[error("Token encoding failed")]
    EncodingFailed(#[from] jsonwebtoken::errors::Error),

    #[error("Token validation failed")]
    ValidationFailed,

    #[error("Token expired")]
    Expired,

    #[error("Invalid token type")]
    InvalidType,
}

/// Service for JWT operations
pub struct TokenService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_token_ttl: chrono::Duration,
    refresh_token_ttl: chrono::Duration,
}

impl TokenService {
    pub fn new(config: &AuthConfig) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(config.jwt_secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(config.jwt_secret.as_bytes()),
            access_token_ttl: chrono::Duration::minutes(config.access_token_ttl_minutes),
            refresh_token_ttl: chrono::Duration::days(config.refresh_token_ttl_days),
        }
    }

    /// Generate access token
    pub fn generate_access_token(
        &self,
        user_id: Uuid,
        email: String,
        roles: Vec<String>,
    ) -> Result<String, TokenError> {
        let claims = AccessClaims::new(user_id, email, roles, self.access_token_ttl);

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(TokenError::EncodingFailed)
    }

    /// Generate refresh token
    pub fn generate_refresh_token(&self, user_id: Uuid) -> Result<String, TokenError> {
        let claims = RefreshClaims::new(user_id, self.refresh_token_ttl);

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(TokenError::EncodingFailed)
    }

    /// Generate token pair (access + refresh)
    pub fn generate_token_pair(
        &self,
        user_id: Uuid,
        email: String,
        roles: Vec<String>,
    ) -> Result<TokenPair, TokenError> {
        Ok(TokenPair {
            access_token: self.generate_access_token(user_id, email, roles)?,
            refresh_token: self.generate_refresh_token(user_id)?,
            token_type: "Bearer".to_string(),
            expires_in: self.access_token_ttl.num_seconds() as u64,
        })
    }

    /// Validate and decode access token
    pub fn validate_access_token(&self, token: &str) -> Result<AccessClaims, TokenError> {
        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data: TokenData<AccessClaims> =
            decode(token, &self.decoding_key, &validation)
                .map_err(|_| TokenError::ValidationFailed)?;

        // Verify token type
        if token_data.claims.typ != "access" {
            return Err(TokenError::InvalidType);
        }

        Ok(token_data.claims)
    }

    /// Validate and decode refresh token
    pub fn validate_refresh_token(&self, token: &str) -> Result<RefreshClaims, TokenError> {
        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data: TokenData<RefreshClaims> =
            decode(token, &self.decoding_key, &validation)
                .map_err(|_| TokenError::ValidationFailed)?;

        if token_data.claims.typ != "refresh" {
            return Err(TokenError::InvalidType);
        }

        Ok(token_data.claims)
    }
}

/// Token pair returned to client
#[derive(Debug, serde::Serialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: u64,
}
```

---

## Password Hashing

Never store plaintext passwords. Use Argon2 for secure hashing.

```rust
// src/auth/password.rs
// Secure password hashing with Argon2

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PasswordError {
    #[error("Failed to hash password")]
    HashingFailed,

    #[error("Password verification failed")]
    VerificationFailed,

    #[error("Invalid hash format")]
    InvalidHash,
}

/// Hash a password using Argon2id
pub fn hash_password(password: &str) -> Result<String, PasswordError> {
    let salt = SaltString::generate(&mut OsRng);

    // Argon2id with default parameters (recommended for most use cases)
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| PasswordError::HashingFailed)
}

/// Verify a password against a stored hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool, PasswordError> {
    let parsed_hash = PasswordHash::new(hash).map_err(|_| PasswordError::InvalidHash)?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let password = "secure_password_123";
        let hash = hash_password(password).unwrap();

        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }
}
```

---

## Authentication Handlers

```rust
// src/handlers/auth.rs
// Authentication endpoints

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::auth::{password, token_service::TokenPair, TokenService};
use crate::error::{AppError, Result};
use crate::state::AppState;

/// Login request
#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

/// Registration request
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    #[validate(length(min = 1, max = 100))]
    pub name: String,
}

/// Refresh token request
#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

/// Authentication response
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: UserInfo,
    #[serde(flatten)]
    pub tokens: TokenPair,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub email: String,
    pub name: String,
}

/// User login
#[tracing::instrument(skip(state, payload), fields(user.email = %payload.email))]
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>> {
    payload.validate().map_err(|e| AppError::Validation(e.to_string()))?;

    // Find user by email (replace with actual database query)
    let user = find_user_by_email(&payload.email)
        .await
        .ok_or(AppError::Unauthorized)?;

    // Verify password
    let password_valid = tokio::task::spawn_blocking({
        let password = payload.password.clone();
        let hash = user.password_hash.clone();
        move || password::verify_password(&password, &hash)
    })
    .await
    .map_err(|_| AppError::Internal(anyhow::anyhow!("Password verification failed")))?
    .map_err(|_| AppError::Unauthorized)?;

    if !password_valid {
        tracing::warn!("Invalid password attempt");
        return Err(AppError::Unauthorized);
    }

    // Generate tokens
    let tokens = state
        .token_service
        .generate_token_pair(user.id, user.email.clone(), user.roles.clone())?;

    tracing::info!(user.id = %user.id, "User logged in");

    Ok(Json(AuthResponse {
        user: UserInfo {
            id: user.id,
            email: user.email,
            name: user.name,
        },
        tokens,
    }))
}

/// User registration
#[tracing::instrument(skip(state, payload), fields(user.email = %payload.email))]
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>)> {
    payload.validate().map_err(|e| AppError::Validation(e.to_string()))?;

    // Check if user exists
    if user_exists(&payload.email).await {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    // Hash password (CPU-intensive, use spawn_blocking)
    let password_hash = tokio::task::spawn_blocking({
        let password = payload.password.clone();
        move || password::hash_password(&password)
    })
    .await
    .map_err(|_| AppError::Internal(anyhow::anyhow!("Password hashing failed")))?
    .map_err(|_| AppError::Internal(anyhow::anyhow!("Password hashing failed")))?;

    // Create user (replace with actual database insert)
    let user_id = Uuid::new_v4();

    // Generate tokens
    let tokens = state.token_service.generate_token_pair(
        user_id,
        payload.email.clone(),
        vec!["user".to_string()],
    )?;

    tracing::info!(user.id = %user_id, "User registered");

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            user: UserInfo {
                id: user_id,
                email: payload.email,
                name: payload.name,
            },
            tokens,
        }),
    ))
}

/// Refresh access token
#[tracing::instrument(skip(state, payload))]
pub async fn refresh(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<TokenPair>> {
    // Validate refresh token
    let claims = state
        .token_service
        .validate_refresh_token(&payload.refresh_token)?;

    // Check if token is revoked (should check database/cache)
    // if is_token_revoked(&claims.family).await {
    //     return Err(AppError::Unauthorized);
    // }

    // Fetch current user info
    let user = find_user_by_id(claims.sub)
        .await
        .ok_or(AppError::Unauthorized)?;

    // Generate new token pair
    let tokens = state
        .token_service
        .generate_token_pair(user.id, user.email, user.roles)?;

    // Optionally: Revoke old refresh token family (rotation)
    // revoke_token_family(&claims.family).await;

    tracing::info!(user.id = %claims.sub, "Tokens refreshed");

    Ok(Json(tokens))
}

/// Logout (revoke refresh token)
#[tracing::instrument(skip(state, payload))]
pub async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<StatusCode> {
    // Validate and get claims
    if let Ok(claims) = state.token_service.validate_refresh_token(&payload.refresh_token) {
        // Revoke the token family
        // revoke_token_family(&claims.family).await;
        tracing::info!(user.id = %claims.sub, "User logged out");
    }

    // Always return success (don't reveal if token was valid)
    Ok(StatusCode::NO_CONTENT)
}

// Placeholder functions - replace with actual database queries
async fn find_user_by_email(_email: &str) -> Option<User> {
    None
}

async fn find_user_by_id(_id: Uuid) -> Option<User> {
    None
}

async fn user_exists(_email: &str) -> bool {
    false
}

struct User {
    id: Uuid,
    email: String,
    name: String,
    password_hash: String,
    roles: Vec<String>,
}
```

---

## Authentication Middleware

```rust
// src/middleware/auth.rs
// JWT authentication extractor

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use uuid::Uuid;

use crate::auth::claims::AccessClaims;
use crate::error::AppError;
use crate::state::AppState;

/// Authenticated user information extracted from JWT
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub roles: Vec<String>,
}

impl From<AccessClaims> for AuthUser {
    fn from(claims: AccessClaims) -> Self {
        Self {
            id: claims.sub,
            email: claims.email,
            roles: claims.roles,
        }
    }
}

impl AuthUser {
    /// Check if user has a specific role
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    /// Check if user has any of the specified roles
    pub fn has_any_role(&self, roles: &[&str]) -> bool {
        roles.iter().any(|role| self.has_role(role))
    }
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Extract Authorization header
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AppError::Unauthorized)?;

        // Validate token
        let claims = state
            .token_service
            .validate_access_token(bearer.token())
            .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser::from(claims))
    }
}

/// Optional authentication - doesn't fail if no token provided
pub struct OptionalAuthUser(pub Option<AuthUser>);

#[async_trait]
impl FromRequestParts<AppState> for OptionalAuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        match AuthUser::from_request_parts(parts, state).await {
            Ok(user) => Ok(OptionalAuthUser(Some(user))),
            Err(_) => Ok(OptionalAuthUser(None)),
        }
    }
}

/// Role-based authorization extractor
pub struct RequireRole<const ROLE: &'static str>;

#[async_trait]
impl<const ROLE: &'static str> FromRequestParts<AppState> for RequireRole<ROLE> {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;

        if !user.has_role(ROLE) {
            return Err(AppError::Forbidden);
        }

        Ok(RequireRole)
    }
}
```

---

## Protected Routes

```rust
// src/routes/protected.rs
// Routes requiring authentication

use axum::{routing::get, Json, Router};

use crate::middleware::auth::{AuthUser, RequireRole};
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/api/me", get(get_current_user))
        .route("/api/admin/users", get(admin_list_users))
}

/// Get current user profile (requires authentication)
async fn get_current_user(user: AuthUser) -> Json<UserProfile> {
    Json(UserProfile {
        id: user.id,
        email: user.email,
        roles: user.roles,
    })
}

/// Admin-only endpoint (requires admin role)
async fn admin_list_users(
    _admin: RequireRole<"admin">,
    user: AuthUser,  // Also get user info
) -> Json<AdminResponse> {
    tracing::info!(admin.id = %user.id, "Admin accessed user list");

    Json(AdminResponse {
        users: vec![],
        total: 0,
    })
}

#[derive(serde::Serialize)]
struct UserProfile {
    id: uuid::Uuid,
    email: String,
    roles: Vec<String>,
}

#[derive(serde::Serialize)]
struct AdminResponse {
    users: Vec<UserProfile>,
    total: usize,
}
```

---

## Security Best Practices

### Token Storage (Client-Side)

```javascript
// Frontend: Secure token storage

// Access token: Store in memory only (JavaScript variable)
// - Not localStorage (XSS vulnerable)
// - Not sessionStorage (XSS vulnerable)
let accessToken = null;

// Refresh token: HttpOnly cookie (set by server)
// - Not accessible via JavaScript
// - Automatically sent with requests

// Example: Handling token refresh
async function fetchWithAuth(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (response.status === 401) {
        // Try to refresh
        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include', // Send HttpOnly cookie
        });

        if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            accessToken = data.access_token;
            // Retry original request
            return fetchWithAuth(url, options);
        }

        // Refresh failed - redirect to login
        window.location.href = '/login';
    }

    return response;
}
```

### Setting HttpOnly Cookies (Server-Side)

```rust
// Set refresh token as HttpOnly cookie
use axum::http::{header, HeaderValue};

fn set_refresh_token_cookie(token: &str, max_age_days: i64) -> HeaderValue {
    let cookie = format!(
        "refresh_token={}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age={}",
        token,
        max_age_days * 24 * 60 * 60
    );
    HeaderValue::from_str(&cookie).unwrap()
}
```

### Security Checklist

| Practice | Implementation |
|----------|----------------|
| Short access token lifetime | 15-60 minutes |
| Long refresh token lifetime | 7-30 days |
| HttpOnly refresh token cookie | Prevents XSS theft |
| Secure flag on cookies | HTTPS only |
| SameSite=Strict | Prevents CSRF |
| Token rotation | New refresh token on each refresh |
| Token revocation | Store revoked tokens/families |
| Rate limiting | Prevent brute force |
| Password hashing | Argon2id |

---

## Common Pitfalls to Avoid

1. **Storing JWTs in localStorage** - Vulnerable to XSS
2. **Long-lived access tokens** - Use short TTL + refresh tokens
3. **No token revocation** - Track token families for logout
4. **Weak secrets** - Use cryptographically random secrets (32+ bytes)
5. **Algorithm confusion** - Explicitly specify algorithm in validation
6. **Missing token type validation** - Check `typ` claim
7. **Exposing sensitive data** - Don't put passwords/secrets in claims

---

*Need to monitor authentication across your services? [OneUptime](https://oneuptime.com) provides security monitoring and alerting for authentication failures.*

**Related Reading:**
- [How to Build Production-Ready REST APIs in Rust with Axum](https://oneuptime.com/blog/post/2026-01-07-rust-axum-rest-api/view)
- [How to Secure Rust APIs Against Common Vulnerabilities](https://oneuptime.com/blog/post/2026-01-07-rust-api-security/view)
