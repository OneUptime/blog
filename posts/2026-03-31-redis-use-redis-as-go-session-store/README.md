# How to Use Redis as Go Session Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Session, Authentication, Gorilla

Description: Implement server-side session storage in Go using Redis with the gorilla/sessions library and a Redis-backed store for scalable session management.

---

## Introduction

Go web applications commonly use cookies for session storage, but this has size limits and requires sending session data on every request. A Redis-backed session store keeps sessions on the server side, sharing them across multiple application instances. This guide implements Redis session storage with `gorilla/sessions` and `redisstore`.

## Dependencies

```bash
go get github.com/gorilla/sessions
go get github.com/rbcervilla/redisstore/v9
go get github.com/redis/go-redis/v9
```

## Session Store Setup

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/gorilla/sessions"
    "github.com/rbcervilla/redisstore/v9"
    "github.com/redis/go-redis/v9"
)

func NewSessionStore(redisAddr string) (*redisstore.RedisStore, error) {
    client := redis.NewClient(&redis.Options{
        Addr:     redisAddr,
        Password: "",
        DB:       1, // Dedicated DB for sessions
    })

    if err := client.Ping(context.Background()).Err(); err != nil {
        return nil, err
    }

    store, err := redisstore.NewRedisStore(context.Background(), client)
    if err != nil {
        return nil, err
    }

    store.KeyPrefix("session:")
    store.Options(sessions.Options{
        Path:     "/",
        MaxAge:   3600 * 2, // 2 hours
        HttpOnly: true,
        Secure:   false, // Set true in production with TLS
        SameSite: http.SameSiteLaxMode,
    })

    return store, nil
}
```

## Login Handler

```go
package main

import (
    "encoding/json"
    "net/http"

    "github.com/rbcervilla/redisstore/v9"
)

type SessionStore struct {
    store *redisstore.RedisStore
    name  string
}

func (ss *SessionStore) Login(w http.ResponseWriter, r *http.Request) {
    var creds struct {
        Email    string `json:"email"`
        Password string `json:"password"`
    }

    if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    user, err := authenticateUser(creds.Email, creds.Password)
    if err != nil {
        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    session, err := ss.store.Get(r, ss.name)
    if err != nil {
        http.Error(w, "Session error", http.StatusInternalServerError)
        return
    }

    session.Values["user_id"] = user.ID
    session.Values["user_email"] = user.Email
    session.Values["user_role"] = user.Role
    session.Values["logged_in"] = true

    if err := session.Save(r, w); err != nil {
        http.Error(w, "Failed to save session", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "logged in"})
}
```

## Middleware for Authentication

```go
func (ss *SessionStore) AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        session, err := ss.store.Get(r, ss.name)
        if err != nil || session.IsNew {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        loggedIn, ok := session.Values["logged_in"].(bool)
        if !ok || !loggedIn {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        // Add user info to context
        userID := session.Values["user_id"]
        ctx := context.WithValue(r.Context(), "user_id", userID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Profile and Logout Handlers

```go
func (ss *SessionStore) Profile(w http.ResponseWriter, r *http.Request) {
    session, _ := ss.store.Get(r, ss.name)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "user_id":  session.Values["user_id"],
        "email":    session.Values["user_email"],
        "role":     session.Values["user_role"],
    })
}

func (ss *SessionStore) Logout(w http.ResponseWriter, r *http.Request) {
    session, err := ss.store.Get(r, ss.name)
    if err != nil {
        http.Error(w, "Session error", http.StatusInternalServerError)
        return
    }

    // Mark session as expired
    session.Options.MaxAge = -1
    session.Save(r, w)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "logged out"})
}
```

## Wiring Up the Application

```go
func main() {
    store, err := NewSessionStore("localhost:6379")
    if err != nil {
        log.Fatal("Failed to create session store:", err)
    }

    ss := &SessionStore{store: store, name: "myapp-session"}

    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/login", ss.Login)
    mux.HandleFunc("POST /api/logout", ss.Logout)
    mux.Handle("GET /api/profile", ss.AuthMiddleware(http.HandlerFunc(ss.Profile)))

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

## Summary

Redis-backed sessions in Go are implemented with `gorilla/sessions` and `redisstore`, which stores session data as serialized values in Redis keyed by a random session ID sent to the client as a cookie. The `AuthMiddleware` checks for a valid session on protected routes. Calling `session.Options.MaxAge = -1` and saving invalidates the session server-side, immediately terminating access without waiting for cookie expiry.
