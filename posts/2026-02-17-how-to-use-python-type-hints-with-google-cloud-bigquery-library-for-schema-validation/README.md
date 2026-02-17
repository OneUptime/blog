# How to Use Python Type Hints with the google-cloud-bigquery Library for Schema Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Python, Type Hints, Data Validation

Description: Learn how to use Python type hints and dataclasses with the google-cloud-bigquery library to validate data schemas before loading into BigQuery.

---

Schema mismatches between your Python code and BigQuery tables are a common source of data pipeline failures. A field that should be an integer gets loaded as a string, a required column is missing, or a date format does not match what BigQuery expects. Using Python type hints with dataclasses, you can validate your data before it ever reaches BigQuery, catching errors early instead of dealing with load job failures.

## The Problem

Without validation, schema errors surface late in the pipeline.

```python
from google.cloud import bigquery

client = bigquery.Client()

# This will fail if the data doesn't match the table schema
rows = [
    {"user_id": "123", "score": "not_a_number", "created_at": "invalid-date"},
]

errors = client.insert_rows_json("my-project.dataset.table", rows)
if errors:
    # You find out about the mismatch only after trying to insert
    print(f"Insert errors: {errors}")
```

Let me show you how to catch these issues before they reach BigQuery.

## Defining Schemas with Dataclasses

Python dataclasses with type hints serve as both documentation and validation schemas.

```python
# schemas.py - Define your BigQuery table schemas as dataclasses
from dataclasses import dataclass, field, asdict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

@dataclass
class UserEvent:
    """Schema for the user_events BigQuery table."""
    event_id: str
    user_id: str
    event_type: str
    timestamp: datetime
    properties: dict
    session_id: Optional[str] = None
    duration_ms: Optional[int] = None
    page_path: Optional[str] = None

@dataclass
class OrderRecord:
    """Schema for the orders BigQuery table."""
    order_id: str
    customer_id: str
    order_date: date
    total_amount: Decimal
    currency: str
    items_count: int
    status: str
    shipping_address: Optional[str] = None
    notes: Optional[str] = None

@dataclass
class MetricRecord:
    """Schema for the metrics BigQuery table."""
    metric_name: str
    value: float
    timestamp: datetime
    tags: dict
    host: str
    region: Optional[str] = None
```

## Building a Schema Validator

Create a validator that checks data against your dataclass schemas before sending to BigQuery.

```python
# validator.py - Validate data against dataclass schemas
from dataclasses import fields as dataclass_fields
from typing import get_type_hints, get_origin, get_args, Union
from datetime import datetime, date
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class SchemaValidationError(Exception):
    """Raised when data does not match the expected schema."""
    def __init__(self, errors):
        self.errors = errors
        super().__init__(f"Schema validation failed: {errors}")

class SchemaValidator:
    """Validate dictionaries against dataclass schemas."""

    # Map Python types to BigQuery types for reference
    TYPE_MAP = {
        str: "STRING",
        int: "INTEGER",
        float: "FLOAT",
        bool: "BOOLEAN",
        datetime: "TIMESTAMP",
        date: "DATE",
        Decimal: "NUMERIC",
        dict: "JSON",
        list: "REPEATED",
        bytes: "BYTES",
    }

    def validate(self, data, schema_class):
        """Validate a dictionary against a dataclass schema.

        Returns the validated and converted data as a dict.
        Raises SchemaValidationError if validation fails.
        """
        errors = []
        validated = {}

        # Get all fields from the dataclass
        hints = get_type_hints(schema_class)
        dc_fields = {f.name: f for f in dataclass_fields(schema_class)}

        # Check for required fields
        for field_name, field_obj in dc_fields.items():
            field_type = hints[field_name]
            is_optional = self._is_optional(field_type)
            has_default = field_obj.default is not field_obj.default_factory

            if field_name not in data:
                if not is_optional and not has_default:
                    errors.append(f"Missing required field: {field_name}")
                continue

            value = data[field_name]

            # Allow None for optional fields
            if value is None and is_optional:
                validated[field_name] = None
                continue

            # Validate and convert the value
            try:
                validated[field_name] = self._validate_field(
                    field_name, value, field_type
                )
            except (TypeError, ValueError) as e:
                errors.append(f"Field '{field_name}': {str(e)}")

        # Check for unexpected fields
        expected_fields = set(dc_fields.keys())
        actual_fields = set(data.keys())
        extra_fields = actual_fields - expected_fields
        if extra_fields:
            errors.append(f"Unexpected fields: {extra_fields}")

        if errors:
            raise SchemaValidationError(errors)

        return validated

    def _is_optional(self, type_hint):
        """Check if a type hint is Optional (Union with None)."""
        origin = get_origin(type_hint)
        if origin is Union:
            args = get_args(type_hint)
            return type(None) in args
        return False

    def _validate_field(self, name, value, expected_type):
        """Validate and convert a single field value."""
        # Unwrap Optional type
        if self._is_optional(expected_type):
            args = get_args(expected_type)
            expected_type = [a for a in args if a is not type(None)][0]

        # Type-specific validation
        if expected_type == datetime:
            if isinstance(value, str):
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            elif isinstance(value, datetime):
                return value
            else:
                raise TypeError(f"Expected datetime, got {type(value).__name__}")

        elif expected_type == date:
            if isinstance(value, str):
                return date.fromisoformat(value)
            elif isinstance(value, date):
                return value
            else:
                raise TypeError(f"Expected date, got {type(value).__name__}")

        elif expected_type == Decimal:
            try:
                return Decimal(str(value))
            except Exception:
                raise TypeError(f"Cannot convert {value} to Decimal")

        elif expected_type == int:
            if isinstance(value, bool):
                raise TypeError(f"Expected int, got bool")
            if not isinstance(value, int):
                raise TypeError(f"Expected int, got {type(value).__name__}")
            return value

        elif expected_type == float:
            if isinstance(value, (int, float)):
                return float(value)
            raise TypeError(f"Expected float, got {type(value).__name__}")

        elif expected_type == str:
            if not isinstance(value, str):
                raise TypeError(f"Expected str, got {type(value).__name__}")
            return value

        elif expected_type == bool:
            if not isinstance(value, bool):
                raise TypeError(f"Expected bool, got {type(value).__name__}")
            return value

        elif expected_type == dict:
            if not isinstance(value, dict):
                raise TypeError(f"Expected dict, got {type(value).__name__}")
            return value

        return value
```

## Using the Validator with BigQuery

Integrate the validator into your data loading pipeline.

```python
from google.cloud import bigquery
from validator import SchemaValidator, SchemaValidationError
from schemas import UserEvent, OrderRecord
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)
validator = SchemaValidator()
client = bigquery.Client()

def load_validated_rows(table_id, rows, schema_class):
    """Validate rows against a schema and load them into BigQuery."""
    valid_rows = []
    invalid_rows = []

    for i, row in enumerate(rows):
        try:
            validated = validator.validate(row, schema_class)
            # Convert datetime objects to ISO strings for BigQuery JSON insert
            serialized = serialize_for_bigquery(validated)
            valid_rows.append(serialized)
        except SchemaValidationError as e:
            invalid_rows.append({"index": i, "errors": e.errors, "data": row})
            logger.warning(f"Row {i} validation failed: {e.errors}")

    # Report validation results
    logger.info(f"Validation: {len(valid_rows)} valid, {len(invalid_rows)} invalid out of {len(rows)} total")

    if invalid_rows:
        logger.warning(f"Invalid rows: {json.dumps(invalid_rows[:5], default=str)}")

    # Insert valid rows into BigQuery
    if valid_rows:
        errors = client.insert_rows_json(table_id, valid_rows)
        if errors:
            logger.error(f"BigQuery insert errors: {errors}")
            return {"inserted": 0, "validation_errors": len(invalid_rows), "insert_errors": errors}

    return {
        "inserted": len(valid_rows),
        "validation_errors": len(invalid_rows),
        "insert_errors": [],
    }

def serialize_for_bigquery(data):
    """Convert Python objects to BigQuery-compatible JSON types."""
    serialized = {}
    for key, value in data.items():
        if isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif isinstance(value, date):
            serialized[key] = value.isoformat()
        elif isinstance(value, Decimal):
            serialized[key] = float(value)
        elif value is None:
            serialized[key] = None
        else:
            serialized[key] = value
    return serialized

# Example usage
rows = [
    {
        "event_id": "evt-001",
        "user_id": "user-123",
        "event_type": "page_view",
        "timestamp": "2024-01-15T10:30:00Z",
        "properties": {"page": "/home"},
        "duration_ms": 4500,
    },
    {
        "event_id": "evt-002",
        "user_id": "user-456",
        "event_type": "click",
        "timestamp": "not-a-date",  # This will fail validation
        "properties": {"button": "signup"},
    },
]

result = load_validated_rows(
    "my-project.analytics.user_events",
    rows,
    UserEvent,
)
print(f"Result: {result}")
```

## Generating BigQuery Schemas from Dataclasses

You can auto-generate BigQuery table schemas from your dataclass definitions.

```python
from google.cloud import bigquery
from dataclasses import fields as dataclass_fields
from typing import get_type_hints, get_origin, get_args, Union
from datetime import datetime, date
from decimal import Decimal

def dataclass_to_bq_schema(schema_class):
    """Generate a BigQuery schema from a dataclass definition."""
    type_mapping = {
        str: "STRING",
        int: "INT64",
        float: "FLOAT64",
        bool: "BOOL",
        datetime: "TIMESTAMP",
        date: "DATE",
        Decimal: "NUMERIC",
        dict: "JSON",
        bytes: "BYTES",
    }

    hints = get_type_hints(schema_class)
    bq_fields = []

    for f in dataclass_fields(schema_class):
        field_type = hints[f.name]
        is_optional = False

        # Check if the field is Optional
        origin = get_origin(field_type)
        if origin is Union:
            args = get_args(field_type)
            if type(None) in args:
                is_optional = True
                field_type = [a for a in args if a is not type(None)][0]

        # Map Python type to BigQuery type
        bq_type = type_mapping.get(field_type, "STRING")

        mode = "NULLABLE" if is_optional or f.default is not f.default_factory else "REQUIRED"

        bq_fields.append(
            bigquery.SchemaField(f.name, bq_type, mode=mode)
        )

    return bq_fields

# Generate a BigQuery schema from the UserEvent dataclass
from schemas import UserEvent

bq_schema = dataclass_to_bq_schema(UserEvent)
for field in bq_schema:
    print(f"{field.name}: {field.field_type} ({field.mode})")
```

## Creating Tables from Dataclass Schemas

Use the generated schema to create BigQuery tables programmatically.

```python
from google.cloud import bigquery

client = bigquery.Client()

def create_table_from_dataclass(dataset_id, table_name, schema_class):
    """Create a BigQuery table from a dataclass schema."""
    schema = dataclass_to_bq_schema(schema_class)

    table_id = f"{client.project}.{dataset_id}.{table_name}"
    table = bigquery.Table(table_id, schema=schema)

    # Add partitioning if there is a timestamp field
    hints = get_type_hints(schema_class)
    for f in dataclass_fields(schema_class):
        if hints[f.name] == datetime or hints[f.name] == date:
            table.time_partitioning = bigquery.TimePartitioning(
                field=f.name,
                type_=bigquery.TimePartitioningType.DAY,
            )
            break

    table = client.create_table(table, exists_ok=True)
    print(f"Created table {table.full_table_id}")
    return table

# Create the user_events table from the dataclass
create_table_from_dataclass("analytics", "user_events", UserEvent)
```

## Using Pydantic for Validation

If you prefer Pydantic over raw dataclasses, it provides even richer validation.

```python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Dict

class UserEventModel(BaseModel):
    """Pydantic model for user events with built-in validation."""
    event_id: str = Field(..., min_length=1, max_length=100)
    user_id: str = Field(..., min_length=1, max_length=100)
    event_type: str = Field(..., pattern="^[a-z_]+$")
    timestamp: datetime
    properties: Dict[str, object] = Field(default_factory=dict)
    session_id: Optional[str] = None
    duration_ms: Optional[int] = Field(None, ge=0)

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v):
        """Ensure event_type is a known value."""
        valid_types = {"page_view", "click", "form_submit", "purchase", "search"}
        if v not in valid_types:
            raise ValueError(f"Unknown event type: {v}. Must be one of {valid_types}")
        return v

# Validate and convert data
try:
    event = UserEventModel(
        event_id="evt-001",
        user_id="user-123",
        event_type="page_view",
        timestamp="2024-01-15T10:30:00Z",
        properties={"page": "/home"},
    )
    # Convert to dict for BigQuery
    row = event.model_dump(mode="json")
    print(f"Valid: {row}")
except Exception as e:
    print(f"Validation error: {e}")
```

## Monitoring Data Quality

Schema validation catches issues at the application level, but you also need monitoring for data quality in production. OneUptime (https://oneuptime.com) can monitor your data pipeline services and alert you when error rates increase, which often indicates schema changes or data quality problems upstream.

## Summary

Using Python type hints and dataclasses for BigQuery schema validation catches data issues early in your pipeline. Define your schemas as dataclasses or Pydantic models, validate data before loading, and auto-generate BigQuery schemas from your Python definitions to keep them in sync. This approach gives you a single source of truth for your data schema that works for both runtime validation and table creation. The extra effort upfront saves significant debugging time when something goes wrong in production.
