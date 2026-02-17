# How to Build a GraphQL API with Strawberry in Python and Deploy to Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GraphQL, Python, Strawberry, Azure, App Service, API, FastAPI

Description: Build a type-safe GraphQL API using Strawberry and Python, integrate it with FastAPI, and deploy the whole thing to Azure App Service.

---

Strawberry is a Python library for building GraphQL APIs that takes advantage of Python's type hints. Unlike older libraries like Graphene that require a lot of boilerplate, Strawberry lets you define your schema using dataclasses and type annotations. The result is cleaner code that is easier to read and maintain.

In this guide, we will build a GraphQL API with Strawberry, integrate it with FastAPI for serving, and deploy the whole thing to Azure App Service. Along the way, we will cover queries, mutations, input types, and error handling.

## Why Strawberry?

If you have used Graphene, you know it can get verbose. Strawberry takes a different approach by leaning heavily on Python's type system. You define types as dataclasses, and Strawberry generates the GraphQL schema from them. This means your Python types and your GraphQL types are the same thing, eliminating a whole class of bugs where the two get out of sync.

## Project Setup

Start by setting up a virtual environment and installing dependencies.

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install Strawberry with FastAPI integration
pip install strawberry-graphql[fastapi] uvicorn

# Freeze dependencies for deployment
pip freeze > requirements.txt
```

## Define the Data Models

Let us build a bookstore API. We start by defining our data types using Strawberry's type decorators.

```python
# models.py
# Data models for the bookstore API
import strawberry
from typing import Optional
from datetime import date

@strawberry.type
class Author:
    """Represents a book author."""
    id: str
    name: str
    bio: Optional[str] = None

@strawberry.type
class Book:
    """Represents a book in the store."""
    id: str
    title: str
    author: Author
    isbn: str
    published_date: date
    price: float
    in_stock: bool

# Input types for mutations - separate from the output types
@strawberry.input
class CreateBookInput:
    """Input for creating a new book."""
    title: str
    author_id: str
    isbn: str
    published_date: date
    price: float

@strawberry.input
class UpdateBookInput:
    """Input for updating an existing book."""
    title: Optional[str] = None
    price: Optional[float] = None
    in_stock: Optional[bool] = None
```

## Create the Data Store

For this example, we will use an in-memory store. In production, you would replace this with a database like PostgreSQL or Cosmos DB.

```python
# store.py
# In-memory data store for books and authors
from models import Author, Book
from datetime import date

# Seed data for the store
authors_db = {
    "a1": Author(id="a1", name="Jane Doe", bio="Fiction writer"),
    "a2": Author(id="a2", name="John Smith", bio="Technical author"),
}

books_db = {
    "b1": Book(
        id="b1",
        title="Learning Python",
        author=authors_db["a2"],
        isbn="978-1234567890",
        published_date=date(2024, 3, 15),
        price=39.99,
        in_stock=True,
    ),
}
```

## Define Queries and Mutations

Now we define the GraphQL operations.

```python
# schema.py
# GraphQL schema with queries and mutations
import strawberry
from typing import Optional
import uuid
from datetime import date
from models import Book, Author, CreateBookInput, UpdateBookInput
from store import books_db, authors_db

@strawberry.type
class Query:
    @strawberry.field
    def book(self, id: str) -> Optional[Book]:
        """Fetch a single book by its ID."""
        return books_db.get(id)

    @strawberry.field
    def books(self) -> list[Book]:
        """Fetch all books in the store."""
        return list(books_db.values())

    @strawberry.field
    def author(self, id: str) -> Optional[Author]:
        """Fetch a single author by their ID."""
        return authors_db.get(id)

    @strawberry.field
    def authors(self) -> list[Author]:
        """Fetch all authors."""
        return list(authors_db.values())

    @strawberry.field
    def search_books(self, title: str) -> list[Book]:
        """Search books by title substring (case-insensitive)."""
        query = title.lower()
        return [b for b in books_db.values() if query in b.title.lower()]

@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_book(self, input: CreateBookInput) -> Book:
        """Create a new book entry."""
        author = authors_db.get(input.author_id)
        if not author:
            raise ValueError(f"Author with id {input.author_id} not found")

        book_id = str(uuid.uuid4())[:8]
        book = Book(
            id=book_id,
            title=input.title,
            author=author,
            isbn=input.isbn,
            published_date=input.published_date,
            price=input.price,
            in_stock=True,
        )
        books_db[book_id] = book
        return book

    @strawberry.mutation
    def update_book(self, id: str, input: UpdateBookInput) -> Book:
        """Update an existing book's fields."""
        book = books_db.get(id)
        if not book:
            raise ValueError(f"Book with id {id} not found")

        # Only update fields that were provided
        if input.title is not None:
            book = strawberry.types.copy_with(book, title=input.title)
        if input.price is not None:
            book = strawberry.types.copy_with(book, price=input.price)
        if input.in_stock is not None:
            book = strawberry.types.copy_with(book, in_stock=input.in_stock)

        books_db[id] = book
        return book

    @strawberry.mutation
    def delete_book(self, id: str) -> bool:
        """Delete a book by ID. Returns True if deleted."""
        if id in books_db:
            del books_db[id]
            return True
        return False

# Create the schema object
schema = strawberry.Schema(query=Query, mutation=Mutation)
```

## Integrate with FastAPI

Strawberry has first-class integration with FastAPI.

```python
# main.py
# FastAPI application with Strawberry GraphQL
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from schema import schema

app = FastAPI(title="Bookstore GraphQL API")

# Mount the GraphQL endpoint at /graphql
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")

# Health check endpoint for Azure App Service
@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Test Locally

Run the app and open the GraphQL playground in your browser.

```bash
# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Navigate to `http://localhost:8000/graphql` and try a query.

```graphql
# Query all books
query {
  books {
    id
    title
    price
    author {
      name
    }
  }
}

# Create a new book
mutation {
  createBook(input: {
    title: "Advanced Python"
    authorId: "a2"
    isbn: "978-9876543210"
    publishedDate: "2025-01-10"
    price: 49.99
  }) {
    id
    title
    author {
      name
    }
  }
}
```

## Error Handling

Strawberry supports custom error types using union types, which is a cleaner pattern than throwing exceptions.

```python
# Custom error handling with union types
@strawberry.type
class BookNotFoundError:
    message: str
    book_id: str

# Define a union type for the response
BookResult = strawberry.union("BookResult", types=[Book, BookNotFoundError])

@strawberry.type
class SafeQuery:
    @strawberry.field
    def book_safe(self, id: str) -> BookResult:
        """Fetch a book with typed error handling."""
        book = books_db.get(id)
        if book is None:
            return BookNotFoundError(
                message=f"No book found with id {id}",
                book_id=id,
            )
        return book
```

## Prepare for Deployment

Create a Dockerfile for the application.

```dockerfile
# Dockerfile for the Strawberry GraphQL API
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./

# Run with uvicorn in production mode
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Deploy to Azure App Service

Push the container to ACR and deploy it.

```bash
# Build and push to Azure Container Registry
az acr build --registry mybookstoreacr --image bookstore-graphql:v1 .

# Create the App Service plan
az appservice plan create \
  --name bookstore-plan \
  --resource-group bookstore-rg \
  --is-linux \
  --sku B1

# Create the web app with the container
az webapp create \
  --resource-group bookstore-rg \
  --plan bookstore-plan \
  --name bookstore-graphql-api \
  --deployment-container-image-name mybookstoreacr.azurecr.io/bookstore-graphql:v1

# Configure health check path
az webapp config set \
  --resource-group bookstore-rg \
  --name bookstore-graphql-api \
  --generic-configurations '{"healthCheckPath": "/health"}'
```

## Adding DataLoader for N+1 Prevention

When your GraphQL types have relationships (like Book to Author), you can run into N+1 query problems. Strawberry supports DataLoaders to batch and cache these lookups.

```python
# dataloaders.py
# DataLoader to batch author lookups
from strawberry.dataloader import DataLoader
from store import authors_db

async def load_authors(keys: list[str]) -> list[Author]:
    """Batch load authors by their IDs."""
    return [authors_db.get(key) for key in keys]

author_loader = DataLoader(load_fn=load_authors)
```

## Performance Tips

For production Strawberry deployments, keep these tips in mind:

- Use DataLoaders for all relationship fields to avoid N+1 queries
- Enable query complexity analysis to prevent abusive queries from consuming too many resources
- Set a maximum query depth to block deeply nested queries
- Use persisted queries in production to avoid parsing the same query repeatedly
- Add caching at the resolver level using libraries like `cachetools` for expensive lookups

## Summary

Strawberry gives you a clean, Pythonic way to build GraphQL APIs. The type-hint-driven approach means less boilerplate and better IDE support compared to alternatives. Combined with FastAPI for serving and Azure App Service for hosting, you get a full-stack deployment pipeline with minimal configuration. The key advantage of this stack is that your Python type hints, your GraphQL schema, and your API documentation all come from the same source - the Strawberry type definitions.
