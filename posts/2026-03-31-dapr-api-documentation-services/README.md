# How to Implement API Documentation for Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API Documentation, OpenAPI, Swagger, Developer Experience

Description: Learn how to implement and serve OpenAPI documentation for Dapr microservices, including aggregating multiple service specs into a unified API portal.

---

## API Documentation for Dapr Microservices

Good API documentation is essential for developer experience and internal team efficiency. In a Dapr microservices architecture, each service owns its OpenAPI specification. A documentation portal aggregates all specs into a unified view using Dapr service invocation to fetch them.

## Adding OpenAPI Documentation to a Dapr Service

Use FastAPI (Python) which generates OpenAPI specs automatically:

```python
# user_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List

app = FastAPI(
    title="User Service API",
    description="Manages user profiles and preferences",
    version="2.0.0",
    contact={
        "name": "Platform Team",
        "email": "platform@myorg.com"
    },
    license_info={
        "name": "Internal",
    },
    openapi_tags=[
        {"name": "users", "description": "User profile operations"},
        {"name": "preferences", "description": "User preference management"},
    ]
)

class User(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: EmailStr
    tags: List[str] = []

class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr

@app.get("/users/{user_id}",
    response_model=User,
    tags=["users"],
    summary="Get user by ID",
    responses={
        404: {"description": "User not found"},
        200: {"description": "User profile"}
    })
async def get_user(user_id: str):
    """
    Retrieve a user profile by their unique identifier.
    Returns full user information including name, email, and tags.
    """
    # Implementation here
    return User(id=user_id, first_name="John", last_name="Doe",
                email="john@example.com")

@app.post("/users",
    response_model=User,
    status_code=201,
    tags=["users"],
    summary="Create a new user")
async def create_user(request: CreateUserRequest):
    """Create a new user account. Returns the created user with generated ID."""
    return User(id="new-id", **request.model_dump())
```

## Serving OpenAPI Spec via Dapr Endpoint

Add a dedicated endpoint that serves the OpenAPI spec for aggregation:

```python
@app.get("/openapi.json", include_in_schema=False)
async def get_openapi():
    return app.openapi()
```

## Building an API Documentation Portal

Create a gateway service that aggregates all service specs using Dapr invocation:

```go
// docs-portal.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"

    "github.com/gin-gonic/gin"
    dapr "github.com/dapr/go-sdk/client"
)

type ServiceRegistry struct {
    Services map[string]string `json:"services"` // display name -> app-id
}

var registry = ServiceRegistry{
    Services: map[string]string{
        "User Service":    "user-service",
        "Order Service":   "order-service",
        "Payment Service": "payment-service",
        "Product Service": "product-service",
    },
}

func getAggregatedSpecs(client dapr.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        specs := make(map[string]interface{})
        var mu sync.Mutex
        var wg sync.WaitGroup

        for name, appID := range registry.Services {
            wg.Add(1)
            go func(displayName, id string) {
                defer wg.Done()
                resp, err := client.InvokeMethod(
                    c.Request.Context(), id, "openapi.json", "GET")
                if err != nil {
                    log.Printf("Failed to fetch spec for %s: %v", id, err)
                    return
                }

                var spec interface{}
                if err := json.Unmarshal(resp, &spec); err == nil {
                    mu.Lock()
                    specs[displayName] = spec
                    mu.Unlock()
                }
            }(name, appID)
        }

        wg.Wait()
        c.JSON(http.StatusOK, specs)
    }
}

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    r := gin.Default()

    // Serve Swagger UI
    r.Static("/docs", "./swagger-ui/dist")
    r.GET("/specs", getAggregatedSpecs(client))
    r.GET("/specs/:service", func(c *gin.Context) {
        service := c.Param("service")
        appID := registry.Services[service]
        resp, _ := client.InvokeMethod(c.Request.Context(), appID, "openapi.json", "GET")
        c.Data(200, "application/json", resp)
    })

    log.Fatal(r.Run(":8090"))
}
```

## Hosting Swagger UI for Each Service

Deploy a Swagger UI instance per service using Nginx:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: swagger-ui-config
  namespace: production
data:
  nginx.conf: |
    server {
      listen 80;
      root /usr/share/nginx/html;

      location / {
        try_files $uri $uri/ /index.html;
      }

      location /openapi.json {
        proxy_pass http://localhost:3500/v1.0/invoke/user-service/method/openapi.json;
      }
    }
```

## Automating Spec Validation in CI

```bash
# .github/workflows/validate-openapi.yaml steps
- name: Validate OpenAPI spec
  run: |
    pip install openapi-spec-validator
    python -c "
    import json
    from openapi_spec_validator import validate
    from openapi_spec_validator.readers import read_from_filename
    spec, *_ = read_from_filename('openapi.json')
    validate(spec)
    print('OpenAPI spec is valid')
    "
```

## Summary

Implementing API documentation for Dapr services requires each service to expose a `/openapi.json` endpoint (FastAPI generates this automatically) and a centralized documentation portal that uses Dapr service invocation to aggregate all specs into a unified view. Serve Swagger UI from the portal for interactive documentation, validate OpenAPI specs in CI to catch specification errors early, and keep documentation current by generating it from code annotations rather than maintaining separate YAML files.
