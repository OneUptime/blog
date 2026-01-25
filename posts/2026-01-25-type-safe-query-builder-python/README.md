# How to Build a Type-Safe Query Builder in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Query Builder, Type Safety, SQL, Database, Design Patterns, SQLAlchemy

Description: Learn how to build a type-safe query builder in Python that catches errors at development time instead of runtime. This guide covers fluent interfaces, generics, and practical patterns for safe SQL construction.

---

> Raw SQL strings are error-prone. You concatenate strings, forget quotes, introduce SQL injection, and only find out when your query fails in production. A type-safe query builder catches these mistakes before your code even runs.

Building a query builder in Python requires balancing flexibility with type safety. Python's type hints, combined with dataclasses and generics, let you create fluent APIs that your IDE can validate as you type.

---

## Why Build a Type-Safe Query Builder?

String-based SQL has several problems:

```python
# Problems with raw SQL strings
query = "SELECT * FROM users WHERE status = " + status  # SQL injection
query = f"SELECT * FROM users WHERE age > {age} AND name = {name}"  # Missing quotes
query = "SELECT * FROM users WERE status = 'active'"  # Typo in WHERE
```

A type-safe query builder prevents these issues by:
- Validating column names against a schema
- Automatically handling parameter escaping
- Providing IDE autocomplete for columns and operators
- Catching typos at development time

---

## Basic Query Builder Structure

Let's start with a simple foundation. The query builder uses method chaining to construct queries piece by piece:

```python
# query_builder.py
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar, List, Optional, Tuple
from enum import Enum, auto

class Operator(Enum):
    """SQL comparison operators"""
    EQ = "="
    NE = "!="
    GT = ">"
    GTE = ">="
    LT = "<"
    LTE = "<="
    LIKE = "LIKE"
    IN = "IN"
    IS_NULL = "IS NULL"
    IS_NOT_NULL = "IS NOT NULL"


@dataclass
class Condition:
    """Represents a WHERE condition"""
    column: str
    operator: Operator
    value: Any = None

    def to_sql(self, param_index: int) -> Tuple[str, List[Any]]:
        """Convert condition to SQL with parameter placeholder"""
        if self.operator == Operator.IS_NULL:
            return f"{self.column} IS NULL", []
        if self.operator == Operator.IS_NOT_NULL:
            return f"{self.column} IS NOT NULL", []
        if self.operator == Operator.IN:
            # Create placeholders for each value in the list
            placeholders = ", ".join([f"${param_index + i}" for i in range(len(self.value))])
            return f"{self.column} IN ({placeholders})", list(self.value)

        return f"{self.column} {self.operator.value} ${param_index}", [self.value]


@dataclass
class OrderBy:
    """Represents an ORDER BY clause"""
    column: str
    descending: bool = False

    def to_sql(self) -> str:
        direction = "DESC" if self.descending else "ASC"
        return f"{self.column} {direction}"
```

---

## Building the Fluent Interface

The fluent interface enables method chaining. Each method returns `self` so you can chain calls:

```python
# query_builder.py (continued)
from typing import Set

@dataclass
class SelectQuery:
    """Type-safe SELECT query builder"""

    _table: str = ""
    _columns: List[str] = field(default_factory=list)
    _conditions: List[Condition] = field(default_factory=list)
    _order_by: List[OrderBy] = field(default_factory=list)
    _limit: Optional[int] = None
    _offset: Optional[int] = None
    _valid_columns: Set[str] = field(default_factory=set)

    def table(self, name: str, valid_columns: Set[str] = None) -> "SelectQuery":
        """Set the table to query from"""
        self._table = name
        if valid_columns:
            self._valid_columns = valid_columns
        return self

    def _validate_column(self, column: str) -> None:
        """Validate column name against schema"""
        if self._valid_columns and column not in self._valid_columns:
            raise ValueError(
                f"Unknown column '{column}'. Valid columns: {self._valid_columns}"
            )

    def select(self, *columns: str) -> "SelectQuery":
        """Specify columns to select"""
        for col in columns:
            self._validate_column(col)
        self._columns = list(columns) if columns else ["*"]
        return self

    def where(self, column: str, operator: Operator, value: Any = None) -> "SelectQuery":
        """Add a WHERE condition"""
        self._validate_column(column)
        self._conditions.append(Condition(column, operator, value))
        return self

    def where_eq(self, column: str, value: Any) -> "SelectQuery":
        """Shorthand for WHERE column = value"""
        return self.where(column, Operator.EQ, value)

    def where_in(self, column: str, values: List[Any]) -> "SelectQuery":
        """Shorthand for WHERE column IN (values)"""
        return self.where(column, Operator.IN, values)

    def order_by(self, column: str, descending: bool = False) -> "SelectQuery":
        """Add ORDER BY clause"""
        self._validate_column(column)
        self._order_by.append(OrderBy(column, descending))
        return self

    def limit(self, count: int) -> "SelectQuery":
        """Set LIMIT clause"""
        self._limit = count
        return self

    def offset(self, count: int) -> "SelectQuery":
        """Set OFFSET clause"""
        self._offset = count
        return self

    def build(self) -> Tuple[str, List[Any]]:
        """Build the final SQL query and parameters"""
        if not self._table:
            raise ValueError("Table name is required")

        # Build SELECT clause
        columns = ", ".join(self._columns) if self._columns else "*"
        sql = f"SELECT {columns} FROM {self._table}"
        params: List[Any] = []

        # Build WHERE clause
        if self._conditions:
            where_parts = []
            param_index = 1
            for condition in self._conditions:
                condition_sql, condition_params = condition.to_sql(param_index)
                where_parts.append(condition_sql)
                params.extend(condition_params)
                param_index += len(condition_params)
            sql += " WHERE " + " AND ".join(where_parts)

        # Build ORDER BY clause
        if self._order_by:
            order_parts = [ob.to_sql() for ob in self._order_by]
            sql += " ORDER BY " + ", ".join(order_parts)

        # Build LIMIT and OFFSET
        if self._limit is not None:
            sql += f" LIMIT {self._limit}"
        if self._offset is not None:
            sql += f" OFFSET {self._offset}"

        return sql, params


# Usage example
query = (
    SelectQuery()
    .table("users", {"id", "name", "email", "status", "created_at"})
    .select("id", "name", "email")
    .where_eq("status", "active")
    .where(column="created_at", operator=Operator.GTE, value="2024-01-01")
    .order_by("created_at", descending=True)
    .limit(10)
)

sql, params = query.build()
print(sql)
# SELECT id, name, email FROM users WHERE status = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT 10
print(params)
# ['active', '2024-01-01']
```

---

## Adding Generic Type Support

To get IDE autocomplete for column names, we can use TypedDict and generics:

```python
# typed_query_builder.py
from typing import TypedDict, Generic, TypeVar, get_type_hints, Type
from dataclasses import dataclass, field

# Define table schema as TypedDict
class UserSchema(TypedDict):
    id: int
    name: str
    email: str
    status: str
    created_at: str


T = TypeVar("T", bound=TypedDict)


@dataclass
class TypedSelectQuery(Generic[T]):
    """Query builder with schema type validation"""

    _schema: Type[T] = None
    _table: str = ""
    _columns: List[str] = field(default_factory=list)
    _conditions: List[Condition] = field(default_factory=list)
    _order_by: List[OrderBy] = field(default_factory=list)
    _limit: Optional[int] = None
    _offset: Optional[int] = None

    @classmethod
    def for_table(cls, table: str, schema: Type[T]) -> "TypedSelectQuery[T]":
        """Create a query builder for a specific table and schema"""
        query = cls()
        query._table = table
        query._schema = schema
        return query

    def _get_valid_columns(self) -> Set[str]:
        """Extract valid column names from schema"""
        if self._schema is None:
            return set()
        return set(get_type_hints(self._schema).keys())

    def _validate_column(self, column: str) -> None:
        """Validate column exists in schema"""
        valid = self._get_valid_columns()
        if valid and column not in valid:
            raise ValueError(f"Column '{column}' not in schema. Valid: {valid}")

    def select(self, *columns: str) -> "TypedSelectQuery[T]":
        """Select specific columns"""
        for col in columns:
            self._validate_column(col)
        self._columns = list(columns)
        return self

    def where(self, column: str, operator: Operator, value: Any = None) -> "TypedSelectQuery[T]":
        """Add WHERE condition with validation"""
        self._validate_column(column)
        self._conditions.append(Condition(column, operator, value))
        return self

    def where_eq(self, column: str, value: Any) -> "TypedSelectQuery[T]":
        """WHERE column = value"""
        return self.where(column, Operator.EQ, value)

    def order_by(self, column: str, descending: bool = False) -> "TypedSelectQuery[T]":
        """Add ORDER BY"""
        self._validate_column(column)
        self._order_by.append(OrderBy(column, descending))
        return self

    def limit(self, count: int) -> "TypedSelectQuery[T]":
        """Set LIMIT"""
        self._limit = count
        return self

    def offset(self, count: int) -> "TypedSelectQuery[T]":
        """Set OFFSET"""
        self._offset = count
        return self

    def build(self) -> Tuple[str, List[Any]]:
        """Build SQL query"""
        columns = ", ".join(self._columns) if self._columns else "*"
        sql = f"SELECT {columns} FROM {self._table}"
        params: List[Any] = []

        if self._conditions:
            where_parts = []
            param_index = 1
            for condition in self._conditions:
                condition_sql, condition_params = condition.to_sql(param_index)
                where_parts.append(condition_sql)
                params.extend(condition_params)
                param_index += len(condition_params)
            sql += " WHERE " + " AND ".join(where_parts)

        if self._order_by:
            order_parts = [ob.to_sql() for ob in self._order_by]
            sql += " ORDER BY " + ", ".join(order_parts)

        if self._limit is not None:
            sql += f" LIMIT {self._limit}"
        if self._offset is not None:
            sql += f" OFFSET {self._offset}"

        return sql, params


# Usage with type safety
query = (
    TypedSelectQuery.for_table("users", UserSchema)
    .select("id", "name", "email")
    .where_eq("status", "active")
    .order_by("created_at", descending=True)
    .limit(10)
)

# This will raise ValueError at runtime:
# query.select("invalid_column")  # Column 'invalid_column' not in schema
```

---

## INSERT, UPDATE, and DELETE Builders

A complete query builder needs more than SELECT:

```python
# mutation_builders.py
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple, Set, Optional


@dataclass
class InsertQuery:
    """Type-safe INSERT query builder"""

    _table: str = ""
    _columns: List[str] = field(default_factory=list)
    _values: List[Any] = field(default_factory=list)
    _returning: List[str] = field(default_factory=list)
    _valid_columns: Set[str] = field(default_factory=set)

    def into(self, table: str, valid_columns: Set[str] = None) -> "InsertQuery":
        """Set target table"""
        self._table = table
        if valid_columns:
            self._valid_columns = valid_columns
        return self

    def values(self, **kwargs) -> "InsertQuery":
        """Set column values as keyword arguments"""
        for col in kwargs.keys():
            if self._valid_columns and col not in self._valid_columns:
                raise ValueError(f"Unknown column: {col}")
        self._columns = list(kwargs.keys())
        self._values = list(kwargs.values())
        return self

    def returning(self, *columns: str) -> "InsertQuery":
        """Add RETURNING clause (PostgreSQL)"""
        self._returning = list(columns)
        return self

    def build(self) -> Tuple[str, List[Any]]:
        """Build INSERT query"""
        if not self._table or not self._columns:
            raise ValueError("Table and values are required")

        columns = ", ".join(self._columns)
        placeholders = ", ".join([f"${i+1}" for i in range(len(self._values))])

        sql = f"INSERT INTO {self._table} ({columns}) VALUES ({placeholders})"

        if self._returning:
            sql += " RETURNING " + ", ".join(self._returning)

        return sql, self._values


@dataclass
class UpdateQuery:
    """Type-safe UPDATE query builder"""

    _table: str = ""
    _set_values: Dict[str, Any] = field(default_factory=dict)
    _conditions: List[Condition] = field(default_factory=list)
    _valid_columns: Set[str] = field(default_factory=set)

    def table(self, name: str, valid_columns: Set[str] = None) -> "UpdateQuery":
        """Set target table"""
        self._table = name
        if valid_columns:
            self._valid_columns = valid_columns
        return self

    def set(self, **kwargs) -> "UpdateQuery":
        """Set column values to update"""
        for col in kwargs.keys():
            if self._valid_columns and col not in self._valid_columns:
                raise ValueError(f"Unknown column: {col}")
        self._set_values.update(kwargs)
        return self

    def where(self, column: str, operator: Operator, value: Any = None) -> "UpdateQuery":
        """Add WHERE condition"""
        if self._valid_columns and column not in self._valid_columns:
            raise ValueError(f"Unknown column: {column}")
        self._conditions.append(Condition(column, operator, value))
        return self

    def where_eq(self, column: str, value: Any) -> "UpdateQuery":
        """WHERE column = value"""
        return self.where(column, Operator.EQ, value)

    def build(self) -> Tuple[str, List[Any]]:
        """Build UPDATE query"""
        if not self._table or not self._set_values:
            raise ValueError("Table and SET values are required")

        params: List[Any] = []
        param_index = 1

        # Build SET clause
        set_parts = []
        for col, val in self._set_values.items():
            set_parts.append(f"{col} = ${param_index}")
            params.append(val)
            param_index += 1

        sql = f"UPDATE {self._table} SET " + ", ".join(set_parts)

        # Build WHERE clause
        if self._conditions:
            where_parts = []
            for condition in self._conditions:
                condition_sql, condition_params = condition.to_sql(param_index)
                where_parts.append(condition_sql)
                params.extend(condition_params)
                param_index += len(condition_params)
            sql += " WHERE " + " AND ".join(where_parts)

        return sql, params


@dataclass
class DeleteQuery:
    """Type-safe DELETE query builder"""

    _table: str = ""
    _conditions: List[Condition] = field(default_factory=list)
    _valid_columns: Set[str] = field(default_factory=set)

    def from_table(self, name: str, valid_columns: Set[str] = None) -> "DeleteQuery":
        """Set target table"""
        self._table = name
        if valid_columns:
            self._valid_columns = valid_columns
        return self

    def where(self, column: str, operator: Operator, value: Any = None) -> "DeleteQuery":
        """Add WHERE condition"""
        if self._valid_columns and column not in self._valid_columns:
            raise ValueError(f"Unknown column: {column}")
        self._conditions.append(Condition(column, operator, value))
        return self

    def where_eq(self, column: str, value: Any) -> "DeleteQuery":
        """WHERE column = value"""
        return self.where(column, Operator.EQ, value)

    def build(self) -> Tuple[str, List[Any]]:
        """Build DELETE query"""
        if not self._table:
            raise ValueError("Table is required")
        if not self._conditions:
            raise ValueError("DELETE requires at least one WHERE condition for safety")

        sql = f"DELETE FROM {self._table}"
        params: List[Any] = []

        where_parts = []
        param_index = 1
        for condition in self._conditions:
            condition_sql, condition_params = condition.to_sql(param_index)
            where_parts.append(condition_sql)
            params.extend(condition_params)
            param_index += len(condition_params)

        sql += " WHERE " + " AND ".join(where_parts)

        return sql, params


# Usage examples
# INSERT
insert = (
    InsertQuery()
    .into("users", {"id", "name", "email", "status"})
    .values(name="John Doe", email="john@example.com", status="active")
    .returning("id")
)
sql, params = insert.build()
# INSERT INTO users (name, email, status) VALUES ($1, $2, $3) RETURNING id

# UPDATE
update = (
    UpdateQuery()
    .table("users", {"id", "name", "email", "status"})
    .set(status="inactive", email="newemail@example.com")
    .where_eq("id", 123)
)
sql, params = update.build()
# UPDATE users SET status = $1, email = $2 WHERE id = $3

# DELETE
delete = (
    DeleteQuery()
    .from_table("users", {"id", "name", "email", "status"})
    .where_eq("status", "deleted")
)
sql, params = delete.build()
# DELETE FROM users WHERE status = $1
```

---

## Integration with asyncpg

Here is how to use the query builder with asyncpg for actual database operations:

```python
# db_integration.py
import asyncpg
from typing import List, Dict, Any, Optional

class Database:
    """Database wrapper using the type-safe query builder"""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def select(self, query: SelectQuery) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as dictionaries"""
        sql, params = query.build()
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)
            return [dict(row) for row in rows]

    async def select_one(self, query: SelectQuery) -> Optional[Dict[str, Any]]:
        """Execute a SELECT query and return first result"""
        sql, params = query.build()
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(sql, *params)
            return dict(row) if row else None

    async def insert(self, query: InsertQuery) -> Optional[Any]:
        """Execute an INSERT query and return the RETURNING value"""
        sql, params = query.build()
        async with self.pool.acquire() as conn:
            return await conn.fetchval(sql, *params)

    async def update(self, query: UpdateQuery) -> int:
        """Execute an UPDATE query and return affected row count"""
        sql, params = query.build()
        async with self.pool.acquire() as conn:
            result = await conn.execute(sql, *params)
            # Parse "UPDATE N" to get count
            return int(result.split()[-1])

    async def delete(self, query: DeleteQuery) -> int:
        """Execute a DELETE query and return affected row count"""
        sql, params = query.build()
        async with self.pool.acquire() as conn:
            result = await conn.execute(sql, *params)
            return int(result.split()[-1])


# Example usage
async def example():
    pool = await asyncpg.create_pool("postgresql://localhost/mydb")
    db = Database(pool)

    # Define valid columns for the users table
    user_columns = {"id", "name", "email", "status", "created_at"}

    # Select active users
    users = await db.select(
        SelectQuery()
        .table("users", user_columns)
        .select("id", "name", "email")
        .where_eq("status", "active")
        .order_by("created_at", descending=True)
        .limit(10)
    )

    # Insert a new user
    user_id = await db.insert(
        InsertQuery()
        .into("users", user_columns)
        .values(name="Jane Doe", email="jane@example.com", status="active")
        .returning("id")
    )

    # Update user status
    affected = await db.update(
        UpdateQuery()
        .table("users", user_columns)
        .set(status="verified")
        .where_eq("id", user_id)
    )

    await pool.close()
```

---

## Best Practices

**1. Define schemas centrally:**
```python
# schemas.py
USER_COLUMNS = {"id", "name", "email", "status", "created_at"}
ORDER_COLUMNS = {"id", "user_id", "total", "status", "created_at"}
```

**2. Create table-specific query helpers:**
```python
def users_query() -> SelectQuery:
    return SelectQuery().table("users", USER_COLUMNS)

def orders_query() -> SelectQuery:
    return SelectQuery().table("orders", ORDER_COLUMNS)
```

**3. Add query logging for debugging:**
```python
def build_with_log(query) -> Tuple[str, List[Any]]:
    sql, params = query.build()
    logger.debug(f"SQL: {sql}, Params: {params}")
    return sql, params
```

---

## Conclusion

A type-safe query builder provides several advantages over raw SQL strings:

- **Validation at development time**: Catch typos and invalid columns before running queries
- **IDE support**: Get autocomplete for column names and methods
- **SQL injection prevention**: Parameters are always properly escaped
- **Composability**: Build complex queries by chaining simple methods
- **Testability**: Each builder method can be unit tested independently

The patterns shown here work well for simple to moderately complex queries. For very complex queries with subqueries, CTEs, or window functions, consider using SQLAlchemy's expression language or writing raw SQL with careful validation.

---

*Need to monitor your database query performance? [OneUptime](https://oneuptime.com) provides query tracing, slow query detection, and database monitoring to help you optimize your application.*

**Related Reading:**
- [How to Implement Connection Pooling in Python for PostgreSQL](https://oneuptime.com/blog/post/2025-01-06-python-connection-pooling-postgresql/view)
