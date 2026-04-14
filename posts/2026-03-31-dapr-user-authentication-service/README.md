# How to Build a User Authentication Service with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Authentication, JWT, Secret, State

Description: Learn how to build a secure user authentication service using Dapr secrets management, state storage for sessions, and service invocation for auth validation.

---

## Overview

A Dapr-powered authentication service manages user credentials, issues JWTs, handles sessions with secure state storage, and exposes a validation endpoint that other services invoke via Dapr service invocation. Dapr secrets management keeps credentials out of your code.

## Secrets Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.kubernetes
  version: v1
```

Create the JWT signing secret:

```bash
kubectl create secret generic auth-secrets \
  --from-literal=jwtSigningKey=$(openssl rand -base64 64)
```

## Authentication Service

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
    dapr "github.com/dapr/go-sdk/client"
)

type AuthService struct {
    daprClient dapr.Client
    jwtSecret  []byte
}

func NewAuthService() (*AuthService, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return nil, err
    }

    // Retrieve JWT signing key from Dapr secrets
    secret, err := client.GetSecret(
        context.Background(),
        "secretstore",
        "auth-secrets",
        nil,
    )
    if err != nil {
        return nil, err
    }

    return &AuthService{
        daprClient: client,
        jwtSecret:  []byte(secret["jwtSigningKey"]),
    }, nil
}
```

## User Registration

```go
type RegisterRequest struct {
    Email    string `json:"email"`
    Password string `json:"password"`
    Name     string `json:"name"`
}

func (svc *AuthService) HandleRegister(w http.ResponseWriter, r *http.Request) {
    var req RegisterRequest
    json.NewDecoder(r.Body).Decode(&req)

    // Check if user exists
    existing, _ := svc.daprClient.GetState(
        context.Background(), "statestore", "user:"+req.Email, nil,
    )
    if existing.Value != nil {
        http.Error(w, "user already exists", http.StatusConflict)
        return
    }

    // Hash password
    hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        http.Error(w, "server error", 500)
        return
    }

    user := map[string]any{
        "id":           generateID(),
        "email":        req.Email,
        "name":         req.Name,
        "passwordHash": string(hashed),
        "createdAt":    time.Now().Unix(),
    }

    data, _ := json.Marshal(user)
    svc.daprClient.SaveState(context.Background(), "statestore", "user:"+req.Email, data, nil)

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "user created"})
}
```

## Login and JWT Issuance

```go
func (svc *AuthService) HandleLogin(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    // Load user
    item, err := svc.daprClient.GetState(
        context.Background(), "statestore", "user:"+req.Email, nil,
    )
    if err != nil || item.Value == nil {
        http.Error(w, "invalid credentials", http.StatusUnauthorized)
        return
    }

    var user map[string]any
    json.Unmarshal(item.Value, &user)

    // Verify password
    if err := bcrypt.CompareHashAndPassword(
        []byte(user["passwordHash"].(string)),
        []byte(req.Password),
    ); err != nil {
        http.Error(w, "invalid credentials", http.StatusUnauthorized)
        return
    }

    // Issue JWT
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "sub":   user["id"],
        "email": user["email"],
        "name":  user["name"],
        "iat":   time.Now().Unix(),
        "exp":   time.Now().Add(24 * time.Hour).Unix(),
    })

    tokenString, _ := token.SignedString(svc.jwtSecret)

    // Store session
    svc.daprClient.SaveState(
        context.Background(),
        "statestore",
        "session:"+tokenString[:16],
        []byte(user["id"].(string)),
        nil,
    )

    json.NewEncoder(w).Encode(map[string]string{
        "token": tokenString,
        "type":  "Bearer",
    })
}
```

## Token Validation Endpoint (Called by Other Services)

```go
func (svc *AuthService) HandleValidate(w http.ResponseWriter, r *http.Request) {
    var req struct{ Token string `json:"token"` }
    json.NewDecoder(r.Body).Decode(&req)

    token, err := jwt.Parse(req.Token, func(t *jwt.Token) (interface{}, error) {
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method")
        }
        return svc.jwtSecret, nil
    })

    if err != nil || !token.Valid {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]bool{"valid": false})
        return
    }

    claims := token.Claims.(jwt.MapClaims)
    json.NewEncoder(w).Encode(map[string]any{
        "valid":  true,
        "userId": claims["sub"],
        "email":  claims["email"],
    })
}
```

## Summary

Dapr provides secure secret management, durable state storage for users and sessions, and service invocation for token validation across microservices. By storing JWT signing keys in Dapr's secret store rather than environment variables or config maps, credentials remain protected. Other services validate tokens by invoking the auth service via Dapr, getting mTLS protection for free.
