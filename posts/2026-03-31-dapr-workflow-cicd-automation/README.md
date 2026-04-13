# How to Use Dapr Workflow for CI/CD Pipeline Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, CI/CD, Pipeline, Deployment, DevOps, Automation

Description: Learn how to build durable CI/CD pipeline automation using Dapr Workflow, orchestrating build, test, deploy, and verification steps with rollback support.

---

## Why Orchestrate CI/CD with Dapr Workflow?

Traditional CI/CD pipelines are static YAML files. For dynamic pipelines - where deployment targets change at runtime, human approval gates are needed, or multi-cloud rollouts must be coordinated - a workflow engine provides more flexibility. Dapr Workflow lets you write pipeline logic in code with full programmatic control.

## Example: Blue-Green Deployment Pipeline

1. Build container image
2. Run automated tests in parallel
3. Gate on human approval for production
4. Deploy to staging and verify
5. Deploy to production (blue-green swap)
6. Run smoke tests against production
7. Rollback if smoke tests fail

## Pipeline Workflow in Python

```python
import dapr.ext.workflow as wf
from datetime import timedelta

wfr = wf.WorkflowRuntime()

@wfr.workflow
def deployment_pipeline_workflow(ctx: wf.DaprWorkflowContext, release: dict):
    service = release["service"]
    version = release["version"]

    # Step 1 - build
    ctx.set_custom_status(f"Building {service}:{version}")
    image = yield ctx.call_activity(build_container_image, input=release)

    # Step 2 - run tests in parallel
    ctx.set_custom_status("Running tests")
    unit_task = ctx.call_activity(run_unit_tests, input=image)
    integration_task = ctx.call_activity(run_integration_tests, input=image)
    lint_task = ctx.call_activity(run_security_scan, input=image)

    results = yield wf.when_all([unit_task, integration_task, lint_task])
    if any(not r["passed"] for r in results):
        failed = [r["suite"] for r in results if not r["passed"]]
        return {"status": "test_failed", "suites": failed}

    # Step 3 - deploy to staging
    ctx.set_custom_status("Deploying to staging")
    yield ctx.call_activity(deploy_to_environment, input={
        "image": image, "environment": "staging"
    })

    # Step 4 - verify staging
    staging_ok = yield ctx.call_activity(run_smoke_tests, input={"environment": "staging"})
    if not staging_ok:
        return {"status": "staging_verification_failed"}

    # Step 5 - request production approval
    yield ctx.call_activity(notify_approvers, input={
        "release": release,
        "workflowId": ctx.instance_id
    })

    ctx.set_custom_status("Awaiting production approval")
    approval_event = ctx.wait_for_external_event("production_approved")
    timeout = ctx.create_timer(timedelta(hours=4))
    winner = yield wf.when_any([approval_event, timeout])

    if winner == timeout:
        return {"status": "approval_timeout"}

    decision = approval_event.get_result()
    if not decision["approved"]:
        return {"status": "rejected", "reason": decision.get("reason")}

    # Step 6 - deploy to production (blue-green)
    ctx.set_custom_status("Deploying to production")
    deploy_result = yield ctx.call_activity(deploy_blue_green, input={
        "image": image,
        "environment": "production"
    })

    # Step 7 - smoke test production
    ctx.set_custom_status("Verifying production")
    prod_ok = yield ctx.call_activity(run_smoke_tests, input={"environment": "production"})

    if not prod_ok:
        ctx.set_custom_status("Rolling back production")
        yield ctx.call_activity(rollback_deployment, input={
            "environment": "production",
            "previousVersion": deploy_result["previousVersion"]
        })
        return {"status": "rolled_back"}

    return {"status": "deployed", "version": version, "environment": "production"}
```

## Activity: Deploy with Kubectl

```python
@wfr.activity
def deploy_to_environment(ctx, data: dict) -> dict:
    import subprocess

    env = data["environment"]
    image = data["image"]

    result = subprocess.run([
        "kubectl", "set", "image",
        f"deployment/{image['service']}",
        f"{image['service']}={image['tag']}",
        "-n", env
    ], capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"Deploy failed: {result.stderr}")

    # Wait for rollout
    subprocess.run([
        "kubectl", "rollout", "status",
        f"deployment/{image['service']}",
        "-n", env, "--timeout=5m"
    ], check=True)

    return {"deployed": True, "environment": env}
```

## Approval Webhook

```python
@app.route("/pipelines/approve", methods=["POST"])
def approve_deployment():
    data = request.get_json()
    with DaprClient() as d:
        d.raise_workflow_event(
            instance_id=data["workflowId"],
            workflow_component="dapr",
            event_name="production_approved",
            event_data={"approved": data["approved"], "reason": data.get("reason")}
        )
    return {"status": "recorded"}, 200
```

## Triggering the Pipeline

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/deployment_pipeline_workflow/start \
  -H "Content-Type: application/json" \
  -d '{"service": "api-server", "version": "v2.5.0", "gitSha": "abc123"}'
```

## Summary

Dapr Workflow brings programmable, durable orchestration to CI/CD pipelines. Parallel test execution reduces pipeline time, human approval gates pause execution without polling, and automatic rollback logic keeps production safe - all expressed as readable Python code rather than complex YAML DSL.
