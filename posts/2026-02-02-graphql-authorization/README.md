# How to Implement Authorization in GraphQL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: GraphQL, Authorization, Security, API, Access Control

Description: Learn how to implement authorization in GraphQL APIs using resolver-level checks, directives, middleware, and field-level permissions.

---

Authorization in GraphQL is tricky because it works differently from REST APIs. In REST, you can slap middleware on specific routes and call it a day. But GraphQL has a single endpoint, and clients can request any combination of fields in a single query. This flexibility is great for clients but creates interesting challenges when you need to control who can access what.

The good news is that GraphQL gives you several patterns to handle authorization effectively. Let's walk through the most practical approaches.

## The Challenge with GraphQL Authorization

Consider a simple query like this:

```graphql
query {
  user(id: "123") {
    name
    email
    salary      # Only HR should see this
    ssn         # Only the user themselves should see this
  }
}
```

You need to allow the query but potentially hide certain fields based on who is asking. This is where field-level authorization becomes important.

## Setting Up Context-Based Authentication

Before authorization, you need to know who the user is. The standard approach is to extract user information from the request and attach it to the GraphQL context.

```javascript
// server.js
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const jwt = require('jsonwebtoken');

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

await server.start();

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => {
    // Extract the token from the Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // Return context with no user - they're not authenticated
      return { user: null };
    }

    try {
      // Verify and decode the JWT token
      const user = jwt.verify(token, process.env.JWT_SECRET);
      return { user };
    } catch (error) {
      // Invalid token - treat as unauthenticated
      return { user: null };
    }
  }
}));
```

Now every resolver has access to `context.user` which contains the authenticated user's information.

## Resolver-Level Authorization

The most straightforward approach is checking permissions directly in your resolvers.

```javascript
// resolvers.js
const resolvers = {
  Query: {
    // Anyone can fetch public user info
    user: async (_, { id }, context) => {
      return await User.findById(id);
    },

    // Only authenticated users can list all users
    users: async (_, __, context) => {
      if (!context.user) {
        throw new Error('You must be logged in to view users');
      }
      return await User.find();
    },

    // Only admins can view admin dashboard data
    adminDashboard: async (_, __, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      if (!context.user.roles.includes('admin')) {
        throw new Error('Admin access required');
      }

      return await Dashboard.getAdminStats();
    }
  }
};
```

This works but gets repetitive fast. Let's look at better patterns.

## Creating Reusable Authorization Helpers

Extract your authorization logic into helper functions to keep resolvers clean.

```javascript
// auth-helpers.js

// Throws if user is not authenticated
function requireAuth(context) {
  if (!context.user) {
    throw new AuthenticationError('You must be logged in');
  }
  return context.user;
}

// Throws if user doesn't have the required role
function requireRole(context, role) {
  const user = requireAuth(context);

  if (!user.roles.includes(role)) {
    throw new ForbiddenError(`Role '${role}' required`);
  }

  return user;
}

// Throws if user can't access the resource
function requireOwnership(context, resourceOwnerId) {
  const user = requireAuth(context);

  if (user.id !== resourceOwnerId && !user.roles.includes('admin')) {
    throw new ForbiddenError('You can only access your own resources');
  }

  return user;
}
```

Now your resolvers become much cleaner:

```javascript
const resolvers = {
  Query: {
    myProfile: (_, __, context) => {
      const user = requireAuth(context);
      return User.findById(user.id);
    },

    adminStats: (_, __, context) => {
      requireRole(context, 'admin');
      return Stats.getAll();
    }
  },

  Mutation: {
    updateUser: async (_, { id, input }, context) => {
      requireOwnership(context, id);
      return User.findByIdAndUpdate(id, input, { new: true });
    }
  }
};
```

## Custom Directives for Declarative Authorization

Schema directives let you define authorization rules right in your schema definition. This is my favorite approach because it makes permissions visible at a glance.

```graphql
# schema.graphql
directive @auth on FIELD_DEFINITION
directive @hasRole(role: String!) on FIELD_DEFINITION

type Query {
  publicPosts: [Post]

  myProfile: User @auth

  allUsers: [User] @auth @hasRole(role: "admin")

  adminDashboard: Dashboard @hasRole(role: "admin")
}

type User {
  id: ID!
  name: String!
  email: String! @auth          # Only authenticated users see email
  salary: Float @hasRole(role: "hr")    # Only HR sees salary
}
```

Here's the directive implementation:

```javascript
// directives.js
const { mapSchema, getDirective, MapperKind } = require('@graphql-tools/utils');
const { defaultFieldResolver } = require('graphql');

function authDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      // Check if this field has the @auth directive
      const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0];

      if (authDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;

        // Wrap the original resolver with auth check
        fieldConfig.resolve = async function (source, args, context, info) {
          if (!context.user) {
            throw new Error('Authentication required');
          }
          return resolve(source, args, context, info);
        };
      }

      return fieldConfig;
    }
  });
}

function hasRoleDirectiveTransformer(schema) {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const hasRoleDirective = getDirective(schema, fieldConfig, 'hasRole')?.[0];

      if (hasRoleDirective) {
        const { role } = hasRoleDirective;
        const { resolve = defaultFieldResolver } = fieldConfig;

        fieldConfig.resolve = async function (source, args, context, info) {
          if (!context.user) {
            throw new Error('Authentication required');
          }

          if (!context.user.roles.includes(role)) {
            throw new Error(`Role '${role}' required`);
          }

          return resolve(source, args, context, info);
        };
      }

      return fieldConfig;
    }
  });
}

// Apply transformers to your schema
let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = authDirectiveTransformer(schema);
schema = hasRoleDirectiveTransformer(schema);
```

## Field-Level Access Control

Sometimes you need to hide specific fields rather than blocking the entire query. This is useful when different users can see different parts of the same object.

```javascript
const resolvers = {
  User: {
    // Email is only visible to the user themselves or admins
    email: (user, _, context) => {
      if (!context.user) return null;

      if (context.user.id === user.id || context.user.roles.includes('admin')) {
        return user.email;
      }

      return null; // Return null instead of throwing
    },

    // Salary only visible to HR
    salary: (user, _, context) => {
      if (context.user?.roles.includes('hr')) {
        return user.salary;
      }
      return null;
    },

    // SSN only visible to the user themselves
    ssn: (user, _, context) => {
      if (context.user?.id === user.id) {
        return user.ssn;
      }
      return null;
    }
  }
};
```

## Authorization Patterns Comparison

| Pattern | Best For | Pros | Cons |
|---------|----------|------|------|
| Resolver checks | Simple APIs | Easy to understand, explicit | Repetitive, scattered logic |
| Helper functions | Medium APIs | Reusable, testable | Still manual per resolver |
| Schema directives | Large APIs | Declarative, visible in schema | More setup, learning curve |
| Field resolvers | Partial access | Graceful degradation | Can be confusing for clients |

## Putting It All Together

Here's a complete example combining these patterns:

```javascript
// Complete authorization setup
const { ApolloServer } = require('@apollo/server');
const { makeExecutableSchema } = require('@graphql-tools/schema');

// Schema with directives
const typeDefs = `
  directive @auth on FIELD_DEFINITION
  directive @hasRole(role: String!) on FIELD_DEFINITION

  type User {
    id: ID!
    name: String!
    email: String! @auth
    role: String! @auth
  }

  type Query {
    me: User @auth
    users: [User] @hasRole(role: "admin")
  }

  type Mutation {
    updateProfile(name: String!): User @auth
  }
`;

const resolvers = {
  Query: {
    me: (_, __, { user }) => User.findById(user.id),
    users: () => User.find()
  },
  Mutation: {
    updateProfile: async (_, { name }, { user }) => {
      return User.findByIdAndUpdate(user.id, { name }, { new: true });
    }
  }
};

// Build and transform schema
let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = authDirectiveTransformer(schema);
schema = hasRoleDirectiveTransformer(schema);

const server = new ApolloServer({ schema });
```

## Best Practices

1. **Always authenticate before authorizing** - Know who the user is before checking what they can do.

2. **Fail secure** - When in doubt, deny access. Return null for fields or throw errors for operations.

3. **Keep authorization close to the data** - Check permissions in resolvers or field resolvers, not in the transport layer.

4. **Log authorization failures** - Track when users try to access things they shouldn't. This helps identify both bugs and potential attacks.

5. **Test your authorization logic** - Write tests that verify unauthorized users can't access protected resources.

GraphQL's flexibility means you need to think carefully about authorization, but these patterns give you the tools to handle it cleanly. Start with resolver-level checks for simple cases, and graduate to directives as your API grows.
