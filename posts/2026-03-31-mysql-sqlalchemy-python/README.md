# How to Use MySQL with SQLAlchemy in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Python, SQLAlchemy, ORM, Database

Description: Learn how to use SQLAlchemy ORM with MySQL in Python to define models, run queries, manage sessions, and handle relationships and transactions.

---

## How SQLAlchemy Works with MySQL

SQLAlchemy is the most popular Python SQL toolkit and ORM. It has two layers: the Core (expression language and raw SQL) and the ORM (mapping Python classes to tables). SQLAlchemy uses `mysql-connector-python` or `PyMySQL` as its database driver. The ORM layer manages object identity, lazy/eager loading, and unit-of-work transactions.

```mermaid
flowchart TD
    A[Python Model Class] --> B[SQLAlchemy ORM]
    B --> C[Session]
    C --> D[SQLAlchemy Core]
    D --> E[mysql-connector-python]
    E --> F[MySQL Server]
    F --> E
    E --> D
    D --> C
    C --> G[Python Objects]
```

## Installation

```bash
pip install sqlalchemy mysql-connector-python
```

## Engine and Session Setup

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = (
    "mysql+mysqlconnector://appuser:secret@localhost:3306/myapp"
    "?charset=utf8mb4"
)

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # Test connections before use
    echo=False            # Set True to log SQL
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()
```

## Defining Models

```python
from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = 'users'

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(100), nullable=False)
    email      = Column(String(150), nullable=False, unique=True)
    role       = Column(String(20), nullable=False, default='user')
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    posts = relationship('Post', back_populates='author', lazy='select')

    def __repr__(self):
        return f'<User id={self.id} name={self.name!r}>'


class Post(Base):
    __tablename__ = 'posts'

    id         = Column(Integer, primary_key=True, autoincrement=True)
    title      = Column(String(200), nullable=False)
    body       = Column(Text)
    user_id    = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    author = relationship('User', back_populates='posts')
```

## Create Tables

```python
Base.metadata.create_all(bind=engine)
```

## Session Context Manager

```python
from contextlib import contextmanager

@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
```

## CRUD Operations

```python
from sqlalchemy.orm import joinedload

# Create
def create_user(name: str, email: str, role: str = 'user') -> User:
    with get_session() as session:
        user = User(name=name, email=email, role=role)
        session.add(user)
        session.flush()   # Flush to get the generated ID
        session.expunge(user)
        return user

# Read by PK
def get_user(user_id: int) -> User | None:
    with get_session() as session:
        return session.get(User, user_id)

# Read with filter
def list_admins() -> list[User]:
    with get_session() as session:
        return session.query(User).filter(User.role == 'admin').order_by(User.name).all()

# Update
def update_role(user_id: int, new_role: str) -> bool:
    with get_session() as session:
        user = session.get(User, user_id)
        if user is None:
            return False
        user.role = new_role
        return True

# Delete
def delete_user(user_id: int) -> bool:
    with get_session() as session:
        user = session.get(User, user_id)
        if user is None:
            return False
        session.delete(user)
        return True
```

## Querying with Filters

```python
from sqlalchemy import or_, and_

def search_users(keyword: str, role: str | None = None) -> list[User]:
    with get_session() as session:
        query = session.query(User).filter(
            or_(
                User.name.ilike(f'%{keyword}%'),
                User.email.ilike(f'%{keyword}%')
            )
        )
        if role:
            query = query.filter(User.role == role)
        return query.order_by(User.name).all()
```

## Eager Loading (JOIN)

```python
def get_users_with_posts() -> list[User]:
    with get_session() as session:
        return (
            session.query(User)
            .options(joinedload(User.posts))
            .filter(User.role == 'admin')
            .all()
        )
```

## Raw SQL with SQLAlchemy Core

```python
from sqlalchemy import text

def get_post_counts() -> list[dict]:
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT u.id, u.name, COUNT(p.id) AS post_count "
            "FROM users u LEFT JOIN posts p ON u.id = p.user_id "
            "GROUP BY u.id ORDER BY post_count DESC"
        ))
        return [dict(row._mapping) for row in result]
```

## Transactions (Explicit)

```python
def register_with_subscription(name: str, email: str, plan_id: int) -> User:
    with get_session() as session:
        user = User(name=name, email=email)
        session.add(user)
        session.flush()   # Get user.id before inserting subscription

        session.execute(text(
            "INSERT INTO subscriptions (user_id, plan_id) VALUES (:uid, :pid)"
        ), {'uid': user.id, 'pid': plan_id})

        session.expunge(user)
        return user
```

## SQLAlchemy 2.0 Style (Modern API)

```python
from sqlalchemy import select

def list_users_modern() -> list[User]:
    with get_session() as session:
        stmt = select(User).where(User.role == 'user').order_by(User.name)
        return list(session.scalars(stmt))
```

## Best Practices

- Use `pool_pre_ping=True` so SQLAlchemy tests connections before use, preventing stale connection errors.
- Wrap sessions in a context manager that commits on success and rolls back on exception.
- Use `session.flush()` inside a transaction to get generated IDs before committing.
- Use `joinedload` or `selectinload` for eagerly loaded relationships instead of relying on lazy loading in loops.
- Use the SQLAlchemy 2.0 `select()` style for new code - it is more explicit and composable.
- Never share a `Session` across threads; use `SessionLocal()` per request or per thread.

## Summary

SQLAlchemy provides a full-featured ORM for MySQL in Python. Define table-mapped models using `declarative_base`, configure a connection pool with `create_engine`, and manage object lifecycle with `Session`. Use `session.query()` or the modern `select()` API with `.where()`, `.order_by()`, and `.limit()` for queries. Eager loading with `joinedload` prevents N+1 query problems. The context manager pattern ensures sessions always commit or roll back and close properly.
