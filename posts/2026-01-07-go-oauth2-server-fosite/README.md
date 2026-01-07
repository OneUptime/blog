# How to Implement OAuth2 Server in Go with fosite

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, OAuth2, Authentication, Security, API, fosite

Description: Build an OAuth2 authorization server in Go using fosite for secure API authentication with authorization code, client credentials, and refresh token flows.

---

## Introduction

OAuth2 is the industry-standard protocol for authorization, enabling third-party applications to obtain limited access to HTTP services. Building a robust OAuth2 server from scratch is complex and error-prone. Fortunately, the fosite library provides a production-ready foundation for implementing OAuth2 servers in Go.

In this comprehensive guide, we will build a complete OAuth2 authorization server using fosite, covering all major grant types, token introspection, PKCE support, and custom storage implementations.

## Prerequisites

Before diving in, ensure you have:

- Go 1.21 or later installed
- Basic understanding of OAuth2 concepts
- Familiarity with HTTP servers in Go

## OAuth2 Grant Types Overview

OAuth2 defines several grant types, each suited for different use cases:

### Authorization Code Flow
The most secure flow for web applications with server-side components. Users authenticate directly with the authorization server and receive an authorization code that the client exchanges for tokens.

### Client Credentials Flow
Used for machine-to-machine communication where no user context is required. The client authenticates with its own credentials to obtain an access token.

### Refresh Token Flow
Allows clients to obtain new access tokens without re-authenticating the user, providing a seamless user experience for long-running applications.

### PKCE (Proof Key for Code Exchange)
An extension to the authorization code flow that adds an additional layer of security, essential for public clients like mobile and single-page applications.

## Setting Up fosite

Let us start by setting up a new Go project and installing the required dependencies.

```bash
mkdir oauth2-server && cd oauth2-server
go mod init github.com/yourusername/oauth2-server
go get github.com/ory/fosite
go get github.com/ory/fosite/storage/memory
go get github.com/ory/fosite/handler/oauth2
go get github.com/ory/fosite/handler/openid
go get github.com/ory/fosite/token/jwt
```

## Project Structure

Our OAuth2 server will follow a clean architecture with separation of concerns.

```
oauth2-server/
├── main.go
├── config/
│   └── config.go
├── storage/
│   └── memory.go
├── handlers/
│   ├── authorize.go
│   ├── token.go
│   └── introspect.go
└── models/
    └── client.go
```

## Configuration Setup

First, let us create the configuration for our OAuth2 server with proper secret management and token settings.

```go
// config/config.go
package config

import (
	"crypto/rand"
	"crypto/rsa"
	"time"

	"github.com/ory/fosite"
	"github.com/ory/fosite/compose"
	"github.com/ory/fosite/token/jwt"
)

// Config holds the OAuth2 server configuration
type Config struct {
	// Secret is used for HMAC signing of tokens
	Secret []byte
	// PrivateKey is used for RS256 JWT signing
	PrivateKey *rsa.PrivateKey
	// AccessTokenLifespan defines how long access tokens are valid
	AccessTokenLifespan time.Duration
	// RefreshTokenLifespan defines how long refresh tokens are valid
	RefreshTokenLifespan time.Duration
	// AuthorizeCodeLifespan defines how long authorization codes are valid
	AuthorizeCodeLifespan time.Duration
}

// NewConfig creates a new OAuth2 server configuration with sensible defaults
func NewConfig() (*Config, error) {
	// Generate a 32-byte secret for HMAC operations
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return nil, err
	}

	// Generate RSA key pair for JWT signing
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}

	return &Config{
		Secret:                secret,
		PrivateKey:            privateKey,
		AccessTokenLifespan:   time.Hour,
		RefreshTokenLifespan:  time.Hour * 24 * 7,
		AuthorizeCodeLifespan: time.Minute * 10,
	}, nil
}

// BuildFositeConfig creates the fosite configuration from our config
func (c *Config) BuildFositeConfig() *fosite.Config {
	return &fosite.Config{
		AccessTokenLifespan:            c.AccessTokenLifespan,
		RefreshTokenLifespan:           c.RefreshTokenLifespan,
		AuthorizeCodeLifespan:          c.AuthorizeCodeLifespan,
		GlobalSecret:                   c.Secret,
		SendDebugMessagesToClients:     false,
		EnforcePKCE:                    true,
		EnforcePKCEForPublicClients:    true,
		EnablePKCEPlainChallengeMethod: false,
	}
}
```

## Client Model

Define the OAuth2 client model that represents registered applications.

```go
// models/client.go
package models

import (
	"time"

	"github.com/ory/fosite"
)

// Client represents an OAuth2 client application
type Client struct {
	ID            string
	Secret        []byte
	RedirectURIs  []string
	GrantTypes    []string
	ResponseTypes []string
	Scopes        []string
	Public        bool
	CreatedAt     time.Time
}

// GetID returns the client ID
func (c *Client) GetID() string {
	return c.ID
}

// GetHashedSecret returns the hashed client secret
func (c *Client) GetHashedSecret() []byte {
	return c.Secret
}

// GetRedirectURIs returns registered redirect URIs
func (c *Client) GetRedirectURIs() []string {
	return c.RedirectURIs
}

// GetGrantTypes returns allowed grant types
func (c *Client) GetGrantTypes() fosite.Arguments {
	return c.GrantTypes
}

// GetResponseTypes returns allowed response types
func (c *Client) GetResponseTypes() fosite.Arguments {
	return c.ResponseTypes
}

// GetScopes returns the allowed scopes for this client
func (c *Client) GetScopes() fosite.Arguments {
	return c.Scopes
}

// IsPublic returns true if the client is a public client
func (c *Client) IsPublic() bool {
	return c.Public
}

// GetAudience returns the allowed audiences for this client
func (c *Client) GetAudience() fosite.Arguments {
	return []string{}
}
```

## Custom Storage Implementation

Implement a custom storage backend. While we use in-memory storage for demonstration, this pattern easily adapts to databases like PostgreSQL or Redis.

```go
// storage/memory.go
package storage

import (
	"context"
	"sync"
	"time"

	"github.com/ory/fosite"
	"github.com/yourusername/oauth2-server/models"
)

// MemoryStore provides in-memory storage for OAuth2 data
type MemoryStore struct {
	// Mutex protects concurrent access to maps
	mu sync.RWMutex

	// Clients stores registered OAuth2 clients
	Clients map[string]*models.Client

	// AuthorizeCodes stores pending authorization codes
	AuthorizeCodes map[string]fosite.Requester

	// AccessTokens stores active access tokens
	AccessTokens map[string]fosite.Requester

	// RefreshTokens stores active refresh tokens
	RefreshTokens map[string]fosite.Requester

	// PKCE stores PKCE challenges
	PKCE map[string]fosite.Requester

	// Users stores user credentials for resource owner password flow
	Users map[string]string
}

// NewMemoryStore creates a new in-memory storage
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		Clients:        make(map[string]*models.Client),
		AuthorizeCodes: make(map[string]fosite.Requester),
		AccessTokens:   make(map[string]fosite.Requester),
		RefreshTokens:  make(map[string]fosite.Requester),
		PKCE:           make(map[string]fosite.Requester),
		Users:          make(map[string]string),
	}
}

// GetClient retrieves a client by ID
func (s *MemoryStore) GetClient(ctx context.Context, id string) (fosite.Client, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	client, ok := s.Clients[id]
	if !ok {
		return nil, fosite.ErrNotFound
	}
	return client, nil
}

// CreateAuthorizeCodeSession stores a new authorization code
func (s *MemoryStore) CreateAuthorizeCodeSession(
	ctx context.Context,
	code string,
	request fosite.Requester,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.AuthorizeCodes[code] = request
	return nil
}

// GetAuthorizeCodeSession retrieves an authorization code session
func (s *MemoryStore) GetAuthorizeCodeSession(
	ctx context.Context,
	code string,
	session fosite.Session,
) (fosite.Requester, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	request, ok := s.AuthorizeCodes[code]
	if !ok {
		return nil, fosite.ErrNotFound
	}
	return request, nil
}

// InvalidateAuthorizeCodeSession marks an authorization code as used
func (s *MemoryStore) InvalidateAuthorizeCodeSession(
	ctx context.Context,
	code string,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.AuthorizeCodes, code)
	return nil
}

// CreateAccessTokenSession stores a new access token
func (s *MemoryStore) CreateAccessTokenSession(
	ctx context.Context,
	signature string,
	request fosite.Requester,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.AccessTokens[signature] = request
	return nil
}

// GetAccessTokenSession retrieves an access token session
func (s *MemoryStore) GetAccessTokenSession(
	ctx context.Context,
	signature string,
	session fosite.Session,
) (fosite.Requester, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	request, ok := s.AccessTokens[signature]
	if !ok {
		return nil, fosite.ErrNotFound
	}
	return request, nil
}

// DeleteAccessTokenSession removes an access token
func (s *MemoryStore) DeleteAccessTokenSession(
	ctx context.Context,
	signature string,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.AccessTokens, signature)
	return nil
}

// CreateRefreshTokenSession stores a new refresh token
func (s *MemoryStore) CreateRefreshTokenSession(
	ctx context.Context,
	signature string,
	request fosite.Requester,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.RefreshTokens[signature] = request
	return nil
}

// GetRefreshTokenSession retrieves a refresh token session
func (s *MemoryStore) GetRefreshTokenSession(
	ctx context.Context,
	signature string,
	session fosite.Session,
) (fosite.Requester, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	request, ok := s.RefreshTokens[signature]
	if !ok {
		return nil, fosite.ErrNotFound
	}
	return request, nil
}

// DeleteRefreshTokenSession removes a refresh token
func (s *MemoryStore) DeleteRefreshTokenSession(
	ctx context.Context,
	signature string,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.RefreshTokens, signature)
	return nil
}

// RevokeRefreshToken revokes a refresh token by its request ID
func (s *MemoryStore) RevokeRefreshToken(
	ctx context.Context,
	requestID string,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for sig, req := range s.RefreshTokens {
		if req.GetID() == requestID {
			delete(s.RefreshTokens, sig)
		}
	}
	return nil
}

// RevokeAccessToken revokes an access token by its request ID
func (s *MemoryStore) RevokeAccessToken(
	ctx context.Context,
	requestID string,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for sig, req := range s.AccessTokens {
		if req.GetID() == requestID {
			delete(s.AccessTokens, sig)
		}
	}
	return nil
}

// CreatePKCERequestSession stores PKCE data for authorization requests
func (s *MemoryStore) CreatePKCERequestSession(
	ctx context.Context,
	signature string,
	request fosite.Requester,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.PKCE[signature] = request
	return nil
}

// GetPKCERequestSession retrieves PKCE data
func (s *MemoryStore) GetPKCERequestSession(
	ctx context.Context,
	signature string,
	session fosite.Session,
) (fosite.Requester, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	request, ok := s.PKCE[signature]
	if !ok {
		return nil, fosite.ErrNotFound
	}
	return request, nil
}

// DeletePKCERequestSession removes PKCE data
func (s *MemoryStore) DeletePKCERequestSession(
	ctx context.Context,
	signature string,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.PKCE, signature)
	return nil
}

// RegisterClient adds a new OAuth2 client to the store
func (s *MemoryStore) RegisterClient(client *models.Client) {
	s.mu.Lock()
	defer s.mu.Unlock()

	client.CreatedAt = time.Now()
	s.Clients[client.ID] = client
}
```

## Authorization Endpoint Handler

Implement the authorization endpoint that handles user consent and issues authorization codes.

```go
// handlers/authorize.go
package handlers

import (
	"html/template"
	"net/http"

	"github.com/ory/fosite"
)

// AuthorizeHandler handles OAuth2 authorization requests
type AuthorizeHandler struct {
	OAuth2Provider fosite.OAuth2Provider
	LoginTemplate  *template.Template
}

// NewAuthorizeHandler creates a new authorization handler
func NewAuthorizeHandler(provider fosite.OAuth2Provider) *AuthorizeHandler {
	tmpl := template.Must(template.New("login").Parse(`
<!DOCTYPE html>
<html>
<head><title>Login</title></head>
<body>
	<h1>Authorize Application</h1>
	<p>Application <strong>{{.ClientID}}</strong> is requesting access to:</p>
	<ul>
		{{range .Scopes}}<li>{{.}}</li>{{end}}
	</ul>
	<form method="post">
		<input type="hidden" name="client_id" value="{{.ClientID}}">
		<input type="hidden" name="redirect_uri" value="{{.RedirectURI}}">
		<input type="hidden" name="state" value="{{.State}}">
		<input type="hidden" name="scope" value="{{.ScopeString}}">
		<input type="hidden" name="response_type" value="{{.ResponseType}}">
		<input type="hidden" name="code_challenge" value="{{.CodeChallenge}}">
		<input type="hidden" name="code_challenge_method" value="{{.CodeChallengeMethod}}">
		<label>Username: <input type="text" name="username"></label><br>
		<label>Password: <input type="password" name="password"></label><br>
		<button type="submit" name="action" value="approve">Approve</button>
		<button type="submit" name="action" value="deny">Deny</button>
	</form>
</body>
</html>`))

	return &AuthorizeHandler{
		OAuth2Provider: provider,
		LoginTemplate:  tmpl,
	}
}

// HandleAuthorize processes authorization requests
func (h *AuthorizeHandler) HandleAuthorize(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse the authorization request from URL parameters
	ar, err := h.OAuth2Provider.NewAuthorizeRequest(ctx, r)
	if err != nil {
		h.OAuth2Provider.WriteAuthorizeError(ctx, w, ar, err)
		return
	}

	// For GET requests, show the login form
	if r.Method == http.MethodGet {
		h.showLoginForm(w, ar)
		return
	}

	// For POST requests, process the user's decision
	if r.Method == http.MethodPost {
		h.processAuthorization(w, r, ar)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

// showLoginForm renders the authorization consent form
func (h *AuthorizeHandler) showLoginForm(w http.ResponseWriter, ar fosite.AuthorizeRequester) {
	data := map[string]interface{}{
		"ClientID":            ar.GetClient().GetID(),
		"RedirectURI":         ar.GetRedirectURI().String(),
		"State":               ar.GetState(),
		"Scopes":              ar.GetRequestedScopes(),
		"ScopeString":         ar.GetRequestedScopes().String(),
		"ResponseType":        ar.GetResponseTypes().String(),
		"CodeChallenge":       ar.GetRequestForm().Get("code_challenge"),
		"CodeChallengeMethod": ar.GetRequestForm().Get("code_challenge_method"),
	}

	w.Header().Set("Content-Type", "text/html")
	h.LoginTemplate.Execute(w, data)
}

// processAuthorization handles the user's consent decision
func (h *AuthorizeHandler) processAuthorization(
	w http.ResponseWriter,
	r *http.Request,
	ar fosite.AuthorizeRequester,
) {
	ctx := r.Context()

	// Check if user denied the request
	if r.FormValue("action") == "deny" {
		h.OAuth2Provider.WriteAuthorizeError(ctx, w, ar, fosite.ErrAccessDenied)
		return
	}

	// Validate user credentials (simplified for demonstration)
	username := r.FormValue("username")
	password := r.FormValue("password")
	if !h.validateCredentials(username, password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Create a session for the authorized user
	session := NewSession(username)

	// Grant all requested scopes (in production, filter based on user consent)
	for _, scope := range ar.GetRequestedScopes() {
		ar.GrantScope(scope)
	}

	// Generate the authorization response
	response, err := h.OAuth2Provider.NewAuthorizeResponse(ctx, ar, session)
	if err != nil {
		h.OAuth2Provider.WriteAuthorizeError(ctx, w, ar, err)
		return
	}

	// Write the response (redirect with authorization code)
	h.OAuth2Provider.WriteAuthorizeResponse(ctx, w, ar, response)
}

// validateCredentials checks username and password
func (h *AuthorizeHandler) validateCredentials(username, password string) bool {
	// In production, validate against a user database
	return username == "demo" && password == "demo"
}
```

## Token Endpoint Handler

Implement the token endpoint that exchanges authorization codes for tokens and handles refresh token requests.

```go
// handlers/token.go
package handlers

import (
	"net/http"
	"time"

	"github.com/ory/fosite"
	"github.com/ory/fosite/token/jwt"
)

// Session represents the OAuth2 session data
type Session struct {
	Username  string
	Subject   string
	ExpiresAt map[fosite.TokenType]time.Time
	Extra     map[string]interface{}
	JWTClaims *jwt.JWTClaims
}

// NewSession creates a new session for the given user
func NewSession(username string) *Session {
	return &Session{
		Username: username,
		Subject:  username,
		ExpiresAt: map[fosite.TokenType]time.Time{
			fosite.AccessToken:  time.Now().Add(time.Hour),
			fosite.RefreshToken: time.Now().Add(time.Hour * 24 * 7),
		},
		Extra: make(map[string]interface{}),
		JWTClaims: &jwt.JWTClaims{
			Subject: username,
			Issuer:  "https://auth.example.com",
			Extra:   make(map[string]interface{}),
		},
	}
}

// SetExpiresAt sets the expiration time for a specific token type
func (s *Session) SetExpiresAt(key fosite.TokenType, exp time.Time) {
	s.ExpiresAt[key] = exp
}

// GetExpiresAt returns the expiration time for a token type
func (s *Session) GetExpiresAt(key fosite.TokenType) time.Time {
	return s.ExpiresAt[key]
}

// GetUsername returns the session username
func (s *Session) GetUsername() string {
	return s.Username
}

// GetSubject returns the session subject
func (s *Session) GetSubject() string {
	return s.Subject
}

// Clone creates a deep copy of the session
func (s *Session) Clone() fosite.Session {
	clone := &Session{
		Username:  s.Username,
		Subject:   s.Subject,
		ExpiresAt: make(map[fosite.TokenType]time.Time),
		Extra:     make(map[string]interface{}),
	}

	for k, v := range s.ExpiresAt {
		clone.ExpiresAt[k] = v
	}

	for k, v := range s.Extra {
		clone.Extra[k] = v
	}

	return clone
}

// TokenHandler handles token requests
type TokenHandler struct {
	OAuth2Provider fosite.OAuth2Provider
}

// NewTokenHandler creates a new token handler
func NewTokenHandler(provider fosite.OAuth2Provider) *TokenHandler {
	return &TokenHandler{
		OAuth2Provider: provider,
	}
}

// HandleToken processes token requests for all grant types
func (h *TokenHandler) HandleToken(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Create a new session for this request
	session := NewSession("")

	// Parse and validate the token request
	accessRequest, err := h.OAuth2Provider.NewAccessRequest(ctx, r, session)
	if err != nil {
		h.OAuth2Provider.WriteAccessError(ctx, w, accessRequest, err)
		return
	}

	// Grant scopes based on the grant type
	if accessRequest.GetGrantTypes().ExactOne("client_credentials") {
		// For client credentials, grant all requested scopes
		for _, scope := range accessRequest.GetRequestedScopes() {
			accessRequest.GrantScope(scope)
		}
	}

	// Generate the access token response
	response, err := h.OAuth2Provider.NewAccessResponse(ctx, accessRequest)
	if err != nil {
		h.OAuth2Provider.WriteAccessError(ctx, w, accessRequest, err)
		return
	}

	// Write the token response as JSON
	h.OAuth2Provider.WriteAccessResponse(ctx, w, accessRequest, response)
}
```

## Token Introspection Handler

Implement token introspection for validating tokens from resource servers.

```go
// handlers/introspect.go
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ory/fosite"
)

// IntrospectionHandler handles token introspection requests
type IntrospectionHandler struct {
	OAuth2Provider fosite.OAuth2Provider
}

// NewIntrospectionHandler creates a new introspection handler
func NewIntrospectionHandler(provider fosite.OAuth2Provider) *IntrospectionHandler {
	return &IntrospectionHandler{
		OAuth2Provider: provider,
	}
}

// IntrospectionResponse represents the token introspection response
type IntrospectionResponse struct {
	Active    bool   `json:"active"`
	Scope     string `json:"scope,omitempty"`
	ClientID  string `json:"client_id,omitempty"`
	Username  string `json:"username,omitempty"`
	TokenType string `json:"token_type,omitempty"`
	Exp       int64  `json:"exp,omitempty"`
	Iat       int64  `json:"iat,omitempty"`
	Sub       string `json:"sub,omitempty"`
	Aud       string `json:"aud,omitempty"`
	Iss       string `json:"iss,omitempty"`
}

// HandleIntrospection processes token introspection requests
func (h *IntrospectionHandler) HandleIntrospection(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Create a session for introspection
	session := NewSession("")

	// Perform the introspection
	ir, err := h.OAuth2Provider.NewIntrospectionRequest(ctx, r, session)
	if err != nil {
		// Token is not active or invalid
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(IntrospectionResponse{Active: false})
		return
	}

	// Build the introspection response
	response := IntrospectionResponse{
		Active:    ir.IsActive(),
		Scope:     ir.GetAccessRequester().GetGrantedScopes().String(),
		ClientID:  ir.GetAccessRequester().GetClient().GetID(),
		TokenType: string(ir.GetTokenUse()),
	}

	// Add session information if available
	if session := ir.GetAccessRequester().GetSession(); session != nil {
		response.Username = session.GetUsername()
		response.Sub = session.GetSubject()
		response.Exp = session.GetExpiresAt(fosite.AccessToken).Unix()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
```

## Building the OAuth2 Provider

Now let us compose all handlers into a complete OAuth2 provider using fosite's compose package.

```go
// main.go
package main

import (
	"log"
	"net/http"

	"github.com/ory/fosite"
	"github.com/ory/fosite/compose"
	"github.com/ory/fosite/handler/oauth2"
	"github.com/ory/fosite/handler/pkce"
	"golang.org/x/crypto/bcrypt"

	"github.com/yourusername/oauth2-server/config"
	"github.com/yourusername/oauth2-server/handlers"
	"github.com/yourusername/oauth2-server/models"
	"github.com/yourusername/oauth2-server/storage"
)

func main() {
	// Initialize configuration
	cfg, err := config.NewConfig()
	if err != nil {
		log.Fatalf("Failed to create config: %v", err)
	}

	// Initialize storage
	store := storage.NewMemoryStore()

	// Register demo clients
	registerDemoClients(store)

	// Build the OAuth2 provider with all required handlers
	provider := buildOAuth2Provider(cfg, store)

	// Create HTTP handlers
	authorizeHandler := handlers.NewAuthorizeHandler(provider)
	tokenHandler := handlers.NewTokenHandler(provider)
	introspectionHandler := handlers.NewIntrospectionHandler(provider)

	// Set up routes
	http.HandleFunc("/oauth2/authorize", authorizeHandler.HandleAuthorize)
	http.HandleFunc("/oauth2/token", tokenHandler.HandleToken)
	http.HandleFunc("/oauth2/introspect", introspectionHandler.HandleIntrospection)

	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("OAuth2 server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// buildOAuth2Provider creates the fosite OAuth2 provider with all handlers
func buildOAuth2Provider(cfg *config.Config, store *storage.MemoryStore) fosite.OAuth2Provider {
	fositeConfig := cfg.BuildFositeConfig()

	// Compose the OAuth2 provider with required handlers
	return compose.Compose(
		fositeConfig,
		store,
		&compose.CommonStrategy{
			CoreStrategy: compose.NewOAuth2HMACStrategy(fositeConfig),
		},
		// Authorization code flow
		oauth2.AuthorizeExplicitGrantFactory,
		// Client credentials flow
		oauth2.ClientCredentialsGrantFactory,
		// Refresh token flow
		oauth2.RefreshTokenGrantFactory,
		// Token introspection
		oauth2.TokenIntrospectionFactory,
		// Token revocation
		oauth2.TokenRevocationFactory,
		// PKCE support
		pkce.PKCEHandlerFactory,
	)
}

// registerDemoClients adds sample OAuth2 clients for testing
func registerDemoClients(store *storage.MemoryStore) {
	// Hash the client secret
	hashedSecret, _ := bcrypt.GenerateFromPassword(
		[]byte("demo-secret"),
		bcrypt.DefaultCost,
	)

	// Register a confidential client (web application)
	store.RegisterClient(&models.Client{
		ID:           "demo-client",
		Secret:       hashedSecret,
		RedirectURIs: []string{"http://localhost:3000/callback"},
		GrantTypes: []string{
			"authorization_code",
			"refresh_token",
		},
		ResponseTypes: []string{"code"},
		Scopes:        []string{"openid", "profile", "email", "read", "write"},
		Public:        false,
	})

	// Register a public client (mobile/SPA application)
	store.RegisterClient(&models.Client{
		ID:           "mobile-client",
		Secret:       nil,
		RedirectURIs: []string{"myapp://callback"},
		GrantTypes: []string{
			"authorization_code",
			"refresh_token",
		},
		ResponseTypes: []string{"code"},
		Scopes:        []string{"openid", "profile", "read"},
		Public:        true,
	})

	// Register a service client (machine-to-machine)
	serviceSecret, _ := bcrypt.GenerateFromPassword(
		[]byte("service-secret"),
		bcrypt.DefaultCost,
	)
	store.RegisterClient(&models.Client{
		ID:            "service-client",
		Secret:        serviceSecret,
		RedirectURIs:  []string{},
		GrantTypes:    []string{"client_credentials"},
		ResponseTypes: []string{},
		Scopes:        []string{"admin", "read", "write"},
		Public:        false,
	})
}
```

## PKCE Implementation Details

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks. Here is how it works with our implementation.

```go
// Example PKCE flow implementation for clients
package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
)

// PKCEChallenge represents a PKCE code verifier and challenge pair
type PKCEChallenge struct {
	Verifier  string
	Challenge string
	Method    string
}

// GeneratePKCEChallenge creates a new PKCE code verifier and challenge
func GeneratePKCEChallenge() (*PKCEChallenge, error) {
	// Generate a cryptographically random code verifier (43-128 characters)
	verifierBytes := make([]byte, 32)
	if _, err := rand.Read(verifierBytes); err != nil {
		return nil, err
	}

	// Base64 URL encode without padding
	verifier := base64.RawURLEncoding.EncodeToString(verifierBytes)

	// Create the challenge using SHA256 (S256 method)
	hash := sha256.Sum256([]byte(verifier))
	challenge := base64.RawURLEncoding.EncodeToString(hash[:])

	return &PKCEChallenge{
		Verifier:  verifier,
		Challenge: challenge,
		Method:    "S256",
	}, nil
}

// BuildAuthorizationURL constructs the authorization URL with PKCE parameters
func (p *PKCEChallenge) BuildAuthorizationURL(
	baseURL, clientID, redirectURI, scope, state string,
) string {
	params := []string{
		fmt.Sprintf("client_id=%s", clientID),
		fmt.Sprintf("redirect_uri=%s", redirectURI),
		fmt.Sprintf("response_type=code"),
		fmt.Sprintf("scope=%s", scope),
		fmt.Sprintf("state=%s", state),
		fmt.Sprintf("code_challenge=%s", p.Challenge),
		fmt.Sprintf("code_challenge_method=%s", p.Method),
	}

	return baseURL + "?" + strings.Join(params, "&")
}
```

## Testing the OAuth2 Server

Here is a comprehensive test file to verify our OAuth2 server functionality.

```go
// main_test.go
package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/yourusername/oauth2-server/config"
	"github.com/yourusername/oauth2-server/handlers"
	"github.com/yourusername/oauth2-server/storage"
)

func TestClientCredentialsFlow(t *testing.T) {
	// Set up the test server
	cfg, _ := config.NewConfig()
	store := storage.NewMemoryStore()
	registerDemoClients(store)
	provider := buildOAuth2Provider(cfg, store)
	tokenHandler := handlers.NewTokenHandler(provider)

	// Build the token request
	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("scope", "read write")

	req := httptest.NewRequest(
		http.MethodPost,
		"/oauth2/token",
		strings.NewReader(form.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth("service-client", "service-secret")

	// Execute the request
	rec := httptest.NewRecorder()
	tokenHandler.HandleToken(rec, req)

	// Verify the response
	if rec.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rec.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if _, ok := response["access_token"]; !ok {
		t.Error("Response missing access_token")
	}

	if response["token_type"] != "bearer" {
		t.Errorf("Expected token_type 'bearer', got %v", response["token_type"])
	}
}

func TestTokenIntrospection(t *testing.T) {
	// Set up the test server
	cfg, _ := config.NewConfig()
	store := storage.NewMemoryStore()
	registerDemoClients(store)
	provider := buildOAuth2Provider(cfg, store)

	tokenHandler := handlers.NewTokenHandler(provider)
	introspectionHandler := handlers.NewIntrospectionHandler(provider)

	// First, obtain an access token
	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("scope", "read")

	tokenReq := httptest.NewRequest(
		http.MethodPost,
		"/oauth2/token",
		strings.NewReader(form.Encode()),
	)
	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	tokenReq.SetBasicAuth("service-client", "service-secret")

	tokenRec := httptest.NewRecorder()
	tokenHandler.HandleToken(tokenRec, tokenReq)

	var tokenResponse map[string]interface{}
	json.NewDecoder(tokenRec.Body).Decode(&tokenResponse)
	accessToken := tokenResponse["access_token"].(string)

	// Now introspect the token
	introspectForm := url.Values{}
	introspectForm.Set("token", accessToken)

	introspectReq := httptest.NewRequest(
		http.MethodPost,
		"/oauth2/introspect",
		strings.NewReader(introspectForm.Encode()),
	)
	introspectReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	introspectReq.SetBasicAuth("service-client", "service-secret")

	introspectRec := httptest.NewRecorder()
	introspectionHandler.HandleIntrospection(introspectRec, introspectReq)

	var introspectResponse map[string]interface{}
	json.NewDecoder(introspectRec.Body).Decode(&introspectResponse)

	if introspectResponse["active"] != true {
		t.Error("Expected token to be active")
	}
}
```

## Database Storage Implementation

For production use, implement a database-backed storage. Here is a PostgreSQL example.

```go
// storage/postgres.go
package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/ory/fosite"
	_ "github.com/lib/pq"
)

// PostgresStore implements fosite storage using PostgreSQL
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore creates a new PostgreSQL storage
func NewPostgresStore(connectionString string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &PostgresStore{db: db}, nil
}

// Schema returns the SQL schema for the OAuth2 tables
func (s *PostgresStore) Schema() string {
	return `
	CREATE TABLE IF NOT EXISTS oauth2_clients (
		id VARCHAR(255) PRIMARY KEY,
		secret_hash BYTEA,
		redirect_uris TEXT[],
		grant_types TEXT[],
		response_types TEXT[],
		scopes TEXT[],
		public BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS oauth2_access_tokens (
		signature VARCHAR(255) PRIMARY KEY,
		request_id VARCHAR(255),
		client_id VARCHAR(255),
		scopes TEXT[],
		granted_scopes TEXT[],
		session_data JSONB,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		expires_at TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS oauth2_refresh_tokens (
		signature VARCHAR(255) PRIMARY KEY,
		request_id VARCHAR(255),
		client_id VARCHAR(255),
		scopes TEXT[],
		granted_scopes TEXT[],
		session_data JSONB,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		expires_at TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS oauth2_authorization_codes (
		code VARCHAR(255) PRIMARY KEY,
		request_id VARCHAR(255),
		client_id VARCHAR(255),
		redirect_uri TEXT,
		scopes TEXT[],
		granted_scopes TEXT[],
		session_data JSONB,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		expires_at TIMESTAMP,
		used BOOLEAN DEFAULT FALSE
	);

	CREATE TABLE IF NOT EXISTS oauth2_pkce (
		signature VARCHAR(255) PRIMARY KEY,
		request_id VARCHAR(255),
		code_challenge VARCHAR(255),
		code_challenge_method VARCHAR(10),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX idx_access_tokens_request_id ON oauth2_access_tokens(request_id);
	CREATE INDEX idx_refresh_tokens_request_id ON oauth2_refresh_tokens(request_id);
	CREATE INDEX idx_authorization_codes_expires ON oauth2_authorization_codes(expires_at);
	`
}

// CreateAccessTokenSession stores an access token in the database
func (s *PostgresStore) CreateAccessTokenSession(
	ctx context.Context,
	signature string,
	request fosite.Requester,
) error {
	sessionData, _ := json.Marshal(request.GetSession())

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO oauth2_access_tokens
		(signature, request_id, client_id, scopes, granted_scopes, session_data, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`,
		signature,
		request.GetID(),
		request.GetClient().GetID(),
		request.GetRequestedScopes(),
		request.GetGrantedScopes(),
		sessionData,
		request.GetSession().GetExpiresAt(fosite.AccessToken),
	)

	return err
}

// Close closes the database connection
func (s *PostgresStore) Close() error {
	return s.db.Close()
}

// CleanupExpiredTokens removes expired tokens from the database
func (s *PostgresStore) CleanupExpiredTokens(ctx context.Context) error {
	now := time.Now()

	// Delete expired access tokens
	if _, err := s.db.ExecContext(ctx,
		"DELETE FROM oauth2_access_tokens WHERE expires_at < $1",
		now,
	); err != nil {
		return err
	}

	// Delete expired refresh tokens
	if _, err := s.db.ExecContext(ctx,
		"DELETE FROM oauth2_refresh_tokens WHERE expires_at < $1",
		now,
	); err != nil {
		return err
	}

	// Delete expired authorization codes
	if _, err := s.db.ExecContext(ctx,
		"DELETE FROM oauth2_authorization_codes WHERE expires_at < $1",
		now,
	); err != nil {
		return err
	}

	return nil
}
```

## Security Best Practices

When deploying your OAuth2 server to production, follow these security guidelines:

### Token Security
- Use short-lived access tokens (1 hour or less)
- Implement token rotation for refresh tokens
- Store tokens securely with proper encryption

### HTTPS Enforcement
```go
// middleware/security.go
package middleware

import (
	"net/http"
)

// RequireHTTPS redirects HTTP requests to HTTPS in production
func RequireHTTPS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Forwarded-Proto") == "http" {
			http.Redirect(w, r, "https://"+r.Host+r.URL.String(), http.StatusPermanentRedirect)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders adds security headers to responses
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Pragma", "no-cache")
		next.ServeHTTP(w, r)
	})
}
```

### Rate Limiting
```go
// middleware/ratelimit.go
package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// RateLimiter provides per-client rate limiting
type RateLimiter struct {
	clients map[string]*rate.Limiter
	mu      sync.RWMutex
	rate    rate.Limit
	burst   int
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(requestsPerSecond float64, burst int) *RateLimiter {
	return &RateLimiter{
		clients: make(map[string]*rate.Limiter),
		rate:    rate.Limit(requestsPerSecond),
		burst:   burst,
	}
}

// getLimiter returns the rate limiter for a client
func (rl *RateLimiter) getLimiter(clientID string) *rate.Limiter {
	rl.mu.RLock()
	limiter, exists := rl.clients[clientID]
	rl.mu.RUnlock()

	if exists {
		return limiter
	}

	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter = rate.NewLimiter(rl.rate, rl.burst)
	rl.clients[clientID] = limiter

	return limiter
}

// Middleware returns the rate limiting middleware
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientID := r.RemoteAddr

		if !rl.getLimiter(clientID).Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

## Conclusion

We have built a complete OAuth2 authorization server in Go using fosite. This implementation includes:

- Authorization code flow with PKCE support
- Client credentials flow for machine-to-machine authentication
- Refresh token handling for long-lived sessions
- Token introspection for resource server validation
- Custom storage implementations for both in-memory and database backends
- Security middleware for production deployments

The fosite library provides a solid foundation for building production-ready OAuth2 servers. Remember to thoroughly test your implementation and follow security best practices before deploying to production.

For more advanced features, consider adding:
- OpenID Connect support for identity federation
- JWT access tokens for stateless validation
- Dynamic client registration
- Token revocation endpoints
- Audit logging for security compliance

## Resources

- [fosite GitHub Repository](https://github.com/ory/fosite)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Token Introspection RFC 7662](https://tools.ietf.org/html/rfc7662)
