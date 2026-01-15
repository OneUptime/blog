# How to Debug Network Requests in React Native with Flipper

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Flipper, Network Debugging, API, Mobile Development, Debugging

Description: Learn how to effectively debug network requests in React Native using Flipper's network inspector for faster API troubleshooting.

---

Debugging network requests is one of the most critical skills for React Native developers. Whether you're integrating REST APIs, handling GraphQL queries, or troubleshooting WebSocket connections, having the right tools can save hours of frustration. Flipper, developed by Meta, has become the go-to debugging platform for React Native applications, and its network inspection capabilities are particularly powerful.

In this comprehensive guide, we'll explore everything you need to know about debugging network requests in React Native using Flipper's network inspector.

## Table of Contents

1. [Introduction to Flipper](#introduction-to-flipper)
2. [Setting Up Flipper Network Plugin](#setting-up-flipper-network-plugin)
3. [Inspecting HTTP Requests and Responses](#inspecting-http-requests-and-responses)
4. [Viewing Request Headers and Body](#viewing-request-headers-and-body)
5. [Response Timing Analysis](#response-timing-analysis)
6. [Filtering and Searching Requests](#filtering-and-searching-requests)
7. [Mocking API Responses](#mocking-api-responses)
8. [Debugging Failed Requests](#debugging-failed-requests)
9. [SSL Certificate Issues](#ssl-certificate-issues)
10. [GraphQL Request Debugging](#graphql-request-debugging)
11. [WebSocket Inspection](#websocket-inspection)
12. [Exporting Network Logs](#exporting-network-logs)
13. [Common Network Issues and Solutions](#common-network-issues-and-solutions)
14. [Best Practices](#best-practices)
15. [Conclusion](#conclusion)

---

## Introduction to Flipper

Flipper is an extensible mobile app debugging platform created by Meta (formerly Facebook). It provides a desktop application that connects to your iOS and Android apps, offering various debugging tools including:

- Network inspection
- Layout inspection
- Database browsing
- Log viewing
- Crash reporting
- Custom plugin support

The network plugin is particularly valuable because it provides a Chrome DevTools-like experience for mobile network debugging, something that was previously difficult to achieve in React Native development.

### Why Flipper for Network Debugging?

Before Flipper, developers often relied on:

- `console.log` statements to print request data
- Charles Proxy or similar tools
- React Native Debugger
- Network interceptors in code

Flipper offers advantages over these approaches:

- **Native integration**: Works directly with React Native without proxies
- **Low overhead**: Minimal performance impact compared to proxied debugging
- **Rich interface**: Visual inspection of requests, responses, and timing
- **Plugin ecosystem**: Extensible with custom plugins
- **Cross-platform**: Works for both iOS and Android

---

## Setting Up Flipper Network Plugin

### Prerequisites

Before getting started, ensure you have:

1. React Native 0.62 or higher (Flipper is included by default)
2. Flipper desktop application installed
3. Your development environment set up for React Native

### Installing Flipper Desktop

Download Flipper from the official website or install via package managers:

```bash
# macOS with Homebrew
brew install --cask flipper

# Or download directly from
# https://fbflipper.com/
```

### Enabling Network Plugin in React Native

For React Native 0.62+, Flipper comes pre-configured. However, you need to ensure the network plugin is properly set up.

#### iOS Setup

Check your `ios/Podfile` for Flipper configuration:

```ruby
# ios/Podfile
use_flipper!({ 'Flipper' => '0.182.0' })

post_install do |installer|
  flipper_post_install(installer)
  # ... other configurations
end
```

Run pod install:

```bash
cd ios && pod install && cd ..
```

#### Android Setup

Verify your `android/app/build.gradle`:

```gradle
dependencies {
    // Flipper dependencies
    debugImplementation("com.facebook.flipper:flipper:${FLIPPER_VERSION}") {
        exclude group:'com.facebook.fbjni'
    }
    debugImplementation("com.facebook.flipper:flipper-network-plugin:${FLIPPER_VERSION}") {
        exclude group:'com.facebook.flipper'
    }
}
```

#### Configuring the Network Plugin

In your React Native app, configure the network plugin in your entry file:

```typescript
// index.js or App.tsx
import { Platform } from 'react-native';

if (__DEV__) {
  // Network plugin is automatically enabled in debug builds
  // but you can add custom configuration here
}
```

For advanced configuration with fetch interceptors:

```typescript
// flipperConfig.ts
import { addPlugin } from 'react-native-flipper';

if (__DEV__) {
  // Custom network configuration if needed
  const networkPlugin = require('flipper-plugin-network');

  // Configure options
  networkPlugin.configure({
    // Options here
  });
}
```

### Verifying the Connection

1. Start your React Native app in development mode
2. Open Flipper desktop application
3. Your app should appear in the left sidebar
4. Click on "Network" in the plugin list

You should see the Network plugin interface ready to capture requests.

---

## Inspecting HTTP Requests and Responses

Once connected, Flipper captures all HTTP/HTTPS traffic from your app automatically.

### The Network Plugin Interface

The interface consists of several key areas:

1. **Request List**: Shows all captured requests with basic info
2. **Request Details Panel**: Detailed view of selected request
3. **Filter Bar**: Search and filter options
4. **Timeline View**: Visual representation of request timing

### Understanding Request Information

Each request in the list shows:

- **Method**: GET, POST, PUT, DELETE, PATCH, etc.
- **Status Code**: HTTP response status (200, 404, 500, etc.)
- **URL**: The endpoint being called
- **Duration**: Time taken for the request
- **Size**: Response payload size

### Viewing Request Details

Click on any request to see detailed information:

```typescript
// Example API call in your app
const fetchUserData = async (userId: string) => {
  try {
    const response = await fetch(`https://api.example.com/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};
```

In Flipper, this request will show:

- Full URL with path parameters
- All request headers
- Response headers
- Response body (formatted JSON)
- Timing breakdown

---

## Viewing Request Headers and Body

### Request Headers

Flipper displays all headers sent with your request:

```typescript
// Headers visible in Flipper
{
  "Authorization": "Bearer token123",
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "ReactNative/0.72.0",
  "Accept-Encoding": "gzip, deflate",
  "Connection": "keep-alive"
}
```

### Request Body

For POST/PUT/PATCH requests, Flipper shows the request body:

```typescript
// Example POST request
const createUser = async (userData: UserData) => {
  const response = await fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: userData.name,
      email: userData.email,
      role: userData.role,
    }),
  });

  return response.json();
};
```

In Flipper, you'll see the body formatted as:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin"
}
```

### Response Headers and Body

Response information includes:

```typescript
// Response headers visible in Flipper
{
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-cache",
  "X-Request-Id": "abc123",
  "Date": "Thu, 15 Jan 2026 10:30:00 GMT",
  "Content-Length": "256"
}

// Response body
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### Binary Data

For binary responses (images, files), Flipper shows:

- Content type
- Size information
- Preview (for images)
- Download option

---

## Response Timing Analysis

Understanding request timing is crucial for performance optimization.

### Timing Breakdown

Flipper provides detailed timing information:

1. **DNS Lookup**: Time to resolve domain name
2. **Connection**: TCP connection establishment
3. **SSL Handshake**: HTTPS encryption setup
4. **Time to First Byte (TTFB)**: Server processing time
5. **Content Download**: Time to receive response body
6. **Total Time**: Complete request duration

### Analyzing Slow Requests

```typescript
// Example: Identifying slow requests
const fetchLargeDataset = async () => {
  const startTime = performance.now();

  const response = await fetch('https://api.example.com/large-dataset', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  const endTime = performance.now();

  console.log(`Request took ${endTime - startTime}ms`);
  return data;
};
```

In Flipper, you can identify:

- Slow server responses (high TTFB)
- Large payload downloads
- Connection issues
- SSL negotiation delays

### Timeline Visualization

The timeline view shows requests in chronological order, helping identify:

- Sequential vs parallel requests
- Request blocking
- Waterfall patterns
- Optimal request batching opportunities

---

## Filtering and Searching Requests

With many requests in your app, filtering becomes essential.

### Text Search

Use the search bar to filter by:

- URL path
- Domain name
- Request method
- Status code

```
// Search examples
/api/users        # Filter by path
api.example.com   # Filter by domain
POST              # Filter by method
500               # Filter by status
```

### Status Code Filters

Quick filters for common scenarios:

- **All**: Show all requests
- **2xx**: Successful responses
- **3xx**: Redirects
- **4xx**: Client errors
- **5xx**: Server errors
- **Failed**: Network failures

### Method Filters

Filter by HTTP method:

```typescript
// Different request types you might filter
GET    // Data retrieval
POST   // Data creation
PUT    // Full updates
PATCH  // Partial updates
DELETE // Deletions
```

### Custom Filters

Create complex filters:

```
// Combine filters
domain:api.example.com method:POST status:>=400
```

### Saving Filter Presets

For frequently used filters, save presets:

1. Configure your filter
2. Click "Save Filter"
3. Name your preset
4. Access quickly from dropdown

---

## Mocking API Responses

Flipper allows you to mock API responses for testing.

### Setting Up Mock Responses

```typescript
// In Flipper, you can mock this endpoint
const fetchProducts = async () => {
  const response = await fetch('https://api.example.com/products');
  return response.json();
};
```

### Creating a Mock

1. Right-click on a request in Flipper
2. Select "Mock Response"
3. Configure the mock:

```json
{
  "status": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "products": [
      {
        "id": "mock_1",
        "name": "Mock Product",
        "price": 99.99
      }
    ],
    "total": 1
  }
}
```

### Use Cases for Mocking

1. **Testing error handling**:

```json
{
  "status": 500,
  "body": {
    "error": "Internal Server Error",
    "message": "Database connection failed"
  }
}
```

2. **Testing edge cases**:

```json
{
  "status": 200,
  "body": {
    "products": [],
    "total": 0
  }
}
```

3. **Testing slow responses**:

Configure response delay to simulate network latency.

4. **Testing offline scenarios**:

Mock network failures to test offline handling.

---

## Debugging Failed Requests

Failed requests are common during development. Flipper helps identify issues quickly.

### Common Failure Types

#### Network Errors

```typescript
// Example handling network errors
const fetchWithRetry = async (url: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

In Flipper, failed requests show:

- Error type (timeout, connection refused, etc.)
- Error message
- Stack trace if available

#### HTTP Errors

For 4xx and 5xx responses:

```typescript
// Flipper shows the full error response
{
  "status": 401,
  "body": {
    "error": "Unauthorized",
    "message": "Invalid or expired token"
  }
}
```

### Debugging Steps

1. **Check the request URL**: Verify path and query parameters
2. **Inspect headers**: Ensure authentication tokens are present
3. **Review request body**: Validate JSON structure
4. **Examine response**: Read error messages from server
5. **Check timing**: Identify timeout issues

### Replay Requests

Flipper allows you to replay requests:

1. Right-click on a request
2. Select "Replay"
3. Optionally modify headers or body
4. Send the request again

This is useful for testing fixes without restarting your app.

---

## SSL Certificate Issues

HTTPS connections can fail due to certificate problems.

### Common SSL Issues

#### Development Certificates

```typescript
// For development with self-signed certificates
// Add to your network configuration

// iOS: Info.plist
// <key>NSAppTransportSecurity</key>
// <dict>
//   <key>NSAllowsArbitraryLoads</key>
//   <true/>
// </dict>

// Android: network_security_config.xml
// <network-security-config>
//   <debug-overrides>
//     <trust-anchors>
//       <certificates src="user" />
//     </trust-anchors>
//   </debug-overrides>
// </network-security-config>
```

#### Certificate Pinning

If using certificate pinning:

```typescript
// Example with react-native-ssl-pinning
import { fetch as sslFetch } from 'react-native-ssl-pinning';

const secureFetch = async (url: string) => {
  return sslFetch(url, {
    method: 'GET',
    sslPinning: {
      certs: ['cert1', 'cert2'],
    },
  });
};
```

### Diagnosing SSL Issues in Flipper

Flipper shows SSL errors including:

- Certificate validation failures
- Hostname mismatches
- Expired certificates
- Untrusted certificate authorities

### Solutions

1. **Development**: Configure ATS (iOS) or network security config (Android)
2. **Production**: Ensure valid certificates
3. **Certificate pinning**: Update pins when certificates rotate

---

## GraphQL Request Debugging

GraphQL requests have unique characteristics that Flipper handles well.

### Inspecting GraphQL Queries

```typescript
// Example GraphQL query
const fetchUserProfile = async (userId: string) => {
  const query = `
    query GetUserProfile($id: ID!) {
      user(id: $id) {
        id
        name
        email
        posts {
          id
          title
          createdAt
        }
      }
    }
  `;

  const response = await fetch('https://api.example.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { id: userId },
    }),
  });

  return response.json();
};
```

### What Flipper Shows

In Flipper, GraphQL requests display:

**Request Body:**
```json
{
  "query": "query GetUserProfile($id: ID!) { ... }",
  "variables": {
    "id": "user_123"
  }
}
```

**Response Body:**
```json
{
  "data": {
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "posts": []
    }
  }
}
```

### Debugging GraphQL Errors

GraphQL errors appear in the response:

```json
{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 3, "column": 5 }],
      "path": ["user"]
    }
  ]
}
```

### Mutations

```typescript
// GraphQL mutation
const createPost = async (title: string, content: string) => {
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        title
        createdAt
      }
    }
  `;

  const response = await fetch('https://api.example.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: { title, content },
      },
    }),
  });

  return response.json();
};
```

---

## WebSocket Inspection

Modern apps often use WebSockets for real-time features.

### WebSocket Support in Flipper

Flipper can inspect WebSocket connections:

```typescript
// Example WebSocket connection
const connectWebSocket = () => {
  const ws = new WebSocket('wss://api.example.com/socket');

  ws.onopen = () => {
    console.log('Connected');
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'notifications',
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('Disconnected');
  };

  return ws;
};
```

### Viewing WebSocket Data

Flipper shows:

- Connection status
- Messages sent and received
- Message timestamps
- Connection duration
- Close reasons

### WebSocket Message Format

```json
// Sent message
{
  "type": "subscribe",
  "channel": "notifications"
}

// Received message
{
  "type": "notification",
  "data": {
    "id": "notif_123",
    "message": "New message received"
  }
}
```

### Debugging WebSocket Issues

Common issues visible in Flipper:

1. **Connection failures**: Server unreachable
2. **Authentication errors**: Invalid tokens
3. **Message parsing errors**: Malformed JSON
4. **Unexpected disconnections**: Server closes connection

---

## Exporting Network Logs

Flipper allows exporting network data for sharing and documentation.

### Export Options

#### Export as HAR File

HAR (HTTP Archive) format is widely supported:

1. Select requests to export
2. Click "Export" or right-click menu
3. Choose "Export as HAR"
4. Save the .har file

HAR files can be opened in:

- Chrome DevTools
- Firefox Developer Tools
- HAR analyzers

#### Export as cURL

Convert requests to cURL commands:

```bash
# Exported cURL command
curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token123' \
  -d '{"name":"John","email":"john@example.com"}'
```

This is useful for:

- Sharing with backend developers
- Testing in terminal
- Documentation

### Sharing Network Logs

For bug reports:

1. Export relevant requests
2. Sanitize sensitive data (tokens, personal info)
3. Include in bug report
4. Provide context about the issue

---

## Common Network Issues and Solutions

### Issue 1: CORS Errors

**Symptom**: Requests fail with CORS error in logs.

**Note**: CORS is primarily a browser concern, but similar issues can occur with misconfigured proxies.

**Solution**:

```typescript
// Ensure proper headers are sent
const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    // Include required headers
  },
});
```

### Issue 2: Authentication Failures

**Symptom**: 401 Unauthorized responses.

**Debugging in Flipper**:
- Check Authorization header presence
- Verify token format
- Check token expiration

**Solution**:

```typescript
// Token refresh handling
const fetchWithAuth = async (url: string) => {
  let token = await getStoredToken();

  if (isTokenExpired(token)) {
    token = await refreshToken();
  }

  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

### Issue 3: Timeout Errors

**Symptom**: Requests hang and eventually fail.

**Debugging in Flipper**:
- Check timing breakdown
- Identify slow phase (DNS, connection, response)

**Solution**:

```typescript
// Add timeout handling
const fetchWithTimeout = async (url: string, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};
```

### Issue 4: Large Response Handling

**Symptom**: Memory issues with large responses.

**Solution**:

```typescript
// Implement pagination
const fetchPaginated = async (page = 1, limit = 50) => {
  const response = await fetch(
    `https://api.example.com/items?page=${page}&limit=${limit}`
  );
  return response.json();
};
```

### Issue 5: Request Deduplication

**Symptom**: Duplicate requests visible in Flipper.

**Solution**:

```typescript
// Implement request caching
const requestCache = new Map();

const fetchWithCache = async (url: string) => {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }

  const promise = fetch(url).then(r => r.json());
  requestCache.set(url, promise);

  // Clear cache after response
  promise.finally(() => {
    setTimeout(() => requestCache.delete(url), 5000);
  });

  return promise;
};
```

### Issue 6: Network State Changes

**Symptom**: Requests fail when network changes.

**Solution**:

```typescript
// Use NetInfo to handle network changes
import NetInfo from '@react-native-community/netinfo';

const fetchWithNetworkCheck = async (url: string) => {
  const state = await NetInfo.fetch();

  if (!state.isConnected) {
    throw new Error('No network connection');
  }

  return fetch(url);
};
```

---

## Best Practices

### 1. Keep Flipper Updated

Regularly update Flipper for bug fixes and new features:

```bash
brew upgrade flipper
```

### 2. Use Descriptive Request Names

When possible, add custom names to requests:

```typescript
// Add custom headers for identification
fetch(url, {
  headers: {
    'X-Request-Name': 'fetchUserProfile',
  },
});
```

### 3. Clean Up Old Requests

Clear the request list periodically to focus on current debugging:

- Use the "Clear" button
- Filter by time range
- Restart Flipper for fresh session

### 4. Leverage Search Effectively

Learn search syntax for quick filtering:

```
status:>=400 method:POST  # Failed POST requests
domain:api.example.com    # Specific API calls
```

### 5. Document Findings

When debugging complex issues:

1. Export relevant requests
2. Document the issue
3. Note the solution
4. Share with team

### 6. Security Considerations

- Never commit exported logs with sensitive data
- Sanitize tokens before sharing
- Be cautious with production debugging

---

## Conclusion

Flipper's network plugin is an indispensable tool for React Native developers. It provides visibility into your app's network layer that was previously difficult to achieve in mobile development.

Key takeaways:

1. **Easy setup**: Flipper comes pre-configured in React Native 0.62+
2. **Comprehensive inspection**: View all request and response details
3. **Performance analysis**: Understand timing and optimize slow requests
4. **Debugging tools**: Mock responses, replay requests, filter effectively
5. **Protocol support**: HTTP, HTTPS, GraphQL, and WebSocket debugging

By mastering Flipper's network debugging capabilities, you can:

- Reduce debugging time significantly
- Identify issues before they reach production
- Optimize app performance
- Collaborate more effectively with backend teams

Start using Flipper today and transform how you debug network requests in your React Native applications. The investment in learning this tool pays dividends in faster development cycles and more reliable apps.

---

## Additional Resources

- [Flipper Official Documentation](https://fbflipper.com/)
- [React Native Networking Guide](https://reactnative.dev/docs/network)
- [React Native Flipper Integration](https://reactnative.dev/docs/debugging)

---

*Happy debugging!*
