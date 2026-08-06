# Databricks Job Parameters, Task Parameters, and Widgets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Job, Apache Spark, Data Engineering, Workflow

Description: Understand Databricks parameter precedence, defaults, task-type behavior, widget access, and a repeatable debugging workflow for Lakeflow Jobs.

---

Parameter bugs in Databricks usually come from treating job parameters, task parameters, and notebook widgets as three interchangeable stores. They are not. Job and task parameters are inputs configured by Lakeflow Jobs. A widget is one interface through which notebook code reads an effective parameter value.

The rules also change with the task type. A notebook task receives key-value parameters, while a Python script or JAR task receives an ordered JSON array. That distinction determines whether job parameters are pushed down automatically.

## The three concepts

| Concept | Where it is defined | Scope | Typical purpose |
| --- | --- | --- | --- |
| Job parameter | The job definition | The whole job run | Environment, processing date, source system, run mode |
| Task parameter | An individual task | One task | A task-specific table, path, or option |
| Notebook widget | Notebook code or notebook UI | The notebook session | Reading a named value inside notebook code |

Job parameter defaults are resolved when a run starts and can be overridden for that run. Task parameters are part of a task definition and can contain static text, job parameter references, task value references, or other supported dynamic value references. Widgets do not introduce another job-level value. They expose the value delivered to a notebook task.

Dynamic value references, such as `{{job.run_id}}`, are run-time string substitutions used in supported job and task configuration fields. They are not expressions, and they cannot be placed directly in notebook source and expected to evaluate. Put them in a task parameter or another job field that supports dynamic values, then read the resolved value in the task.

## Precedence for key-value tasks

Databricks automatically pushes job parameters into task types that accept key-value parameters:

- Notebook tasks
- Python wheel tasks configured with keyword arguments
- SQL query or SQL file tasks
- Run Job tasks

If a job parameter and a task parameter use the same key, the job parameter wins. If the job is started with a run-specific override, that override replaces the saved job parameter default before pushdown.

For a notebook key, the practical order from highest to lowest is:

1. A run-specific value for a job parameter
2. The saved job parameter default
3. A same-named notebook task parameter
4. A notebook widget default, when the job sends no value for that name

Consider this partial job definition:

```json
{
  "parameters": [
    {
      "name": "catalog",
      "default": "main"
    }
  ],
  "tasks": [
    {
      "task_key": "load_orders",
      "notebook_task": {
        "notebook_path": "/Workspace/Shared/load_orders",
        "base_parameters": {
          "catalog": "dev",
          "job_run_id": "{{job.run_id}}"
        }
      }
    }
  ]
}
```

The effective `catalog` is `main`, not `dev`, because the job parameter is pushed down over the task parameter. If the run is launched with `catalog=prod`, the effective value is `prod`. The `job_run_id` task parameter has no same-named job parameter, so it resolves from the dynamic value reference.

Avoid duplicate names when the values have different meanings. A job-level `environment` and a task-level `target_schema` are easier to reason about than two unrelated parameters both named `target`.

## JSON-array tasks do not get automatic pushdown

Python script, positional Python wheel, JAR, Spark Submit, and For each tasks use JSON-formatted arrays. Job parameters are not inserted into those arrays automatically. For code tasks, reference each value explicitly and preserve the order expected by the program. A For each task instead iterates over its input array, which can explicitly reference a job parameter.

```json
[
  "--catalog",
  "{{job.parameters.catalog}}",
  "--run-id",
  "{{job.run_id}}"
]
```

A Python script can then parse the arguments normally:

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--catalog", required=True)
parser.add_argument("--run-id", required=True)
args = parser.parse_args()
```

This explicit mapping is important. Adding a job parameter in the job UI does not make it appear in `sys.argv` for an array-based task.

## Read notebook parameters with widgets

In a Python notebook task, read named parameters with `dbutils.widgets.get`:

```python
catalog = dbutils.widgets.get("catalog")
job_run_id = dbutils.widgets.get("job_run_id")
```

The names are case-sensitive from the application's point of view. Keep one spelling in the job definition, notebook, bundle configuration, and tests.

For interactive development, a notebook can create a widget with a default:

```python
dbutils.widgets.text("catalog", "dev", "Target catalog")
catalog = dbutils.widgets.get("catalog")
```

This is convenient but can hide a broken production job definition. For required production inputs, fail clearly instead of silently processing the development catalog:

```python
def required_widget(name: str) -> str:
    try:
        value = dbutils.widgets.get(name)
    except Exception as exc:
        raise ValueError(f"Required job parameter is missing: {name}") from exc

    value = value.strip()
    if not value:
        raise ValueError(f"Required job parameter is empty: {name}")
    return value


catalog = required_widget("catalog")
run_date = required_widget("run_date")
```

Use SQL named parameter markers when a SQL notebook or SQL task consumes a parameter. Accessing notebook widget values with parameter markers requires Databricks Runtime 15.2 or above. Do not concatenate untrusted values into SQL text.

```sql
SELECT *
FROM main.sales.orders
WHERE order_date = CAST(:run_date AS DATE);
```

Values used as catalog, schema, or table identifiers need a deliberate allowlist or the supported `IDENTIFIER` clause, which is available in Databricks SQL and Databricks Runtime 13.3 LTS or above. A value parameter marker is not an identifier substitution mechanism.

## Defaults should have an owner

A value with defaults in several layers is difficult to debug. Pick one owner for each default:

- Use a job parameter default for a value that operators may change per run.
- Use a task parameter for a value that is truly local to one task.
- Use a widget default only for interactive notebook development.
- Use a deployment variable for environment-specific infrastructure that should resolve when a bundle is deployed, not when a job runs.

Bundle variables and job parameters resolve at different times. A bundle variable is resolved at deployment. A job parameter is resolved at run time. If operators need to change a date or mode without redeploying, it belongs in a job parameter.

Bundle validation currently does not allow job-level `parameters` and notebook task `base_parameters` in the same job. If a bundle job defines job parameters, move its notebook task parameters to the job level.

## A reliable debugging sequence

When a task sees an unexpected value, use this order:

1. Open the run details and inspect the resolved Parameters section. This distinguishes a run override from a saved default.
2. Inspect the job parameter list and the affected task's parameter list for duplicate keys.
3. Confirm whether the task uses key-value parameters or a JSON array. For an array, verify every required job parameter is referenced explicitly.
4. Check key spelling and case in the task definition and source code.
5. Inspect unresolved values. A malformed dynamic reference can survive as literal text rather than the intended ID or date.
6. Log parameter names and non-sensitive values at task startup. Never log passwords, tokens, or secret-derived values.
7. Test both a normal run and a run with overrides. Also test the notebook interactively if it intentionally supports that mode.

A small startup record makes later incidents much easier to reconstruct:

```python
safe_context = {
    "catalog": catalog,
    "run_date": run_date,
    "job_run_id": job_run_id,
}
print(f"Resolved job context: {safe_context}")
```

Treat the run details page as the source for what Lakeflow Jobs resolved and the task startup record as evidence of what the application actually read.

## Production checklist

- Use job parameters for values shared by tasks.
- Avoid same-named job and task parameters unless overriding the task value is intentional.
- Reference job parameters explicitly in JSON-array tasks.
- Pass dynamic references through supported task fields.
- Validate required values before reading or writing data.
- Keep production defaults out of notebook-only development widgets.
- Review resolved parameters after a failed run or repair.
- Keep secrets in a supported secret or credential system, not in parameters.

## Official Documentation

- [Configure job parameters](https://docs.databricks.com/aws/en/jobs/job-parameters)
- [Configure task parameters](https://docs.databricks.com/aws/en/jobs/task-parameters)
- [Access parameter values from a task](https://docs.databricks.com/aws/en/jobs/parameter-use)
- [Dynamic value references](https://docs.databricks.com/aws/en/jobs/dynamic-value-references)
- [Configure job parameters in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/job-parameters)

## Conclusion

Databricks parameter behavior is predictable once the task interface is explicit. Job parameters override same-named parameters on key-value tasks, array-based tasks require explicit references, and notebook widgets simply read what the task received. Give each default one owner, validate inputs at startup, and use the run's resolved Parameters view before debugging notebook internals.
