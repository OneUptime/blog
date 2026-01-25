# How to Implement DataOps Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DataOps, Data Engineering, CI/CD, Data Quality, Data Pipelines, Automation, Observability

Description: A practical guide to implementing DataOps practices including version control, CI/CD, testing, monitoring, and collaboration for data teams.

---

DataOps brings DevOps principles to data engineering. It's not just about tools. It's about culture, automation, and treating data pipelines with the same rigor as application code. Organizations that adopt DataOps see faster delivery, fewer production incidents, and happier data teams.

## What is DataOps?

DataOps combines agile development, DevOps, and statistical process control to improve data pipeline quality and reduce cycle time.

```mermaid
flowchart TB
    subgraph Pillars["DataOps Pillars"]
        P1[Version Control]
        P2[CI/CD Automation]
        P3[Testing & Validation]
        P4[Monitoring & Observability]
        P5[Collaboration]
    end

    subgraph Outcomes["Outcomes"]
        O1[Faster Delivery]
        O2[Higher Quality]
        O3[Better Collaboration]
        O4[Reduced Incidents]
    end

    Pillars --> Outcomes
```

## Pillar 1: Version Control Everything

Data pipelines, schemas, configurations, and documentation should all live in version control.

### Repository Structure

```
data-platform/
├── dags/                      # Airflow DAGs
│   ├── ingestion/
│   ├── transformation/
│   └── reporting/
├── dbt/                       # dbt models
│   ├── models/
│   │   ├── staging/
│   │   ├── intermediate/
│   │   └── marts/
│   ├── tests/
│   └── macros/
├── schemas/                   # Schema definitions
│   ├── avro/
│   ├── protobuf/
│   └── json-schema/
├── infrastructure/            # IaC for data infrastructure
│   ├── terraform/
│   └── kubernetes/
├── tests/                     # Pipeline tests
│   ├── unit/
│   ├── integration/
│   └── data-quality/
├── docs/                      # Documentation
└── .github/
    └── workflows/             # CI/CD pipelines
```

### Schema Version Control

```python
# schemas/orders_v2.py
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class OrderSchemaV2:
    """
    Order schema version 2
    Changes from v1:
    - Added discount_amount field
    - Renamed customer_email to email
    """
    order_id: str
    customer_id: str
    email: str  # Renamed from customer_email
    product_id: str
    quantity: int
    unit_price: float
    discount_amount: Optional[float] = 0.0  # New field
    created_at: datetime = None

    # Schema version for tracking
    _schema_version: str = "2.0.0"

    @classmethod
    def from_v1(cls, v1_record: dict) -> 'OrderSchemaV2':
        """Migration from v1 schema"""
        return cls(
            order_id=v1_record['order_id'],
            customer_id=v1_record['customer_id'],
            email=v1_record.get('customer_email', ''),  # Handle rename
            product_id=v1_record['product_id'],
            quantity=v1_record['quantity'],
            unit_price=v1_record['unit_price'],
            discount_amount=0.0,  # Default for new field
            created_at=v1_record.get('created_at')
        )
```

## Pillar 2: CI/CD for Data Pipelines

Automate testing and deployment of data pipeline changes.

### GitHub Actions Workflow

```yaml
# .github/workflows/data-pipeline-ci.yml
name: Data Pipeline CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          pip install ruff black sqlfluff

      - name: Lint Python code
        run: ruff check dags/ tests/

      - name: Check formatting
        run: black --check dags/ tests/

      - name: Lint SQL
        run: sqlfluff lint dbt/models/

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: pip install -r requirements-test.txt

      - name: Run unit tests
        run: pytest tests/unit/ -v --cov=dags

      - name: Run integration tests
        run: pytest tests/integration/ -v
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run dbt tests
        run: |
          cd dbt
          dbt deps
          dbt build --target test

  validate-dags:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install Airflow
        run: pip install apache-airflow==2.7.0

      - name: Validate DAGs
        run: |
          export AIRFLOW_HOME=$(pwd)
          airflow db init
          python -c "from airflow.models import DagBag; d = DagBag(); assert not d.import_errors, d.import_errors"

  deploy:
    needs: [test, validate-dags]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          # Sync DAGs to Airflow
          aws s3 sync dags/ s3://airflow-dags-bucket/dags/

          # Run dbt deploy
          cd dbt
          dbt deps
          dbt build --target prod
```

## Pillar 3: Testing Data Pipelines

### Unit Tests for Transformations

```python
# tests/unit/test_transformations.py
import pytest
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, DoubleType
from dags.transformations.order_processing import calculate_order_metrics

@pytest.fixture(scope="session")
def spark():
    return SparkSession.builder \
        .master("local[2]") \
        .appName("unit-tests") \
        .getOrCreate()

def test_calculate_order_metrics(spark):
    """Test order metrics calculation"""
    # Arrange
    schema = StructType([
        StructField("order_id", StringType(), False),
        StructField("quantity", DoubleType(), False),
        StructField("unit_price", DoubleType(), False),
    ])

    input_data = [
        ("ORD001", 2.0, 10.0),
        ("ORD002", 1.0, 25.0),
        ("ORD003", 3.0, 15.0),
    ]

    input_df = spark.createDataFrame(input_data, schema)

    # Act
    result_df = calculate_order_metrics(input_df)
    result = result_df.collect()

    # Assert
    assert len(result) == 3
    assert result[0]["order_total"] == 20.0  # 2 * 10
    assert result[1]["order_total"] == 25.0  # 1 * 25
    assert result[2]["order_total"] == 45.0  # 3 * 15

def test_handles_null_values(spark):
    """Test graceful handling of null values"""
    schema = StructType([
        StructField("order_id", StringType(), False),
        StructField("quantity", DoubleType(), True),
        StructField("unit_price", DoubleType(), True),
    ])

    input_data = [
        ("ORD001", None, 10.0),
        ("ORD002", 1.0, None),
    ]

    input_df = spark.createDataFrame(input_data, schema)

    result_df = calculate_order_metrics(input_df)
    result = result_df.collect()

    # Nulls should result in null total, not error
    assert result[0]["order_total"] is None
    assert result[1]["order_total"] is None
```

### Data Quality Tests with Great Expectations

```python
# tests/data_quality/test_orders_quality.py
import great_expectations as gx
from great_expectations.core.batch import RuntimeBatchRequest

def create_order_expectations():
    """Define data quality expectations for orders table"""
    context = gx.get_context()

    # Create expectation suite
    suite = context.add_expectation_suite("orders_quality_suite")

    # Add expectations
    expectations = [
        # Primary key should be unique
        {
            "expectation_type": "expect_column_values_to_be_unique",
            "kwargs": {"column": "order_id"}
        },
        # Required fields should not be null
        {
            "expectation_type": "expect_column_values_to_not_be_null",
            "kwargs": {"column": "customer_id"}
        },
        # Quantity should be positive
        {
            "expectation_type": "expect_column_values_to_be_between",
            "kwargs": {"column": "quantity", "min_value": 1}
        },
        # Status should be valid enum
        {
            "expectation_type": "expect_column_values_to_be_in_set",
            "kwargs": {
                "column": "status",
                "value_set": ["pending", "processing", "shipped", "delivered", "cancelled"]
            }
        },
        # Order date should not be in future
        {
            "expectation_type": "expect_column_values_to_be_dateutil_parseable",
            "kwargs": {"column": "order_date"}
        },
        # Table should have minimum row count
        {
            "expectation_type": "expect_table_row_count_to_be_between",
            "kwargs": {"min_value": 1}
        }
    ]

    for exp in expectations:
        suite.add_expectation(gx.expectations.ExpectationConfiguration(**exp))

    return suite

def validate_orders_data(df):
    """Run validation on orders dataframe"""
    context = gx.get_context()

    # Create batch request
    batch_request = RuntimeBatchRequest(
        datasource_name="spark_datasource",
        data_connector_name="runtime_data_connector",
        data_asset_name="orders",
        runtime_parameters={"batch_data": df},
        batch_identifiers={"batch_id": "validation_run"}
    )

    # Run validation
    results = context.run_checkpoint(
        checkpoint_name="orders_checkpoint",
        batch_request=batch_request
    )

    return results.success
```

## Pillar 4: Monitoring and Observability

### Pipeline Metrics Collection

```python
# monitoring/pipeline_metrics.py
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any
import json
from prometheus_client import Counter, Histogram, Gauge, push_to_gateway

# Define metrics
RECORDS_PROCESSED = Counter(
    'pipeline_records_processed_total',
    'Total records processed',
    ['pipeline', 'stage']
)

PROCESSING_DURATION = Histogram(
    'pipeline_processing_duration_seconds',
    'Pipeline processing duration',
    ['pipeline', 'stage'],
    buckets=[1, 5, 10, 30, 60, 120, 300, 600]
)

DATA_QUALITY_SCORE = Gauge(
    'pipeline_data_quality_score',
    'Data quality score (0-100)',
    ['pipeline', 'table']
)

@dataclass
class PipelineMetrics:
    pipeline_name: str
    stage: str
    records_in: int
    records_out: int
    records_failed: int
    start_time: datetime
    end_time: datetime
    quality_score: float

    def push_to_prometheus(self, gateway_url: str):
        """Push metrics to Prometheus Pushgateway"""
        RECORDS_PROCESSED.labels(
            pipeline=self.pipeline_name,
            stage=self.stage
        ).inc(self.records_out)

        duration = (self.end_time - self.start_time).total_seconds()
        PROCESSING_DURATION.labels(
            pipeline=self.pipeline_name,
            stage=self.stage
        ).observe(duration)

        DATA_QUALITY_SCORE.labels(
            pipeline=self.pipeline_name,
            table=self.stage
        ).set(self.quality_score)

        push_to_gateway(
            gateway_url,
            job=f'pipeline_{self.pipeline_name}',
            registry=None
        )

    def to_json(self) -> str:
        """Export metrics as JSON for logging"""
        return json.dumps({
            'pipeline': self.pipeline_name,
            'stage': self.stage,
            'records_in': self.records_in,
            'records_out': self.records_out,
            'records_failed': self.records_failed,
            'duration_seconds': (self.end_time - self.start_time).total_seconds(),
            'quality_score': self.quality_score,
            'timestamp': self.end_time.isoformat()
        })
```

### Data Freshness Monitoring

```python
# monitoring/freshness_check.py
from datetime import datetime, timedelta
from typing import List
import logging

logger = logging.getLogger(__name__)

class FreshnessMonitor:
    def __init__(self, spark, alert_callback):
        self.spark = spark
        self.alert_callback = alert_callback

    def check_table_freshness(
        self,
        table_name: str,
        timestamp_column: str,
        max_age_hours: int
    ) -> bool:
        """Check if table data is fresh"""
        query = f"""
        SELECT MAX({timestamp_column}) as latest_timestamp
        FROM {table_name}
        """

        result = self.spark.sql(query).collect()[0]
        latest_timestamp = result['latest_timestamp']

        if latest_timestamp is None:
            self.alert_callback(
                severity="critical",
                message=f"Table {table_name} has no data"
            )
            return False

        age_hours = (datetime.now() - latest_timestamp).total_seconds() / 3600

        if age_hours > max_age_hours:
            self.alert_callback(
                severity="warning",
                message=f"Table {table_name} is {age_hours:.1f} hours stale (threshold: {max_age_hours})"
            )
            return False

        logger.info(f"Table {table_name} is fresh (age: {age_hours:.1f} hours)")
        return True

    def run_freshness_checks(self, checks: List[dict]):
        """Run multiple freshness checks"""
        results = []
        for check in checks:
            is_fresh = self.check_table_freshness(
                table_name=check['table'],
                timestamp_column=check['timestamp_column'],
                max_age_hours=check['max_age_hours']
            )
            results.append({
                'table': check['table'],
                'is_fresh': is_fresh,
                'checked_at': datetime.now().isoformat()
            })
        return results

# Usage
freshness_checks = [
    {'table': 'silver.orders', 'timestamp_column': 'updated_at', 'max_age_hours': 2},
    {'table': 'gold.daily_revenue', 'timestamp_column': 'created_at', 'max_age_hours': 24},
    {'table': 'gold.customer_features', 'timestamp_column': 'feature_timestamp', 'max_age_hours': 6},
]
```

## Pillar 5: Collaboration and Documentation

### Data Catalog Integration

```python
# catalog/data_catalog.py
from dataclasses import dataclass
from typing import List, Dict, Optional
import yaml

@dataclass
class TableMetadata:
    name: str
    description: str
    owner: str
    schema: List[Dict]
    tags: List[str]
    lineage: Dict
    quality_rules: List[str]
    refresh_schedule: str

def generate_catalog_entry(table: TableMetadata) -> dict:
    """Generate data catalog entry"""
    return {
        'name': table.name,
        'description': table.description,
        'owner': table.owner,
        'columns': [
            {
                'name': col['name'],
                'type': col['type'],
                'description': col.get('description', ''),
                'pii': col.get('pii', False)
            }
            for col in table.schema
        ],
        'tags': table.tags,
        'lineage': {
            'upstream': table.lineage.get('upstream', []),
            'downstream': table.lineage.get('downstream', [])
        },
        'quality': {
            'rules': table.quality_rules,
            'last_validation': None
        },
        'operations': {
            'refresh_schedule': table.refresh_schedule,
            'last_refresh': None
        }
    }

# Example catalog definition
orders_table = TableMetadata(
    name='gold.orders_summary',
    description='Daily aggregated order metrics for business reporting',
    owner='data-team@company.com',
    schema=[
        {'name': 'order_date', 'type': 'date', 'description': 'Order date'},
        {'name': 'total_orders', 'type': 'bigint', 'description': 'Count of orders'},
        {'name': 'total_revenue', 'type': 'decimal(18,2)', 'description': 'Sum of order values'},
    ],
    tags=['gold', 'orders', 'daily', 'business-critical'],
    lineage={
        'upstream': ['silver.orders', 'silver.products'],
        'downstream': ['reporting.executive_dashboard']
    },
    quality_rules=['unique_date', 'positive_revenue', 'no_future_dates'],
    refresh_schedule='0 6 * * *'  # Daily at 6 AM
)
```

```mermaid
flowchart TB
    subgraph DataOps["DataOps Workflow"]
        Dev[Developer] --> |Push Code| VCS[Version Control]
        VCS --> |Trigger| CI[CI Pipeline]
        CI --> |Lint & Test| Tests[Automated Tests]
        Tests --> |Pass| Deploy[Deploy to Staging]
        Deploy --> |Validate| QA[Data Quality Checks]
        QA --> |Approve| Prod[Production Deploy]
        Prod --> |Monitor| Obs[Observability]
        Obs --> |Alert| Oncall[On-Call Team]
        Oncall --> |Fix| Dev
    end
```

## Getting Started Checklist

- [ ] Put all pipeline code in version control
- [ ] Set up CI/CD for automated testing and deployment
- [ ] Implement unit tests for transformation logic
- [ ] Add data quality checks with Great Expectations or similar
- [ ] Configure monitoring and alerting for pipeline health
- [ ] Create data catalog with ownership and lineage
- [ ] Establish code review process for data changes
- [ ] Document SLAs for data freshness and quality
- [ ] Set up incident response procedures
- [ ] Schedule regular retrospectives to improve processes

---

DataOps is a journey, not a destination. Start with version control and basic CI/CD, then incrementally add testing, monitoring, and automation. The goal is not to implement every tool but to build a culture where data quality and reliability are everyone's responsibility.
