# How to Automate Toil Reduction with Cloud Workflows and Cloud Scheduler on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workflows, Cloud Scheduler, Automation, SRE, Toil Reduction

Description: Learn how to combine Google Cloud Workflows and Cloud Scheduler to automate repetitive operational tasks and reduce toil in your GCP environment.

---

If you have ever spent your morning manually rotating service account keys, cleaning up unused disks, or restarting flaky services, you know what toil feels like. It is the kind of work that is manual, repetitive, automatable, and grows linearly with your infrastructure. Google's SRE book defines toil as operational work tied to running a service that tends to be manual, repetitive, and devoid of lasting value.

The good news is that GCP gives you two services that work beautifully together to eliminate toil: Cloud Workflows for orchestrating multi-step processes and Cloud Scheduler for triggering those processes on a recurring basis. In this guide, we will walk through building a real toil-reduction pipeline from scratch.

## Why Cloud Workflows and Cloud Scheduler

Cloud Workflows is a serverless orchestration service that lets you chain together API calls, conditional logic, and error handling into a single definition file. Cloud Scheduler is a fully managed cron job service. Together, they let you define what needs to happen and when it should happen, without managing any servers.

The alternative would be writing a Cloud Function with cron-like scheduling, but Workflows gives you better visibility into execution state, built-in retry logic, and the ability to compose complex multi-step processes declaratively.

## Setting Up Your First Workflow

Let us start with a common toil scenario: cleaning up unattached persistent disks that waste money. First, enable the required APIs.

```bash
# Enable Cloud Workflows and Cloud Scheduler APIs
gcloud services enable workflows.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable compute.googleapis.com
```

Now create a service account that the workflow will run as. This account needs permissions to list and delete disks.

```yaml
# cleanup-disks-workflow.yaml
# This workflow lists all disks in a project and deletes any that are not attached to a VM
main:
  params: [args]
  steps:
    - init:
        assign:
          - project: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
          - zones: ["us-central1-a", "us-central1-b", "us-east1-b"]
          - deleted_count: 0

    - iterate_zones:
        for:
          value: zone
          in: ${zones}
          steps:
            - list_disks:
                call: googleapis.compute.v1.disks.list
                args:
                  project: ${project}
                  zone: ${zone}
                result: disk_list

            - check_disks:
                for:
                  value: disk
                  in: ${disk_list.items}
                  steps:
                    - check_if_unattached:
                        switch:
                          - condition: ${"users" not in disk}
                            steps:
                              - log_deletion:
                                  call: sys.log
                                  args:
                                    text: ${"Deleting unattached disk " + disk.name + " in " + zone}
                                    severity: INFO
                              - delete_disk:
                                  call: googleapis.compute.v1.disks.delete
                                  args:
                                    project: ${project}
                                    zone: ${zone}
                                    disk: ${disk.name}
                              - increment_count:
                                  assign:
                                    - deleted_count: ${deleted_count + 1}

    - return_result:
        return:
          deleted_disks: ${deleted_count}
          status: "cleanup complete"
```

Deploy the workflow with the following command.

```bash
# Deploy the workflow using gcloud CLI
gcloud workflows deploy cleanup-unattached-disks \
  --source=cleanup-disks-workflow.yaml \
  --service-account=toil-automation@YOUR_PROJECT.iam.gserviceaccount.com \
  --location=us-central1
```

## Scheduling the Workflow

With the workflow deployed, attach a Cloud Scheduler job to run it on a regular basis.

```bash
# Create a Cloud Scheduler job that triggers the workflow every day at 2 AM UTC
gcloud scheduler jobs create http cleanup-disks-daily \
  --schedule="0 2 * * *" \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/workflows/cleanup-unattached-disks/executions" \
  --message-body='{"argument": "{}"}' \
  --oauth-service-account-email=toil-automation@YOUR_PROJECT.iam.gserviceaccount.com \
  --location=us-central1
```

This creates a job that fires every day at 2 AM. The Scheduler makes an authenticated HTTP POST to the Workflows execution API, which starts a new execution of your workflow.

## Adding Error Handling and Notifications

Production workflows need error handling. Here is how to add a try-catch block that sends a Slack notification when something goes wrong.

```yaml
# Enhanced workflow with error handling and Slack notifications
main:
  params: [args]
  steps:
    - init:
        assign:
          - project: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
          - slack_webhook: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

    - try_cleanup:
        try:
          call: cleanup_disks
          result: cleanup_result
        except:
          as: e
          steps:
            - notify_failure:
                call: http.post
                args:
                  url: ${slack_webhook}
                  body:
                    text: ${"Disk cleanup failed - " + e.message}
            - raise_error:
                raise: ${e}

    - notify_success:
        call: http.post
        args:
          url: ${slack_webhook}
          body:
            text: ${"Disk cleanup completed. Deleted " + string(cleanup_result.deleted_disks) + " disks."}

    - done:
        return: ${cleanup_result}
```

## Building a Multi-Step Toil Reduction Pipeline

The real power shows up when you chain multiple toil-reduction tasks into a single workflow. Here is a more comprehensive example that handles several common operational tasks.

```yaml
# weekly-maintenance-workflow.yaml
# Runs multiple maintenance tasks in sequence with independent error handling
main:
  steps:
    - cleanup_disks:
        try:
          call: googleapis.compute.v1.disks.list
          args:
            project: ${sys.get_env("GOOGLE_CLOUD_PROJECT_ID")}
            zone: "us-central1-a"
          result: disks
        except:
          as: e
          steps:
            - log_disk_error:
                call: sys.log
                args:
                  text: ${"Disk cleanup failed - " + e.message}
                  severity: WARNING

    - rotate_keys:
        # Call a Cloud Function that handles key rotation logic
        call: http.post
        args:
          url: "https://us-central1-YOUR_PROJECT.cloudfunctions.net/rotate-sa-keys"
          auth:
            type: OIDC
        result: key_rotation_result

    - check_ssl_expiry:
        # Call another Cloud Function to check SSL certificate expiration dates
        call: http.post
        args:
          url: "https://us-central1-YOUR_PROJECT.cloudfunctions.net/check-ssl-certs"
          auth:
            type: OIDC
        result: ssl_check_result

    - aggregate_results:
        assign:
          - summary:
              disk_cleanup: "done"
              key_rotation: ${key_rotation_result.body}
              ssl_check: ${ssl_check_result.body}

    - return_summary:
        return: ${summary}
```

## Monitoring Your Automation

You should monitor your toil-reduction automations just like any other service. Cloud Workflows automatically exports execution metrics to Cloud Monitoring. You can set up alerts on execution failures.

```bash
# Create an alert policy that fires when workflow executions fail
gcloud alpha monitoring policies create \
  --display-name="Workflow Execution Failures" \
  --condition-display-name="Failed executions" \
  --condition-filter='resource.type="workflows.googleapis.com/Workflow" AND metric.type="workflows.googleapis.com/finished_execution_count" AND metric.labels.status="FAILED"' \
  --condition-threshold-value=1 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/YOUR_PROJECT/notificationChannels/CHANNEL_ID"
```

## Practical Tips from Production

After running workflows like these across multiple projects, here are a few things I have learned:

First, always run your cleanup workflows in dry-run mode before enabling actual deletions. Add a parameter to your workflow that controls whether it actually deletes resources or just logs what it would delete. This saves you from accidental data loss.

Second, use workflow callbacks for long-running operations. If a task takes more than 30 minutes, Cloud Workflows supports callbacks that pause execution and resume when an external signal arrives.

Third, version your workflow definitions in source control. Treat them like infrastructure-as-code. Use Terraform or a CI/CD pipeline to deploy updates.

Fourth, start small. Pick your single most annoying repetitive task and automate it. Once you see the time savings, you will naturally expand to other tasks.

## Measuring Toil Reduction

Track how much time your automations save. A simple approach is to estimate how long each manual task took, multiply by frequency, and compare to the time spent building and maintaining the automation. Google's SRE teams aim to keep toil below 50% of an engineer's time, but the real goal is trending downward.

Cloud Workflows and Cloud Scheduler give you a clean, serverless way to chip away at toil without adding more infrastructure to maintain. The combination of declarative workflow definitions with scheduled triggers covers a huge percentage of the operational busywork that slows teams down. Start with one workflow, prove the value, and expand from there.
