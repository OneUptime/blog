# How to Implement Database Migrations with Alembic and Azure SQL Database in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alembic, Azure SQL, Python, Database Migrations, SQLAlchemy, DevOps, Schema

Description: Manage database schema changes with Alembic migrations against Azure SQL Database in Python for version-controlled schema evolution.

---

Database schema changes need to be versioned, repeatable, and reversible. Making ad-hoc ALTER TABLE statements against a production database is how you end up with schema drift between environments and late-night debugging sessions. Alembic, the migration tool built for SQLAlchemy, brings structure to schema changes. Each migration is a Python script with an upgrade function and a downgrade function. You run them forward to evolve the schema and backward to revert. Combined with Azure SQL Database, you get a managed database with migration history tracked in version control.

This guide covers setting up Alembic, writing migrations, and running them against Azure SQL Database in a Python project.

## Prerequisites

- Python 3.11 or later
- An Azure SQL Database
- Azure CLI installed
- Basic SQLAlchemy knowledge

## Setting Up Azure SQL Database

```bash
# Create resources
az group create --name alembic-demo-rg --location eastus

az sql server create \
  --name alembic-sql-server \
  --resource-group alembic-demo-rg \
  --location eastus \
  --admin-user sqladmin \
  --admin-password SecureP@ss123!

az sql db create \
  --name AlembicDemo \
  --resource-group alembic-demo-rg \
  --server alembic-sql-server \
  --edition Basic

# Allow your IP
az sql server firewall-rule create \
  --resource-group alembic-demo-rg \
  --server alembic-sql-server \
  --name dev-access \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255
```

## Project Setup

```bash
# Create the project
mkdir alembic-azure-demo && cd alembic-azure-demo
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install sqlalchemy alembic pyodbc python-dotenv
```

Create a `.env` file with the connection string:

```env
# Azure SQL connection string for SQLAlchemy
DATABASE_URL=mssql+pyodbc://sqladmin:SecureP%40ss123!@alembic-sql-server.database.windows.net:1433/AlembicDemo?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no
```

## Defining the SQLAlchemy Models

```python
# app/models.py - SQLAlchemy models
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass


class Customer(Base):
    """Customer entity."""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    company = Column(String(200))
    phone = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    orders = relationship("Order", back_populates="customer")


class Product(Base):
    """Product entity."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(50), nullable=False, unique=True)
    price = Column(Float, nullable=False)
    description = Column(Text)
    stock_quantity = Column(Integer, default=0)
    category = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Order(Base):
    """Order entity."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    total_amount = Column(Float, default=0)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    """Order line item entity."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
```

## Initializing Alembic

```bash
# Initialize Alembic in the project
alembic init alembic
```

This creates an `alembic` directory and an `alembic.ini` file. Configure Alembic to use your models and database URL.

Edit `alembic/env.py` to import your models and read the database URL from environment variables:

```python
# alembic/env.py - Alembic environment configuration
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import your models so Alembic can detect changes
from app.models import Base

# Alembic Config object
config = context.config

# Override the database URL from environment variable
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

# Set up logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This generates SQL scripts without connecting to the database.
    Useful for reviewing changes before applying them.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates a database connection and applies migrations directly.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Compare types to detect column type changes
            compare_type=True,
            # Compare server defaults
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

## Creating Migrations

Generate the initial migration from your models:

```bash
# Auto-generate the initial migration
alembic revision --autogenerate -m "create initial tables"
```

This creates a migration file in `alembic/versions/`. Here is what a typical generated migration looks like:

```python
# alembic/versions/xxxx_create_initial_tables.py - Auto-generated migration
"""create initial tables

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-02-16 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create customers table
    op.create_table(
        'customers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=False),
        sa.Column('company', sa.String(length=200), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )

    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('sku', sa.String(length=50), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('stock_quantity', sa.Integer(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sku'),
    )

    # Create indexes for frequently queried columns
    op.create_index('ix_products_category', 'products', ['category'])
    op.create_index('ix_products_sku', 'products', ['sku'])


def downgrade() -> None:
    op.drop_index('ix_products_sku', table_name='products')
    op.drop_index('ix_products_category', table_name='products')
    op.drop_table('products')
    op.drop_table('customers')
```

## Applying Migrations

```bash
# Apply all pending migrations to Azure SQL
alembic upgrade head

# Check current migration status
alembic current

# View migration history
alembic history --verbose
```

## Writing Manual Migrations

Sometimes auto-generation does not capture what you need. Here is how to write data migrations manually:

```python
# alembic/versions/xxxx_add_customer_tier.py - Manual migration with data changes
"""add customer tier column and populate defaults

Revision ID: b2c3d4e5f6g7
"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'


def upgrade() -> None:
    # Add the new column with a default value
    op.add_column('customers', sa.Column('tier', sa.String(50), server_default='basic'))

    # Update existing customers based on their order history
    op.execute("""
        UPDATE customers SET tier = 'premium'
        WHERE id IN (
            SELECT customer_id FROM orders
            GROUP BY customer_id
            HAVING SUM(total_amount) > 1000
        )
    """)

    # Add an index on the new column
    op.create_index('ix_customers_tier', 'customers', ['tier'])


def downgrade() -> None:
    op.drop_index('ix_customers_tier', table_name='customers')
    op.drop_column('customers', 'tier')
```

## CI/CD Integration

Add Alembic migrations to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml - CI/CD with Alembic migrations
name: Deploy with Migrations

on:
  push:
    branches: [main]

jobs:
  migrate-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install ODBC Driver
        run: |
          sudo apt-get update
          sudo ACCEPT_EULA=Y apt-get install -y msodbcsql18

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          alembic upgrade head

      - name: Deploy application
        run: |
          # Your deployment steps here
          echo "Deploying application..."
```

## Generating SQL Scripts

For environments where you cannot run Python directly, generate SQL scripts:

```bash
# Generate SQL for all pending migrations
alembic upgrade head --sql > migration.sql

# Generate SQL for a specific migration range
alembic upgrade a1b2c3:b2c3d4 --sql > specific_migration.sql
```

## Wrapping Up

Alembic brings discipline to database schema management in Python projects. Every change is tracked in version control, every migration has an upgrade and downgrade path, and the auto-generation feature catches most schema differences automatically. Running Alembic against Azure SQL Database works the same as running it against a local database - the connection string is the only difference. Integrating it into your CI/CD pipeline ensures that schema changes are applied consistently across environments, and generating SQL scripts gives your DBA team visibility into what changes are coming. For any Python project backed by a relational database, Alembic is worth the small upfront investment.
