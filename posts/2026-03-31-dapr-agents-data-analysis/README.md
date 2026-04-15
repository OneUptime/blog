# How to Use Dapr Agents for Data Analysis Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Data Analysis, Pipeline, Python

Description: Learn how to build automated data analysis pipelines with Dapr Agents that ingest data, run analyses, generate insights, and deliver reports reliably.

---

## Why Dapr for Data Analysis Pipelines?

Data analysis pipelines often involve long-running tasks that must survive failures - reading large datasets, running statistical analyses, calling LLMs for insights, and generating reports. Dapr Agents provide durable execution, automatic retries, and checkpointing, making them ideal for production data pipelines.

## Pipeline Architecture

```text
Data Source (S3, DB, API)
         |
   Ingestion Agent
         |
   Analysis Agent
         |
   Insight Agent (LLM)
         |
   Report Agent
         |
  Output (Email, Slack, S3)
```

## Building the Data Ingestion Agent

```python
import pandas as pd
from dapr_agents import Agent, tool
from dapr import Client
import json

class DataIngestionAgent(Agent):
    name = "data-ingestion-agent"
    instructions = "You coordinate data ingestion from various sources and validate data quality."

    @tool
    def load_csv(self, filepath: str) -> str:
        """Loads a CSV file and returns summary statistics.

        Args:
            filepath: Path to the CSV file to load.
        """
        df = pd.read_csv(filepath)
        summary = {
            "rows": len(df),
            "columns": list(df.columns),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing": df.isnull().sum().to_dict(),
            "preview": df.head(3).to_dict()
        }
        # Save data to shared state
        Client().save_state("statestore", "current-dataset", df.to_json())
        return json.dumps(summary)

    @tool
    def validate_data_quality(self, dataset_key: str) -> str:
        """Validates data quality for a stored dataset.

        Args:
            dataset_key: The state store key for the dataset.
        """
        state = Client().get_state("statestore", dataset_key)
        df = pd.read_json(state.data)
        issues = []
        null_cols = df.columns[df.isnull().any()].tolist()
        if null_cols:
            issues.append(f"Null values in: {null_cols}")
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            issues.append(f"{duplicates} duplicate rows")
        return f"Quality check: {len(issues)} issues - {'; '.join(issues) or 'PASS'}"
```

## Building the Statistical Analysis Agent

```python
class AnalysisAgent(Agent):
    name = "analysis-agent"
    instructions = """You perform statistical analysis on datasets.
    Identify trends, outliers, correlations, and patterns.
    Return findings as structured data."""

    @tool
    def compute_correlation_matrix(self, dataset_key: str) -> str:
        """Computes correlation matrix for numeric columns.

        Args:
            dataset_key: State store key for the dataset to analyze.
        """
        state = Client().get_state("statestore", dataset_key)
        df = pd.read_json(state.data)
        numeric_df = df.select_dtypes(include="number")
        corr = numeric_df.corr()
        strong_correlations = []
        for col1 in corr.columns:
            for col2 in corr.columns:
                if col1 != col2 and abs(corr[col1][col2]) > 0.7:
                    strong_correlations.append(f"{col1}-{col2}: {corr[col1][col2]:.2f}")
        return f"Strong correlations: {strong_correlations}"

    @tool
    def detect_outliers(self, column: str, dataset_key: str) -> str:
        """Detects outliers in a specific column using IQR method.

        Args:
            column: Column name to check for outliers.
            dataset_key: State store key for the dataset.
        """
        state = Client().get_state("statestore", dataset_key)
        df = pd.read_json(state.data)
        q1, q3 = df[column].quantile(0.25), df[column].quantile(0.75)
        iqr = q3 - q1
        outliers = df[(df[column] < q1 - 1.5 * iqr) | (df[column] > q3 + 1.5 * iqr)]
        return f"Found {len(outliers)} outliers in {column} (IQR method)"
```

## Running the Pipeline with Dapr Workflows

Orchestrate the pipeline steps durably:

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext

wfr = WorkflowRuntime()

@wfr.workflow(name="data-analysis-pipeline")
def run_pipeline(ctx: DaprWorkflowContext, input: dict):
    # Step 1: Ingest
    ingestion_result = yield ctx.call_activity(
        ingest_data, input={"source": input["data_source"]}
    )

    # Step 2: Analyze
    analysis_result = yield ctx.call_activity(
        analyze_data, input={"dataset_key": "current-dataset"}
    )

    # Step 3: Generate insights with LLM
    insights = yield ctx.call_activity(
        generate_insights, input={"analysis": analysis_result}
    )

    # Step 4: Deliver report
    yield ctx.call_activity(
        deliver_report, input={"insights": insights, "recipients": input["recipients"]}
    )

    return {"status": "completed", "insights_preview": insights[:200]}
```

## Scheduling Recurring Analysis

Use Dapr's cron binding for scheduled analysis runs:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: daily-analysis-trigger
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "0 8 * * *"  # Every day at 8 AM
```

Handle the cron trigger:

```python
from dapr.clients import DaprClient

@app.route("/daily-analysis-trigger", methods=["POST"])
def trigger_analysis():
    with DaprClient() as d:
        d.start_workflow(
            workflow_component="dapr",
            workflow_name="data-analysis-pipeline",
            input={"data_source": "s3://my-bucket/daily-data.csv", "recipients": ["team@company.com"]}
        )
    return "", 200
```

## Summary

Dapr Agents power reliable data analysis pipelines through durable workflow execution and automatic checkpointing. Build specialized ingestion, analysis, and insight agents connected by Dapr state stores and pub/sub. Use Dapr Workflows to orchestrate multi-step pipelines that survive restarts, and schedule recurring analysis runs with Dapr's cron binding.
