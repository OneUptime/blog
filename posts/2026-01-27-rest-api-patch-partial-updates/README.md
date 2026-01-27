# How to Implement Partial Updates with PATCH in REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, PATCH, API Design, Partial Updates, HTTP

Description: Learn how to implement PATCH for partial updates in REST APIs including JSON Patch, JSON Merge Patch, and validation strategies.

---

> PATCH is for partial updates. PUT is for full replacements. Knowing when to use each prevents data loss and reduces bandwidth.

Partial updates are essential for efficient REST APIs. Instead of sending an entire resource to change one field, PATCH lets clients send only the modified fields. This guide covers the standards, implementation patterns, and pitfalls of PATCH operations.

## PUT vs PATCH Semantics

| Method | Semantic | What it Does |
|--------|----------|--------------|
| **PUT** | Replace | Replaces the entire resource with the request body |
| **PATCH** | Modify | Applies partial modifications to the resource |

PUT is idempotent - calling it multiple times with the same payload produces the same result. PATCH may or may not be idempotent depending on the operation.

```javascript
// PUT replaces everything - missing fields become null/default
// Original: { name: "John", email: "john@example.com", age: 30 }
// PUT body: { name: "John Updated" }
// Result: { name: "John Updated", email: null, age: null }

// PATCH only updates what you send
// Original: { name: "John", email: "john@example.com", age: 30 }
// PATCH body: { name: "John Updated" }
// Result: { name: "John Updated", email: "john@example.com", age: 30 }
```

## JSON Merge Patch (RFC 7396)

JSON Merge Patch is the simplest approach. Send a JSON object with only the fields you want to change. The server merges it with the existing resource.

```javascript
// Content-Type: application/merge-patch+json

// Original resource
const user = {
  name: "Alice",
  email: "alice@example.com",
  profile: {
    bio: "Developer",
    location: "NYC",
    social: {
      twitter: "@alice",
      github: "alice"
    }
  }
};

// Merge Patch request body
const patch = {
  name: "Alice Smith",           // Update name
  profile: {
    location: "Boston",          // Update nested field
    social: {
      linkedin: "alicesmith"     // Add new nested field
    }
  }
};

// Result after merge
const result = {
  name: "Alice Smith",
  email: "alice@example.com",    // Unchanged
  profile: {
    bio: "Developer",            // Unchanged
    location: "Boston",
    social: {
      twitter: "@alice",         // Unchanged
      github: "alice",           // Unchanged
      linkedin: "alicesmith"     // Added
    }
  }
};
```

### Implementing JSON Merge Patch

```javascript
// Deep merge utility for JSON Merge Patch
// Handles nested objects and null values (null = delete)
function jsonMergePatch(target, patch) {
  // If patch is not an object, it replaces target entirely
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return patch;
  }

  // Start with a copy of target
  const result = { ...target };

  for (const key of Object.keys(patch)) {
    const patchValue = patch[key];

    if (patchValue === null) {
      // Null means delete the key
      delete result[key];
    } else if (typeof patchValue === 'object' && !Array.isArray(patchValue)) {
      // Recursively merge nested objects
      result[key] = jsonMergePatch(result[key] || {}, patchValue);
    } else {
      // Primitive values or arrays replace entirely
      result[key] = patchValue;
    }
  }

  return result;
}

// Express.js route handler
app.patch('/users/:id', async (req, res) => {
  const contentType = req.headers['content-type'];

  // Validate content type
  if (contentType !== 'application/merge-patch+json') {
    return res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'Use application/merge-patch+json'
    });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Apply the merge patch
    const updated = jsonMergePatch(user.toObject(), req.body);

    // Validate the result before saving
    const validated = await validateUser(updated);

    await User.findByIdAndUpdate(req.params.id, validated);

    res.json(validated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Handling Null Values

JSON Merge Patch uses null to delete fields. This creates a problem: how do you actually set a field to null?

```javascript
// Problem: Cannot distinguish between "delete field" and "set to null"
const patch = { middleName: null }; // Deletes middleName

// Solution 1: Use empty string or sentinel value
const patch1 = { middleName: "" };           // Empty string means null
const patch2 = { middleName: "__NULL__" };   // Sentinel value

// Solution 2: Use JSON Patch instead (see next section)

// Solution 3: Document the behavior and accept the limitation
// Most APIs don't need to distinguish null from absent
```

## JSON Patch (RFC 6902)

JSON Patch is more powerful but more complex. It uses an array of operations to describe changes. This gives precise control over additions, removals, replacements, and even array manipulations.

```javascript
// Content-Type: application/json-patch+json

// JSON Patch operations array
const patch = [
  { "op": "replace", "path": "/name", "value": "Alice Smith" },
  { "op": "add", "path": "/profile/social/linkedin", "value": "alicesmith" },
  { "op": "remove", "path": "/profile/social/twitter" },
  { "op": "copy", "path": "/profile/displayName", "from": "/name" },
  { "op": "move", "path": "/oldEmail", "from": "/backupEmail" },
  { "op": "test", "path": "/version", "value": 5 }  // Fails if version != 5
];

// Operations:
// - add: Add a value (to object or array)
// - remove: Remove a value
// - replace: Replace a value (must exist)
// - move: Move a value from one path to another
// - copy: Copy a value to another path
// - test: Verify a value (useful for optimistic locking)
```

### Implementing JSON Patch

```javascript
// Simple JSON Patch implementation
// For production, use a library like 'fast-json-patch'
function applyJsonPatch(document, operations) {
  let result = JSON.parse(JSON.stringify(document)); // Deep clone

  for (const op of operations) {
    const { path, value, from } = op;

    switch (op.op) {
      case 'add':
        result = setValueAtPath(result, path, value);
        break;

      case 'remove':
        result = removeValueAtPath(result, path);
        break;

      case 'replace':
        if (getValueAtPath(result, path) === undefined) {
          throw new Error(`Path ${path} does not exist`);
        }
        result = setValueAtPath(result, path, value);
        break;

      case 'move':
        const moveValue = getValueAtPath(result, from);
        result = removeValueAtPath(result, from);
        result = setValueAtPath(result, path, moveValue);
        break;

      case 'copy':
        const copyValue = getValueAtPath(result, from);
        result = setValueAtPath(result, path, copyValue);
        break;

      case 'test':
        const testValue = getValueAtPath(result, path);
        if (JSON.stringify(testValue) !== JSON.stringify(value)) {
          throw new Error(`Test failed at ${path}`);
        }
        break;

      default:
        throw new Error(`Unknown operation: ${op.op}`);
    }
  }

  return result;
}

// Path utilities using JSON Pointer format (/foo/bar/0)
function parsePath(path) {
  return path.split('/').slice(1).map(segment =>
    segment.replace(/~1/g, '/').replace(/~0/g, '~')
  );
}

function getValueAtPath(obj, path) {
  const segments = parsePath(path);
  let current = obj;

  for (const segment of segments) {
    if (current === undefined || current === null) return undefined;
    current = current[segment];
  }

  return current;
}

function setValueAtPath(obj, path, value) {
  const segments = parsePath(path);
  const result = JSON.parse(JSON.stringify(obj));
  let current = result;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment];
  }

  const lastSegment = segments[segments.length - 1];

  // Handle array append with '-'
  if (lastSegment === '-' && Array.isArray(current)) {
    current.push(value);
  } else {
    current[lastSegment] = value;
  }

  return result;
}

function removeValueAtPath(obj, path) {
  const segments = parsePath(path);
  const result = JSON.parse(JSON.stringify(obj));
  let current = result;

  for (let i = 0; i < segments.length - 1; i++) {
    current = current[segments[i]];
  }

  const lastSegment = segments[segments.length - 1];

  if (Array.isArray(current)) {
    current.splice(parseInt(lastSegment), 1);
  } else {
    delete current[lastSegment];
  }

  return result;
}
```

### Express Handler for JSON Patch

```javascript
const jsonpatch = require('fast-json-patch');

app.patch('/users/:id', async (req, res) => {
  const contentType = req.headers['content-type'];

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updated;
    const document = user.toObject();

    if (contentType === 'application/json-patch+json') {
      // JSON Patch - array of operations
      const errors = jsonpatch.validate(req.body, document);
      if (errors) {
        return res.status(400).json({ error: 'Invalid patch', details: errors });
      }
      updated = jsonpatch.applyPatch(document, req.body).newDocument;

    } else if (contentType === 'application/merge-patch+json') {
      // JSON Merge Patch
      updated = jsonMergePatch(document, req.body);

    } else {
      return res.status(415).json({
        error: 'Unsupported content type',
        supported: ['application/json-patch+json', 'application/merge-patch+json']
      });
    }

    // Validate before saving
    const validated = await validateUser(updated);
    await User.findByIdAndUpdate(req.params.id, validated);

    res.json(validated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## Validation of Partial Data

Validating partial updates is tricky. You cannot require fields that are not being updated.

```javascript
// Zod schema for full user validation
const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  profile: z.object({
    bio: z.string().max(500).optional(),
    location: z.string().optional()
  }).optional()
});

// For PATCH, make all fields optional but validate if present
const patchUserSchema = userSchema.partial().strict();

// Alternative: Create patch schema that validates only provided fields
function createPatchValidator(fullSchema) {
  return (patch, existingData) => {
    // Merge patch with existing data
    const merged = { ...existingData, ...patch };

    // Validate the merged result against full schema
    return fullSchema.parse(merged);
  };
}

// Usage in route handler
app.patch('/users/:id', async (req, res) => {
  try {
    // Validate patch structure (all fields optional)
    const patch = patchUserSchema.parse(req.body);

    const user = await User.findById(req.params.id);
    const merged = jsonMergePatch(user.toObject(), patch);

    // Validate final result against full schema
    const validated = userSchema.parse(merged);

    await User.findByIdAndUpdate(req.params.id, validated);
    res.json(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});
```

## Concurrent Update Handling with ETags

ETags prevent lost updates when multiple clients modify the same resource. The client sends the ETag it received, and the server rejects updates if the resource changed.

```javascript
// Generate ETag from resource state
function generateETag(data) {
  const hash = require('crypto')
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
}

app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  const etag = generateETag(user);

  // Check If-None-Match for conditional GET
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.set('ETag', etag);
  res.json(user);
});

app.patch('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  const currentETag = generateETag(user);
  const clientETag = req.headers['if-match'];

  // Require If-Match header for optimistic locking
  if (!clientETag) {
    return res.status(428).json({
      error: 'Precondition Required',
      message: 'Include If-Match header with ETag'
    });
  }

  // Reject if resource changed since client fetched it
  if (clientETag !== currentETag) {
    return res.status(412).json({
      error: 'Precondition Failed',
      message: 'Resource was modified. Fetch latest version and retry.',
      currentETag
    });
  }

  // Apply patch and save
  const updated = jsonMergePatch(user.toObject(), req.body);
  await User.findByIdAndUpdate(req.params.id, updated);

  const newETag = generateETag(updated);
  res.set('ETag', newETag);
  res.json(updated);
});
```

### Using JSON Patch Test Operation

JSON Patch has a built-in test operation for optimistic locking without ETags.

```javascript
// Client includes test operation to verify expected state
const patch = [
  { "op": "test", "path": "/version", "value": 5 },
  { "op": "replace", "path": "/name", "value": "New Name" },
  { "op": "replace", "path": "/version", "value": 6 }
];

// If version is not 5, the entire patch fails
// This ensures atomic check-and-update
```

## Response Format for PATCH

Return the updated resource in the response. Include the ETag for subsequent requests.

```javascript
// Successful PATCH response
// Status: 200 OK
{
  "id": "123",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "profile": {
    "bio": "Developer",
    "location": "Boston"
  },
  "updatedAt": "2026-01-27T10:30:00Z"
}

// Headers
// ETag: "abc123"
// Last-Modified: Mon, 27 Jan 2026 10:30:00 GMT

// Alternative: Return 204 No Content if client does not need response body
// Useful for bandwidth-constrained clients
```

### Error Responses

```javascript
// 400 Bad Request - Invalid patch format
{
  "error": "Invalid patch",
  "details": [
    { "path": "/email", "message": "Invalid email format" }
  ]
}

// 409 Conflict - Business rule violation
{
  "error": "Conflict",
  "message": "Cannot change email while account is locked"
}

// 412 Precondition Failed - ETag mismatch
{
  "error": "Precondition Failed",
  "message": "Resource was modified by another request",
  "currentETag": "\"xyz789\""
}

// 422 Unprocessable Entity - Valid format, invalid semantics
{
  "error": "Unprocessable Entity",
  "message": "Age cannot be negative"
}
```

## Database Considerations

### SQL Partial Updates

```javascript
// Build UPDATE query with only changed fields
function buildPartialUpdate(tableName, id, changes) {
  const fields = Object.keys(changes);

  if (fields.length === 0) {
    return null; // Nothing to update
  }

  const setClauses = fields.map((field, i) => `${field} = $${i + 2}`);
  const values = [id, ...fields.map(f => changes[f])];

  return {
    query: `
      UPDATE ${tableName}
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    values
  };
}

// Usage with pg
async function patchUser(id, changes) {
  const { query, values } = buildPartialUpdate('users', id, changes);
  const result = await pool.query(query, values);
  return result.rows[0];
}
```

### MongoDB Partial Updates

```javascript
// MongoDB $set for partial updates
async function patchUser(id, changes) {
  // Flatten nested objects for $set
  const setOperations = flattenForMongo(changes);

  const result = await User.findByIdAndUpdate(
    id,
    {
      $set: setOperations,
      $currentDate: { updatedAt: true }
    },
    { new: true, runValidators: true }
  );

  return result;
}

// Flatten nested objects: { profile: { bio: "x" } } => { "profile.bio": "x" }
function flattenForMongo(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null) {
      // Use $unset for null values if needed
      result[path] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenForMongo(value, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}
```

## Implementation in Python (FastAPI)

```python
from fastapi import FastAPI, HTTPException, Header, Response
from pydantic import BaseModel, EmailStr
from typing import Optional
import hashlib
import json

app = FastAPI()

# In-memory store for example
users_db = {}

class UserBase(BaseModel):
    name: str
    email: EmailStr
    age: Optional[int] = None

class UserPatch(BaseModel):
    # All fields optional for PATCH
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    age: Optional[int] = None

    class Config:
        # Exclude unset fields from dict
        extra = "forbid"

def generate_etag(data: dict) -> str:
    content = json.dumps(data, sort_keys=True)
    return f'"{hashlib.md5(content.encode()).hexdigest()}"'

@app.patch("/users/{user_id}")
async def patch_user(
    user_id: str,
    patch: UserPatch,
    response: Response,
    if_match: Optional[str] = Header(None)
):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")

    user = users_db[user_id]
    current_etag = generate_etag(user)

    # Check ETag if provided
    if if_match and if_match != current_etag:
        raise HTTPException(
            status_code=412,
            detail="Resource was modified"
        )

    # Apply only the fields that were set
    patch_data = patch.dict(exclude_unset=True)
    updated = {**user, **patch_data}

    # Validate against full schema
    UserBase(**updated)

    users_db[user_id] = updated
    response.headers["ETag"] = generate_etag(updated)

    return updated
```

## Implementation in Go

```go
package main

import (
    "crypto/md5"
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/gin-gonic/gin"
)

type User struct {
    ID    string  `json:"id"`
    Name  string  `json:"name"`
    Email string  `json:"email"`
    Age   *int    `json:"age,omitempty"`
}

// UserPatch uses pointers to distinguish between "not set" and "set to zero"
type UserPatch struct {
    Name  *string `json:"name,omitempty"`
    Email *string `json:"email,omitempty"`
    Age   *int    `json:"age,omitempty"`
}

func generateETag(data interface{}) string {
    bytes, _ := json.Marshal(data)
    hash := md5.Sum(bytes)
    return fmt.Sprintf(`"%x"`, hash)
}

func patchUser(c *gin.Context) {
    userID := c.Param("id")

    // Fetch user from database
    user, exists := usersDB[userID]
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // Check ETag
    currentETag := generateETag(user)
    ifMatch := c.GetHeader("If-Match")
    if ifMatch != "" && ifMatch != currentETag {
        c.JSON(http.StatusPreconditionFailed, gin.H{
            "error": "Resource was modified",
        })
        return
    }

    // Parse patch
    var patch UserPatch
    if err := c.ShouldBindJSON(&patch); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Apply patch - only update non-nil fields
    if patch.Name != nil {
        user.Name = *patch.Name
    }
    if patch.Email != nil {
        user.Email = *patch.Email
    }
    if patch.Age != nil {
        user.Age = patch.Age
    }

    // Save and respond
    usersDB[userID] = user
    c.Header("ETag", generateETag(user))
    c.JSON(http.StatusOK, user)
}
```

## Best Practices Summary

| Practice | Reason |
|----------|--------|
| **Use appropriate Content-Type** | `application/merge-patch+json` or `application/json-patch+json` |
| **Validate merged result** | Partial data may be valid but combined result invalid |
| **Use ETags for concurrency** | Prevents lost updates from concurrent modifications |
| **Return updated resource** | Client needs current state after PATCH |
| **Document null handling** | JSON Merge Patch deletes on null |
| **Use 422 for semantic errors** | Distinguish from 400 syntax errors |
| **Support If-Match header** | Required for safe concurrent updates |
| **Flatten updates for databases** | Convert nested patches to dot notation |

PATCH enables efficient partial updates when implemented correctly. JSON Merge Patch is simpler for most use cases, while JSON Patch provides precise control for complex operations. Combine with ETags and proper validation for robust APIs.

---

OneUptime provides comprehensive API monitoring to track your REST endpoints. Monitor response times, error rates, and availability of your PATCH endpoints in real-time. [Try OneUptime](https://oneuptime.com) to ensure your APIs perform reliably.
