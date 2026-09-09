# How to Test Spot Interruption Handling with AWS FIS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, AWS FIS, Chaos Engineering, Fault Tolerance

Description: Create a narrowly targeted AWS FIS Spot interruption experiment, preview its targets, use a stop condition, and verify application recovery with timestamps.

AWS Fault Injection Service can send real Spot interruption signals to selected instances and interrupt those instances. This exercises metadata polling, EventBridge handlers, draining, checkpointing, and replacement behavior more faithfully than publishing an imitation event.

Start with one disposable Spot worker processing synthetic work in an isolated test environment. The experiment can terminate or stop the selected machine, so its useful result is evidence that the application recovers correctly.

## Define What a Successful Test Proves

Write down measurable acceptance criteria before creating the experiment. For a queue worker, these might be stopping new assignments promptly, making an unfinished job available for retry, producing exactly one committed result, and restoring useful capacity within a chosen time budget.

Choose a test job long enough to be running during the interruption. Give it a unique identifier so you can follow attempts and committed output across replacement workers. A short job that finishes before the signal arrives proves little about interrupted-work recovery.

Create an existing CloudWatch alarm for an unacceptable test-service condition, such as a sustained synthetic error rate. Confirm it starts in a known healthy state and receives fresh data. A stop condition depends on that alarm; an unpopulated metric is not a meaningful guardrail. [FIS stop conditions](https://docs.aws.amazon.com/fis/latest/userguide/stop-conditions.html).

## Prepare a Narrow Experiment Role and Target

Create an IAM role trusted by `fis.amazonaws.com` using the documented FIS trust policy conditions for your account. Grant the action's required `ec2:SendSpotInstanceInterruptions` and `ec2:DescribeInstances` permissions, scoped where the API supports it. The operator creating the template also needs the appropriate FIS permissions and permission to pass the experiment role.

Tag one running Spot Instance with `SpotInterruptionTest=canary`. Use an instance whose interruption behavior is `terminate` or `stop`; do not use `hibernate` for this test because hibernation begins immediately without a two-minute warning. Do not propagate this tag to every production worker. Preview the matching resources:

```bash
aws ec2 describe-instances \
  --region us-east-1 \
  --filters Name=tag:SpotInterruptionTest,Values=canary \
            Name=instance-lifecycle,Values=spot \
            Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].{Id:InstanceId,Type:InstanceType,Zone:Placement.AvailabilityZone}' \
  --output table
```

If multiple instances match, `COUNT(1)` chooses one of them; it does not promise your preferred machine. Narrow the tag or use an explicitly selected resource when a particular worker matters.

## Create the Experiment Template

Save the following as `spot-interruption-template.json`, replacing the account, Region, role, and existing alarm ARN:

```json
{
  "description": "Interrupt one tagged test Spot worker and verify recovery",
  "roleArn": "arn:aws:iam::123456789012:role/FisSpotCanaryRole",
  "targets": {
    "canarySpotWorker": {
      "resourceType": "aws:ec2:spot-instance",
      "resourceTags": {"SpotInterruptionTest": "canary"},
      "filters": [
        {"path": "State.Name", "values": ["running"]}
      ],
      "selectionMode": "COUNT(1)"
    }
  },
  "actions": {
    "interruptCanary": {
      "actionId": "aws:ec2:send-spot-instance-interruptions",
      "parameters": {"durationBeforeInterruption": "PT2M"},
      "targets": {"SpotInstances": "canarySpotWorker"}
    }
  },
  "stopConditions": [
    {
      "source": "aws:cloudwatch:alarm",
      "value": "arn:aws:cloudwatch:us-east-1:123456789012:alarm:spot-canary-service-errors"
    }
  ],
  "experimentOptions": {
    "accountTargeting": "single-account",
    "emptyTargetResolutionMode": "fail"
  }
}
```

This action targets `aws:ec2:spot-instance`, and its action target key is `SpotInstances`. Those names differ from the generic EC2 termination action. The supported duration range is two to fifteen minutes. [FIS action reference](https://docs.aws.amazon.com/fis/latest/userguide/fis-actions-reference.html).

```bash
TEMPLATE_ID=$(aws fis create-experiment-template \
  --region us-east-1 \
  --cli-input-json file://spot-interruption-template.json \
  --query 'experimentTemplate.id' --output text)
```

Creating the template does not yet inject the fault. Keep the resulting template ID with the test record.

## Preview Targets Before Running Actions

FIS supports `skip-all` when starting an experiment to resolve targets without executing fault actions:

```bash
PREVIEW_ID=$(aws fis start-experiment \
  --region us-east-1 \
  --experiment-template-id "$TEMPLATE_ID" \
  --experiment-options actionsMode=skip-all \
  --query 'experiment.id' --output text)

aws fis list-experiment-resolved-targets \
  --region us-east-1 \
  --experiment-id "$PREVIEW_ID"
```

Wait for target resolution to complete if the first response is empty. Verify the instance IDs and account before proceeding. Preview does not validate all permissions required by the action, and resources can change between preview and execution. [FIS experiment options](https://docs.aws.amazon.com/fis/latest/userguide/experiment-options.html).

## Run the Test and Capture the Timeline

Starting with `run-all` performs the interruption:

```bash
EXPERIMENT_ID=$(aws fis start-experiment \
  --region us-east-1 \
  --experiment-template-id "$TEMPLATE_ID" \
  --experiment-options actionsMode=run-all \
  --query 'experiment.id' --output text)

aws fis get-experiment \
  --region us-east-1 \
  --id "$EXPERIMENT_ID"
```

Capture the experiment start, rebalance recommendation, interruption warning, stopped scheduling, checkpoint completion, EC2 state transition, and replacement readiness. Use observed timestamps rather than assuming that notification delivery or instance startup is instantaneous.

The action emits a rebalance recommendation when initiated, followed by the interruption flow. A longer configured duration can provide separation between the recommendation and warning. The official [Spot interruption tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html) describes the resulting stopped or terminated states and experiment-specific Spot request status codes.

If the test breaches the chosen threshold, the alarm can stop the experiment. You can also call `aws fis stop-experiment --region us-east-1 --id "$EXPERIMENT_ID"`. Stopping an experiment is not a rollback of an already interrupted instance; continue verifying recovery and cleanup.

## Review Results and Remove Test Resources

Check the job's committed output, not just the FIS state. A completed experiment means the experiment ran, while a recovered application requires healthy replacement capacity and correct work results.

Remove the canary tag when the test ends. Delete the template if it is no longer required. Clean up stopped instances, storage, and any test fleet or group according to the owning service so a capacity manager does not keep replacing resources you intended to remove.

## Conclusion

Use a single explicit test target, a real service alarm, and a target preview before injecting an interruption. Judge the test by application correctness and measured recovery, and preserve the timeline so the next improvement addresses the actual slow or failing phase.

## Official Documentation

- [AWS FIS Spot interruption tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html)
- [AWS FIS action reference](https://docs.aws.amazon.com/fis/latest/userguide/fis-actions-reference.html)
- [AWS FIS stop conditions](https://docs.aws.amazon.com/fis/latest/userguide/stop-conditions.html)
- [AWS FIS experiment options](https://docs.aws.amazon.com/fis/latest/userguide/experiment-options.html)
- [AWS FIS experiment role](https://docs.aws.amazon.com/fis/latest/userguide/getting-started-iam-service-role.html)
