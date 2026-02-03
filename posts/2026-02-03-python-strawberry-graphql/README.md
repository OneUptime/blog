# How to Build GraphQL APIs with Strawberry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Strawberry, GraphQL, API, FastAPI, Backend

Description: Learn how to build type-safe GraphQL APIs in Python using Strawberry. This guide covers schemas, queries, mutations, subscriptions, and FastAPI integration.

---

> GraphQL has become the go-to solution for building flexible APIs that give clients exactly the data they need. Strawberry is a modern Python library that brings the full power of GraphQL to Python with type hints and dataclasses at its core. This guide walks you through building production-ready GraphQL APIs from scratch.

What makes Strawberry stand out from other Python GraphQL libraries is its use of Python's native type hints. Instead of learning a separate schema definition language, you write plain Python classes and let Strawberry generate the GraphQL schema for you. This means your IDE gives you autocomplete, type checking catches bugs before runtime, and your code stays maintainable as it grows.

---

## Why Choose Strawberry for GraphQL

Before diving into code, here is why Strawberry has gained popularity in the Python ecosystem:

- **Type Safety First** - Uses Python type hints for schema definition
- **Code-First Approach** - No separate schema files to maintain
- **Async Native** - Built for modern async Python frameworks
- **FastAPI Integration** - First-class support for the most popular async framework
- **Active Development** - Regular updates and growing ecosystem
- **IDE Support** - Full autocomplete and type checking

---

## Installation and Setup

### Basic Installation

Start by installing Strawberry and its dependencies. The base package includes everything you need for a basic GraphQL server.

```bash
# Install Strawberry with the ASGI server
pip install strawberry-graphql[asgi]

# For FastAPI integration (recommended)
pip install strawberry-graphql[fastapi]

# For Django integration
pip install strawberry-graphql[django]

# For development with hot reload
pip install uvicorn[standard]
```

### Project Structure

A well-organized Strawberry project follows this structure. Keeping types, resolvers, and mutations in separate modules makes the codebase easier to navigate as it grows.

```
graphql_api/
    __init__.py
    schema.py           # Main schema definition
    types/
        __init__.py
        user.py         # User-related types
        post.py         # Post-related types
    resolvers/
        __init__.py
        user.py         # User query resolvers
        post.py         # Post query resolvers
    mutations/
        __init__.py
        user.py         # User mutations
        post.py         # Post mutations
    dataloaders/
        __init__.py
        user.py         # User dataloaders for N+1 prevention
    context.py          # Request context definition
```

---

## Defining Types

### Basic Type Definition

Strawberry uses Python dataclasses decorated with `@strawberry.type` to define GraphQL types. Each field becomes a GraphQL field with its type automatically inferred from the Python type hint.

```python
# types/user.py
# Define GraphQL types using Python dataclasses
import strawberry
from datetime import datetime
from typing import Optional, List

@strawberry.type
class User:
    """
    Represents a user in the system.
    The docstring becomes the GraphQL type description.
    """
    # Required fields - cannot be null in GraphQL
    id: strawberry.ID  # Maps to GraphQL ID scalar type
    email: str  # Maps to GraphQL String type
    username: str
    created_at: datetime  # Strawberry handles datetime serialization

    # Optional fields - can be null in GraphQL
    full_name: Optional[str] = None  # Optional with default value
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    # Boolean fields for status tracking
    is_active: bool = True
    is_verified: bool = False


@strawberry.type
class UserProfile:
    """Extended user profile with additional fields"""
    user: User  # Nested type reference
    follower_count: int
    following_count: int
    post_count: int

    # List types for collections
    recent_posts: List["Post"]  # Forward reference to Post type
```

### Input Types

Input types are used for mutations and query arguments. They are similar to regular types but use the `@strawberry.input` decorator. Input types cannot have resolvers and are meant for receiving data from clients.

```python
# types/inputs.py
# Input types for mutations and query arguments
import strawberry
from typing import Optional
from datetime import datetime

@strawberry.input
class CreateUserInput:
    """Input for creating a new user account"""
    email: str  # Required field
    username: str
    password: str  # Will be hashed before storage
    full_name: Optional[str] = None  # Optional field with default


@strawberry.input
class UpdateUserInput:
    """Input for updating user profile - all fields optional"""
    # Making all fields optional allows partial updates
    full_name: Optional[str] = strawberry.UNSET  # UNSET means field was not provided
    bio: Optional[str] = strawberry.UNSET
    avatar_url: Optional[str] = strawberry.UNSET


@strawberry.input
class UserFilterInput:
    """Filtering options for user queries"""
    is_active: Optional[bool] = None  # Filter by active status
    is_verified: Optional[bool] = None  # Filter by verification status
    created_after: Optional[datetime] = None  # Filter by creation date
    search: Optional[str] = None  # Search in username and email


@strawberry.input
class PaginationInput:
    """Standard pagination parameters"""
    limit: int = 20  # Default page size
    offset: int = 0  # Starting position

    def __post_init__(self):
        # Validate and constrain values
        if self.limit > 100:
            self.limit = 100  # Cap maximum page size
        if self.limit < 1:
            self.limit = 1
        if self.offset < 0:
            self.offset = 0
```

### Enum Types

Enums provide a restricted set of values for a field. Strawberry converts Python Enums to GraphQL Enum types automatically.

```python
# types/enums.py
# Enum types for restricted value sets
import strawberry
from enum import Enum

@strawberry.enum
class UserRole(Enum):
    """User role determines permissions in the system"""
    ADMIN = "admin"  # Full access to all features
    MODERATOR = "moderator"  # Can moderate content
    MEMBER = "member"  # Standard user access
    GUEST = "guest"  # Limited read-only access


@strawberry.enum
class PostStatus(Enum):
    """Publication status of a post"""
    DRAFT = "draft"  # Not visible to others
    PUBLISHED = "published"  # Visible to all
    ARCHIVED = "archived"  # Hidden but not deleted
    SCHEDULED = "scheduled"  # Will be published at a future date


@strawberry.enum
class SortOrder(Enum):
    """Sort direction for list queries"""
    ASC = "asc"
    DESC = "desc"
```

### Interface Types

Interfaces define a contract that other types must implement. They are useful for polymorphic queries where different types share common fields.

```python
# types/interfaces.py
# Interface types for shared structure across types
import strawberry
from datetime import datetime
from typing import Optional

@strawberry.interface
class Node:
    """
    Base interface for all identifiable entities.
    Implements the Relay Node specification.
    """
    id: strawberry.ID  # Global unique identifier


@strawberry.interface
class Timestamped:
    """Interface for entities with creation and update timestamps"""
    created_at: datetime
    updated_at: Optional[datetime]


@strawberry.interface
class Auditable(Timestamped):
    """Extended interface that includes user tracking"""
    created_by: Optional["User"]
    updated_by: Optional["User"]


# Types implementing interfaces
@strawberry.type
class Post(Node, Timestamped):
    """A post implements both Node and Timestamped interfaces"""
    id: strawberry.ID
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    author_id: strawberry.ID


@strawberry.type
class Comment(Node, Timestamped):
    """Comments also implement the same interfaces"""
    id: strawberry.ID
    text: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    post_id: strawberry.ID
    author_id: strawberry.ID
```

---

## Building Queries

### Basic Query Definition

Queries are defined in a class decorated with `@strawberry.type`. Each method becomes a query field. The method name becomes the field name in the GraphQL schema.

```python
# resolvers/queries.py
# Query definitions with resolver functions
import strawberry
from typing import Optional, List
from types.user import User, UserProfile
from types.inputs import UserFilterInput, PaginationInput
from types.enums import SortOrder

@strawberry.type
class Query:
    """Root query type - all read operations start here"""

    @strawberry.field
    def hello(self) -> str:
        """Simple test query to verify the API is working"""
        return "Hello, GraphQL!"

    @strawberry.field
    def user(self, id: strawberry.ID) -> Optional[User]:
        """
        Fetch a single user by their unique ID.
        Returns None if the user does not exist.
        """
        # In production, this would query your database
        return get_user_by_id(id)

    @strawberry.field
    def user_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by their email address"""
        return get_user_by_email(email)

    @strawberry.field
    def users(
        self,
        filter: Optional[UserFilterInput] = None,
        pagination: Optional[PaginationInput] = None,
        sort_order: SortOrder = SortOrder.DESC
    ) -> List[User]:
        """
        Fetch a list of users with optional filtering and pagination.
        Default sort is by creation date descending (newest first).
        """
        # Build query based on filter parameters
        query = build_user_query(filter)

        # Apply pagination
        if pagination:
            query = query.offset(pagination.offset).limit(pagination.limit)
        else:
            query = query.limit(20)  # Default limit

        # Apply sorting
        if sort_order == SortOrder.ASC:
            query = query.order_by(User.created_at.asc())
        else:
            query = query.order_by(User.created_at.desc())

        return query.all()

    @strawberry.field
    def user_count(self, filter: Optional[UserFilterInput] = None) -> int:
        """Get total count of users matching the filter"""
        query = build_user_query(filter)
        return query.count()


# Helper function for building filtered queries
def build_user_query(filter: Optional[UserFilterInput]):
    """Build a database query based on filter parameters"""
    query = db.query(UserModel)

    if filter:
        if filter.is_active is not None:
            query = query.filter(UserModel.is_active == filter.is_active)
        if filter.is_verified is not None:
            query = query.filter(UserModel.is_verified == filter.is_verified)
        if filter.created_after:
            query = query.filter(UserModel.created_at >= filter.created_after)
        if filter.search:
            # Search in username and email
            search_term = f"%{filter.search}%"
            query = query.filter(
                (UserModel.username.ilike(search_term)) |
                (UserModel.email.ilike(search_term))
            )

    return query
```

### Resolver with Context

Context allows you to access request-specific data like the authenticated user, database session, or request headers. The context is passed to resolvers through the `Info` object.

```python
# resolvers/authenticated_queries.py
# Queries that require authentication context
import strawberry
from strawberry.types import Info
from typing import Optional, List
from types.user import User, UserProfile

@strawberry.type
class Query:
    @strawberry.field
    def me(self, info: Info) -> Optional[User]:
        """
        Get the currently authenticated user.
        Returns None if not authenticated.
        """
        # Access the current user from context
        # Context is set up in the FastAPI integration
        current_user = info.context.get("user")

        if not current_user:
            return None

        return current_user

    @strawberry.field
    def my_profile(self, info: Info) -> Optional[UserProfile]:
        """Get the full profile of the authenticated user"""
        current_user = info.context.get("user")

        if not current_user:
            return None

        # Fetch additional profile data
        return UserProfile(
            user=current_user,
            follower_count=get_follower_count(current_user.id),
            following_count=get_following_count(current_user.id),
            post_count=get_post_count(current_user.id),
            recent_posts=get_recent_posts(current_user.id, limit=5)
        )

    @strawberry.field
    def my_feed(
        self,
        info: Info,
        limit: int = 20,
        offset: int = 0
    ) -> List["Post"]:
        """Get personalized feed for the authenticated user"""
        current_user = info.context.get("user")

        if not current_user:
            return []

        # Get posts from users the current user follows
        following_ids = get_following_ids(current_user.id)

        posts = (
            db.query(PostModel)
            .filter(PostModel.author_id.in_(following_ids))
            .filter(PostModel.status == "published")
            .order_by(PostModel.created_at.desc())
            .offset(offset)
            .limit(min(limit, 100))  # Cap at 100
            .all()
        )

        return posts
```

### Field Resolvers on Types

Sometimes you need to compute a field value based on other fields or fetch related data. Field resolvers let you define custom logic for specific fields on a type.

```python
# types/user_with_resolvers.py
# Types with field-level resolvers
import strawberry
from strawberry.types import Info
from typing import Optional, List
from datetime import datetime

@strawberry.type
class User:
    id: strawberry.ID
    email: str
    username: str
    created_at: datetime
    full_name: Optional[str] = None

    @strawberry.field
    def display_name(self) -> str:
        """
        Computed field that returns a display-friendly name.
        Falls back to username if full_name is not set.
        """
        return self.full_name or self.username

    @strawberry.field
    def member_since(self) -> str:
        """Returns a human-readable membership duration"""
        delta = datetime.utcnow() - self.created_at
        years = delta.days // 365

        if years > 0:
            return f"Member for {years} year{'s' if years > 1 else ''}"

        months = delta.days // 30
        if months > 0:
            return f"Member for {months} month{'s' if months > 1 else ''}"

        return f"Member for {delta.days} day{'s' if delta.days != 1 else ''}"

    @strawberry.field
    async def posts(
        self,
        info: Info,
        limit: int = 10
    ) -> List["Post"]:
        """
        Fetch posts authored by this user.
        Uses dataloader to prevent N+1 queries.
        """
        # Get the dataloader from context
        loader = info.context["post_loader"]

        # Load posts for this user
        posts = await loader.load(self.id)

        return posts[:limit]

    @strawberry.field
    async def follower_count(self, info: Info) -> int:
        """Get the number of followers for this user"""
        loader = info.context["follower_count_loader"]
        return await loader.load(self.id)

    @strawberry.field
    def gravatar_url(self, size: int = 80) -> str:
        """
        Generate Gravatar URL from email.
        Accepts optional size parameter.
        """
        import hashlib

        email_hash = hashlib.md5(
            self.email.lower().encode()
        ).hexdigest()

        return f"https://www.gravatar.com/avatar/{email_hash}?s={size}&d=identicon"
```

---

## Building Mutations

### Basic Mutation Definition

Mutations handle write operations like creating, updating, and deleting data. They follow the same pattern as queries but typically return the affected object.

```python
# mutations/user.py
# User mutation definitions
import strawberry
from strawberry.types import Info
from typing import Optional
from datetime import datetime
import uuid
import bcrypt

from types.user import User
from types.inputs import CreateUserInput, UpdateUserInput

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_user(
        self,
        info: Info,
        input: CreateUserInput
    ) -> User:
        """
        Create a new user account.
        Returns the newly created user.
        """
        # Get database session from context
        db = info.context["db"]

        # Check if email already exists
        existing = db.query(UserModel).filter(
            UserModel.email == input.email
        ).first()

        if existing:
            raise ValueError("Email already registered")

        # Check if username is taken
        existing_username = db.query(UserModel).filter(
            UserModel.username == input.username
        ).first()

        if existing_username:
            raise ValueError("Username already taken")

        # Hash the password before storing
        password_hash = bcrypt.hashpw(
            input.password.encode(),
            bcrypt.gensalt()
        ).decode()

        # Create the user record
        user = UserModel(
            id=str(uuid.uuid4()),
            email=input.email,
            username=input.username,
            password_hash=password_hash,
            full_name=input.full_name,
            created_at=datetime.utcnow(),
            is_active=True,
            is_verified=False
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        # Return as Strawberry type
        return User(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            created_at=user.created_at,
            is_active=user.is_active,
            is_verified=user.is_verified
        )

    @strawberry.mutation
    async def update_user(
        self,
        info: Info,
        id: strawberry.ID,
        input: UpdateUserInput
    ) -> Optional[User]:
        """
        Update a user's profile.
        Only updates fields that are explicitly provided.
        """
        db = info.context["db"]
        current_user = info.context.get("user")

        # Authorization check
        if not current_user or str(current_user.id) != str(id):
            raise PermissionError("Cannot update another user's profile")

        user = db.query(UserModel).filter(UserModel.id == id).first()

        if not user:
            return None

        # Use UNSET to distinguish between "not provided" and "set to None"
        if input.full_name is not strawberry.UNSET:
            user.full_name = input.full_name

        if input.bio is not strawberry.UNSET:
            user.bio = input.bio

        if input.avatar_url is not strawberry.UNSET:
            user.avatar_url = input.avatar_url

        user.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(user)

        return User(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            created_at=user.created_at,
            is_active=user.is_active,
            is_verified=user.is_verified
        )

    @strawberry.mutation
    async def delete_user(
        self,
        info: Info,
        id: strawberry.ID
    ) -> bool:
        """
        Delete a user account.
        Returns True if deletion was successful.
        """
        db = info.context["db"]
        current_user = info.context.get("user")

        # Only admins or the user themselves can delete
        if not current_user:
            raise PermissionError("Authentication required")

        is_admin = current_user.role == "admin"
        is_self = str(current_user.id) == str(id)

        if not (is_admin or is_self):
            raise PermissionError("Cannot delete another user's account")

        user = db.query(UserModel).filter(UserModel.id == id).first()

        if not user:
            return False

        # Soft delete by deactivating
        user.is_active = False
        user.deleted_at = datetime.utcnow()

        db.commit()

        return True
```

### Mutation Response Types

For more complex mutations, define custom response types that include the result, errors, and any additional information the client might need.

```python
# types/responses.py
# Custom response types for mutations
import strawberry
from typing import Optional, List

@strawberry.type
class MutationError:
    """Represents an error from a mutation"""
    field: Optional[str]  # Which field caused the error (if applicable)
    message: str  # Human-readable error message
    code: str  # Machine-readable error code


@strawberry.type
class CreateUserResponse:
    """Response type for user creation"""
    user: Optional["User"]  # The created user, or None if failed
    success: bool  # Whether the mutation succeeded
    errors: List[MutationError]  # List of any errors that occurred


@strawberry.type
class AuthPayload:
    """Response type for authentication mutations"""
    access_token: Optional[str]  # JWT access token
    refresh_token: Optional[str]  # JWT refresh token
    user: Optional["User"]  # The authenticated user
    expires_at: Optional[datetime]  # Token expiration time
    success: bool
    errors: List[MutationError]


# Updated mutation using response type
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_user(
        self,
        info: Info,
        input: CreateUserInput
    ) -> CreateUserResponse:
        """Create a new user with structured response"""
        db = info.context["db"]
        errors = []

        # Validate email format
        if not is_valid_email(input.email):
            errors.append(MutationError(
                field="email",
                message="Invalid email format",
                code="INVALID_EMAIL"
            ))

        # Check email uniqueness
        if db.query(UserModel).filter(UserModel.email == input.email).first():
            errors.append(MutationError(
                field="email",
                message="Email already registered",
                code="EMAIL_EXISTS"
            ))

        # Check username uniqueness
        if db.query(UserModel).filter(UserModel.username == input.username).first():
            errors.append(MutationError(
                field="username",
                message="Username already taken",
                code="USERNAME_EXISTS"
            ))

        # Validate password strength
        if len(input.password) < 8:
            errors.append(MutationError(
                field="password",
                message="Password must be at least 8 characters",
                code="WEAK_PASSWORD"
            ))

        # Return early if validation failed
        if errors:
            return CreateUserResponse(
                user=None,
                success=False,
                errors=errors
            )

        # Create the user
        try:
            user = create_user_in_db(db, input)
            return CreateUserResponse(
                user=user,
                success=True,
                errors=[]
            )
        except Exception as e:
            return CreateUserResponse(
                user=None,
                success=False,
                errors=[MutationError(
                    field=None,
                    message=str(e),
                    code="INTERNAL_ERROR"
                )]
            )
```

---

## DataLoaders for N+1 Prevention

### Understanding the N+1 Problem

When fetching related data, GraphQL can trigger many database queries. For example, fetching 10 users and their posts might result in 11 queries (1 for users + 10 for posts). DataLoaders batch these requests into a single query.

```python
# dataloaders/user.py
# DataLoader implementations for efficient data fetching
from strawberry.dataloader import DataLoader
from typing import List, Dict, Any
from collections import defaultdict

async def load_users_by_ids(keys: List[str]) -> List[Optional["User"]]:
    """
    Batch load users by their IDs.
    This function is called once with all requested IDs.
    """
    # Single query to fetch all users
    users = db.query(UserModel).filter(
        UserModel.id.in_(keys)
    ).all()

    # Create a lookup dictionary
    user_map: Dict[str, User] = {
        str(u.id): User(
            id=u.id,
            email=u.email,
            username=u.username,
            full_name=u.full_name,
            created_at=u.created_at,
            is_active=u.is_active,
            is_verified=u.is_verified
        )
        for u in users
    }

    # Return users in the same order as the keys
    # Return None for any keys not found
    return [user_map.get(key) for key in keys]


async def load_posts_by_author_ids(keys: List[str]) -> List[List["Post"]]:
    """
    Batch load posts for multiple authors.
    Returns a list of posts for each author ID.
    """
    # Single query to fetch all posts for all authors
    posts = db.query(PostModel).filter(
        PostModel.author_id.in_(keys),
        PostModel.status == "published"
    ).order_by(PostModel.created_at.desc()).all()

    # Group posts by author_id
    posts_by_author: Dict[str, List[Post]] = defaultdict(list)

    for post in posts:
        posts_by_author[str(post.author_id)].append(Post(
            id=post.id,
            title=post.title,
            content=post.content,
            created_at=post.created_at,
            author_id=post.author_id
        ))

    # Return posts in the same order as the keys
    return [posts_by_author.get(key, []) for key in keys]


async def load_follower_counts(keys: List[str]) -> List[int]:
    """
    Batch load follower counts for multiple users.
    Returns the count for each user ID.
    """
    # Single query with GROUP BY
    from sqlalchemy import func

    counts = db.query(
        FollowModel.followed_id,
        func.count(FollowModel.follower_id).label("count")
    ).filter(
        FollowModel.followed_id.in_(keys)
    ).group_by(
        FollowModel.followed_id
    ).all()

    # Create lookup dictionary
    count_map: Dict[str, int] = {
        str(row.followed_id): row.count
        for row in counts
    }

    # Return counts in the same order as keys
    return [count_map.get(key, 0) for key in keys]


# Create DataLoader instances
def create_dataloaders() -> Dict[str, DataLoader]:
    """
    Create fresh DataLoader instances.
    Should be called once per request to ensure proper batching.
    """
    return {
        "user_loader": DataLoader(load_fn=load_users_by_ids),
        "post_loader": DataLoader(load_fn=load_posts_by_author_ids),
        "follower_count_loader": DataLoader(load_fn=load_follower_counts),
    }
```

### Using DataLoaders in Resolvers

Once you have defined your DataLoaders, use them in resolvers through the context. The DataLoader will automatically batch requests made during the same GraphQL execution.

```python
# types/post_with_loader.py
# Type with DataLoader usage for efficient fetching
import strawberry
from strawberry.types import Info
from typing import Optional
from datetime import datetime

@strawberry.type
class Post:
    id: strawberry.ID
    title: str
    content: str
    created_at: datetime
    author_id: strawberry.ID

    @strawberry.field
    async def author(self, info: Info) -> Optional["User"]:
        """
        Fetch the post's author using DataLoader.
        Multiple posts requesting their author will be batched.
        """
        # Get the DataLoader from context
        loader = info.context["user_loader"]

        # This call is batched with other loader.load() calls
        return await loader.load(str(self.author_id))

    @strawberry.field
    async def comments(
        self,
        info: Info,
        limit: int = 10
    ) -> List["Comment"]:
        """Fetch comments on this post"""
        loader = info.context["comment_loader"]
        comments = await loader.load(str(self.id))
        return comments[:limit]

    @strawberry.field
    async def comment_count(self, info: Info) -> int:
        """Get total comment count for this post"""
        loader = info.context["comment_count_loader"]
        return await loader.load(str(self.id))


# Example query that benefits from DataLoaders
@strawberry.type
class Query:
    @strawberry.field
    async def posts(
        self,
        info: Info,
        limit: int = 20
    ) -> List[Post]:
        """
        Fetch recent posts.
        When the client requests post.author for each post,
        the DataLoader batches all author fetches into one query.
        """
        posts = db.query(PostModel).order_by(
            PostModel.created_at.desc()
        ).limit(limit).all()

        return [
            Post(
                id=p.id,
                title=p.title,
                content=p.content,
                created_at=p.created_at,
                author_id=p.author_id
            )
            for p in posts
        ]
```

---

## FastAPI Integration

### Basic Setup

Strawberry provides a GraphQL router that integrates directly with FastAPI. This gives you access to FastAPI's dependency injection, middleware, and authentication systems.

```python
# main.py
# FastAPI application with Strawberry GraphQL
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter
from contextlib import asynccontextmanager
import strawberry

from schema import Query, Mutation
from dataloaders import create_dataloaders
from database import get_db, create_tables

# Lifespan handler for startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create database tables
    create_tables()
    yield
    # Shutdown: cleanup resources if needed

# Create FastAPI application
app = FastAPI(
    title="GraphQL API",
    description="A GraphQL API built with Strawberry",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_context(request: Request, db=Depends(get_db)):
    """
    Context factory function.
    Called for each request to set up the GraphQL context.
    """
    # Extract authentication token from headers
    auth_header = request.headers.get("Authorization", "")
    user = None

    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        user = await get_user_from_token(token)

    # Create fresh DataLoaders for this request
    loaders = create_dataloaders()

    return {
        "request": request,
        "db": db,
        "user": user,
        **loaders  # Spread DataLoaders into context
    }


# Create the Strawberry schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation
)

# Create the GraphQL router with context dependency
graphql_router = GraphQLRouter(
    schema=schema,
    context_getter=get_context
)

# Mount the GraphQL endpoint
app.include_router(graphql_router, prefix="/graphql")


# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Authentication Middleware

Implement authentication as a permission class that can be applied to queries and mutations that require authentication.

```python
# auth/permissions.py
# Permission classes for authorization
import strawberry
from strawberry.permission import BasePermission
from strawberry.types import Info
from typing import Any

class IsAuthenticated(BasePermission):
    """Permission class that requires authentication"""
    message = "Authentication required"

    def has_permission(
        self,
        source: Any,
        info: Info,
        **kwargs
    ) -> bool:
        """Check if the user is authenticated"""
        user = info.context.get("user")
        return user is not None


class IsAdmin(BasePermission):
    """Permission class that requires admin role"""
    message = "Admin access required"

    def has_permission(
        self,
        source: Any,
        info: Info,
        **kwargs
    ) -> bool:
        """Check if the user is an admin"""
        user = info.context.get("user")
        return user is not None and user.role == "admin"


class IsOwner(BasePermission):
    """Permission that checks if the user owns the resource"""
    message = "You do not have permission to access this resource"

    def has_permission(
        self,
        source: Any,
        info: Info,
        **kwargs
    ) -> bool:
        """Check if the user owns the resource being accessed"""
        user = info.context.get("user")

        if not user:
            return False

        # Check the id argument against the user's id
        resource_id = kwargs.get("id")
        return str(user.id) == str(resource_id)


# Usage in queries and mutations
@strawberry.type
class Query:
    @strawberry.field(permission_classes=[IsAuthenticated])
    def me(self, info: Info) -> "User":
        """Get current user - requires authentication"""
        return info.context["user"]

    @strawberry.field(permission_classes=[IsAdmin])
    def admin_stats(self, info: Info) -> "AdminStats":
        """Get admin statistics - requires admin role"""
        return get_admin_stats()


@strawberry.type
class Mutation:
    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def create_post(
        self,
        info: Info,
        input: CreatePostInput
    ) -> "Post":
        """Create a post - requires authentication"""
        user = info.context["user"]
        return await create_post(info.context["db"], user.id, input)
```

### Request Logging and Monitoring

Add middleware to log GraphQL operations for monitoring and debugging. This helps track query performance and identify issues.

```python
# middleware/logging.py
# Request logging middleware for GraphQL operations
import time
import logging
from strawberry.extensions import Extension
from strawberry.types import ExecutionContext
from typing import Callable, Any

logger = logging.getLogger(__name__)

class LoggingExtension(Extension):
    """
    Strawberry extension that logs GraphQL operations.
    Captures operation name, duration, and any errors.
    """

    def on_request_start(self):
        """Called when a GraphQL request starts"""
        self.start_time = time.time()

    def on_request_end(self):
        """Called when a GraphQL request ends"""
        duration_ms = (time.time() - self.start_time) * 1000

        # Get operation details from execution context
        execution_context = self.execution_context
        operation_name = execution_context.operation_name or "anonymous"
        operation_type = execution_context.operation_type.value

        # Log the operation
        logger.info(
            "GraphQL operation completed",
            extra={
                "operation_name": operation_name,
                "operation_type": operation_type,
                "duration_ms": round(duration_ms, 2),
                "variables": execution_context.variables
            }
        )

    def on_validation_end(self):
        """Called after query validation"""
        if self.execution_context.errors:
            # Log validation errors
            for error in self.execution_context.errors:
                logger.warning(
                    "GraphQL validation error",
                    extra={
                        "message": str(error),
                        "locations": error.locations
                    }
                )

    def resolve(
        self,
        _next: Callable,
        root: Any,
        info: "Info",
        *args,
        **kwargs
    ):
        """Called for each field resolution"""
        start = time.time()
        result = _next(root, info, *args, **kwargs)
        duration_ms = (time.time() - start) * 1000

        # Log slow resolvers (over 100ms)
        if duration_ms > 100:
            logger.warning(
                "Slow resolver detected",
                extra={
                    "field": f"{info.parent_type.name}.{info.field_name}",
                    "duration_ms": round(duration_ms, 2)
                }
            )

        return result


# Add extension to schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    extensions=[LoggingExtension]
)
```

---

## Subscriptions for Real-time Updates

### Basic Subscription Setup

Subscriptions allow clients to receive real-time updates when data changes. Strawberry supports subscriptions through async generators.

```python
# subscriptions/notifications.py
# Real-time subscription definitions
import strawberry
from strawberry.types import Info
from typing import AsyncGenerator
import asyncio

@strawberry.type
class Subscription:
    @strawberry.subscription
    async def notifications(
        self,
        info: Info
    ) -> AsyncGenerator["Notification", None]:
        """
        Subscribe to notifications for the current user.
        Yields notifications as they arrive.
        """
        user = info.context.get("user")

        if not user:
            raise PermissionError("Authentication required")

        # Get the notification queue for this user
        queue = get_notification_queue(user.id)

        try:
            while True:
                # Wait for next notification
                notification = await queue.get()
                yield notification
        except asyncio.CancelledError:
            # Client disconnected
            pass

    @strawberry.subscription
    async def post_created(self) -> AsyncGenerator["Post", None]:
        """Subscribe to new posts in the system"""
        # Use a pub/sub system like Redis
        pubsub = get_redis_pubsub()
        await pubsub.subscribe("posts:created")

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    post_data = json.loads(message["data"])
                    yield Post(**post_data)
        except asyncio.CancelledError:
            await pubsub.unsubscribe("posts:created")

    @strawberry.subscription
    async def typing_indicator(
        self,
        chat_id: strawberry.ID
    ) -> AsyncGenerator["TypingEvent", None]:
        """Subscribe to typing indicators in a chat"""
        pubsub = get_redis_pubsub()
        channel = f"chat:{chat_id}:typing"
        await pubsub.subscribe(channel)

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    event_data = json.loads(message["data"])
                    yield TypingEvent(**event_data)
        except asyncio.CancelledError:
            await pubsub.unsubscribe(channel)


@strawberry.type
class Notification:
    id: strawberry.ID
    type: str  # "mention", "follow", "like", etc.
    message: str
    created_at: datetime
    read: bool = False


@strawberry.type
class TypingEvent:
    user_id: strawberry.ID
    username: str
    is_typing: bool
```

### WebSocket Configuration

For subscriptions to work, you need to configure the GraphQL router to handle WebSocket connections.

```python
# main.py with subscription support
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from strawberry.subscriptions import GRAPHQL_TRANSPORT_WS_PROTOCOL
from strawberry.subscriptions import GRAPHQL_WS_PROTOCOL

# Create schema with subscription support
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription
)

# Create router with WebSocket protocols
graphql_router = GraphQLRouter(
    schema=schema,
    context_getter=get_context,
    subscription_protocols=[
        GRAPHQL_TRANSPORT_WS_PROTOCOL,  # graphql-transport-ws
        GRAPHQL_WS_PROTOCOL,  # Legacy protocol
    ]
)

app.include_router(graphql_router, prefix="/graphql")
```

---

## Error Handling

### Custom Error Types

Define custom error types that provide structured error information to clients. This makes it easier for frontend applications to handle errors gracefully.

```python
# errors/custom.py
# Custom error classes and handling
import strawberry
from typing import List, Optional
from enum import Enum

@strawberry.enum
class ErrorCode(Enum):
    """Standard error codes for the API"""
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class GraphQLError(Exception):
    """Base class for GraphQL errors"""

    def __init__(
        self,
        message: str,
        code: ErrorCode,
        field: Optional[str] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.field = field


class NotFoundError(GraphQLError):
    """Resource not found error"""

    def __init__(self, resource: str, id: str):
        super().__init__(
            message=f"{resource} with id '{id}' not found",
            code=ErrorCode.NOT_FOUND
        )


class ValidationError(GraphQLError):
    """Input validation error"""

    def __init__(self, field: str, message: str):
        super().__init__(
            message=message,
            code=ErrorCode.VALIDATION_ERROR,
            field=field
        )


class UnauthorizedError(GraphQLError):
    """Authentication required error"""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code=ErrorCode.UNAUTHORIZED
        )


# Error formatting extension
from strawberry.extensions import Extension

class ErrorFormattingExtension(Extension):
    """Extension that formats errors consistently"""

    def on_parse_end(self):
        """Format any errors after parsing"""
        pass

    def on_validate_end(self):
        """Format validation errors"""
        if self.execution_context.errors:
            formatted = []
            for error in self.execution_context.errors:
                formatted.append({
                    "message": str(error),
                    "code": "VALIDATION_ERROR",
                    "locations": error.locations
                })
            # Errors are automatically formatted by Strawberry
```

---

## Testing GraphQL APIs

### Unit Testing Resolvers

Write unit tests for your resolvers by creating mock contexts and calling the resolver functions directly.

```python
# tests/test_queries.py
# Unit tests for GraphQL queries
import pytest
from unittest.mock import Mock, AsyncMock
from resolvers.queries import Query
from types.user import User
from datetime import datetime

@pytest.fixture
def mock_context():
    """Create a mock context for testing"""
    return {
        "db": Mock(),
        "user": User(
            id="user_123",
            email="test@example.com",
            username="testuser",
            created_at=datetime.utcnow(),
            is_active=True,
            is_verified=True
        ),
        "user_loader": AsyncMock(),
        "post_loader": AsyncMock()
    }


@pytest.fixture
def mock_info(mock_context):
    """Create a mock Info object"""
    info = Mock()
    info.context = mock_context
    return info


class TestUserQueries:
    def test_hello_query(self):
        """Test the hello query returns expected string"""
        query = Query()
        result = query.hello()

        assert result == "Hello, GraphQL!"

    def test_me_query_authenticated(self, mock_info):
        """Test me query returns current user when authenticated"""
        query = Query()
        result = query.me(mock_info)

        assert result is not None
        assert result.id == "user_123"
        assert result.email == "test@example.com"

    def test_me_query_unauthenticated(self, mock_info):
        """Test me query returns None when not authenticated"""
        mock_info.context["user"] = None

        query = Query()
        result = query.me(mock_info)

        assert result is None

    @pytest.mark.asyncio
    async def test_user_query_found(self, mock_info):
        """Test user query when user exists"""
        expected_user = User(
            id="user_456",
            email="other@example.com",
            username="otheruser",
            created_at=datetime.utcnow(),
            is_active=True,
            is_verified=False
        )

        mock_info.context["user_loader"].load = AsyncMock(
            return_value=expected_user
        )

        query = Query()
        result = await query.user(mock_info, id="user_456")

        assert result is not None
        assert result.id == "user_456"

    @pytest.mark.asyncio
    async def test_user_query_not_found(self, mock_info):
        """Test user query when user does not exist"""
        mock_info.context["user_loader"].load = AsyncMock(
            return_value=None
        )

        query = Query()
        result = await query.user(mock_info, id="nonexistent")

        assert result is None
```

### Integration Testing with Test Client

Use Strawberry's test client to send actual GraphQL queries and test the full execution pipeline.

```python
# tests/test_integration.py
# Integration tests using Strawberry test client
import pytest
from strawberry.test import client as strawberry_client
from schema import schema
from datetime import datetime

@pytest.fixture
def test_context():
    """Create a test context with mock database"""
    return {
        "db": create_test_database(),
        "user": None,
        "user_loader": create_test_user_loader(),
        "post_loader": create_test_post_loader()
    }


@pytest.fixture
def client(test_context):
    """Create a test client with context"""
    return strawberry_client.TestClient(
        schema=schema,
        context=test_context
    )


class TestGraphQLIntegration:
    def test_hello_query(self, client):
        """Test simple query execution"""
        query = """
            query {
                hello
            }
        """

        result = client.execute(query)

        assert result.errors is None
        assert result.data["hello"] == "Hello, GraphQL!"

    def test_users_query_with_pagination(self, client):
        """Test users query with pagination"""
        query = """
            query GetUsers($pagination: PaginationInput) {
                users(pagination: $pagination) {
                    id
                    username
                    email
                }
            }
        """

        result = client.execute(
            query,
            variables={
                "pagination": {
                    "limit": 5,
                    "offset": 0
                }
            }
        )

        assert result.errors is None
        assert len(result.data["users"]) <= 5

    def test_create_user_mutation(self, client):
        """Test user creation mutation"""
        mutation = """
            mutation CreateUser($input: CreateUserInput!) {
                createUser(input: $input) {
                    success
                    user {
                        id
                        email
                        username
                    }
                    errors {
                        field
                        message
                        code
                    }
                }
            }
        """

        result = client.execute(
            mutation,
            variables={
                "input": {
                    "email": "new@example.com",
                    "username": "newuser",
                    "password": "securepassword123"
                }
            }
        )

        assert result.errors is None
        assert result.data["createUser"]["success"] is True
        assert result.data["createUser"]["user"]["email"] == "new@example.com"

    def test_create_user_validation_error(self, client):
        """Test user creation with invalid data"""
        mutation = """
            mutation CreateUser($input: CreateUserInput!) {
                createUser(input: $input) {
                    success
                    user {
                        id
                    }
                    errors {
                        field
                        message
                        code
                    }
                }
            }
        """

        result = client.execute(
            mutation,
            variables={
                "input": {
                    "email": "invalid-email",
                    "username": "u",
                    "password": "short"
                }
            }
        )

        assert result.errors is None
        assert result.data["createUser"]["success"] is False
        assert len(result.data["createUser"]["errors"]) > 0
```

---

## Complete Schema Example

Here is a complete schema file that brings together all the components covered in this guide.

```python
# schema.py
# Complete Strawberry GraphQL schema
import strawberry
from typing import Optional, List
from datetime import datetime

# Import all types
from types.user import User, UserProfile
from types.post import Post
from types.inputs import (
    CreateUserInput,
    UpdateUserInput,
    CreatePostInput,
    UserFilterInput,
    PaginationInput
)
from types.responses import CreateUserResponse, AuthPayload
from types.enums import UserRole, PostStatus, SortOrder

# Import permissions
from auth.permissions import IsAuthenticated, IsAdmin

# Import extensions
from middleware.logging import LoggingExtension

@strawberry.type
class Query:
    """Root query type for all read operations"""

    @strawberry.field
    def hello(self) -> str:
        return "Hello, GraphQL with Strawberry!"

    @strawberry.field
    def user(self, id: strawberry.ID) -> Optional[User]:
        return get_user_by_id(id)

    @strawberry.field
    def users(
        self,
        filter: Optional[UserFilterInput] = None,
        pagination: Optional[PaginationInput] = None
    ) -> List[User]:
        return get_users(filter, pagination)

    @strawberry.field(permission_classes=[IsAuthenticated])
    def me(self, info: Info) -> User:
        return info.context["user"]

    @strawberry.field
    def post(self, id: strawberry.ID) -> Optional[Post]:
        return get_post_by_id(id)

    @strawberry.field
    def posts(
        self,
        status: Optional[PostStatus] = PostStatus.PUBLISHED,
        pagination: Optional[PaginationInput] = None
    ) -> List[Post]:
        return get_posts(status, pagination)


@strawberry.type
class Mutation:
    """Root mutation type for all write operations"""

    @strawberry.mutation
    async def create_user(
        self,
        info: Info,
        input: CreateUserInput
    ) -> CreateUserResponse:
        return await create_user(info.context["db"], input)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def update_user(
        self,
        info: Info,
        input: UpdateUserInput
    ) -> Optional[User]:
        user = info.context["user"]
        return await update_user(info.context["db"], user.id, input)

    @strawberry.mutation
    async def login(
        self,
        email: str,
        password: str
    ) -> AuthPayload:
        return await authenticate_user(email, password)

    @strawberry.mutation(permission_classes=[IsAuthenticated])
    async def create_post(
        self,
        info: Info,
        input: CreatePostInput
    ) -> Post:
        user = info.context["user"]
        return await create_post(info.context["db"], user.id, input)


@strawberry.type
class Subscription:
    """Root subscription type for real-time updates"""

    @strawberry.subscription
    async def post_created(self) -> AsyncGenerator[Post, None]:
        async for post in subscribe_to_new_posts():
            yield post


# Create the schema with all components
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription,
    extensions=[LoggingExtension]
)
```

---

## Deployment Considerations

### Production Configuration

When deploying a Strawberry GraphQL API to production, consider these configuration options for security and performance.

```python
# config/production.py
# Production configuration for Strawberry GraphQL
import os
from strawberry.extensions import QueryDepthLimiter
from strawberry.extensions import MaxAliasesLimiter

# Security extensions to prevent abuse
security_extensions = [
    # Limit query depth to prevent deeply nested queries
    QueryDepthLimiter(max_depth=10),

    # Limit field aliases to prevent alias-based DoS
    MaxAliasesLimiter(max_alias_count=15),
]

# Schema configuration for production
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription,
    extensions=[
        LoggingExtension,
        *security_extensions
    ]
)

# Disable GraphiQL in production
graphql_router = GraphQLRouter(
    schema=schema,
    context_getter=get_context,
    graphiql=os.getenv("ENVIRONMENT") != "production"
)
```

### Docker Configuration

Package your GraphQL API in a container for consistent deployment across environments.

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Conclusion

Strawberry provides an elegant way to build GraphQL APIs in Python. By leveraging Python's type hints and dataclasses, you get type safety, IDE support, and clean code without maintaining separate schema files. The integration with FastAPI makes it easy to build production-ready APIs with authentication, middleware, and real-time subscriptions.

Key takeaways from this guide:

- Use `@strawberry.type` for output types and `@strawberry.input` for input types
- Implement DataLoaders to prevent N+1 query problems
- Use permission classes for authorization
- Add logging extensions for monitoring and debugging
- Write tests using both unit tests and integration tests with the test client

Start small with basic queries and mutations, then add complexity as your API grows. The type safety provided by Strawberry catches errors early and makes refactoring safer.

---

*Building a GraphQL API and need monitoring? [OneUptime](https://oneuptime.com) provides comprehensive observability for your APIs with request tracing, error tracking, and performance monitoring. Set up alerts to catch issues before your users do and keep your GraphQL endpoints running smoothly.*

**Related Reading:**
- [FastAPI Rate Limiting Guide](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
- [Python Health Checks for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [Structured Logging in Python with OpenTelemetry](https://oneuptime.com/blog/post/2025-01-06-python-structured-logging-opentelemetry/view)
