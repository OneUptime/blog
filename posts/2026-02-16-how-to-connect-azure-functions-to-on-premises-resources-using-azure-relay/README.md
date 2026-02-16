# How to Connect Azure Functions to On-Premises Resources Using Azure Relay

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Functions, Relay, Hybrid Connections, On-Premises, Serverless, Integration

Description: Connect Azure Functions to on-premises databases and APIs using Azure Relay Hybrid Connections for secure serverless-to-on-premises communication.

---

Azure Functions are great for serverless workloads, but what happens when your function needs to access a database or API running behind your corporate firewall? You cannot just open a port and call it a day. Azure Relay Hybrid Connections provides a clean way to bridge serverless functions in the cloud with resources on your internal network, without VPNs and without opening inbound firewall rules.

In this post, I will show you how to connect Azure Functions to on-premises resources using Azure Relay Hybrid Connections, including the built-in App Service Hybrid Connections feature and the manual SDK approach.

## Two Approaches

There are two ways to use Hybrid Connections with Azure Functions:

1. **App Service Hybrid Connections** - A built-in feature of the Azure Functions hosting platform. You configure a hybrid connection in the portal, install a Hybrid Connection Manager on-premises, and your function can make TCP connections to on-premises endpoints as if they were local. This is the simpler approach.

2. **Azure Relay SDK** - You write the relay logic yourself using the Azure Relay SDK. This gives you more control but requires more code. Use this when you need custom logic in the relay layer.

## Approach 1: App Service Hybrid Connections

This is the easiest path. The Azure Functions platform handles the relay for you. Your function code does not need to know about the relay at all - it just makes a regular HTTP or TCP call, and the platform routes it through the hybrid connection.

### Setting Up the Hybrid Connection Manager

The Hybrid Connection Manager (HCM) is a lightweight agent that runs on a Windows machine inside your corporate network. It maintains the outbound connection to Azure Relay.

1. In the Azure portal, navigate to your Function App.
2. Under Networking, select Hybrid Connections.
3. Click "Add hybrid connection" and create a new one or select an existing one.
4. Note the endpoint hostname and port you configure (e.g., `internal-db-server:1433` for SQL Server).
5. Download and install the Hybrid Connection Manager on a machine that can reach the target resource.

The HCM opens an outbound connection over port 443 (HTTPS) to Azure. No inbound ports are needed.

### Calling an On-Premises API from Your Function

Once the hybrid connection is configured, your function can call the on-premises endpoint using the hostname and port you specified. The Azure platform intercepts the connection and routes it through the relay.

```javascript
// function-with-hybrid.js - Azure Function calling an on-premises API
const axios = require('axios');

module.exports = async function (context, req) {
  try {
    // This looks like a normal HTTP call, but the platform routes it
    // through the Hybrid Connection to your on-premises server
    const response = await axios.get('http://internal-api-server:8080/api/data', {
      timeout: 30000,
      headers: {
        'Authorization': 'Bearer ' + process.env.INTERNAL_API_KEY
      }
    });

    context.res = {
      status: 200,
      body: {
        source: 'on-premises',
        data: response.data
      }
    };
  } catch (err) {
    context.log.error('Failed to reach on-premises API:', err.message);
    context.res = {
      status: 502,
      body: { error: 'On-premises service unavailable' }
    };
  }
};
```

### Connecting to an On-Premises SQL Database

The same approach works for database connections. Configure a hybrid connection pointing to your SQL Server's hostname and port, and then use a normal connection string.

```javascript
// sql-via-hybrid.js - Azure Function querying an on-premises SQL Server
const sql = require('mssql');

// The hostname in the connection string must match the hybrid connection endpoint
const config = {
  server: 'internal-db-server',  // This maps to the hybrid connection endpoint
  port: 1433,
  database: 'ProductionDB',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,  // Internal connection, encryption handled by relay
    trustServerCertificate: true
  }
};

module.exports = async function (context, req) {
  let pool;
  try {
    pool = await sql.connect(config);

    const result = await pool.request()
      .input('status', sql.VarChar, 'active')
      .query('SELECT TOP 10 * FROM Orders WHERE Status = @status');

    context.res = {
      body: { orders: result.recordset }
    };
  } catch (err) {
    context.log.error('Database query failed:', err.message);
    context.res = {
      status: 500,
      body: { error: 'Database query failed' }
    };
  } finally {
    if (pool) await pool.close();
  }
};
```

## Approach 2: Using the Azure Relay SDK

When you need more control over the relay behavior, or when you are not using the App Service hosting plan (for example, you are using a container-based function), you can use the Azure Relay SDK directly.

### On-Premises Listener

First, set up a listener on your internal network that proxies requests to the target resource.

```javascript
// on-prem-listener.js - Relay listener that proxies to an internal API
const { RelayedServer } = require('hyco-https');
const axios = require('axios');

const relayNamespace = process.env.RELAY_NAMESPACE;
const hybridConnectionName = 'functions-bridge';
const keyName = process.env.RELAY_KEY_NAME;
const key = process.env.RELAY_KEY;

const INTERNAL_API_BASE = 'http://localhost:8080';

const server = RelayedServer.createRelayedServer(
  {
    server: relayNamespace,
    path: hybridConnectionName,
    token: () => {
      return RelayedServer.createRelayToken(
        `https://${relayNamespace}/${hybridConnectionName}`,
        keyName,
        key
      );
    }
  },
  async (relayReq, relayRes) => {
    // Read the incoming request body
    let body = '';
    relayReq.on('data', chunk => { body += chunk; });

    relayReq.on('end', async () => {
      try {
        // Forward the request to the internal API
        const internalResponse = await axios({
          method: relayReq.method,
          url: `${INTERNAL_API_BASE}${relayReq.url}`,
          headers: { 'Content-Type': relayReq.headers['content-type'] || 'application/json' },
          data: body || undefined,
          timeout: 25000
        });

        relayRes.writeHead(internalResponse.status, {
          'Content-Type': 'application/json'
        });
        relayRes.end(JSON.stringify(internalResponse.data));
      } catch (err) {
        relayRes.writeHead(502, { 'Content-Type': 'application/json' });
        relayRes.end(JSON.stringify({ error: err.message }));
      }
    });
  }
);

server.listen(() => {
  console.log('Relay listener running, forwarding to', INTERNAL_API_BASE);
});
```

### Azure Function Using the Relay SDK

The function sends requests through the relay using the sender connection string.

```javascript
// function-sdk-approach.js - Azure Function using the Relay SDK directly
const https = require('https');
const crypto = require('crypto');

const RELAY_NAMESPACE = process.env.RELAY_NAMESPACE;
const HYBRID_CONNECTION = 'functions-bridge';
const RELAY_KEY_NAME = process.env.RELAY_KEY_NAME;
const RELAY_KEY = process.env.RELAY_KEY;

function createSasToken(uri, keyName, key) {
  const encoded = encodeURIComponent(uri);
  const expiry = Math.ceil(Date.now() / 1000) + 3600;
  const signature = crypto
    .createHmac('sha256', key)
    .update(`${encoded}\n${expiry}`)
    .digest('base64');

  return `SharedAccessSignature sr=${encoded}&sig=${encodeURIComponent(signature)}&se=${expiry}&skn=${keyName}`;
}

async function callOnPremises(method, path, data) {
  const uri = `https://${RELAY_NAMESPACE}/${HYBRID_CONNECTION}`;
  const token = createSasToken(uri, RELAY_KEY_NAME, RELAY_KEY);

  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';

    const options = {
      hostname: RELAY_NAMESPACE,
      path: `/${HYBRID_CONNECTION}${path}`,
      method: method,
      headers: {
        'ServiceBusAuthorization': token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = async function (context, req) {
  try {
    const result = await callOnPremises('GET', '/api/inventory');

    context.res = {
      status: 200,
      body: result.data
    };
  } catch (err) {
    context.log.error('Relay call failed:', err.message);
    context.res = {
      status: 502,
      body: { error: 'Failed to reach on-premises resource' }
    };
  }
};
```

## Which Approach to Use?

**Use App Service Hybrid Connections when:**
- You are on the App Service plan (Premium or dedicated)
- You want the simplest setup with no relay code
- You need TCP-level connectivity (databases, custom protocols)
- You have a Windows machine available for the Hybrid Connection Manager

**Use the Azure Relay SDK when:**
- You need custom logic in the relay layer (filtering, transformation)
- You are running functions in containers or on Kubernetes
- You need to support Linux on-premises machines (HCM is Windows-only)
- You want to relay between multiple internal services through a single connection

## Handling Timeouts and Retries

On-premises resources may be slower than cloud services. Account for the added latency of the relay hop.

```javascript
// retry-wrapper.js - Resilient on-premises calls with retry logic
async function callWithRetry(fn, maxRetries = 3, baseDelayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err.code === 'ECONNREFUSED' ||
                          err.code === 'ECONNRESET' ||
                          err.code === 'ETIMEDOUT';

      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage in a function
module.exports = async function (context, req) {
  const result = await callWithRetry(
    () => callOnPremises('GET', '/api/data'),
    3,
    1000
  );

  context.res = { body: result.data };
};
```

## Security Considerations

- Store relay keys and internal API credentials in Azure Key Vault, not in app settings.
- The Hybrid Connection Manager should run under a service account with minimum required permissions.
- Log all requests passing through the relay for audit purposes.
- Consider implementing IP allowlisting on the internal API to only accept requests from the machine running the HCM or relay listener.

## Wrapping Up

Azure Relay Hybrid Connections is the bridge between serverless and on-premises. Whether you use the built-in App Service Hybrid Connections for a zero-code relay experience or the Azure Relay SDK for custom control, the pattern is the same: outbound connections from your network, no inbound firewall changes, and your Azure Functions can reach internal resources as if they were next door. Start with App Service Hybrid Connections for simplicity, and move to the SDK approach when you need more flexibility.
