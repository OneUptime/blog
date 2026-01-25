# How to Create Swagger Documentation for Node.js APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Swagger, OpenAPI, Documentation, REST API

Description: Generate interactive API documentation for your Node.js Express applications using Swagger UI and OpenAPI specification with automatic schema generation.

---

Good API documentation saves time for everyone. Swagger (now OpenAPI) provides interactive documentation where developers can explore and test your API directly in the browser. Here is how to set it up properly in Express.js.

## Quick Setup with swagger-jsdoc and swagger-ui-express

Install the required packages:

```bash
npm install swagger-jsdoc swagger-ui-express
```

Create the basic configuration:

```javascript
// src/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'My API',
            version: '1.0.0',
            description: 'A sample API documentation',
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://api.example.com',
                description: 'Production server'
            }
        ]
    },
    // Path to the API routes files
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
    // Swagger UI page
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customSiteTitle: 'My API Documentation'
    }));

    // Serve OpenAPI spec as JSON
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}

module.exports = setupSwagger;
```

Use it in your Express app:

```javascript
// src/index.js
const express = require('express');
const setupSwagger = require('./swagger');

const app = express();
app.use(express.json());

// Setup Swagger before routes
setupSwagger(app);

// Your routes
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
    console.log('API docs at http://localhost:3000/api-docs');
});
```

## Documenting Endpoints with JSDoc Comments

Add OpenAPI annotations to your route files:

```javascript
// src/routes/users.js
const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated user ID
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         name:
 *           type: string
 *           description: User full name
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           default: user
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 1
 *         email: john@example.com
 *         name: John Doe
 *         role: user
 *         createdAt: 2024-01-15T10:30:00Z
 *
 *     CreateUser:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         message:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */
router.get('/', (req, res) => {
    // Implementation
    res.json({ data: [], pagination: {} });
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', (req, res) => {
    res.json({ id: req.params.id, name: 'John' });
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUser'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', (req, res) => {
    res.status(201).json({ id: 1, ...req.body });
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUser'
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.put('/:id', (req, res) => {
    res.json({ id: req.params.id, ...req.body });
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/:id', (req, res) => {
    res.status(204).send();
});

module.exports = router;
```

## Adding Authentication Documentation

```javascript
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     apiKey:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 */

// Apply globally in swagger.js options
const options = {
    definition: {
        openapi: '3.0.0',
        info: { /* ... */ },
        security: [
            { bearerAuth: [] }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

// Or per-endpoint
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Admin endpoint
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
```

## File Upload Documentation

```javascript
/**
 * @swagger
 * /api/users/{id}/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG)
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 */
```

## Organizing with Separate Schema Files

For larger APIs, separate schemas into their own files:

```javascript
// src/schemas/user.schema.js
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         name:
 *           type: string
 */

// Then include in swagger options
const options = {
    definition: { /* ... */ },
    apis: [
        './src/routes/*.js',
        './src/schemas/*.js'  // Include schema files
    ]
};
```

## Generating OpenAPI Spec for CI/CD

Export the spec for use in other tools:

```javascript
// scripts/generate-openapi.js
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'My API',
            version: process.env.npm_package_version || '1.0.0'
        }
    },
    apis: ['./src/routes/*.js']
};

const spec = swaggerJsdoc(options);

// Write JSON
fs.writeFileSync('./openapi.json', JSON.stringify(spec, null, 2));

// Write YAML
const yaml = require('js-yaml');
fs.writeFileSync('./openapi.yaml', yaml.dump(spec));

console.log('OpenAPI spec generated');
```

Add to package.json:

```json
{
  "scripts": {
    "generate:openapi": "node scripts/generate-openapi.js"
  }
}
```

## Validation with OpenAPI Schema

Use your OpenAPI schemas for request validation:

```bash
npm install express-openapi-validator
```

```javascript
const OpenApiValidator = require('express-openapi-validator');

app.use(
    OpenApiValidator.middleware({
        apiSpec: './openapi.json',  // Or inline spec
        validateRequests: true,
        validateResponses: true
    })
);

// Validation errors are automatically handled
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        error: err.message,
        errors: err.errors
    });
});
```

## Custom Swagger UI Options

```javascript
const swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'My API Docs',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
        persistAuthorization: true,  // Remember auth token
        displayRequestDuration: true,
        filter: true,  // Enable filtering
        deepLinking: true
    }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
```

## Environment-Based Documentation

Hide sensitive info in production:

```javascript
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'My API',
            version: '1.0.0'
        },
        servers: process.env.NODE_ENV === 'production'
            ? [{ url: 'https://api.example.com', description: 'Production' }]
            : [
                { url: 'http://localhost:3000', description: 'Local' },
                { url: 'https://staging-api.example.com', description: 'Staging' }
            ]
    },
    apis: ['./src/routes/*.js']
};

// Only expose docs in development
if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
}
```

## Summary

Swagger documentation makes your API discoverable and testable. Use JSDoc comments to document endpoints inline with your code, define reusable schemas in components, add authentication documentation, and export the OpenAPI spec for use with validation libraries and client generators. The documentation stays in sync with your code and provides an interactive testing interface at `/api-docs`.
