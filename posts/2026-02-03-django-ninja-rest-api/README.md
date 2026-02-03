# How to Build REST APIs with Django Ninja

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Django, Django Ninja, REST API, Backend

Description: Learn how to build fast REST APIs with Django Ninja. This guide covers routing, schemas, authentication, and automatic documentation.

---

> Django Ninja is a fast, modern web framework for building APIs with Django using Python type hints. It combines Django's maturity with Pydantic's validation and automatic OpenAPI documentation. If you love FastAPI but need Django's ORM, admin, and ecosystem, Django Ninja is your answer.

Building REST APIs in Django traditionally meant using Django REST Framework (DRF). While DRF is powerful, it can be verbose. Django Ninja offers a lighter, faster alternative with automatic request/response validation, OpenAPI schema generation, and a familiar decorator-based syntax.

---

## Why Django Ninja?

| Feature | Django Ninja | Django REST Framework |
|---------|--------------|----------------------|
| **Performance** | Fast (uses Pydantic) | Slower serializers |
| **Type Hints** | Native support | Limited |
| **OpenAPI Docs** | Automatic | Requires setup |
| **Learning Curve** | Gentle | Steeper |
| **Validation** | Pydantic | Serializers |

---

## Installation and Setup

```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate

# Install Django and Django Ninja
pip install django django-ninja

# Create a new Django project
django-admin startproject myproject
cd myproject

# Create an app
python manage.py startapp api
```

### Create Your First API

```python
# api/api.py
from ninja import NinjaAPI

api = NinjaAPI(
    title="My API",
    version="1.0.0",
    description="A REST API built with Django Ninja"
)

@api.get("/hello")
def hello(request):
    return {"message": "Hello, World!"}

@api.get("/hello/{name}")
def hello_name(request, name: str):
    return {"message": f"Hello, {name}!"}
```

### Register the API in URLs

```python
# myproject/urls.py
from django.contrib import admin
from django.urls import path
from api.api import api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]
```

Run the server and visit `http://localhost:8000/api/docs` to see the automatic OpenAPI documentation.

---

## Request Routing

### Path and Query Parameters

```python
# api/api.py
from ninja import NinjaAPI, Query
from typing import Optional, List

api = NinjaAPI()

# Path parameters
@api.get("/users/{user_id}")
def get_user(request, user_id: int):
    return {"user_id": user_id}

# Multiple path parameters
@api.get("/posts/{post_id}/comments/{comment_id}")
def get_comment(request, post_id: int, comment_id: int):
    return {"post_id": post_id, "comment_id": comment_id}

# Query parameters with defaults
@api.get("/search")
def search(request, q: str, limit: int = 10, offset: int = 0):
    return {"query": q, "limit": limit, "offset": offset}

# Optional query parameters
@api.get("/products")
def list_products(
    request,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: bool = True
):
    filters = {k: v for k, v in {
        "category": category,
        "min_price": min_price,
        "max_price": max_price,
        "in_stock": in_stock
    }.items() if v is not None}
    return {"filters": filters}

# List query parameters
@api.get("/filter")
def filter_items(request, tags: List[str] = Query(...)):
    return {"tags": tags}
```

### HTTP Methods

```python
# api/api.py

@api.get("/resources")
def list_resources(request):
    return {"resources": []}

@api.post("/resources")
def create_resource(request):
    return {"message": "Created"}

@api.put("/resources/{id}")
def update_resource(request, id: int):
    return {"id": id, "message": "Updated"}

@api.patch("/resources/{id}")
def patch_resource(request, id: int):
    return {"id": id, "message": "Patched"}

@api.delete("/resources/{id}")
def delete_resource(request, id: int):
    return {"id": id, "message": "Deleted"}
```

---

## Schemas with Pydantic

Django Ninja uses Pydantic for request and response validation.

### Basic Schemas

```python
# api/schemas.py
from ninja import Schema
from typing import Optional, List
from datetime import datetime
from pydantic import Field, EmailStr

class UserCreate(Schema):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None

class UserOut(Schema):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime

class UserUpdate(Schema):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
```

### Using Schemas in Endpoints

```python
# api/api.py
from ninja import NinjaAPI
from .schemas import UserCreate, UserOut, UserUpdate
from typing import List

api = NinjaAPI()

@api.post("/users", response=UserOut)
def create_user(request, payload: UserCreate):
    user = {
        "id": 1,
        "username": payload.username,
        "email": payload.email,
        "full_name": payload.full_name,
        "is_active": True,
        "created_at": "2026-02-03T10:00:00Z"
    }
    return user

@api.get("/users/{user_id}", response=UserOut)
def get_user(request, user_id: int):
    return {
        "id": user_id,
        "username": "john_doe",
        "email": "john@example.com",
        "is_active": True,
        "created_at": "2026-02-03T10:00:00Z"
    }

@api.get("/users", response=List[UserOut])
def list_users(request):
    return [{"id": 1, "username": "john_doe", "email": "john@example.com",
             "is_active": True, "created_at": "2026-02-03T10:00:00Z"}]

@api.patch("/users/{user_id}", response=UserOut)
def update_user(request, user_id: int, payload: UserUpdate):
    update_data = payload.dict(exclude_unset=True)
    return {"id": user_id, "username": update_data.get("username", "john_doe"),
            "email": update_data.get("email", "john@example.com"),
            "is_active": True, "created_at": "2026-02-03T10:00:00Z"}
```

### Schema from Django Model

```python
# api/models.py
from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=0)
    category = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

```python
# api/schemas.py
from ninja import ModelSchema
from .models import Product

class ProductSchema(ModelSchema):
    class Meta:
        model = Product
        fields = '__all__'

class ProductCreate(ModelSchema):
    class Meta:
        model = Product
        exclude = ['id', 'created_at', 'updated_at']
```

---

## Django Model Integration

### CRUD Operations

```python
# api/api.py
from ninja import NinjaAPI
from django.shortcuts import get_object_or_404
from .models import Product
from .schemas import ProductCreate, ProductSchema
from typing import List

api = NinjaAPI()

@api.post("/products", response=ProductSchema)
def create_product(request, payload: ProductCreate):
    product = Product.objects.create(**payload.dict())
    return product

@api.get("/products/{product_id}", response=ProductSchema)
def get_product(request, product_id: int):
    return get_object_or_404(Product, id=product_id)

@api.get("/products", response=List[ProductSchema])
def list_products(request, category: str = None, is_active: bool = True):
    products = Product.objects.filter(is_active=is_active)
    if category:
        products = products.filter(category=category)
    return products

@api.put("/products/{product_id}", response=ProductSchema)
def update_product(request, product_id: int, payload: ProductCreate):
    product = get_object_or_404(Product, id=product_id)
    for attr, value in payload.dict().items():
        setattr(product, attr, value)
    product.save()
    return product

@api.delete("/products/{product_id}")
def delete_product(request, product_id: int):
    product = get_object_or_404(Product, id=product_id)
    product.delete()
    return {"success": True}
```

### Pagination

```python
# api/api.py
from ninja import NinjaAPI
from ninja.pagination import paginate, PageNumberPagination
import math

api = NinjaAPI()

@api.get("/products/paginated", response=List[ProductSchema])
@paginate(PageNumberPagination)
def list_products_paginated(request):
    return Product.objects.all()

@api.get("/products/custom")
def list_products_custom(request, page: int = 1, page_size: int = 10):
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size
    total = Product.objects.count()
    products = Product.objects.all()[offset:offset + page_size]

    return {
        "items": list(products.values()),
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size)
    }
```

---

## Authentication

### API Key Authentication

```python
# api/auth.py
from ninja.security import APIKeyHeader
from django.conf import settings

class ApiKeyAuth(APIKeyHeader):
    param_name = "X-API-Key"

    def authenticate(self, request, key):
        if key == settings.API_KEY:
            return key
        return None
```

```python
# api/api.py
from ninja import NinjaAPI
from .auth import ApiKeyAuth

api = NinjaAPI(auth=ApiKeyAuth())

@api.get("/protected")
def protected_endpoint(request):
    return {"message": "You have access!"}

@api.get("/public", auth=None)
def public_endpoint(request):
    return {"message": "No auth required"}
```

### JWT Authentication

```python
# api/auth.py
from ninja.security import HttpBearer
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user = User.objects.get(id=payload.get('user_id'))
            return user
        except (jwt.InvalidTokenError, User.DoesNotExist):
            return None

def create_token(user):
    import datetime
    payload = {
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
```

```python
# api/api.py
from ninja import NinjaAPI, Schema
from .auth import JWTAuth, create_token

api = NinjaAPI()

class LoginSchema(Schema):
    username: str
    password: str

class TokenSchema(Schema):
    access_token: str
    token_type: str = "bearer"

@api.post("/login", response=TokenSchema, auth=None)
def login(request, payload: LoginSchema):
    from django.contrib.auth import authenticate
    user = authenticate(username=payload.username, password=payload.password)
    if not user:
        return api.create_response(request, {"detail": "Invalid credentials"}, status=401)
    return {"access_token": create_token(user), "token_type": "bearer"}

@api.get("/me", auth=JWTAuth())
def get_current_user(request):
    return {"id": request.auth.id, "username": request.auth.username}
```

---

## Error Handling

```python
# api/api.py
from ninja import NinjaAPI
from django.http import Http404

api = NinjaAPI()

class NotFoundError(Exception):
    def __init__(self, message="Resource not found"):
        self.message = message

@api.exception_handler(NotFoundError)
def not_found_handler(request, exc):
    return api.create_response(request, {"detail": exc.message}, status=404)

@api.exception_handler(Http404)
def django_404_handler(request, exc):
    return api.create_response(request, {"detail": "Not found"}, status=404)

@api.exception_handler(Exception)
def generic_error_handler(request, exc):
    import logging
    logging.exception("Unhandled exception")
    return api.create_response(request, {"detail": "Internal server error"}, status=500)
```

### Multiple Response Types

```python
# api/api.py
from .schemas import ProductSchema, ErrorResponse

@api.get("/products/{id}", response={200: ProductSchema, 404: ErrorResponse})
def get_product(request, id: int):
    try:
        return Product.objects.get(id=id)
    except Product.DoesNotExist:
        return 404, {"detail": f"Product {id} not found"}
```

---

## OpenAPI Documentation

Django Ninja automatically generates OpenAPI documentation.

### Customize API Metadata

```python
# api/api.py
from ninja import NinjaAPI

api = NinjaAPI(
    title="Product API",
    version="2.0.0",
    description="A REST API for managing products",
    docs_url="/docs",
    openapi_url="/openapi.json"
)
```

### Document Endpoints

```python
@api.get(
    "/products",
    response=List[ProductSchema],
    tags=["Products"],
    summary="List all products",
    description="Retrieve a list of products with optional filtering."
)
def list_products(request, category: str = None):
    """
    List products with filtering options.
    - **category**: Filter by product category
    """
    return Product.objects.filter(category=category) if category else Product.objects.all()
```

### Group Endpoints with Routers

```python
# api/routers/products.py
from ninja import Router
from typing import List

router = Router(tags=["Products"])

@router.get("/", response=List[ProductSchema])
def list_products(request):
    return Product.objects.all()

@router.post("/", response=ProductSchema)
def create_product(request, payload: ProductCreate):
    return Product.objects.create(**payload.dict())
```

```python
# api/api.py
from ninja import NinjaAPI
from .routers import products, users

api = NinjaAPI(title="My API", version="1.0.0")
api.add_router("/products", products.router)
api.add_router("/users", users.router)
```

---

## Testing

```python
# api/tests.py
from django.test import TestCase
from ninja.testing import TestClient
from .api import api
from .models import Product

class ProductAPITest(TestCase):
    def setUp(self):
        self.client = TestClient(api)
        self.product = Product.objects.create(
            name="Test Product", price=99.99, category="Electronics"
        )

    def test_list_products(self):
        response = self.client.get("/products")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_get_product(self):
        response = self.client.get(f"/products/{self.product.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Test Product")

    def test_create_product(self):
        response = self.client.post("/products", json={
            "name": "New Product", "price": "49.99", "category": "Books", "quantity": 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Product.objects.filter(name="New Product").exists())

    def test_delete_product(self):
        response = self.client.delete(f"/products/{self.product.id}")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Product.objects.filter(id=self.product.id).exists())
```

```bash
# Run tests
python manage.py test api

# Run with coverage
pip install coverage
coverage run manage.py test api
coverage report -m
```

---

## Best Practices

### 1. Project Structure

```
myproject/
    api/
        api.py              # Main API instance
        models.py           # Django models
        schemas.py          # Pydantic schemas
        auth.py             # Authentication
        routers/
            products.py
            users.py
        tests/
            test_products.py
```

### 2. Separate Business Logic

```python
# api/services/product_service.py
class ProductService:
    @staticmethod
    def create(data):
        return Product.objects.create(**data.dict())

    @staticmethod
    def update(product, data):
        for attr, value in data.dict(exclude_unset=True).items():
            setattr(product, attr, value)
        product.save()
        return product
```

### 3. Use Environment Variables

```python
# settings.py
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
API_KEY = os.environ.get('API_KEY')
```

---

## Conclusion

Django Ninja provides a modern, fast approach to building REST APIs with Django. Key takeaways:

- **Type hints** provide validation and documentation automatically
- **Pydantic schemas** ensure data integrity
- **OpenAPI documentation** is generated for free
- **Authentication** integrates seamlessly with Django
- **Routers** keep your code organized

Start with simple endpoints, add schemas for validation, and grow your API with routers as it scales.

---

*Need to monitor your Django Ninja APIs in production? [OneUptime](https://oneuptime.com) provides API monitoring, error tracking, and alerting to keep your services reliable.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting)
- [Python Health Checks for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes)
