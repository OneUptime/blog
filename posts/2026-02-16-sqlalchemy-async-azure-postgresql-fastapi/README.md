# How to Use SQLAlchemy Async Engine with Azure Database for PostgreSQL in FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLAlchemy, FastAPI, Azure, PostgreSQL, Python, Async, Database

Description: Use SQLAlchemy async engine with Azure Database for PostgreSQL in a FastAPI application for high-performance async database access.

---

FastAPI is async by nature. If your database access is synchronous, you are blocking the event loop and throwing away the concurrency advantage that made you choose FastAPI in the first place. SQLAlchemy 2.0 introduced a proper async engine that works with asyncpg (a fast async PostgreSQL driver), giving you non-blocking database access that plays nicely with FastAPI's async request handling. Pair this with Azure Database for PostgreSQL and you have a production-ready async Python API.

This guide walks through setting up SQLAlchemy's async engine with Azure Database for PostgreSQL in a FastAPI application.

## Prerequisites

- Python 3.11 or later
- An Azure account
- Azure CLI installed
- Basic FastAPI and SQLAlchemy knowledge

## Provisioning Azure Database for PostgreSQL

```bash
# Create a resource group
az group create --name fastapi-demo-rg --location eastus

# Create a PostgreSQL flexible server
az postgres flexible-server create \
  --resource-group fastapi-demo-rg \
  --name fastapi-pg-server \
  --location eastus \
  --admin-user pgadmin \
  --admin-password SecureP@ss123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15

# Allow access from your IP
az postgres flexible-server firewall-rule create \
  --resource-group fastapi-demo-rg \
  --name fastapi-pg-server \
  --rule-name dev-access \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255

# Create the application database
az postgres flexible-server db create \
  --resource-group fastapi-demo-rg \
  --server-name fastapi-pg-server \
  --database-name fastapi_app
```

## Project Setup

```bash
# Create the project
mkdir fastapi-sqlalchemy-azure && cd fastapi-sqlalchemy-azure
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy asyncpg python-dotenv pydantic alembic greenlet
```

Create a `.env` file:

```env
# Azure PostgreSQL connection (async driver)
DATABASE_URL=postgresql+asyncpg://pgadmin:SecureP%40ss123!@fastapi-pg-server.postgres.database.azure.com:5432/fastapi_app?ssl=require
```

Note the `postgresql+asyncpg` scheme. This tells SQLAlchemy to use the asyncpg driver instead of the default synchronous psycopg2.

## Configuring the Async Engine

```python
# app/database.py - Async database configuration
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

# Create the async engine with connection pool settings
engine = create_async_engine(
    os.getenv("DATABASE_URL"),
    # Connection pool configuration
    pool_size=10,          # Number of persistent connections
    max_overflow=20,       # Additional connections when pool is full
    pool_timeout=30,       # Seconds to wait for a connection from the pool
    pool_recycle=1800,     # Recycle connections after 30 minutes
    pool_pre_ping=True,    # Test connections before using them
    echo=False,            # Set to True for SQL logging during development
    # SSL arguments for Azure PostgreSQL
    connect_args={
        "ssl": "require",
        "server_settings": {
            "application_name": "fastapi-app",
        },
    },
)

# Create the async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevent lazy loading after commit
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency for FastAPI route handlers
async def get_db():
    """Provide a database session for each request."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

## Defining Models

```python
# app/models.py - SQLAlchemy async models
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Article(Base):
    """Blog article model."""
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(300), nullable=False, index=True)
    slug = Column(String(300), nullable=False, unique=True, index=True)
    content = Column(Text, nullable=False)
    summary = Column(String(500))
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=False)
    published = Column(Boolean, default=False, index=True)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    author = relationship("Author", back_populates="articles")
    tags = relationship("Tag", secondary="article_tags", back_populates="articles")


class Author(Base):
    """Article author model."""
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    bio = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    articles = relationship("Article", back_populates="author")


class Tag(Base):
    """Tag for categorizing articles."""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)

    articles = relationship("Article", secondary="article_tags", back_populates="tags")


# Association table for many-to-many relationship
from sqlalchemy import Table
article_tags = Table(
    "article_tags",
    Base.metadata,
    Column("article_id", Integer, ForeignKey("articles.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)
```

## Pydantic Schemas

```python
# app/schemas.py - Request and response schemas
from pydantic import BaseModel, EmailStr
from datetime import datetime


class AuthorCreate(BaseModel):
    name: str
    email: str
    bio: str | None = None


class AuthorResponse(BaseModel):
    id: int
    name: str
    email: str
    bio: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    title: str
    slug: str
    content: str
    summary: str | None = None
    author_id: int
    tag_names: list[str] = []


class ArticleResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    summary: str | None
    published: bool
    view_count: int
    created_at: datetime
    author: AuthorResponse
    tags: list[str] = []

    model_config = {"from_attributes": True}


class ArticleList(BaseModel):
    id: int
    title: str
    slug: str
    summary: str | None
    published: bool
    view_count: int
    created_at: datetime
    author_name: str

    model_config = {"from_attributes": True}
```

## Building the API

```python
# app/main.py - FastAPI application with async SQLAlchemy
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db, engine, Base
from app.models import Article, Author, Tag, article_tags
from app.schemas import (
    ArticleCreate, ArticleResponse, ArticleList,
    AuthorCreate, AuthorResponse,
)

app = FastAPI(title="Blog API")


# Create tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Shutdown: dispose the engine connection pool
@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()


# --- Author endpoints ---

@app.post("/authors", response_model=AuthorResponse, status_code=201)
async def create_author(data: AuthorCreate, db: AsyncSession = Depends(get_db)):
    """Create a new author."""
    author = Author(name=data.name, email=data.email, bio=data.bio)
    db.add(author)
    await db.commit()
    await db.refresh(author)
    return author


@app.get("/authors", response_model=list[AuthorResponse])
async def list_authors(db: AsyncSession = Depends(get_db)):
    """List all authors."""
    result = await db.execute(select(Author).order_by(Author.name))
    return result.scalars().all()


# --- Article endpoints ---

@app.post("/articles", response_model=ArticleResponse, status_code=201)
async def create_article(data: ArticleCreate, db: AsyncSession = Depends(get_db)):
    """Create a new article with tags."""
    # Verify author exists
    author = await db.get(Author, data.author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    # Create or get tags
    tags = []
    for tag_name in data.tag_names:
        result = await db.execute(select(Tag).where(Tag.name == tag_name))
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=tag_name)
            db.add(tag)
        tags.append(tag)

    # Create the article
    article = Article(
        title=data.title,
        slug=data.slug,
        content=data.content,
        summary=data.summary,
        author_id=data.author_id,
        tags=tags,
    )
    db.add(article)
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.author), selectinload(Article.tags))
        .where(Article.id == article.id)
    )
    article = result.scalar_one()

    return ArticleResponse(
        id=article.id,
        title=article.title,
        slug=article.slug,
        content=article.content,
        summary=article.summary,
        published=article.published,
        view_count=article.view_count,
        created_at=article.created_at,
        author=article.author,
        tags=[t.name for t in article.tags],
    )


@app.get("/articles", response_model=list[ArticleList])
async def list_articles(
    published: bool | None = None,
    tag: str | None = None,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List articles with filtering and pagination."""
    query = (
        select(
            Article.id,
            Article.title,
            Article.slug,
            Article.summary,
            Article.published,
            Article.view_count,
            Article.created_at,
            Author.name.label("author_name"),
        )
        .join(Author, Article.author_id == Author.id)
    )

    # Apply filters
    if published is not None:
        query = query.where(Article.published == published)
    if tag:
        query = query.join(article_tags).join(Tag).where(Tag.name == tag)

    # Apply pagination
    query = query.order_by(Article.created_at.desc())
    query = query.offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    rows = result.all()

    return [
        ArticleList(
            id=row.id,
            title=row.title,
            slug=row.slug,
            summary=row.summary,
            published=row.published,
            view_count=row.view_count,
            created_at=row.created_at,
            author_name=row.author_name,
        )
        for row in rows
    ]


@app.get("/articles/{slug}", response_model=ArticleResponse)
async def get_article(slug: str, db: AsyncSession = Depends(get_db)):
    """Get a single article by slug and increment view count."""
    result = await db.execute(
        select(Article)
        .options(selectinload(Article.author), selectinload(Article.tags))
        .where(Article.slug == slug)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Increment view count
    article.view_count += 1
    await db.commit()

    return ArticleResponse(
        id=article.id,
        title=article.title,
        slug=article.slug,
        content=article.content,
        summary=article.summary,
        published=article.published,
        view_count=article.view_count,
        created_at=article.created_at,
        author=article.author,
        tags=[t.name for t in article.tags],
    )
```

## Running the Application

```bash
# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API documentation is available at `http://localhost:8000/docs`.

## Wrapping Up

SQLAlchemy's async engine with asyncpg gives FastAPI applications true non-blocking database access. Your API can handle many concurrent requests without threads blocking on database I/O. Azure Database for PostgreSQL provides the managed infrastructure, and the `pool_pre_ping` setting ensures stale connections are detected before they cause errors. The `selectinload` strategy for eager loading relationships avoids the N+1 query problem while staying fully async. For Python APIs that need to handle concurrent requests efficiently against a PostgreSQL database, this combination delivers both developer productivity and runtime performance.
