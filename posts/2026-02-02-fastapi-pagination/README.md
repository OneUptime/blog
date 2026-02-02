# How to Implement Pagination in FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, FastAPI, Pagination, API, Database

Description: Learn how to implement efficient pagination in FastAPI using offset, cursor, and keyset strategies with SQLAlchemy for building scalable APIs.

---

Pagination is one of those things that seems simple until you have to deal with millions of records. Get it wrong, and your API becomes unusable. Get it right, and users never even notice it. This guide walks through different pagination strategies in FastAPI, from the basics to production-ready implementations.

---

## Why Pagination Matters

Without pagination, fetching a large dataset means:

- Massive memory consumption on the server
- Slow response times
- Poor user experience
- Potential timeouts and crashes

A simple comparison:

| Approach | 1K Records | 100K Records | 1M Records |
|----------|-----------|--------------|------------|
| No pagination | 50ms | 2s | Timeout |
| Offset pagination | 10ms | 500ms | 5s |
| Cursor pagination | 10ms | 15ms | 20ms |

---

## Pagination Strategies Overview

```mermaid
flowchart TD
    A[Pagination Strategy] --> B[Offset-Based]
    A --> C[Cursor-Based]
    A --> D[Keyset-Based]

    B --> B1[Simple to implement]
    B --> B2[Supports random access]
    B --> B3[Slow on large offsets]

    C --> C1[Consistent performance]
    C --> C2[Handles real-time data]
    C --> C3[No random access]

    D --> D1[Best for large datasets]
    D --> D2[Requires unique sort key]
    D --> D3[Fast at any position]
```

---

## Setting Up the Project

First, let's set up a FastAPI project with SQLAlchemy. This creates the foundation we'll use for all pagination examples.

```python
# models.py
from sqlalchemy import Column, Integer, String, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class Article(Base):
    """Article model for demonstrating pagination"""
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String, nullable=False)
    author = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    views = Column(Integer, default=0)

# Database setup
DATABASE_URL = "postgresql://user:password@localhost/mydb"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Offset-Based Pagination

This is the most common approach. You specify a page number and page size, and the API returns that slice of data.

### Basic Implementation

The offset approach uses SQL's OFFSET and LIMIT clauses. It works well for smaller datasets and when users need to jump to specific pages.

```python
# offset_pagination.py
from fastapi import FastAPI, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Generic, TypeVar
from math import ceil

app = FastAPI()

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response structure"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

class ArticleResponse(BaseModel):
    """Article response schema"""
    id: int
    title: str
    author: str
    created_at: datetime

    class Config:
        from_attributes = True

@app.get("/articles", response_model=PaginatedResponse[ArticleResponse])
def get_articles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of articles using offset pagination.

    This approach is simple but can be slow for large offsets.
    """
    # Calculate offset
    offset = (page - 1) * page_size

    # Get total count for pagination metadata
    total = db.query(Article).count()

    # Fetch items with offset and limit
    items = (
        db.query(Article)
        .order_by(Article.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    total_pages = ceil(total / page_size)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )
```

### Adding Filtering and Sorting

Real APIs need filtering. Here's how to combine pagination with search and sort options.

```python
# filtered_pagination.py
from fastapi import FastAPI, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional
from enum import Enum

app = FastAPI()

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"

class SortField(str, Enum):
    created_at = "created_at"
    title = "title"
    views = "views"

@app.get("/articles/search")
def search_articles(
    # Pagination params
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    # Filter params
    author: Optional[str] = Query(None, description="Filter by author"),
    search: Optional[str] = Query(None, description="Search in title"),
    min_views: Optional[int] = Query(None, ge=0),
    # Sort params
    sort_by: SortField = Query(SortField.created_at),
    sort_order: SortOrder = Query(SortOrder.desc),
    db: Session = Depends(get_db)
):
    """
    Search articles with filtering, sorting, and pagination.

    Combines multiple query features while maintaining pagination.
    """
    # Start building query
    query = db.query(Article)

    # Apply filters
    if author:
        query = query.filter(Article.author == author)

    if search:
        # Case-insensitive search
        query = query.filter(Article.title.ilike(f"%{search}%"))

    if min_views is not None:
        query = query.filter(Article.views >= min_views)

    # Get total before pagination
    total = query.count()

    # Apply sorting
    sort_column = getattr(Article, sort_by.value)
    if sort_order == SortOrder.desc:
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Apply pagination
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "filters_applied": {
            "author": author,
            "search": search,
            "min_views": min_views
        }
    }
```

---

## Cursor-Based Pagination

Cursor pagination uses a pointer to the last item returned. It's more efficient for large datasets and handles real-time data better.

### How Cursors Work

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Database

    Client->>API: GET /articles?limit=10
    API->>Database: SELECT * LIMIT 10
    Database-->>API: 10 articles
    API-->>Client: items + next_cursor="abc123"

    Client->>API: GET /articles?cursor=abc123&limit=10
    API->>Database: SELECT * WHERE id > cursor LIMIT 10
    Database-->>API: Next 10 articles
    API-->>Client: items + next_cursor="xyz789"
```

### Implementation with Encoded Cursors

This implementation encodes the cursor to hide internal details and prevent tampering.

```python
# cursor_pagination.py
from fastapi import FastAPI, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import base64
import json
from datetime import datetime

app = FastAPI()

class CursorPaginatedResponse(BaseModel):
    """Response with cursor-based pagination"""
    items: List[ArticleResponse]
    next_cursor: Optional[str]
    previous_cursor: Optional[str]
    has_more: bool

def encode_cursor(article_id: int, created_at: datetime) -> str:
    """
    Encode pagination cursor from article data.

    Uses base64 encoding to hide implementation details.
    """
    cursor_data = {
        "id": article_id,
        "created_at": created_at.isoformat()
    }
    json_str = json.dumps(cursor_data)
    return base64.urlsafe_b64encode(json_str.encode()).decode()

def decode_cursor(cursor: str) -> dict:
    """
    Decode cursor back to usable data.

    Raises HTTPException if cursor is invalid.
    """
    try:
        json_str = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(json_str)
        data["created_at"] = datetime.fromisoformat(data["created_at"])
        return data
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cursor")

@app.get("/articles/cursor", response_model=CursorPaginatedResponse)
def get_articles_cursor(
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Number of items"),
    db: Session = Depends(get_db)
):
    """
    Get articles using cursor-based pagination.

    More efficient than offset for large datasets.
    Consistent results even when data changes.
    """
    query = db.query(Article).order_by(
        Article.created_at.desc(),
        Article.id.desc()  # Secondary sort for consistency
    )

    # Apply cursor filter if provided
    if cursor:
        cursor_data = decode_cursor(cursor)
        # Get items after the cursor position
        query = query.filter(
            (Article.created_at < cursor_data["created_at"]) |
            (
                (Article.created_at == cursor_data["created_at"]) &
                (Article.id < cursor_data["id"])
            )
        )

    # Fetch one extra to check if there are more items
    items = query.limit(limit + 1).all()

    # Check if there are more items
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]  # Remove the extra item

    # Generate next cursor
    next_cursor = None
    if has_more and items:
        last_item = items[-1]
        next_cursor = encode_cursor(last_item.id, last_item.created_at)

    return CursorPaginatedResponse(
        items=items,
        next_cursor=next_cursor,
        previous_cursor=cursor,  # For going back
        has_more=has_more
    )
```

---

## Keyset Pagination

Keyset pagination is similar to cursor pagination but uses actual column values instead of encoded cursors. It's the most efficient for very large datasets.

### Implementation

Keyset pagination directly uses the sort column values, making queries extremely efficient even at deep offsets.

```python
# keyset_pagination.py
from fastapi import FastAPI, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional
from datetime import datetime

app = FastAPI()

@app.get("/articles/keyset")
def get_articles_keyset(
    # Keyset params - the last values from previous page
    after_id: Optional[int] = Query(None, description="Last article ID"),
    after_date: Optional[datetime] = Query(None, description="Last created_at"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get articles using keyset pagination.

    Most efficient for large datasets with consistent performance
    regardless of how deep into the data you paginate.
    """
    query = db.query(Article).order_by(
        Article.created_at.desc(),
        Article.id.desc()
    )

    # Apply keyset filter
    if after_date is not None and after_id is not None:
        query = query.filter(
            or_(
                Article.created_at < after_date,
                and_(
                    Article.created_at == after_date,
                    Article.id < after_id
                )
            )
        )

    items = query.limit(limit + 1).all()

    has_more = len(items) > limit
    if has_more:
        items = items[:limit]

    # Build response with keyset info for next page
    response = {
        "items": items,
        "has_more": has_more
    }

    if items:
        last = items[-1]
        response["next_params"] = {
            "after_id": last.id,
            "after_date": last.created_at.isoformat()
        }

    return response
```

---

## Async Pagination

For high-performance APIs, use async database operations. This prevents blocking during database queries.

```python
# async_pagination.py
from fastapi import FastAPI, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from typing import List

# Async engine setup
ASYNC_DATABASE_URL = "postgresql+asyncpg://user:password@localhost/mydb"
async_engine = create_async_engine(ASYNC_DATABASE_URL)
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_async_db():
    """Async database session dependency"""
    async with AsyncSessionLocal() as session:
        yield session

app = FastAPI()

@app.get("/articles/async")
async def get_articles_async(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get paginated articles using async database operations.

    Non-blocking queries for better concurrency.
    """
    offset = (page - 1) * page_size

    # Count query
    count_query = select(func.count()).select_from(Article)
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Data query
    data_query = (
        select(Article)
        .order_by(Article.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(data_query)
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }
```

---

## Reusable Pagination Dependency

Create a reusable pagination dependency to avoid repeating code across endpoints.

```python
# pagination_dependency.py
from fastapi import FastAPI, Query, Depends
from pydantic import BaseModel
from typing import Generic, TypeVar, List, Callable
from dataclasses import dataclass

T = TypeVar('T')

@dataclass
class PaginationParams:
    """Pagination parameters extracted from query"""
    page: int
    page_size: int
    offset: int

def get_pagination(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
) -> PaginationParams:
    """
    Reusable dependency for pagination parameters.

    Use this in any endpoint that needs pagination.
    """
    return PaginationParams(
        page=page,
        page_size=page_size,
        offset=(page - 1) * page_size
    )

class Page(BaseModel, Generic[T]):
    """Generic paginated response"""
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

def paginate(
    items: List,
    total: int,
    params: PaginationParams
) -> dict:
    """
    Helper function to create paginated response.

    Takes query results and pagination params,
    returns structured pagination response.
    """
    from math import ceil
    return {
        "items": items,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "pages": ceil(total / params.page_size) if total > 0 else 0
    }

app = FastAPI()

@app.get("/articles")
def list_articles(
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db)
):
    """Example endpoint using pagination dependency"""
    total = db.query(Article).count()
    items = (
        db.query(Article)
        .order_by(Article.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
        .all()
    )

    return paginate(items, total, pagination)

@app.get("/users")
def list_users(
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db)
):
    """Same pagination, different resource"""
    total = db.query(User).count()
    items = (
        db.query(User)
        .offset(pagination.offset)
        .limit(pagination.page_size)
        .all()
    )

    return paginate(items, total, pagination)
```

---

## Performance Optimization Tips

### 1. Index Your Sort Columns

Always index columns used for sorting and filtering in pagination.

```sql
-- Essential indexes for pagination
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_created_at_id ON articles(created_at DESC, id DESC);
```

### 2. Avoid COUNT for Large Tables

For very large tables, approximate counts or caching can help.

```python
# count_optimization.py
from functools import lru_cache
import time

# Cache count for 60 seconds
@lru_cache(maxsize=100)
def get_cached_count(table_name: str, cache_key: int) -> int:
    """
    Get cached total count.

    cache_key is time-based to expire cache periodically.
    """
    # This would query the database
    return db.query(Article).count()

def get_approximate_count(db: Session) -> int:
    """Get approximate count - much faster for large tables"""
    # For PostgreSQL
    result = db.execute(
        "SELECT reltuples::bigint FROM pg_class WHERE relname = 'articles'"
    )
    return result.scalar() or 0

@app.get("/articles/fast")
def get_articles_fast(
    pagination: PaginationParams = Depends(get_pagination),
    db: Session = Depends(get_db)
):
    """Fast pagination with approximate count"""
    # Use approximate count for large tables
    total = get_approximate_count(db)

    items = (
        db.query(Article)
        .order_by(Article.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
        .all()
    )

    return paginate(items, total, pagination)
```

### 3. Limit Maximum Offset

Prevent performance issues from deep pagination.

```python
# limit_offset.py
MAX_OFFSET = 10000

@app.get("/articles/limited")
def get_articles_limited(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Pagination with maximum offset limit"""
    offset = (page - 1) * page_size

    if offset > MAX_OFFSET:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum offset exceeded. Use cursor pagination for deep results."
        )

    # Continue with normal pagination...
```

---

## Comparison Summary

| Feature | Offset | Cursor | Keyset |
|---------|--------|--------|--------|
| Random access | Yes | No | No |
| Performance at page 1 | Fast | Fast | Fast |
| Performance at page 1000 | Slow | Fast | Fast |
| Handles inserts/deletes | Poorly | Well | Well |
| Implementation complexity | Low | Medium | Medium |
| Client complexity | Low | Medium | Low |

**When to use each:**

- **Offset**: Small datasets, need page numbers, admin interfaces
- **Cursor**: Social feeds, infinite scroll, real-time data
- **Keyset**: Large datasets, need consistent performance, APIs

---

## Conclusion

Pagination is essential for any API dealing with collections. Start with offset pagination for simplicity, but switch to cursor or keyset pagination when performance matters. The key points:

- Always validate and limit page sizes
- Index your sort columns
- Consider approximate counts for large tables
- Use cursor pagination for infinite scroll
- Cache counts when possible

Pick the right strategy for your use case, and your API will scale smoothly.

---

*Building APIs that need to scale? [OneUptime](https://oneuptime.com) helps you monitor API performance, track response times, and alert when pagination endpoints slow down.*
