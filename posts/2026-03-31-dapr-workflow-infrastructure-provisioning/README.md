# How to Use Dapr Workflow for Infrastructure Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Infrastructure, Provisioning, Cloud, Automation, DevOps

Description: Learn how to orchestrate cloud infrastructure provisioning workflows with Dapr, coordinating multi-step resource creation with rollback on failure.

---

## Infrastructure Provisioning as a Workflow

Provisioning cloud infrastructure involves multiple sequential steps: creating networks, databases, storage, compute, and then configuring them. If any step fails, you want to clean up what was already created. This is a classic saga pattern - and Dapr Workflow handles it elegantly.

## Example: Tenant Onboarding Provisioning

When a new tenant signs up, provision:
1. Create a Kubernetes namespace
2. Deploy a dedicated database
3. Create an object storage bucket
4. Deploy the application
5. Configure DNS

If any step fails, roll back what was created.

## Workflow in Python

```python
import dapr.ext.workflow as wf

def provision_tenant_workflow(ctx: wf.DaprWorkflowContext, tenant: dict):
    created = {"namespace": False, "database": False, "storage": False}

    # Step 1 - Kubernetes namespace
    ctx.set_custom_status("Creating namespace")
    ns_created = yield ctx.call_activity(create_namespace, input=tenant)
    if not ns_created:
        return {"status": "failed", "step": "namespace"}
    created["namespace"] = True

    # Step 2 - Database
    ctx.set_custom_status("Provisioning database")
    db_info = yield ctx.call_activity(provision_database, input=tenant)
    if not db_info:
        yield ctx.call_activity(delete_namespace, input=tenant)
        return {"status": "failed", "step": "database"}
    created["database"] = True

    # Step 3 - Storage bucket
    ctx.set_custom_status("Creating storage bucket")
    bucket = yield ctx.call_activity(create_storage_bucket, input=tenant)
    if not bucket:
        yield ctx.call_activity(deprovision_database, input=tenant)
        yield ctx.call_activity(delete_namespace, input=tenant)
        return {"status": "failed", "step": "storage"}
    created["storage"] = True

    # Step 4 - Deploy application
    ctx.set_custom_status("Deploying application")
    deployed = yield ctx.call_activity(deploy_application, input={
        "tenant": tenant,
        "dbConnectionString": db_info["connectionString"],
        "bucketName": bucket["name"]
    })
    if not deployed:
        yield ctx.call_activity(delete_storage_bucket, input=bucket)
        yield ctx.call_activity(deprovision_database, input=tenant)
        yield ctx.call_activity(delete_namespace, input=tenant)
        return {"status": "failed", "step": "deployment"}

    # Step 5 - DNS
    ctx.set_custom_status("Configuring DNS")
    yield ctx.call_activity(configure_dns, input=tenant)

    ctx.set_custom_status("Provisioning complete")
    return {"status": "success", "tenantId": tenant["id"]}
```

## Activity: Create Kubernetes Namespace

```python
@wf.activity
def create_namespace(ctx, tenant: dict) -> bool:
    from kubernetes import client, config

    config.load_incluster_config()
    v1 = client.CoreV1Api()

    namespace = client.V1Namespace(
        metadata=client.V1ObjectMeta(
            name=f"tenant-{tenant['id']}",
            labels={"tenant": tenant["id"], "managed-by": "dapr-workflow"}
        )
    )
    v1.create_namespace(body=namespace)
    return True
```

## Activity: Provision Database with Terraform

```python
@wf.activity
def provision_database(ctx, tenant: dict) -> dict:
    import subprocess, json, os

    workspace = f"/tmp/tf-{tenant['id']}"
    os.makedirs(workspace, exist_ok=True)

    # Write Terraform vars
    with open(f"{workspace}/terraform.tfvars.json", "w") as f:
        json.dump({"tenant_id": tenant["id"], "region": tenant["region"]}, f)

    # Apply Terraform
    result = subprocess.run(
        ["terraform", "apply", "-auto-approve", "-var-file=terraform.tfvars.json"],
        cwd=workspace, capture_output=True, text=True
    )

    if result.returncode != 0:
        raise Exception(f"Terraform failed: {result.stderr}")

    output = subprocess.run(
        ["terraform", "output", "-json"],
        cwd=workspace, capture_output=True, text=True
    )
    return json.loads(output.stdout)
```

## Starting a Provisioning Run

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/provision_tenant_workflow/start \
  -H "Content-Type: application/json" \
  -d '{"id": "tenant-abc", "region": "us-east-1", "tier": "pro", "domain": "abc.example.com"}'
```

## Monitoring Progress

```bash
# Poll until done
while true; do
  STATUS=$(curl -s http://localhost:3500/v1.0/workflows/dapr/{instanceId} | jq -r .runtimeStatus)
  echo "Status: $STATUS"
  [ "$STATUS" != "RUNNING" ] && break
  sleep 5
done
```

## Summary

Dapr Workflow is well suited for infrastructure provisioning workflows because it provides durable saga semantics: each provisioning step is checkpointed, failures trigger compensating rollback activities, and the workflow status API gives real-time visibility into multi-minute provisioning operations.
