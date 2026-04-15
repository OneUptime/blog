# How to Implement API Versioning with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API Versioning, Microservice, Architecture, REST

Description: Learn how to implement API versioning in Dapr microservices using URL path versioning, header-based versioning, and routing strategies that allow parallel version deployment.

---

## API Versioning in Microservices

API versioning allows you to evolve service contracts without breaking existing clients. In a Dapr architecture, versioning can be implemented at the service level (within the application code) or at the gateway level (via routing rules). Both approaches work well with Dapr service invocation.

## URL Path Versioning

The simplest approach - include the version in the URL path:

```go
// main.go - versioned API endpoints
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

type UserV1 struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type UserV2 struct {
    ID        string   `json:"id"`
    FirstName string   `json:"firstName"`
    LastName  string   `json:"lastName"`
    Email     string   `json:"email"`
    Tags      []string `json:"tags"`
}

func main() {
    r := gin.Default()

    // V1 API - legacy format
    v1 := r.Group("/v1")
    {
        v1.GET("/users/:id", getUserV1)
        v1.POST("/users", createUserV1)
    }

    // V2 API - new format with split name
    v2 := r.Group("/v2")
    {
        v2.GET("/users/:id", getUserV2)
        v2.POST("/users", createUserV2)
        v2.PUT("/users/:id/tags", addUserTagsV2)
    }

    r.Run(":8080")
}

func getUserV1(c *gin.Context) {
    user := UserV1{
        ID:    c.Param("id"),
        Name:  "John Doe",
        Email: "john@example.com",
    }
    c.JSON(http.StatusOK, user)
}

func getUserV2(c *gin.Context) {
    user := UserV2{
        ID:        c.Param("id"),
        FirstName: "John",
        LastName:  "Doe",
        Email:     "john@example.com",
        Tags:      []string{"premium"},
    }
    c.JSON(http.StatusOK, user)
}
```

## Header-Based Version Routing

Route to different app IDs based on the API version header:

```go
// version-router-middleware.go
func versionRouter(c *gin.Context) {
    apiVersion := c.GetHeader("API-Version")
    if apiVersion == "" {
        apiVersion = c.GetHeader("Accept-Version")
    }

    // Default to latest stable version
    if apiVersion == "" {
        apiVersion = "v2"
    }

    c.Set("api_version", apiVersion)
    c.Next()
}

func routeByVersion(daprClient dapr.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        version := c.GetString("api_version")
        appID := "user-service-" + version // e.g., user-service-v2

        body, _ := io.ReadAll(c.Request.Body)
        resp, err := daprClient.InvokeMethodWithContent(
            c.Request.Context(),
            appID,
            c.Request.URL.Path,
            c.Request.Method,
            &dapr.DataContent{
                ContentType: "application/json",
                Data:        body,
            },
        )
        if err != nil {
            c.JSON(502, gin.H{"error": err.Error()})
            return
        }
        c.Data(200, "application/json", resp)
    }
}
```

## Deploying Multiple Service Versions in Parallel

Run V1 and V2 as separate Kubernetes deployments:

```yaml
# user-service-v1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service-v1
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
      version: v1
  template:
    metadata:
      labels:
        app: user-service
        version: v1
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "user-service-v1"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: user-service
        image: myregistry/user-service:1.x
```

```yaml
# user-service-v2
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service-v2
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
      version: v2
  template:
    metadata:
      labels:
        app: user-service
        version: v2
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "user-service-v2"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: user-service
        image: myregistry/user-service:2.x
```

## Version Deprecation Policy

Document and enforce version deprecation:

```go
// Deprecation warning middleware
func deprecationWarning(version, sunsetDate string) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Deprecation", "@0")
        c.Header("Sunset", sunsetDate)
        c.Header("Link", `</v2/users>; rel="successor-version"`)
        c.Next()
    }
}

// Apply to V1 routes
v1.Use(deprecationWarning("v1", "Thu, 31 Dec 2026 23:59:59 GMT"))
```

## Summary

API versioning in Dapr microservices is best implemented using URL path versioning (`/v1/`, `/v2/`) within application code, with parallel Kubernetes deployments using distinct Dapr app IDs for each version. A gateway service can route requests to the appropriate versioned app ID based on URL path or the `API-Version` header. Add deprecation headers to old API versions with sunset dates to communicate migration timelines to clients, and keep old versions running until client migration is complete rather than forcing breaking changes.
