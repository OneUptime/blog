# How to Implement OAuth2 Scopes in FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FastAPI, Python, OAuth2, Security, Scopes, Authentication, Authorization

Description: Learn how to implement OAuth2 scopes in FastAPI for fine-grained access control, including scope definitions, token validation, and permission checking.

---

> OAuth2 scopes let you grant limited access to your API. Instead of giving users full access or no access, scopes enable fine-grained permissions - a user can read data but not delete it, or access their own resources but not admin features. FastAPI has built-in support for OAuth2 scopes that integrates seamlessly with its dependency injection system.

OAuth2 scopes are strings that represent specific permissions. When a client requests an access token, they specify which scopes they need. The authorization server includes the granted scopes in the token, and your API checks these scopes before allowing access to protected endpoints.

---

## Why Use OAuth2 Scopes

| Benefit | Description |
|---------|-------------|
| **Least Privilege** | Grant only the permissions each client needs |
| **User Control** | Users see what permissions they are granting |
| **API Flexibility** | Same API serves clients with different access levels |
| **Security** | Compromised tokens have limited blast radius |

---

## Defining Scopes in FastAPI

Start by defining your scopes and creating an OAuth2 scheme:

```python
# scopes.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, SecurityScopes
from pydantic import BaseModel
from typing import Optional, List

# Define available scopes with descriptions
# These descriptions appear in the OpenAPI docs
SCOPES = {
    "users:read": "Read user information",
    "users:write": "Create and update users",
    "users:delete": "Delete users",
    "items:read": "Read items",
    "items:write": "Create and update items",
    "admin": "Full administrative access",
}

# OAuth2 scheme with scopes
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes=SCOPES  # Scopes appear in OpenAPI/Swagger UI
)

app = FastAPI()
```

---

## OAuth2 Password Flow with Scopes

Implement token generation that includes scopes:

```python
# auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import List, Optional

# Configuration
SECRET_KEY = "your-secret-key-keep-it-safe"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    scopes: List[str] = []

class User(BaseModel):
    username: str
    email: Optional[str] = None
    disabled: Optional[bool] = None
    # User's allowed scopes - what they CAN request
    allowed_scopes: List[str] = []

class UserInDB(User):
    hashed_password: str

# Mock database
fake_users_db = {
    "alice": {
        "username": "alice",
        "email": "alice@example.com",
        "hashed_password": pwd_context.hash("secret"),
        "disabled": False,
        # Alice can request any user scope
        "allowed_scopes": ["users:read", "users:write", "items:read", "items:write"],
    },
    "admin": {
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": pwd_context.hash("admin"),
        "disabled": False,
        # Admin can request all scopes
        "allowed_scopes": list(SCOPES.keys()),
    },
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db: dict, username: str) -> Optional[UserInDB]:
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(db: dict, username: str, password: str) -> Optional[UserInDB]:
    user = get_user(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT token with scopes in the payload"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

---

## Token Endpoint with Scope Validation

The token endpoint validates requested scopes against user permissions:

```python
# token_endpoint.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

app = FastAPI()

@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 token endpoint with scope handling.
    form_data.scopes contains requested scopes (space-separated in request)
    """
    # Authenticate user
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Validate requested scopes against user's allowed scopes
    requested_scopes = form_data.scopes
    granted_scopes = []

    for scope in requested_scopes:
        if scope in user.allowed_scopes:
            granted_scopes.append(scope)
        else:
            # Option 1: Reject if any scope is not allowed
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User not authorized for scope: {scope}"
            )
            # Option 2: Silently ignore unauthorized scopes
            # (just don't add to granted_scopes)

    # Create token with granted scopes
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "scopes": granted_scopes  # Include scopes in JWT
        },
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}
```

---

## Security Dependencies with Scope Requirements

FastAPI's `Security` dependency allows you to specify required scopes:

```python
# dependencies.py
from fastapi import Security, HTTPException, status
from fastapi.security import SecurityScopes

async def get_current_user(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Dependency that validates token AND checks scopes.
    SecurityScopes contains the scopes required by the endpoint.
    """
    # Build WWW-Authenticate header with required scopes
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": authenticate_value},
    )

    # Decode and validate JWT
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        # Extract scopes from token
        token_scopes = payload.get("scopes", [])
        token_data = TokenData(username=username, scopes=token_scopes)

    except JWTError:
        raise credentials_exception

    # Get user from database
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception

    # Check if token has required scopes
    for scope in security_scopes.scopes:
        if scope not in token_data.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required scope: {scope}",
                headers={"WWW-Authenticate": authenticate_value},
            )

    return user

async def get_current_active_user(
    current_user: User = Security(get_current_user, scopes=[])
) -> User:
    """Dependency for any authenticated user (no specific scopes)"""
    if current_user.disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user
```

---

## Protecting Endpoints with Scopes

Use `Security()` instead of `Depends()` to specify required scopes:

```python
# endpoints.py
from fastapi import APIRouter, Security
from typing import List

router = APIRouter()

# Requires users:read scope
@router.get("/users/me")
async def read_users_me(
    current_user: User = Security(get_current_user, scopes=["users:read"])
):
    """Get current user - requires users:read scope"""
    return current_user

# Requires users:write scope
@router.post("/users")
async def create_user(
    user_data: dict,
    current_user: User = Security(get_current_user, scopes=["users:write"])
):
    """Create user - requires users:write scope"""
    return {"message": "User created", "created_by": current_user.username}

# Requires users:delete scope
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Security(get_current_user, scopes=["users:delete"])
):
    """Delete user - requires users:delete scope"""
    return {"message": f"User {user_id} deleted"}

# Requires items:read scope
@router.get("/items")
async def read_items(
    current_user: User = Security(get_current_user, scopes=["items:read"])
):
    """List items - requires items:read scope"""
    return [{"item_id": 1, "name": "Item 1"}]

# Requires admin scope
@router.get("/admin/stats")
async def admin_stats(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    """Admin statistics - requires admin scope"""
    return {"users": 100, "items": 500}
```

---

## Combining Multiple Scopes

Require multiple scopes for sensitive operations:

```python
# multi_scope.py
from fastapi import Security

# Require ALL listed scopes (AND logic)
@app.delete("/users/{user_id}/permanent")
async def permanently_delete_user(
    user_id: str,
    current_user: User = Security(
        get_current_user,
        scopes=["users:delete", "admin"]  # Needs BOTH scopes
    )
):
    """Permanently delete user - requires users:delete AND admin scopes"""
    return {"message": f"User {user_id} permanently deleted"}

# For OR logic, use separate checks
async def require_any_scope(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme)
) -> User:
    """Alternative: require ANY of the specified scopes"""
    # ... decode token ...
    token_scopes = payload.get("scopes", [])

    # Check if token has ANY of the required scopes
    if security_scopes.scopes:
        has_any = any(scope in token_scopes for scope in security_scopes.scopes)
        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {security_scopes.scope_str}"
            )

    return user

# Use it like this
@app.get("/content")
async def read_content(
    current_user: User = Security(
        require_any_scope,
        scopes=["users:read", "items:read"]  # Needs users:read OR items:read
    )
):
    return {"content": "data"}
```

---

## Scope Inheritance and Hierarchies

Implement hierarchical scopes where broader scopes include narrower ones:

```python
# scope_hierarchy.py
from typing import Set

# Define scope hierarchy
SCOPE_HIERARCHY = {
    "admin": {"users:read", "users:write", "users:delete",
              "items:read", "items:write", "admin"},
    "users:write": {"users:read", "users:write"},
    "items:write": {"items:read", "items:write"},
}

def expand_scopes(scopes: List[str]) -> Set[str]:
    """Expand scopes to include inherited permissions"""
    expanded = set(scopes)

    for scope in scopes:
        if scope in SCOPE_HIERARCHY:
            expanded.update(SCOPE_HIERARCHY[scope])

    return expanded

async def get_current_user_with_hierarchy(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme)
) -> User:
    """Dependency that respects scope hierarchy"""
    # ... authenticate and decode token ...

    token_scopes = payload.get("scopes", [])

    # Expand token scopes to include inherited permissions
    effective_scopes = expand_scopes(token_scopes)

    # Check required scopes against expanded set
    for scope in security_scopes.scopes:
        if scope not in effective_scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required: {scope}"
            )

    return user

# Usage - admin scope grants access to everything
@app.get("/items/{item_id}")
async def read_item(
    item_id: int,
    current_user: User = Security(
        get_current_user_with_hierarchy,
        scopes=["items:read"]
    )
):
    """
    Requires items:read scope.
    Users with 'admin' or 'items:write' scope also have access.
    """
    return {"item_id": item_id}
```

---

## Error Handling for Missing Scopes

Provide clear error messages when scope checks fail:

```python
# error_handling.py
from fastapi import Request
from fastapi.responses import JSONResponse

class InsufficientScopeError(Exception):
    def __init__(self, required: List[str], provided: List[str]):
        self.required = required
        self.provided = provided

@app.exception_handler(InsufficientScopeError)
async def insufficient_scope_handler(
    request: Request,
    exc: InsufficientScopeError
) -> JSONResponse:
    """Custom handler for scope errors with detailed message"""
    missing = set(exc.required) - set(exc.provided)

    return JSONResponse(
        status_code=403,
        content={
            "error": "insufficient_scope",
            "error_description": "The access token does not have the required scopes",
            "required_scopes": exc.required,
            "provided_scopes": exc.provided,
            "missing_scopes": list(missing),
        },
        headers={
            "WWW-Authenticate": f'Bearer scope="{" ".join(exc.required)}"'
        }
    )

async def get_current_user_detailed_errors(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme)
) -> User:
    """Dependency with detailed scope error reporting"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_scopes = payload.get("scopes", [])

        # Check for missing scopes
        missing_scopes = [
            scope for scope in security_scopes.scopes
            if scope not in token_scopes
        ]

        if missing_scopes:
            raise InsufficientScopeError(
                required=security_scopes.scopes,
                provided=token_scopes
            )

        # ... rest of user validation ...

    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token validation failed: {str(e)}"
        )
```

---

## OpenAPI Documentation Integration

FastAPI automatically documents scopes in OpenAPI. Enhance with descriptions:

```python
# openapi_docs.py
from fastapi import FastAPI

# Scopes with detailed descriptions for docs
SCOPES = {
    "users:read": "Read access to user profiles and lists",
    "users:write": "Create new users and update existing user data",
    "users:delete": "Permanently remove user accounts",
    "items:read": "View items and item details",
    "items:write": "Create and modify items",
    "admin": "Full administrative access to all resources",
}

app = FastAPI(
    title="My API",
    description="API with OAuth2 scope-based authorization",
    version="1.0.0",
)

# The OAuth2 scheme registers scopes in OpenAPI
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes=SCOPES,
    description="OAuth2 password flow with scope-based permissions"
)

# Swagger UI will show:
# - Lock icon on protected endpoints
# - Required scopes for each endpoint
# - Scope selection in the authorization dialog
# - Scope descriptions in the security scheme section
```

When you open `/docs`, you will see:

1. A security section listing all available scopes with descriptions
2. Lock icons on protected endpoints showing required scopes
3. An "Authorize" button that lets you specify scopes when getting a token

---

## Testing Scope-Protected Endpoints

```python
# test_scopes.py
import pytest
from fastapi.testclient import TestClient
from jose import jwt

client = TestClient(app)

def create_test_token(username: str, scopes: List[str]) -> str:
    """Helper to create tokens with specific scopes for testing"""
    return jwt.encode(
        {"sub": username, "scopes": scopes},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def test_endpoint_requires_scope():
    """Test that endpoint rejects token without required scope"""
    # Token with only items:read scope
    token = create_test_token("testuser", ["items:read"])

    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    # Should fail - needs users:read scope
    assert response.status_code == 403
    assert "users:read" in response.json()["detail"]

def test_endpoint_accepts_valid_scope():
    """Test that endpoint accepts token with required scope"""
    token = create_test_token("testuser", ["users:read"])

    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200

def test_endpoint_requires_multiple_scopes():
    """Test endpoint requiring multiple scopes"""
    # Token with only one of the required scopes
    token = create_test_token("testuser", ["users:delete"])

    response = client.delete(
        "/users/123/permanent",
        headers={"Authorization": f"Bearer {token}"}
    )

    # Should fail - also needs admin scope
    assert response.status_code == 403

def test_admin_scope_grants_access():
    """Test that admin scope grants access to all endpoints"""
    token = create_test_token("admin", ["admin"])

    # With scope hierarchy, admin can access items:read endpoint
    response = client.get(
        "/items",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200

def test_token_endpoint_validates_scopes():
    """Test that token endpoint validates requested scopes"""
    # Request scope the user is not allowed to have
    response = client.post(
        "/token",
        data={
            "username": "alice",
            "password": "secret",
            "scope": "admin"  # Alice does not have admin permission
        }
    )

    assert response.status_code == 400
    assert "not authorized for scope" in response.json()["detail"]

@pytest.fixture
def admin_token():
    """Fixture providing an admin token"""
    return create_test_token("admin", list(SCOPES.keys()))

@pytest.fixture
def user_token():
    """Fixture providing a regular user token"""
    return create_test_token("alice", ["users:read", "items:read"])
```

---

## Complete Example

Here is a full working example combining all concepts:

```python
# main.py
from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, SecurityScopes
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional, Set

# Configuration
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Scope definitions
SCOPES = {
    "users:read": "Read user information",
    "users:write": "Create and update users",
    "items:read": "Read items",
    "items:write": "Create and update items",
    "admin": "Full administrative access",
}

# Scope hierarchy
SCOPE_HIERARCHY = {
    "admin": set(SCOPES.keys()),
    "users:write": {"users:read", "users:write"},
    "items:write": {"items:read", "items:write"},
}

app = FastAPI(title="OAuth2 Scopes Example")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", scopes=SCOPES)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    allowed_scopes: List[str] = []

# Mock database
users_db = {
    "alice": {
        "username": "alice",
        "hashed_password": pwd_context.hash("secret"),
        "allowed_scopes": ["users:read", "items:read", "items:write"],
    },
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash("admin"),
        "allowed_scopes": list(SCOPES.keys()),
    },
}

def expand_scopes(scopes: List[str]) -> Set[str]:
    """Expand scopes based on hierarchy"""
    expanded = set(scopes)
    for scope in scopes:
        if scope in SCOPE_HIERARCHY:
            expanded.update(SCOPE_HIERARCHY[scope])
    return expanded

async def get_current_user(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme)
) -> User:
    """Validate token and check scopes"""
    authenticate_value = f'Bearer scope="{security_scopes.scope_str}"' if security_scopes.scopes else "Bearer"

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        token_scopes = payload.get("scopes", [])

        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": authenticate_value}
        )

    user_data = users_db.get(username)
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")

    # Check scopes with hierarchy expansion
    effective_scopes = expand_scopes(token_scopes)

    for scope in security_scopes.scopes:
        if scope not in effective_scopes:
            raise HTTPException(
                status_code=403,
                detail=f"Missing required scope: {scope}",
                headers={"WWW-Authenticate": authenticate_value}
            )

    return User(**user_data)

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Get access token with scopes"""
    user_data = users_db.get(form_data.username)

    if not user_data or not pwd_context.verify(form_data.password, user_data["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Validate requested scopes
    for scope in form_data.scopes:
        if scope not in user_data["allowed_scopes"]:
            raise HTTPException(status_code=400, detail=f"Scope not allowed: {scope}")

    # Create token
    token = jwt.encode(
        {
            "sub": form_data.username,
            "scopes": form_data.scopes,
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {"access_token": token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(user: User = Security(get_current_user, scopes=["users:read"])):
    """Requires users:read scope"""
    return user

@app.get("/items")
async def read_items(user: User = Security(get_current_user, scopes=["items:read"])):
    """Requires items:read scope"""
    return [{"id": 1, "name": "Item 1"}]

@app.post("/items")
async def create_item(item: dict, user: User = Security(get_current_user, scopes=["items:write"])):
    """Requires items:write scope"""
    return {"created": item, "by": user.username}

@app.get("/admin/dashboard")
async def admin_dashboard(user: User = Security(get_current_user, scopes=["admin"])):
    """Requires admin scope"""
    return {"status": "admin access granted"}
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Use Descriptive Scope Names** | Format like `resource:action` (e.g., `users:read`) |
| **Document Scopes** | Add clear descriptions in SCOPES dict for OpenAPI docs |
| **Validate at Token Creation** | Check requested scopes against user permissions |
| **Use Scope Hierarchy** | Admin scopes should include lower-level permissions |
| **Return Clear Errors** | Tell clients which scopes are missing |
| **Include WWW-Authenticate** | Add scope info to 401/403 response headers |
| **Test Thoroughly** | Write tests for missing, invalid, and valid scopes |
| **Limit Token Scopes** | Grant only the scopes the client actually needs |

---

*Looking for comprehensive API monitoring with security insights? [OneUptime](https://oneuptime.com) provides real-time monitoring, alerting, and observability for your FastAPI applications.*
