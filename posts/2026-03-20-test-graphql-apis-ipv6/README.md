# How to Test GraphQL APIs over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, IPv6, Testing, curl, Automation

Description: Test GraphQL APIs over IPv6 using curl, Insomnia, automated testing frameworks, and continuous integration pipelines.

## Testing with curl over IPv6

```bash
# Basic GraphQL query over IPv6

curl -6 -X POST http://[::1]:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ hello }"}'

# Against a remote IPv6 server; replace 2001:db8::1 with your server address
curl -6 -X POST http://[2001:db8::1]:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id name } }"}'

# With variables
curl -6 -X POST http://[2001:db8::1]:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetUser($id: ID!) { user(id: $id) { name email } }",
    "variables": {"id": "123"}
  }'

# With authentication
curl -6 -X POST http://[2001:db8::1]:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "{ myProfile { name } }"}'
```

## Automated Testing with Jest

```javascript
// graphql-ipv6.test.js
const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const { createServer } = require('./server');

describe('GraphQL API over IPv6', () => {
    let server;
    let serverUrl;

    beforeAll(async () => {
        server = await createServer();
        // Start on IPv6 for tests
        await new Promise((resolve) => {
            server.listen(0, '::', () => {
                const port = server.address().port;
                serverUrl = `http://[::1]:${port}/graphql`;
                resolve();
            });
        });
    });

    afterAll(async () => {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    });

    async function query(q, variables = {}) {
        const response = await fetch(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: q, variables }),
        });
        return response.json();
    }

    test('returns hello message', async () => {
        const result = await query('{ hello }');
        expect(result.errors).toBeUndefined();
        expect(result.data.hello).toBe('Hello from IPv6 GraphQL!');
    });

    test('introspection works', async () => {
        const result = await query('{ __typename }');
        expect(result.data.__typename).toBe('Query');
    });

    test('handles variables correctly', async () => {
        const result = await query(
            'query Test($name: String!) { greet(name: $name) }',
            { name: 'IPv6' }
        );
        expect(result.errors).toBeUndefined();
    });
});
```

## Python pytest with requests

```python
# test_graphql_ipv6.py
import pytest
import requests

BASE_URL = "http://[::1]:4000/graphql"

def graphql_request(query, variables=None, url=BASE_URL):
    """Helper to make GraphQL requests over IPv6."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()

def test_hello_query():
    result = graphql_request("{ hello }")
    assert "errors" not in result
    assert result["data"]["hello"] is not None

def test_client_ip_is_ipv6():
    """Verify the server sees our connection as IPv6."""
    result = graphql_request("{ clientIP }")
    client_ip = result["data"]["clientIP"]
    # Should be IPv6 loopback
    assert ":" in client_ip or client_ip == "::1"

@pytest.mark.parametrize("ipv6_address", [
    "::1",
    "2001:db8::1",  # Add your test server addresses
])
def test_against_multiple_ipv6_addresses(ipv6_address):
    """Test GraphQL API is accessible from multiple IPv6 addresses."""
    url = f"http://[{ipv6_address}]:4000/graphql"
    try:
        result = graphql_request("{ __typename }", url=url)
        assert result["data"]["__typename"] == "Query"
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
        pytest.skip(f"Cannot connect to {ipv6_address}")
```

## Load Testing with k6

```javascript
// k6-graphql-ipv6-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 supports IPv6 addresses in URLs; replace 2001:db8::1 with your server address
const GRAPHQL_URL = 'http://[2001:db8::1]:4000/graphql';

export const options = {
    vus: 50,        // 50 virtual users
    duration: '30s',
};

const QUERY = JSON.stringify({
    query: '{ hello }',
});

export default function () {
    const response = http.post(
        GRAPHQL_URL,
        QUERY,
        { headers: { 'Content-Type': 'application/json' } }
    );

    check(response, {
        'status is 200': (r) => r.status === 200,
        'no errors': (r) => !JSON.parse(r.body).errors,
        'response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(0.1);
}
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to set up automated GraphQL health checks over IPv6. Configure API monitors that POST a simple introspection query `{ __typename }` to your IPv6 endpoint and alert when the server becomes unreachable or returns errors.

## Conclusion

Testing GraphQL APIs over IPv6 requires using IPv6 URLs in the format `http://[ipv6addr]:port/graphql`. All standard testing tools - curl, Jest, pytest, k6 - support IPv6 addresses. Automate IPv6-specific tests in CI/CD pipelines to catch connectivity regressions early.
