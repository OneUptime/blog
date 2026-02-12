# How to Use Cognito Admin APIs for User Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, User Management, Serverless

Description: A comprehensive guide to using AWS Cognito Admin APIs for server-side user management including creating users, updating attributes, managing groups, disabling accounts, and bulk operations.

---

Cognito's client-side APIs are designed for users managing their own accounts - signing up, logging in, changing passwords. But when you need to manage users from your backend - creating accounts, assigning roles, resetting passwords, or disabling users - you need the Admin APIs. These are server-side operations that require AWS credentials and give you full control over your user pool.

Let's walk through the most common admin operations and how to use them effectively.

## Setting Up Admin Access

Admin APIs require AWS credentials with the right IAM permissions. Here's the minimum IAM policy your backend service needs.

Create an IAM policy for Cognito admin operations:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminGetUser",
                "cognito-idp:AdminUpdateUserAttributes",
                "cognito-idp:AdminDeleteUser",
                "cognito-idp:AdminDisableUser",
                "cognito-idp:AdminEnableUser",
                "cognito-idp:AdminResetUserPassword",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:AdminAddUserToGroup",
                "cognito-idp:AdminRemoveUserFromGroup",
                "cognito-idp:AdminListGroupsForUser",
                "cognito-idp:ListUsers",
                "cognito-idp:ListUsersInGroup"
            ],
            "Resource": "arn:aws:cognito-idp:us-east-1:123456789:userpool/us-east-1_XXXXXXXXX"
        }
    ]
}
```

Initialize the Cognito client for admin operations:

```javascript
const {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminGetUserCommand,
    AdminUpdateUserAttributesCommand,
    AdminDeleteUserCommand,
    AdminDisableUserCommand,
    AdminEnableUserCommand,
    AdminResetUserPasswordCommand,
    AdminSetUserPasswordCommand,
    AdminAddUserToGroupCommand,
    AdminRemoveUserFromGroupCommand,
    AdminListGroupsForUserCommand,
    ListUsersCommand,
    ListUsersInGroupCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const USER_POOL_ID = 'us-east-1_XXXXXXXXX';
```

## Creating Users

The admin create user API lets you create accounts on behalf of users. This is useful for invitation-based systems where you don't want public sign-ups.

Create a user and send them an invitation email:

```javascript
async function createUser(email, name, tempPassword = null) {
    const params = {
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: name }
        ],
        // SUPPRESS = don't send invitation email
        // RESEND = send invitation email
        MessageAction: 'SUPPRESS'
    };

    // If you want Cognito to generate a temp password
    if (tempPassword) {
        params.TemporaryPassword = tempPassword;
    }

    try {
        const response = await client.send(new AdminCreateUserCommand(params));
        console.log('User created:', response.User.Username);
        return response.User;
    } catch (error) {
        if (error.name === 'UsernameExistsException') {
            throw new Error('A user with this email already exists');
        }
        throw error;
    }
}
```

If you want the user to set their own password immediately (skipping the temporary password flow), you can set a permanent password right after creation:

```javascript
async function createUserWithPassword(email, name, password) {
    // Create the user first
    await createUser(email, name);

    // Set a permanent password
    await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: password,
        Permanent: true
    }));

    console.log(`User ${email} created with permanent password`);
}
```

## Getting User Information

Fetch a user's complete profile including attributes and status.

Retrieve user details:

```javascript
async function getUser(username) {
    const response = await client.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
    }));

    // Parse attributes into a cleaner format
    const attributes = {};
    response.UserAttributes.forEach(attr => {
        attributes[attr.Name] = attr.Value;
    });

    return {
        username: response.Username,
        status: response.UserStatus,
        enabled: response.Enabled,
        created: response.UserCreateDate,
        modified: response.UserLastModifiedDate,
        attributes
    };
}
```

## Updating User Attributes

Modify user attributes from the backend. This doesn't require the user to be authenticated.

Update specific user attributes:

```javascript
async function updateUserAttributes(username, updates) {
    // Convert {key: value} to Cognito's attribute format
    const attributes = Object.entries(updates).map(([key, value]) => ({
        Name: key,
        Value: String(value)
    }));

    await client.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: attributes
    }));

    console.log(`Updated attributes for ${username}`);
}

// Usage
await updateUserAttributes('johndoe@example.com', {
    'name': 'John Doe',
    'custom:department': 'Engineering',
    'custom:role': 'lead'
});
```

## Managing Groups

Groups are how you handle role-based access control in Cognito. For a detailed look at RBAC, see [using Cognito groups for role-based access control](https://oneuptime.com/blog/post/cognito-groups-role-based-access-control/view).

Here are the group management operations:

```javascript
// Add a user to a group
async function addUserToGroup(username, groupName) {
    await client.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName
    }));
    console.log(`Added ${username} to ${groupName}`);
}

// Remove a user from a group
async function removeUserFromGroup(username, groupName) {
    await client.send(new AdminRemoveUserFromGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        GroupName: groupName
    }));
    console.log(`Removed ${username} from ${groupName}`);
}

// List all groups for a user
async function getUserGroups(username) {
    const response = await client.send(new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
    }));

    return response.Groups.map(g => ({
        name: g.GroupName,
        description: g.Description,
        precedence: g.Precedence
    }));
}

// List all users in a group
async function listUsersInGroup(groupName, limit = 60) {
    const users = [];
    let nextToken = null;

    do {
        const params = {
            UserPoolId: USER_POOL_ID,
            GroupName: groupName,
            Limit: limit
        };
        if (nextToken) params.NextToken = nextToken;

        const response = await client.send(new ListUsersInGroupCommand(params));
        users.push(...response.Users);
        nextToken = response.NextToken;
    } while (nextToken);

    return users;
}
```

## Disabling and Enabling Users

Sometimes you need to temporarily block a user without deleting their account.

Disable and enable user accounts:

```javascript
async function disableUser(username) {
    await client.send(new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
    }));
    console.log(`Disabled user: ${username}`);
}

async function enableUser(username) {
    await client.send(new AdminEnableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
    }));
    console.log(`Enabled user: ${username}`);
}
```

Disabled users can't sign in but their data remains intact. When you enable them again, everything works as before.

## Searching and Listing Users

Cognito lets you search users by attributes. This is useful for admin dashboards.

Search and list users with pagination:

```javascript
async function searchUsers(filter, limit = 20) {
    const response = await client.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: filter,
        Limit: limit
    }));

    return response.Users.map(user => {
        const attrs = {};
        user.Attributes.forEach(a => { attrs[a.Name] = a.Value; });

        return {
            username: user.Username,
            status: user.UserStatus,
            enabled: user.Enabled,
            email: attrs.email,
            name: attrs.name,
            created: user.UserCreateDate
        };
    });
}

// Search examples
// Find by email
const usersByEmail = await searchUsers('email = "john@example.com"');

// Find by name (prefix match)
const usersByName = await searchUsers('name ^= "John"');

// Find by custom attribute
const usersByDept = await searchUsers('custom:department = "Engineering"');

// Find confirmed users
const confirmedUsers = await searchUsers('status = "Confirmed"');
```

## Listing All Users with Pagination

For large user pools, you'll need to paginate:

```javascript
async function listAllUsers() {
    const allUsers = [];
    let paginationToken = null;

    do {
        const params = {
            UserPoolId: USER_POOL_ID,
            Limit: 60 // Max is 60
        };
        if (paginationToken) {
            params.PaginationToken = paginationToken;
        }

        const response = await client.send(new ListUsersCommand(params));
        allUsers.push(...response.Users);
        paginationToken = response.PaginationToken;

        // Be respectful of rate limits
        if (paginationToken) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } while (paginationToken);

    return allUsers;
}
```

## Password Management

Reset a user's password or force them to change it:

```javascript
// Force a password reset - sends a code to the user
async function resetPassword(username) {
    await client.send(new AdminResetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
    }));
    console.log(`Password reset initiated for ${username}`);
}

// Set a new password directly (no user interaction needed)
async function setPassword(username, newPassword, permanent = true) {
    await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        Password: newPassword,
        Permanent: permanent
    }));
    console.log(`Password set for ${username}`);
}
```

## Building an Admin API

Here's how to expose these operations through an Express API, protected by admin group membership:

```javascript
const express = require('express');
const router = express.Router();

// Middleware: require admin group
function requireAdmin(req, res, next) {
    const groups = req.user.groups || [];
    if (!groups.includes('Admins')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

router.use(requireAdmin);

// List users
router.get('/users', async (req, res) => {
    try {
        const filter = req.query.search
            ? `email ^= "${req.query.search}"`
            : undefined;
        const users = await searchUsers(filter);
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post('/users', async (req, res) => {
    try {
        const { email, name, password, groups } = req.body;
        await createUserWithPassword(email, name, password);

        if (groups) {
            for (const group of groups) {
                await addUserToGroup(email, group);
            }
        }

        res.status(201).json({ message: 'User created', username: email });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Disable user
router.post('/users/:username/disable', async (req, res) => {
    try {
        await disableUser(req.params.username);
        res.json({ message: 'User disabled' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

For setting up these admin operations as part of a Terraform-managed infrastructure, see [setting up Cognito with Terraform](https://oneuptime.com/blog/post/cognito-terraform/view).

## Wrapping Up

The Cognito Admin APIs give you complete server-side control over your user pool. Whether you're building an admin dashboard, automating user provisioning, or handling support operations, these APIs cover the full lifecycle from user creation through group management to account disabling. Just remember that these operations require AWS credentials and proper IAM permissions - never expose them directly to client applications.
