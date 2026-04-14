# How to Implement Report Generation with Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Report Generation, Batch Processing, PDF

Description: Learn how to build a reliable report generation pipeline using Dapr Workflow to orchestrate data gathering, rendering, and delivery steps.

---

Report generation involves multiple sequential steps: querying data from several sources, aggregating results, rendering the report, and delivering it via email or storage. Dapr Workflow ensures each step completes reliably with built-in retry and durability across service restarts.

## Report Generation Workflow

```text
TriggerReport -> GatherData (parallel) -> AggregateResults -> RenderReport -> StoreReport -> SendReport
                   - SalesData
                   - UserData
                   - InventoryData
```

## Define the Report Workflow

```python
import dapr.ext.workflow as wf
from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext

def report_generation_workflow(ctx: DaprWorkflowContext, request: dict):
    report_id = request['reportId']
    report_type = request['reportType']
    date_range = request['dateRange']

    # Gather data from multiple sources in parallel
    data_tasks = [
        ctx.call_activity(fetch_sales_data, input=date_range),
        ctx.call_activity(fetch_user_metrics, input=date_range),
        ctx.call_activity(fetch_inventory_data, input=date_range)
    ]
    sales, users, inventory = yield wf.when_all(data_tasks)

    # Aggregate all data
    aggregated = yield ctx.call_activity(aggregate_report_data, input={
        "reportType": report_type,
        "sales": sales,
        "users": users,
        "inventory": inventory,
        "dateRange": date_range
    })

    # Render the report (PDF or HTML)
    rendered = yield ctx.call_activity(render_report, input={
        "reportId": report_id,
        "template": report_type,
        "data": aggregated
    })

    # Store in S3
    storage_url = yield ctx.call_activity(store_report, input={
        "reportId": report_id,
        "content": rendered['content'],
        "format": rendered['format']
    })

    # Send to recipients
    yield ctx.call_activity(send_report_email, input={
        "reportId": report_id,
        "recipients": request['recipients'],
        "reportUrl": storage_url
    })

    return {"reportId": report_id, "url": storage_url, "status": "delivered"}
```

## Activity Implementations

```python
def fetch_sales_data(ctx: WorkflowActivityContext, date_range: dict) -> dict:
    conn = get_db_connection()
    result = conn.execute("""
        SELECT
            DATE(created_at) as date,
            SUM(amount) as revenue,
            COUNT(*) as order_count
        FROM orders
        WHERE created_at BETWEEN %s AND %s
        GROUP BY DATE(created_at)
        ORDER BY date
    """, (date_range['start'], date_range['end']))
    rows = result.fetchall()
    return {"rows": rows, "total": sum(r['revenue'] for r in rows)}

def render_report(ctx: WorkflowActivityContext, params: dict) -> dict:
    from weasyprint import HTML
    import jinja2
    import base64

    loader = jinja2.FileSystemLoader('templates')
    env = jinja2.Environment(loader=loader)
    template = env.get_template(f"{params['template']}.html")

    html_content = template.render(**params['data'])
    pdf_bytes = HTML(string=html_content).write_pdf()

    return {
        "content": base64.b64encode(pdf_bytes).decode('utf-8'),
        "format": "pdf"
    }

def store_report(ctx: WorkflowActivityContext, payload: dict) -> str:
    import boto3
    import base64
    s3 = boto3.client('s3')
    key = f"reports/{payload['reportId']}.{payload['format']}"

    s3.put_object(
        Bucket='company-reports',
        Key=key,
        Body=base64.b64decode(payload['content']),
        ContentType='application/pdf'
    )

    return f"s3://company-reports/{key}"
```

## Trigger Reports via API

```python
from dapr.ext.workflow import DaprWorkflowClient

@app.route('/reports/generate', methods=['POST'])
def trigger_report():
    request_data = request.json

    client = DaprWorkflowClient()
    instance_id = client.schedule_new_workflow(
        workflow=report_generation_workflow,
        input=request_data
    )

    return jsonify({"instanceId": instance_id, "status": "started"}), 202
```

## Check Report Status

```python
@app.route('/reports/status/<instance_id>', methods=['GET'])
def get_report_status(instance_id: str):
    client = DaprWorkflowClient()
    state = client.get_workflow_state(instance_id)

    return jsonify({
        "status": state.runtime_status.name,
        "result": state.serialized_output
    })
```

## Summary

Dapr Workflow orchestrates report generation by parallelizing independent data fetching steps with `when_all`, then sequentially aggregating, rendering, storing, and delivering the report. If any step fails, Dapr retries the failed activity while preserving all previously completed work. This pattern eliminates re-running expensive data queries after a transient render or delivery failure.
