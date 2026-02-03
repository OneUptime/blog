# How to Implement API Versioning in Express

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Express, API Versioning, REST, Backend

Description: Learn how to implement API versioning in Express applications. This guide covers URL, header, and query parameter versioning strategies.

---

API versioning is essential for maintaining backward compatibility while evolving your API. Without proper versioning, breaking changes can disrupt existing clients and cause integration failures. This guide covers URL-based versioning, header-based versioning, deprecation handling, and migration patterns.

## Why Version Your API?

- **Backward Compatibility**: Existing clients continue working when you release new versions
- **Gradual Migration**: Clients can upgrade on their own schedule
- **Clear Contracts**: Each version represents a stable, documented interface
- **Safe Experimentation**: Test breaking changes without affecting production clients

## URL-Based Versioning

URL-based versioning is the most common and explicit approach. The version number appears directly in the URL path.

### V1 Users Route

```javascript
// routes/v1/users.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];
  res.json({ version: 'v1', users });
});

router.get('/:id', (req, res) => {
  const user = {
    id: parseInt(req.params.id),
    name: 'John Doe',
    email: 'john@example.com',
  };
  res.json({ version: 'v1', user });
});

router.post('/', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const newUser = { id: Date.now(), name, email };
  res.status(201).json({ version: 'v1', user: newUser });
});

module.exports = router;
```

### V2 Users Route with Enhanced Features

```javascript
// routes/v2/users.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const users = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      profile: { avatar: 'https://example.com/avatars/1.jpg', bio: 'Developer' },
      createdAt: '2024-01-15T10:30:00Z',
    },
  ];

  res.json({
    version: 'v2',
    data: users,
    pagination: { page, limit, total: users.length },
  });
});

router.post('/', (req, res) => {
  const { firstName, lastName, email, profile } = req.body;
  const errors = [];
  if (!firstName) errors.push('firstName is required');
  if (!lastName) errors.push('lastName is required');
  if (!email) errors.push('email is required');

  if (errors.length > 0) {
    return res.status(400).json({ version: 'v2', errors, code: 'VALIDATION_ERROR' });
  }

  const newUser = {
    id: Date.now(),
    firstName,
    lastName,
    email,
    profile: profile || {},
    createdAt: new Date().toISOString(),
  };
  res.status(201).json({ version: 'v2', data: newUser });
});

module.exports = router;
```

### Registering Versioned Routes

```javascript
// app.js
const express = require('express');
const app = express();

app.use(express.json());

const usersV1 = require('./routes/v1/users');
const usersV2 = require('./routes/v2/users');

app.use('/api/v1/users', usersV1);
app.use('/api/v2/users', usersV2);

// Default version redirect
app.get('/api/users', (req, res) => {
  res.redirect(307, '/api/v2/users');
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Centralized Version Router

```javascript
// routes/index.js
const express = require('express');
const router = express.Router();

const v1Router = express.Router();
v1Router.use('/users', require('./v1/users'));
v1Router.use('/products', require('./v1/products'));

const v2Router = express.Router();
v2Router.use('/users', require('./v2/users'));
v2Router.use('/products', require('./v2/products'));

router.use('/v1', v1Router);
router.use('/v2', v2Router);

router.get('/versions', (req, res) => {
  res.json({
    versions: [
      { version: 'v1', status: 'deprecated', sunsetDate: '2025-06-01' },
      { version: 'v2', status: 'current' },
    ],
    current: 'v2',
  });
});

module.exports = router;
```

## Header-Based Versioning

Header-based versioning keeps URLs clean while allowing version specification through HTTP headers.

### Version Extraction Middleware

```javascript
// middleware/versionMiddleware.js
const DEFAULT_VERSION = '2';
const SUPPORTED_VERSIONS = ['1', '2', '3'];

function extractVersion(req, res, next) {
  const acceptHeader = req.headers['accept'];
  let version = null;

  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/version=(\d+)/);
    if (versionMatch) version = versionMatch[1];
  }

  if (!version) {
    version = req.headers['x-api-version'] || req.headers['api-version'];
  }

  if (!version) version = DEFAULT_VERSION;

  if (!SUPPORTED_VERSIONS.includes(version)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      supportedVersions: SUPPORTED_VERSIONS,
    });
  }

  req.apiVersion = version;
  res.set('X-API-Version', version);
  next();
}

module.exports = extractVersion;
```

### Version-Based Handler Selection

```javascript
// middleware/versionRouter.js
const v1Handlers = require('../handlers/v1');
const v2Handlers = require('../handlers/v2');

const handlers = { '1': v1Handlers, '2': v2Handlers };

function createVersionedRoute(handlerName) {
  return (req, res, next) => {
    const version = req.apiVersion;
    const versionHandlers = handlers[version];

    if (!versionHandlers || !versionHandlers[handlerName]) {
      return res.status(501).json({
        error: 'Not Implemented',
        message: `Handler ${handlerName} not available in version ${version}`,
      });
    }
    return versionHandlers[handlerName](req, res, next);
  };
}

module.exports = { createVersionedRoute };
```

### Handler Implementations

```javascript
// handlers/v1/users.js
module.exports = {
  listUsers: (req, res) => {
    res.json({ users: [{ id: 1, name: 'John Doe', email: 'john@example.com' }] });
  },
  getUser: (req, res) => {
    res.json({ user: { id: parseInt(req.params.id), name: 'John Doe' } });
  },
};
```

```javascript
// handlers/v2/users.js
module.exports = {
  listUsers: (req, res) => {
    const page = parseInt(req.query.page) || 1;
    res.json({
      data: [{ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' }],
      meta: { page, total: 1 },
    });
  },
  getUser: (req, res) => {
    res.json({
      data: { id: parseInt(req.params.id), firstName: 'John', lastName: 'Doe' },
    });
  },
};
```

### Using Header Versioning

```javascript
// app.js
const express = require('express');
const extractVersion = require('./middleware/versionMiddleware');
const { createVersionedRoute } = require('./middleware/versionRouter');

const app = express();
app.use(express.json());
app.use('/api', extractVersion);

app.get('/api/users', createVersionedRoute('listUsers'));
app.get('/api/users/:id', createVersionedRoute('getUser'));

module.exports = app;
```

## Query Parameter Versioning

Query parameter versioning is simple but generally not recommended for production.

```javascript
// middleware/queryVersionMiddleware.js
function extractQueryVersion(req, res, next) {
  const version = req.query.version || req.query.v || '2';
  const supported = ['1', '2', '3'];

  if (!supported.includes(version)) {
    return res.status(400).json({ error: 'Unsupported version', supported });
  }

  req.apiVersion = version;
  res.set('X-API-Version', version);
  next();
}

module.exports = extractQueryVersion;
```

## API Deprecation Handling

Properly communicating deprecation is crucial for smooth API evolution.

### Deprecation Middleware

```javascript
// middleware/deprecationMiddleware.js
const deprecatedEndpoints = {
  '/api/v1/users': {
    deprecatedDate: '2024-01-01',
    sunsetDate: '2025-06-01',
    replacement: '/api/v2/users',
    message: 'This endpoint is deprecated. Please migrate to v2.',
  },
};

function deprecationMiddleware(req, res, next) {
  const path = req.baseUrl + req.path;
  let deprecation = null;

  for (const [pattern, config] of Object.entries(deprecatedEndpoints)) {
    if (path.startsWith(pattern)) {
      deprecation = config;
      break;
    }
  }

  if (deprecation) {
    res.set('Deprecation', deprecation.deprecatedDate);
    res.set('Sunset', deprecation.sunsetDate);
    res.set('Link', `<${deprecation.replacement}>; rel="successor-version"`);
    res.set('Warning', `299 - "Deprecated API: ${deprecation.message}"`);

    if (new Date() > new Date(deprecation.sunsetDate)) {
      return res.status(410).json({
        error: 'Gone',
        message: 'This API version has been sunset',
        replacement: deprecation.replacement,
      });
    }
  }
  next();
}

module.exports = deprecationMiddleware;
```

### Version Status Middleware

```javascript
// middleware/versionDeprecation.js
const versionStatus = {
  '1': { status: 'deprecated', deprecatedDate: '2024-01-01', sunsetDate: '2025-06-01' },
  '2': { status: 'supported' },
  '3': { status: 'current' },
};

function versionDeprecationMiddleware(req, res, next) {
  const status = versionStatus[req.apiVersion];
  if (!status) return next();

  res.set('X-API-Version-Status', status.status);

  if (status.status === 'deprecated') {
    res.set('Deprecation', status.deprecatedDate);
    res.set('Sunset', status.sunsetDate);

    const originalJson = res.json.bind(res);
    res.json = function(data) {
      data._deprecation = {
        warning: 'This version is deprecated',
        sunsetDate: status.sunsetDate,
      };
      return originalJson(data);
    };
  }
  next();
}

module.exports = versionDeprecationMiddleware;
```

## Migration Support

Help clients migrate between API versions with transformation layers.

### Response Transformers

```javascript
// transformers/userTransformers.js

// Transform v2 response to v1 format
function v2ToV1(data) {
  if (Array.isArray(data)) {
    return data.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    }));
  }
  return {
    id: data.id,
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
  };
}

// Transform v1 request to v2 format
function v1ToV2Request(body) {
  const nameParts = (body.name || '').split(' ');
  return {
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: body.email,
  };
}

module.exports = { v2ToV1, v1ToV2Request };
```

### Compatibility Layer

```javascript
// middleware/compatibilityLayer.js
const transformers = require('../transformers/userTransformers');

function createCompatibilityLayer(latestHandler, transformerMap) {
  return async (req, res, next) => {
    const version = req.apiVersion;

    if (!transformerMap[version]) {
      return latestHandler(req, res, next);
    }

    const { requestTransformer, responseTransformer } = transformerMap[version];

    if (requestTransformer && req.body) {
      req.body = requestTransformer(req.body);
    }

    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (responseTransformer && data.data) {
        data.data = responseTransformer(data.data);
      }
      return originalJson(data);
    };

    return latestHandler(req, res, next);
  };
}

const usersCompatibility = {
  '1': {
    requestTransformer: transformers.v1ToV2Request,
    responseTransformer: transformers.v2ToV1,
  },
};

module.exports = { createCompatibilityLayer, usersCompatibility };
```

## Complete Implementation

### Version Resolver

```javascript
// middleware/versionResolver.js
class VersionResolver {
  constructor() {
    this.defaultVersion = '2';
    this.supportedVersions = ['1', '2', '3'];
    this.deprecatedVersions = {
      '1': { deprecatedDate: '2024-01-01', sunsetDate: '2025-06-01' },
    };
  }

  resolve(req) {
    let version = null;

    // Try URL path
    const urlMatch = req.path.match(/\/v(\d+)\//);
    if (urlMatch) version = urlMatch[1];

    // Try headers
    if (!version) {
      const accept = req.headers['accept'];
      if (accept) {
        const match = accept.match(/version=(\d+)/);
        if (match) version = match[1];
      }
      if (!version) {
        version = req.headers['x-api-version'] || req.headers['api-version'];
      }
    }

    // Try query
    if (!version) {
      version = req.query.version || req.query.v;
    }

    return version || this.defaultVersion;
  }

  validate(version) {
    return this.supportedVersions.includes(version);
  }

  isDeprecated(version) {
    return !!this.deprecatedVersions[version];
  }
}

module.exports = new VersionResolver();
```

### Complete Application

```javascript
// app.js
const express = require('express');
const versionResolver = require('./middleware/versionResolver');

const app = express();
app.use(express.json());

// Versioning middleware
app.use('/api', (req, res, next) => {
  const version = versionResolver.resolve(req);

  if (!versionResolver.validate(version)) {
    return res.status(400).json({
      error: 'Invalid API Version',
      supportedVersions: versionResolver.supportedVersions,
    });
  }

  req.apiVersion = version;
  res.set('X-API-Version', version);
  res.set('X-API-Supported-Versions', versionResolver.supportedVersions.join(', '));

  if (versionResolver.isDeprecated(version)) {
    const info = versionResolver.deprecatedVersions[version];
    res.set('Deprecation', info.deprecatedDate);
    res.set('Sunset', info.sunsetDate);
  }

  next();
});

app.get('/api', (req, res) => {
  res.json({
    name: 'My API',
    versions: { supported: ['v1', 'v2'], current: 'v2', deprecated: ['v1'] },
  });
});

app.use('/api/v1/users', require('./routes/v1/users'));
app.use('/api/v2/users', require('./routes/v2/users'));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', version: req.apiVersion });
});

app.listen(3000);
```

## Testing Versioned APIs

```javascript
// tests/versioning.test.js
const request = require('supertest');
const app = require('../app');

describe('API Versioning', () => {
  it('should return v1 response format', async () => {
    const response = await request(app).get('/api/v1/users').expect(200);
    expect(response.body.users).toBeDefined();
    expect(response.body.users[0]).toHaveProperty('name');
  });

  it('should return v2 response format', async () => {
    const response = await request(app).get('/api/v2/users').expect(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data[0]).toHaveProperty('firstName');
  });

  it('should include deprecation headers for v1', async () => {
    const response = await request(app).get('/api/v1/users').expect(200);
    expect(response.headers['deprecation']).toBeDefined();
  });

  it('should use version from header', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('X-API-Version', '2')
      .expect(200);
    expect(response.headers['x-api-version']).toBe('2');
  });

  it('should reject unsupported versions', async () => {
    await request(app).get('/api/users').set('X-API-Version', '99').expect(400);
  });
});
```

## Best Practices

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| URL | Explicit, cacheable, easy to test | URL clutter | Public APIs |
| Header | Clean URLs, follows REST | Less visible | Enterprise APIs |
| Query | Simple to implement | Not recommended | Internal APIs |

### Version Discovery Endpoint

```javascript
app.get('/api/versions', (req, res) => {
  res.json({
    versions: [
      { version: 'v1', status: 'deprecated', sunsetDate: '2025-06-01' },
      { version: 'v2', status: 'current' },
    ],
    current: 'v2',
    migrationGuides: 'https://api.example.com/docs/migration',
  });
});
```

## Summary

| Strategy | Implementation | Use Case |
|----------|----------------|----------|
| **URL Versioning** | `/api/v1/users` | Public APIs |
| **Header Versioning** | `X-API-Version: 2` | Enterprise APIs |
| **Query Versioning** | `?version=1` | Internal APIs |
| **Deprecation** | RFC 8594 headers | All APIs |
| **Migration** | Transform layers | Version upgrades |

API versioning involves communicating changes to clients, providing migration paths, and maintaining backward compatibility. Choose the strategy that fits your API consumers and apply it consistently.

For monitoring your versioned APIs and tracking which versions your clients use, consider [OneUptime](https://oneuptime.com). OneUptime provides comprehensive API monitoring that helps you track response times, error rates, and usage patterns across different API versions. This visibility is essential when planning deprecation timelines and ensuring smooth migrations for your API consumers.
