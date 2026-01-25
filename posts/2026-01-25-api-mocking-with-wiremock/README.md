# How to Implement API Mocking with WireMock

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireMock, API Mocking, Testing, Microservices, Service Virtualization, Java

Description: Learn how to implement API mocking with WireMock for isolated testing, including stub configuration, request matching, and integration testing patterns.

---

Testing services that depend on external APIs is challenging. The external service might be slow, rate-limited, or unavailable. It might not have a test environment. WireMock solves this by creating a mock server that simulates API responses. Your tests become fast, reliable, and independent of external systems.

## Installing WireMock

### Standalone Server

Download and run WireMock as a standalone server:

```bash
# Download WireMock
wget https://repo1.maven.org/maven2/org/wiremock/wiremock-standalone/3.3.1/wiremock-standalone-3.3.1.jar

# Run WireMock
java -jar wiremock-standalone-3.3.1.jar --port 8080

# Run with verbose logging
java -jar wiremock-standalone-3.3.1.jar --port 8080 --verbose
```

### Docker

Run WireMock in Docker:

```bash
# Run WireMock container
docker run -d \
  --name wiremock \
  -p 8080:8080 \
  -v $(pwd)/stubs:/home/wiremock \
  wiremock/wiremock:3.3.1

# With custom configuration
docker run -d \
  --name wiremock \
  -p 8080:8080 \
  -v $(pwd)/stubs:/home/wiremock \
  wiremock/wiremock:3.3.1 \
  --verbose \
  --global-response-templating
```

### Maven Dependency

For Java projects:

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.wiremock</groupId>
  <artifactId>wiremock</artifactId>
  <version>3.3.1</version>
  <scope>test</scope>
</dependency>
```

## Creating Stub Mappings

### JSON File Stubs

Create stub files in `mappings/` directory:

```json
// mappings/get-user.json
{
  "request": {
    "method": "GET",
    "urlPathPattern": "/api/users/[0-9]+"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

```json
// mappings/create-user.json
{
  "request": {
    "method": "POST",
    "url": "/api/users",
    "headers": {
      "Content-Type": {
        "equalTo": "application/json"
      }
    },
    "bodyPatterns": [
      {
        "matchesJsonPath": "$.name"
      },
      {
        "matchesJsonPath": "$.email"
      }
    ]
  },
  "response": {
    "status": 201,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "id": 456,
      "name": "{{jsonPath request.body '$.name'}}",
      "email": "{{jsonPath request.body '$.email'}}",
      "createdAt": "{{now}}"
    },
    "transformers": ["response-template"]
  }
}
```

### Static Response Files

Store large responses in `__files/` directory:

```json
// __files/products.json
[
  {
    "id": 1,
    "name": "Product A",
    "price": 29.99,
    "category": "Electronics"
  },
  {
    "id": 2,
    "name": "Product B",
    "price": 49.99,
    "category": "Home"
  }
]
```

Reference in mapping:

```json
// mappings/get-products.json
{
  "request": {
    "method": "GET",
    "url": "/api/products"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "bodyFileName": "products.json"
  }
}
```

## Request Matching

### URL Matching

```json
{
  "request": {
    // Exact URL match
    "url": "/api/users/123",

    // URL pattern with regex
    "urlPathPattern": "/api/users/[0-9]+",

    // URL with query parameters
    "urlPathTemplate": "/api/users/{userId}",

    // Match any URL starting with
    "urlPathPrefix": "/api/"
  }
}
```

### Query Parameter Matching

```json
{
  "request": {
    "method": "GET",
    "urlPath": "/api/search",
    "queryParameters": {
      "q": {
        "equalTo": "test"
      },
      "page": {
        "matches": "[0-9]+"
      },
      "limit": {
        "or": [
          { "equalTo": "10" },
          { "equalTo": "20" },
          { "equalTo": "50" }
        ]
      }
    }
  }
}
```

### Header Matching

```json
{
  "request": {
    "method": "GET",
    "url": "/api/protected",
    "headers": {
      "Authorization": {
        "matches": "Bearer .+"
      },
      "Accept": {
        "contains": "application/json"
      },
      "X-Request-ID": {
        "doesNotMatch": "^$"
      }
    }
  }
}
```

### Body Matching

```json
{
  "request": {
    "method": "POST",
    "url": "/api/orders",
    "bodyPatterns": [
      // JSON path exists
      { "matchesJsonPath": "$.items" },

      // JSON path with value
      { "matchesJsonPath": "$.items[?(@.quantity > 0)]" },

      // Exact JSON match
      {
        "equalToJson": {
          "orderId": "123",
          "status": "pending"
        },
        "ignoreExtraElements": true
      },

      // Contains substring
      { "contains": "product_id" },

      // Regex match
      { "matches": ".*\"email\":\"[^\"]+@[^\"]+\".*" }
    ]
  }
}
```

## Response Templating

Enable dynamic responses using Handlebars templates:

```json
{
  "request": {
    "method": "GET",
    "urlPathTemplate": "/api/users/{userId}"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "id": "{{request.pathSegments.[2]}}",
      "requestedAt": "{{now}}",
      "requestId": "{{randomValue type='UUID'}}",
      "userAgent": "{{request.headers.User-Agent}}"
    },
    "transformers": ["response-template"]
  }
}
```

### Template Helpers

```json
{
  "response": {
    "jsonBody": {
      // Current timestamp
      "timestamp": "{{now}}",
      "isoDate": "{{now format='yyyy-MM-dd'}}",

      // Random values
      "uuid": "{{randomValue type='UUID'}}",
      "number": "{{randomValue type='NUMERIC' length=6}}",
      "alphanumeric": "{{randomValue type='ALPHANUMERIC' length=10}}",

      // Request data
      "method": "{{request.method}}",
      "path": "{{request.path}}",
      "query": "{{request.query.param}}",
      "header": "{{request.headers.X-Custom}}",

      // JSON body extraction
      "bodyField": "{{jsonPath request.body '$.fieldName'}}",

      // Conditional
      "status": "{{#if (contains request.path 'admin')}}admin{{else}}user{{/if}}"
    },
    "transformers": ["response-template"]
  }
}
```

## Simulating Failures

### Delayed Response

```json
{
  "request": {
    "method": "GET",
    "url": "/api/slow"
  },
  "response": {
    "status": 200,
    "fixedDelayMilliseconds": 3000,
    "body": "Slow response"
  }
}
```

### Random Delay

```json
{
  "response": {
    "status": 200,
    "delayDistribution": {
      "type": "lognormal",
      "median": 1000,
      "sigma": 0.4
    }
  }
}
```

### Error Responses

```json
// mappings/server-error.json
{
  "request": {
    "method": "GET",
    "url": "/api/unstable"
  },
  "response": {
    "status": 500,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "error": "Internal Server Error",
      "message": "Something went wrong"
    }
  }
}
```

### Fault Injection

```json
{
  "request": {
    "method": "GET",
    "url": "/api/faulty"
  },
  "response": {
    "fault": "CONNECTION_RESET_BY_PEER"
  }
}
```

Available faults:
- `EMPTY_RESPONSE` - Return nothing and close connection
- `MALFORMED_RESPONSE_CHUNK` - Send garbage data
- `RANDOM_DATA_THEN_CLOSE` - Send random bytes then close
- `CONNECTION_RESET_BY_PEER` - Reset the connection

## Stateful Mocking

Simulate stateful behavior using scenarios:

```json
// First call returns pending
{
  "scenarioName": "Order Status",
  "requiredScenarioState": "Started",
  "newScenarioState": "Processing",
  "request": {
    "method": "GET",
    "url": "/api/orders/123"
  },
  "response": {
    "status": 200,
    "jsonBody": { "status": "pending" }
  }
}
```

```json
// Second call returns processing
{
  "scenarioName": "Order Status",
  "requiredScenarioState": "Processing",
  "newScenarioState": "Completed",
  "request": {
    "method": "GET",
    "url": "/api/orders/123"
  },
  "response": {
    "status": 200,
    "jsonBody": { "status": "processing" }
  }
}
```

```json
// Third call returns completed
{
  "scenarioName": "Order Status",
  "requiredScenarioState": "Completed",
  "request": {
    "method": "GET",
    "url": "/api/orders/123"
  },
  "response": {
    "status": 200,
    "jsonBody": { "status": "completed" }
  }
}
```

## Java Integration

Use WireMock in JUnit tests:

```java
// UserServiceTest.java
import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

@WireMockTest(httpPort = 8080)
class UserServiceTest {

    private final UserService userService = new UserService("http://localhost:8080");

    @Test
    void shouldGetUser() {
        // Setup stub
        stubFor(get(urlPathMatching("/api/users/[0-9]+"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("""
                    {
                        "id": 123,
                        "name": "John Doe",
                        "email": "john@example.com"
                    }
                    """)));

        // Execute
        User user = userService.getUser(123);

        // Verify
        assertEquals("John Doe", user.getName());

        // Verify request was made
        verify(getRequestedFor(urlPathMatching("/api/users/123"))
            .withHeader("Accept", containing("application/json")));
    }

    @Test
    void shouldHandleTimeout() {
        stubFor(get(urlEqualTo("/api/users/456"))
            .willReturn(aResponse()
                .withStatus(200)
                .withFixedDelay(5000))); // 5 second delay

        assertThrows(TimeoutException.class, () -> {
            userService.getUser(456);
        });
    }

    @Test
    void shouldHandleServerError() {
        stubFor(get(urlEqualTo("/api/users/789"))
            .willReturn(aResponse()
                .withStatus(500)
                .withBody("Internal Server Error")));

        assertThrows(ServerException.class, () -> {
            userService.getUser(789);
        });
    }
}
```

## Docker Compose for Testing

Set up WireMock with your test environment:

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  wiremock:
    image: wiremock/wiremock:3.3.1
    ports:
      - "8080:8080"
    volumes:
      - ./wiremock/mappings:/home/wiremock/mappings
      - ./wiremock/__files:/home/wiremock/__files
    command: --verbose --global-response-templating

  app:
    build: .
    environment:
      - EXTERNAL_API_URL=http://wiremock:8080
    depends_on:
      - wiremock

  tests:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - app
      - wiremock
```

## Best Practices

1. Keep stubs close to tests that use them
2. Use response templating for dynamic data
3. Simulate realistic error scenarios
4. Version control your stub mappings
5. Use scenarios for stateful workflows
6. Include realistic delays in stubs
7. Verify requests in tests, not just responses
8. Clean up stubs between tests

---

WireMock transforms flaky integration tests into reliable, fast unit tests. By simulating external services, you can test edge cases, error handling, and timeouts without depending on real systems. Start with simple stubs and gradually add complexity as your testing needs grow.
