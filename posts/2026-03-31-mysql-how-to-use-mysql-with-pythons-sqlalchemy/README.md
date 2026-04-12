# How to Use MySQL with Python's SQLAlchemy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Python, SQLAlchemy, ORM, Database Integration

Description: Learn how to connect to MySQL using SQLAlchemy in Python, from raw SQL execution to ORM-based model definitions and queries.

---

## What is SQLAlchemy

SQLAlchemy is the most widely used Python SQL toolkit and ORM (Object-Relational Mapper). It supports two programming paradigms:

- **Core**: SQL expression language and direct engine usage
- **ORM**: Map Python classes to database tables

## Installation

```bash
pip install sqlalchemy pymysql
# or use mysqlclient for better performance:
pip install sqlalchemy mysqlclient
```

## Connecting to MySQL

```python
from sqlalchemy import create_engine, text

# Using pymysql
engine = create_engine(
    "mysql+pymysql://user:password@localhost:3306/your_database",
    echo=True  # Log SQL statements
)

# Using mysqlclient (faster C extension)
engine = create_engine(
    "mysql+mysqldb://user:password@localhost:3306/your_database"
)

# Test connection
with engine.connect() as conn:
    result = conn.execute(text("SELECT VERSION()"))
    print(result.fetchone())
```

## Defining Models with ORM

```python
from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import DeclarativeBase, Session
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100))
    salary = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Employee(id={self.id}, name={self.name})>"

# Create tables
Base.metadata.create_all(engine)
```

## Inserting Records

```python
with Session(engine) as session:
    emp1 = Employee(name="Alice Smith", department="Engineering", salary=95000.00)
    emp2 = Employee(name="Bob Jones", department="Marketing", salary=72000.00)

    session.add(emp1)
    session.add_all([emp2])
    session.commit()

    print(f"New employee ID: {emp1.id}")
```

## Querying Records

```python
from sqlalchemy import select

with Session(engine) as session:
    # Get all employees
    stmt = select(Employee)
    employees = session.scalars(stmt).all()
    for emp in employees:
        print(emp)

    # Filter by department
    stmt = select(Employee).where(Employee.department == "Engineering")
    engineers = session.scalars(stmt).all()

    # Get by primary key
    emp = session.get(Employee, 1)
    print(emp.name)

    # Order and limit
    stmt = select(Employee).order_by(Employee.salary.desc()).limit(5)
    top_earners = session.scalars(stmt).all()
```

## Updating Records

```python
with Session(engine) as session:
    emp = session.get(Employee, 1)
    emp.salary = 105000.00
    session.commit()

    # Bulk update
    from sqlalchemy import update
    stmt = update(Employee).where(Employee.department == "HR").values(salary=70000.00)
    session.execute(stmt)
    session.commit()
```

## Deleting Records

```python
with Session(engine) as session:
    emp = session.get(Employee, 1)
    session.delete(emp)
    session.commit()

    # Bulk delete
    from sqlalchemy import delete
    stmt = delete(Employee).where(Employee.department == "Temp")
    session.execute(stmt)
    session.commit()
```

## Raw SQL with Core

```python
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(
        text("SELECT name, salary FROM employees WHERE salary > :min_sal"),
        {"min_sal": 80000}
    )
    for row in result:
        print(row.name, row.salary)
```

## Connection Pooling Configuration

```python
engine = create_engine(
    "mysql+pymysql://user:password@localhost/your_database",
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_pre_ping=True  # Test connection before use
)
```

## Summary

SQLAlchemy provides both ORM and Core interfaces for MySQL. The ORM maps Python classes to tables enabling Pythonic queries, while the Core layer gives fine-grained SQL control. Use `Session` for ORM operations with automatic transaction management, configure `pool_pre_ping=True` to handle dropped connections, and parameterize queries with `:name` placeholders in raw SQL.
