# Validation Summary: How to Use MongoDB with GraphQL (Strawberry for Python)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- GraphQL
- Strawberry (Python GraphQL library)
- Motor (async MongoDB driver for Python)
- FastAPI
- python-dotenv
- PyMongo (bson module)

## Sources Consulted
- Strawberry GraphQL official documentation: https://strawberry.rocks/docs
- Motor official documentation: https://motor.readthedocs.io/en/stable/
- FastAPI official documentation: https://fastapi.tiangolo.com/
- Python `types` standard library module documentation: https://docs.python.org/3/library/types.html
- python-dotenv documentation: https://saurabh-kumar.com/python-dotenv/

## Issues Found

1. **Module naming conflict: `types.py` shadows Python standard library**
   - **What was wrong:** The types file was named `types.py`, which shadows Python's built-in `types` module. Libraries like Strawberry, Pydantic, and FastAPI internally import from the standard library `types` module (e.g., `from types import NoneType`, `UnionType`). A local `types.py` would intercept those imports and cause runtime `ImportError` or `AttributeError` crashes.
   - **What was changed:** Renamed the file from `types.py` to `models.py` in the file comment header, and updated all import statements (`from types import ...` to `from models import ...`) in both `resolvers.py` and `main.py` code blocks.
   - **Why:** This is a well-known Python pitfall. Naming a local module the same as a standard library module causes import shadowing that breaks third-party dependencies at runtime.

2. **`python-dotenv` installed but never used**
   - **What was wrong:** The installation command includes `python-dotenv`, but `db.py` never called `load_dotenv()`, so `.env` files would not actually be loaded. The `os.getenv()` call would only read from actual environment variables, not from a `.env` file.
   - **What was changed:** Added `from dotenv import load_dotenv` and a `load_dotenv()` call to `db.py` before `os.getenv()` is used.
   - **Why:** Without this call, installing `python-dotenv` serves no purpose and readers following the tutorial would be confused when their `.env` file is ignored.

## Review Notes
- The code uses `input` as a parameter name in `create_product()`, which shadows the Python built-in `input()` function. This works fine but is a minor style concern; not changed since it's idiomatic in GraphQL resolver patterns.
- The Strawberry `@strawberry.field(default_factory=list)` usage on input types is correct and current.
- Motor's async cursor iteration with `async for` is correctly demonstrated.
- The GraphQL mutation example correctly shows Strawberry's automatic snake_case to camelCase conversion (`create_product` becomes `createProduct`).
- All pip package names and uvicorn command syntax are correct.
