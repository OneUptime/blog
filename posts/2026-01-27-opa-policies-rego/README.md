# How to Write OPA Policies with Rego

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPA, Rego, Policy, Authorization, Kubernetes, Security, Access Control

Description: Learn how to write Open Policy Agent (OPA) policies using Rego language for authorization, admission control, and policy enforcement across your infrastructure.

---

> Open Policy Agent (OPA) provides a unified way to enforce policies across your stack. Rego, its declarative policy language, lets you express complex authorization rules in a concise, testable format that works everywhere from Kubernetes admission control to API authorization.

Whether you need to implement RBAC, attribute-based access control, or Kubernetes admission policies, OPA and Rego provide a consistent approach. This guide covers everything from Rego basics to advanced patterns for production use.

---

## What is OPA and Rego?

Open Policy Agent (OPA) is an open-source, general-purpose policy engine. Rego is the high-level declarative language used to write OPA policies. Unlike imperative languages, Rego policies describe what should be allowed rather than how to check it.

Key characteristics of Rego:
- Declarative and data-driven
- Built-in support for JSON and YAML
- Easy to test and version control
- Works with any JSON input

---

## Getting Started with Rego

### Installing OPA

```bash
# macOS
brew install opa

# Linux (download binary)
curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
chmod +x opa
sudo mv opa /usr/local/bin/

# Verify installation
opa version
```

### Your First Policy

Create a simple policy file `example.rego`:

```rego
# Package declaration - organizes policies into namespaces
# Every Rego file must belong to a package
package example

# Import statements bring in built-in functions or other packages
import rego.v1

# A simple rule that evaluates to true
# Rules are the building blocks of Rego policies
allow if {
    # This rule allows access if the user is "admin"
    input.user == "admin"
}
```

Test it with the OPA CLI:

```bash
# Evaluate the policy with sample input
echo '{"user": "admin"}' | opa eval -i /dev/stdin -d example.rego "data.example.allow"
# Output: true

echo '{"user": "guest"}' | opa eval -i /dev/stdin -d example.rego "data.example.allow"
# Output: undefined (no result means false/denied)
```

---

## Rego Language Fundamentals

### Rules and Expressions

Rules in Rego are conditional assignments. A rule has a head (the name and optional value) and a body (the conditions).

```rego
package authz

import rego.v1

# Simple boolean rule - true when all conditions in body are satisfied
# The 'if' keyword makes the rule conditional
allow if {
    input.method == "GET"
    input.path == "/public"
}

# Rule with value assignment - assigns a value when conditions are met
# Useful for returning specific messages or computed values
user_role := role if {
    # Look up the user's role from the data document
    role := data.users[input.user].role
}

# Multiple rules with same name - acts like logical OR
# If any rule evaluates to true, the result is true
allow if {
    input.user == "admin"
}

allow if {
    input.method == "GET"
    input.path[0] == "public"
}
```

### Input and Data

Rego operates on two main sources:
- `input` - the request/query data (provided at evaluation time)
- `data` - the base document (policies and external data)

```rego
package authorization

import rego.v1

# Define static data within the policy
# This data is part of the policy bundle
roles := {
    "admin": {"permissions": ["read", "write", "delete"]},
    "editor": {"permissions": ["read", "write"]},
    "viewer": {"permissions": ["read"]}
}

# Check if user has required permission
# input.user and input.action come from the request
has_permission if {
    # Get the user's role from input
    role := input.user.role

    # Look up permissions for that role
    permissions := roles[role].permissions

    # Check if the requested action is in the permissions list
    input.action in permissions
}
```

### Variables and Unification

Variables in Rego are assigned through unification, not assignment. A statement like `x := value` binds the variable if unbound, or checks equality if already bound.

```rego
package variables

import rego.v1

# Unification examples
example_unification if {
    # Bind x to the value 10
    x := 10

    # This succeeds because x already equals 10
    x == 10

    # Array destructuring through unification
    # Binds first to "a" and rest to ["b", "c"]
    [first, rest] := ["a", ["b", "c"]]
    first == "a"
}

# Using 'some' for iteration with unification
# 'some' introduces local variables for iteration
find_admin[user] if {
    # Iterate over all users in data.users
    some user in data.users

    # Filter to only those with admin role
    data.users[user].role == "admin"
}
```

---

## Comprehensions and Iteration

### Array Comprehensions

Comprehensions let you build collections from iterations.

```rego
package comprehensions

import rego.v1

# Sample data for examples
users := [
    {"name": "alice", "role": "admin", "active": true},
    {"name": "bob", "role": "editor", "active": true},
    {"name": "charlie", "role": "viewer", "active": false}
]

# Array comprehension - collect names of active users
# Syntax: [expression | iteration; condition]
active_user_names := [name |
    # Iterate over each user
    some user in users

    # Filter condition - only active users
    user.active == true

    # Expression to collect
    name := user.name
]
# Result: ["alice", "bob"]

# Array comprehension with transformation
user_summaries := [summary |
    some user in users
    user.active
    summary := sprintf("%s (%s)", [user.name, user.role])
]
# Result: ["alice (admin)", "bob (editor)"]
```

### Set Comprehensions

Sets contain unique values without duplicates.

```rego
package sets

import rego.v1

requests := [
    {"user": "alice", "resource": "/api/users"},
    {"user": "bob", "resource": "/api/orders"},
    {"user": "alice", "resource": "/api/products"}
]

# Set comprehension - collect unique users
# Uses curly braces instead of square brackets
unique_users := {user |
    some req in requests
    user := req.user
}
# Result: {"alice", "bob"}

# Set comprehension for unique resources accessed by alice
alice_resources := {resource |
    some req in requests
    req.user == "alice"
    resource := req.resource
}
# Result: {"/api/users", "/api/products"}
```

### Object Comprehensions

Build objects (key-value maps) dynamically.

```rego
package objects

import rego.v1

users := [
    {"id": "u1", "name": "alice", "email": "alice@example.com"},
    {"id": "u2", "name": "bob", "email": "bob@example.com"}
]

# Object comprehension - create lookup map by id
# Syntax: {key: value | iteration; condition}
users_by_id := {id: user |
    some user in users
    id := user.id
}
# Result: {"u1": {"id": "u1", ...}, "u2": {"id": "u2", ...}}

# Object comprehension for email lookup
emails_by_name := {name: email |
    some user in users
    name := user.name
    email := user.email
}
# Result: {"alice": "alice@example.com", "bob": "bob@example.com"}
```

---

## Functions in Rego

Functions help reduce code duplication and improve readability.

```rego
package functions

import rego.v1

# Function with single argument
# Functions return the value of their body
is_weekend(day) if {
    day in {"Saturday", "Sunday"}
}

# Function with multiple arguments
# Checks if a value falls within a range
in_range(value, min, max) if {
    value >= min
    value <= max
}

# Function that returns a computed value
# Calculates permission level from role
permission_level(role) := level if {
    levels := {
        "admin": 100,
        "editor": 50,
        "viewer": 10,
        "guest": 0
    }
    level := levels[role]
}

# Default value for function when conditions do not match
permission_level(role) := 0 if {
    not role in {"admin", "editor", "viewer", "guest"}
}

# Using functions in rules
allow if {
    level := permission_level(input.user.role)
    level >= 50
    input.action in {"read", "write"}
}
```

---

## Negation and Default Values

### Using Negation

The `not` keyword inverts the truth of a statement.

```rego
package negation

import rego.v1

# List of blocked users
blocked_users := {"spammer", "bot", "banned_user"}

# Allow access if user is NOT blocked
# 'not' returns true when the expression is undefined or false
allow if {
    not user_is_blocked
}

# Helper rule to check if user is blocked
user_is_blocked if {
    input.user in blocked_users
}

# Negation with function calls
restricted_resources := {"/admin", "/internal", "/config"}

allow_resource if {
    not is_restricted(input.path)
}

is_restricted(path) if {
    path in restricted_resources
}
```

### Default Values

Use `default` to provide fallback values when rules do not match.

```rego
package defaults

import rego.v1

# Without default, allow is undefined when no rules match
# With default, it explicitly returns false
default allow := false

allow if {
    input.user == "admin"
}

allow if {
    is_public_resource
    input.method == "GET"
}

is_public_resource if {
    startswith(input.path, "/public/")
}

# Default with complex values
default response := {"allowed": false, "reason": "no matching rule"}

response := {"allowed": true, "reason": "admin access"} if {
    input.user == "admin"
}

response := {"allowed": true, "reason": "public resource"} if {
    is_public_resource
}
```

---

## Common Authorization Patterns

### Role-Based Access Control (RBAC)

```rego
package rbac

import rego.v1

# Define role hierarchy and permissions
# This structure maps roles to allowed actions on resources
role_permissions := {
    "admin": {
        "users": ["create", "read", "update", "delete"],
        "orders": ["create", "read", "update", "delete"],
        "reports": ["create", "read"]
    },
    "manager": {
        "users": ["read"],
        "orders": ["create", "read", "update"],
        "reports": ["read"]
    },
    "employee": {
        "orders": ["create", "read"],
        "reports": ["read"]
    }
}

# Default deny - explicit denial when no rules match
default allow := false

# Main authorization rule
allow if {
    # Get the user's role from input
    role := input.user.role

    # Look up permissions for this role and resource
    permissions := role_permissions[role][input.resource]

    # Check if the requested action is permitted
    input.action in permissions
}

# Generate detailed authorization response
authorization := {
    "allowed": allow,
    "user": input.user.name,
    "role": input.user.role,
    "resource": input.resource,
    "action": input.action
}
```

### Attribute-Based Access Control (ABAC)

```rego
package abac

import rego.v1

# ABAC considers attributes of user, resource, action, and environment
default allow := false

# Rule 1: Admins can do anything
allow if {
    input.user.role == "admin"
}

# Rule 2: Users can access their own resources
allow if {
    input.resource.owner == input.user.id
}

# Rule 3: Department members can read department resources
allow if {
    input.action == "read"
    input.user.department == input.resource.department
}

# Rule 4: Time-based access - only during business hours
allow if {
    input.action == "read"
    is_business_hours
}

# Helper to check business hours (9 AM to 6 PM)
is_business_hours if {
    hour := time.clock([input.environment.timestamp, "UTC"])[0]
    hour >= 9
    hour < 18
}

# Rule 5: Location-based restrictions
allow if {
    input.action == "read"
    input.user.location in input.resource.allowed_locations
}
```

### Kubernetes Admission Control

```rego
package kubernetes.admission

import rego.v1

# Deny pods without resource limits
# This policy ensures all containers specify resource limits
deny contains msg if {
    # Match on pod resources
    input.request.kind.kind == "Pod"

    # Iterate over containers
    some container in input.request.object.spec.containers

    # Check if limits are missing
    not container.resources.limits

    # Generate descriptive error message
    msg := sprintf("Container '%s' must specify resource limits", [container.name])
}

# Deny containers running as root
deny contains msg if {
    input.request.kind.kind == "Pod"
    some container in input.request.object.spec.containers

    # Check security context
    container.securityContext.runAsUser == 0

    msg := sprintf("Container '%s' cannot run as root (UID 0)", [container.name])
}

# Deny pods without labels
deny contains msg if {
    input.request.kind.kind == "Pod"

    # Check for required labels
    required_labels := {"app", "environment"}
    provided_labels := {label | some label, _ in input.request.object.metadata.labels}
    missing := required_labels - provided_labels

    count(missing) > 0

    msg := sprintf("Pod missing required labels: %v", [missing])
}

# Deny images from untrusted registries
deny contains msg if {
    input.request.kind.kind == "Pod"
    some container in input.request.object.spec.containers

    trusted_registries := {"gcr.io/myproject", "docker.io/myorg"}

    not image_from_trusted_registry(container.image, trusted_registries)

    msg := sprintf("Container '%s' uses untrusted image: %s", [container.name, container.image])
}

# Helper function to check image registry
image_from_trusted_registry(image, registries) if {
    some registry in registries
    startswith(image, registry)
}
```

---

## Testing Policies

Testing is essential for policy reliability. OPA has built-in testing support.

```rego
# policy.rego
package authz

import rego.v1

default allow := false

allow if {
    input.user.role == "admin"
}

allow if {
    input.user.role == "editor"
    input.action in {"read", "write"}
}

allow if {
    input.user.role == "viewer"
    input.action == "read"
}
```

```rego
# policy_test.rego
package authz_test

import rego.v1

# Import the policy package to test
import data.authz

# Test that admins are allowed
test_admin_allowed if {
    authz.allow with input as {
        "user": {"role": "admin"},
        "action": "delete"
    }
}

# Test that editors can read and write
test_editor_read_allowed if {
    authz.allow with input as {
        "user": {"role": "editor"},
        "action": "read"
    }
}

test_editor_write_allowed if {
    authz.allow with input as {
        "user": {"role": "editor"},
        "action": "write"
    }
}

# Test that editors cannot delete
test_editor_delete_denied if {
    not authz.allow with input as {
        "user": {"role": "editor"},
        "action": "delete"
    }
}

# Test that viewers can only read
test_viewer_read_allowed if {
    authz.allow with input as {
        "user": {"role": "viewer"},
        "action": "read"
    }
}

test_viewer_write_denied if {
    not authz.allow with input as {
        "user": {"role": "viewer"},
        "action": "write"
    }
}

# Test unknown role is denied
test_unknown_role_denied if {
    not authz.allow with input as {
        "user": {"role": "unknown"},
        "action": "read"
    }
}
```

Run tests:

```bash
# Run all tests in current directory
opa test . -v

# Run tests with coverage
opa test . --coverage

# Run specific test file
opa test policy.rego policy_test.rego -v
```

---

## Debugging with OPA REPL

The OPA REPL is invaluable for debugging and exploring policies.

```bash
# Start REPL with policy files loaded
opa run policy.rego data.json

# Or start empty REPL
opa run
```

Common REPL commands:

```rego
# Load a policy file
> .load policy.rego

# Set input data for queries
> input := {"user": {"role": "admin"}, "action": "delete"}

# Evaluate expressions
> data.authz.allow
true

# Trace evaluation to see how decision was made
> trace(data.authz.allow)

# Explore data structure
> data.authz

# Test comprehensions interactively
> [x | x := data.users[_].name]

# Check variable bindings
> x := "test"; x
"test"

# Use built-in functions
> startswith("hello", "he")
true

# Exit REPL
> exit
```

### Tracing for Debugging

```bash
# Enable detailed tracing from command line
opa eval -d policy.rego -i input.json "data.authz.allow" --explain full

# Partial evaluation for debugging
opa eval -d policy.rego -i input.json "data.authz.allow" --partial
```

---

## Performance Optimization

### Indexing for Fast Lookups

```rego
package optimized

import rego.v1

# Slow: Linear scan through array
# This checks every user on each evaluation
slow_has_permission if {
    some user in data.users
    user.name == input.user
    input.permission in user.permissions
}

# Fast: Use object for O(1) lookup
# Pre-structure data as object keyed by user name
# data.users_by_name = {"alice": {...}, "bob": {...}}
fast_has_permission if {
    user := data.users_by_name[input.user]
    input.permission in user.permissions
}
```

### Avoid Unnecessary Computation

```rego
package efficient

import rego.v1

# Less efficient: Multiple rule evaluations
check_all if {
    check_auth
    check_rate_limit
    check_permissions
}

# More efficient: Early termination with ordered conditions
# Put cheap, likely-to-fail checks first
default allow := false

allow if {
    # Cheap check first - usually fails fast
    not user_is_blocked

    # Then rate limiting
    not rate_limit_exceeded

    # Finally expensive permission check
    has_required_permissions
}

user_is_blocked if {
    input.user in data.blocked_users
}

rate_limit_exceeded if {
    count(data.recent_requests[input.user]) > 100
}

has_required_permissions if {
    # Complex permission logic here
    role := data.users[input.user].role
    required := data.resource_permissions[input.resource]
    role in required.allowed_roles
}
```

---

## Best Practices Summary

### Policy Organization

```rego
# 1. Use clear package hierarchy
package company.platform.authz.api

# 2. Group related rules in same file
# 3. Keep policies focused - one concern per file

# 4. Use descriptive rule names
user_can_access_resource if { ... }  # Good
allow if { ... }                      # Too generic for complex policies

# 5. Document complex logic with comments
# Check if user has transitive permission through group membership
has_inherited_permission if {
    # User belongs to a group
    some group in data.user_groups[input.user]
    # Group has the required permission
    input.permission in data.group_permissions[group]
}
```

### Error Handling

```rego
package robust

import rego.v1

# Always provide defaults for safety
default allow := false
default reason := "access denied"

# Handle missing input gracefully
allow if {
    # Check input exists before accessing
    input.user
    input.user.role
    input.user.role == "admin"
}

# Return informative denial reasons
reason := "user not authenticated" if {
    not input.user
}

reason := "insufficient permissions" if {
    input.user
    not has_permission
}
```

### Security Considerations

```rego
package secure

import rego.v1

# 1. Default to deny
default allow := false

# 2. Validate input types when necessary
allow if {
    is_string(input.user)
    is_string(input.action)
    # Continue with checks
}

# 3. Avoid information leakage in error messages
# Bad: reveals internal structure
# reason := sprintf("user %s not in group %s", [input.user, required_group])

# Good: generic message
reason := "access denied" if {
    not allow
}

# 4. Use allowlists instead of blocklists
allowed_actions := {"read", "write", "list"}

allow if {
    input.action in allowed_actions  # Allowlist approach
}

# 5. Log decisions for audit (configure OPA decision logs)
```

---

## Conclusion

OPA and Rego provide a powerful, unified approach to policy enforcement. Key takeaways:

- Rego is declarative - describe what should be allowed, not how to check
- Use packages to organize policies logically
- Comprehensions handle iteration and collection building
- Test policies thoroughly with OPA's built-in testing
- Use the REPL for interactive debugging
- Structure data for efficient lookups
- Default to deny and use allowlists for security

Start with simple policies and gradually add complexity. The combination of testability, performance, and flexibility makes OPA suitable for everything from API authorization to Kubernetes admission control.

---

*Need to monitor your policy decisions and application performance? [OneUptime](https://oneuptime.com) provides comprehensive observability for your infrastructure, helping you track policy enforcement alongside application metrics and traces.*
