# How to Use Cognito Groups for Role-Based Access Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, RBAC, Security, Authentication

Description: Learn how to implement role-based access control using AWS Cognito groups to manage user permissions, restrict API access, and enforce authorization across your application.

---

Role-based access control (RBAC) is something nearly every application needs. Admins should see different things than regular users. Managers need access that interns don't get. Instead of building this from scratch, you can leverage AWS Cognito groups to handle the heavy lifting.

Cognito groups let you organize users into logical categories, associate those groups with IAM roles, and embed group membership directly into JWT tokens. Your application can then read the token claims and make authorization decisions without additional database lookups.

## Creating Cognito Groups

Groups in Cognito are straightforward to set up. Each group has a name, an optional description, an optional IAM role, and a precedence value that determines which role takes priority when a user belongs to multiple groups.

Here's how to create groups using the AWS CLI:

```bash
# Create an admin group with highest precedence (lowest number = highest priority)
aws cognito-idp create-group \
    --user-pool-id us-east-1_XXXXXXXXX \
    --group-name Admins \
    --description "Full access administrators" \
    --precedence 1

# Create a managers group
aws cognito-idp create-group \
    --user-pool-id us-east-1_XXXXXXXXX \
    --group-name Managers \
    --description "Team managers with elevated access" \
    --precedence 5

# Create a standard users group
aws cognito-idp create-group \
    --user-pool-id us-east-1_XXXXXXXXX \
    --group-name Users \
    --description "Regular application users" \
    --precedence 10
```

The precedence number matters when a user belongs to multiple groups. If someone is in both Admins and Users, the group with the lower precedence number (Admins, precedence 1) takes priority when Cognito needs to pick a preferred IAM role.

## Adding Users to Groups

Once your groups exist, you can assign users to them.

Use these commands to manage group membership:

```bash
# Add a user to the Admins group
aws cognito-idp admin-add-user-to-group \
    --user-pool-id us-east-1_XXXXXXXXX \
    --username johndoe \
    --group-name Admins

# Add a user to multiple groups
aws cognito-idp admin-add-user-to-group \
    --user-pool-id us-east-1_XXXXXXXXX \
    --username janedoe \
    --group-name Managers

aws cognito-idp admin-add-user-to-group \
    --user-pool-id us-east-1_XXXXXXXXX \
    --username janedoe \
    --group-name Users

# Remove a user from a group
aws cognito-idp admin-remove-user-from-group \
    --user-pool-id us-east-1_XXXXXXXXX \
    --username johndoe \
    --group-name Users
```

You can also manage group membership programmatically in your application backend. For a deeper look at user management APIs, check out [using Cognito Admin APIs for user management](https://oneuptime.com/blog/post/cognito-admin-apis-user-management/view).

## How Groups Appear in JWT Tokens

When a user authenticates, their group memberships show up in the `cognito:groups` claim inside the ID token. If you're using an access token, groups appear there too.

Here's what the decoded token payload looks like:

```json
{
    "sub": "abc-123-def-456",
    "cognito:groups": [
        "Admins",
        "Users"
    ],
    "email": "johndoe@example.com",
    "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX",
    "cognito:username": "johndoe",
    "exp": 1707753600,
    "iat": 1707750000
}
```

The `cognito:groups` claim is an array containing all groups the user belongs to. Your application reads this to determine what the user can access.

## Implementing RBAC in Your Backend

Now that groups are in the token, you can enforce access control in your API layer. Here's a middleware approach for an Express.js application.

This middleware extracts groups from the JWT and checks authorization:

```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Configure JWKS client to verify Cognito tokens
const client = jwksClient({
    jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/jwks.json`
});

// Middleware to extract user info from token
function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // Decode header to get kid for key lookup
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;

    client.getSigningKey(kid, (err, key) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });

        const signingKey = key.getPublicKey();
        jwt.verify(token, signingKey, (err, payload) => {
            if (err) return res.status(401).json({ error: 'Token verification failed' });

            req.user = {
                sub: payload.sub,
                email: payload.email,
                groups: payload['cognito:groups'] || []
            };
            next();
        });
    });
}

// Middleware to require specific group membership
function requireGroup(...allowedGroups) {
    return (req, res, next) => {
        const userGroups = req.user.groups;
        const hasAccess = allowedGroups.some(group => userGroups.includes(group));

        if (!hasAccess) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedGroups,
                current: userGroups
            });
        }

        next();
    };
}
```

Now you can protect routes based on group membership:

```javascript
const express = require('express');
const app = express();

// All routes require authentication
app.use(authenticate);

// Public user routes - any authenticated user
app.get('/api/profile', (req, res) => {
    res.json({ user: req.user });
});

// Manager routes - requires Managers or Admins group
app.get('/api/team/reports', requireGroup('Managers', 'Admins'), (req, res) => {
    res.json({ reports: [] });
});

// Admin-only routes
app.get('/api/admin/users', requireGroup('Admins'), (req, res) => {
    res.json({ users: [] });
});

app.delete('/api/admin/users/:id', requireGroup('Admins'), (req, res) => {
    // Only admins can delete users
    res.json({ deleted: true });
});
```

## Frontend Authorization

On the client side, you can read the token to adjust the UI based on group membership. Don't rely on this for security - always enforce rules on the backend too. But it makes for a better user experience when admins see admin buttons and regular users don't.

Here's how to check groups on the frontend:

```javascript
function getUserGroups(idToken) {
    // Decode the JWT payload (base64)
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    return payload['cognito:groups'] || [];
}

function hasRole(idToken, role) {
    const groups = getUserGroups(idToken);
    return groups.includes(role);
}

// Usage in your UI logic
const token = getStoredIdToken();

if (hasRole(token, 'Admins')) {
    showAdminDashboard();
} else if (hasRole(token, 'Managers')) {
    showManagerDashboard();
} else {
    showUserDashboard();
}
```

## API Gateway Authorization with Groups

If you're using API Gateway, you can set up a Cognito authorizer and use groups to control access at the API level. See [integrating Cognito with API Gateway](https://oneuptime.com/blog/post/cognito-api-gateway-authorization/view) for a full walkthrough.

For group-based authorization at the API Gateway level, you'll need a custom Lambda authorizer that checks group claims:

```javascript
// Lambda authorizer that checks Cognito groups
exports.handler = async (event) => {
    const token = event.authorizationToken.replace('Bearer ', '');
    const decoded = decodeAndVerifyToken(token);

    const groups = decoded['cognito:groups'] || [];
    const resource = event.methodArn;

    // Define which groups can access which resources
    const adminPaths = ['/admin', '/users/manage'];
    const isAdminResource = adminPaths.some(p => resource.includes(p));

    if (isAdminResource && !groups.includes('Admins')) {
        return generatePolicy('user', 'Deny', resource);
    }

    return generatePolicy('user', 'Allow', resource);
};

function generatePolicy(principalId, effect, resource) {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }]
        }
    };
}
```

## Group Limits and Best Practices

Cognito allows up to 10,000 groups per user pool, and a user can belong to up to 100 groups. That's more than enough for most applications, but keep a few things in mind:

- **Keep groups coarse-grained**: Use groups for roles (Admin, Editor, Viewer), not for fine-grained permissions. If you need "can_edit_post_123", that belongs in your application's permission system, not Cognito groups.
- **Group names can't be changed**: Once created, you can't rename a group. Choose names carefully.
- **Token size**: Every group adds to the JWT token size. If a user belongs to 50 groups, that's a lot of extra data in every request.
- **Precedence planning**: Leave gaps in precedence numbers (1, 5, 10 instead of 1, 2, 3) so you can insert new groups later without reshuffling.

For mapping groups to AWS IAM roles for direct AWS resource access, check out [mapping Cognito groups to IAM roles](https://oneuptime.com/blog/post/cognito-groups-iam-roles/view).

## Wrapping Up

Cognito groups give you a built-in mechanism for RBAC that integrates naturally with JWT-based authentication. Groups show up in tokens automatically, work with API Gateway authorizers, and can be mapped to IAM roles for AWS resource access. The key is to keep your group structure simple and enforce authorization on both the frontend (for UX) and backend (for security). Start with a few obvious roles, validate the token's group claims in your middleware, and expand from there.
