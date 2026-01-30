# How to Implement OAuth2 Client in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, OAuth2, Authentication, Security

Description: Learn how to implement OAuth2 client flows in Go for authenticating with external services like Google, GitHub, and custom providers.

---

OAuth2 is the industry standard protocol for authorization. It allows applications to access user data from external services without exposing user credentials. In this post, we will build an OAuth2 client in Go that authenticates with GitHub.

## Understanding OAuth2 Basics

OAuth2 defines four key roles:

- **Resource Owner**: The user who owns the data
- **Client**: Your application requesting access
- **Authorization Server**: Issues tokens after authenticating the user
- **Resource Server**: Hosts the protected resources (APIs)

The most common flow for web applications is the Authorization Code Flow. Here is how it works:

1. User clicks "Login with GitHub"
2. App redirects user to GitHub's authorization endpoint
3. User grants permission
4. GitHub redirects back with an authorization code
5. App exchanges the code for an access token
6. App uses the token to access GitHub APIs

## Setting Up the OAuth2 Package

Go provides an official OAuth2 package that handles most of the heavy lifting:

```bash
go get golang.org/x/oauth2
```

## Building the OAuth2 Client

Let's create a complete OAuth2 client that authenticates with GitHub:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"

    "golang.org/x/oauth2"
    "golang.org/x/oauth2/github"
)

// TokenStore handles secure token persistence
type TokenStore struct {
    filePath string
}

// Save writes the token to a file
// In production, use encrypted storage or a secrets manager
func (ts *TokenStore) Save(token *oauth2.Token) error {
    data, err := json.Marshal(token)
    if err != nil {
        return err
    }
    return os.WriteFile(ts.filePath, data, 0600)
}

// Load reads the token from a file
func (ts *TokenStore) Load() (*oauth2.Token, error) {
    data, err := os.ReadFile(ts.filePath)
    if err != nil {
        return nil, err
    }
    var token oauth2.Token
    if err := json.Unmarshal(data, &token); err != nil {
        return nil, err
    }
    return &token, nil
}

var (
    // Configure OAuth2 with GitHub endpoints
    oauthConfig = &oauth2.Config{
        ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
        ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
        Scopes:       []string{"user:email", "read:user"},
        Endpoint:     github.Endpoint,
        RedirectURL:  "http://localhost:8080/callback",
    }

    // State parameter prevents CSRF attacks
    // In production, generate a random string per request
    oauthStateString = "random-state-string"

    tokenStore = &TokenStore{filePath: "token.json"}
)

func main() {
    http.HandleFunc("/", handleHome)
    http.HandleFunc("/login", handleLogin)
    http.HandleFunc("/callback", handleCallback)
    http.HandleFunc("/user", handleUser)

    fmt.Println("Server starting on http://localhost:8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleHome(w http.ResponseWriter, r *http.Request) {
    html := `<html>
        <body>
            <a href="/login">Login with GitHub</a>
        </body>
    </html>`
    fmt.Fprint(w, html)
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
    // Generate the authorization URL
    url := oauthConfig.AuthCodeURL(oauthStateString)
    http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleCallback(w http.ResponseWriter, r *http.Request) {
    // Verify state parameter to prevent CSRF
    state := r.FormValue("state")
    if state != oauthStateString {
        http.Error(w, "Invalid state parameter", http.StatusBadRequest)
        return
    }

    // Extract the authorization code
    code := r.FormValue("code")
    if code == "" {
        http.Error(w, "Code not found", http.StatusBadRequest)
        return
    }

    // Exchange the code for an access token
    token, err := oauthConfig.Exchange(context.Background(), code)
    if err != nil {
        http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Store the token securely
    if err := tokenStore.Save(token); err != nil {
        log.Printf("Failed to save token: %v", err)
    }

    http.Redirect(w, r, "/user", http.StatusTemporaryRedirect)
}

func handleUser(w http.ResponseWriter, r *http.Request) {
    // Load the stored token
    token, err := tokenStore.Load()
    if err != nil {
        http.Error(w, "Not authenticated", http.StatusUnauthorized)
        return
    }

    // Create an HTTP client with automatic token refresh
    client := oauthConfig.Client(context.Background(), token)

    // Fetch user information from GitHub API
    resp, err := client.Get("https://api.github.com/user")
    if err != nil {
        http.Error(w, "Failed to fetch user: "+err.Error(), http.StatusInternalServerError)
        return
    }
    defer resp.Body.Close()

    var user map[string]interface{}
    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
        http.Error(w, "Failed to decode response", http.StatusInternalServerError)
        return
    }

    // Display user information
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}
```

## Token Refresh Handling

The OAuth2 package automatically handles token refresh when you use `oauthConfig.Client()`. This method returns an HTTP client that:

1. Attaches the access token to every request
2. Checks if the token is expired before making requests
3. Uses the refresh token to obtain a new access token when needed
4. Updates the token in memory after refresh

For persistent token refresh, you need to save the updated token after each request:

```go
// RefreshableClient wraps the OAuth2 client with token persistence
func RefreshableClient(ctx context.Context, token *oauth2.Token) *http.Client {
    // TokenSource automatically refreshes expired tokens
    tokenSource := oauthConfig.TokenSource(ctx, token)

    // Wrap the token source to save refreshed tokens
    savingSource := &SavingTokenSource{
        source: tokenSource,
        store:  tokenStore,
    }

    return oauth2.NewClient(ctx, savingSource)
}

// SavingTokenSource saves the token whenever it gets refreshed
type SavingTokenSource struct {
    source oauth2.TokenSource
    store  *TokenStore
}

func (s *SavingTokenSource) Token() (*oauth2.Token, error) {
    token, err := s.source.Token()
    if err != nil {
        return nil, err
    }

    // Save the potentially refreshed token
    if err := s.store.Save(token); err != nil {
        log.Printf("Warning: failed to save token: %v", err)
    }

    return token, nil
}
```

## Secure Token Storage Best Practices

Storing tokens securely is critical. Here are recommendations for different environments:

**Development**: File-based storage with restricted permissions (as shown above)

**Production Web Apps**: Store tokens in an encrypted database column or use a secrets manager like HashiCorp Vault

**Production Microservices**: Use environment variables or mounted secrets in Kubernetes

Never store tokens in:
- Plain text configuration files
- Version control
- Browser local storage (for server-side apps)
- Log files

## Setting Up GitHub OAuth App

Before running the code, create a GitHub OAuth App:

1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Click "New OAuth App"
3. Set the callback URL to `http://localhost:8080/callback`
4. Copy the Client ID and Client Secret
5. Export them as environment variables:

```bash
export GITHUB_CLIENT_ID="your-client-id"
export GITHUB_CLIENT_SECRET="your-client-secret"
go run main.go
```

## Conclusion

Implementing OAuth2 in Go is straightforward with the `golang.org/x/oauth2` package. The key steps are: configuring the OAuth2 client with provider endpoints, implementing the authorization code flow with proper state validation, and storing tokens securely with automatic refresh handling. This pattern works with any OAuth2 provider by simply changing the endpoint configuration.
