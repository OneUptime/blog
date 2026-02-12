# How to Use Boto3 Waiters for Async Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Boto3, Python, Async

Description: Learn how to use Boto3 waiters to handle asynchronous AWS operations gracefully, including built-in waiters, custom waiters, and best practices for polling.

---

If you've worked with AWS through Python, you've probably run into a familiar problem: you kick off an operation - say, launching an EC2 instance or creating an RDS database - and then you need to wait for it to finish before moving on. You could write a loop that checks the status every few seconds, but that's tedious and error-prone. Boto3 waiters solve this problem cleanly.

## What Are Waiters?

Waiters are built-in Boto3 objects that poll an AWS resource until it reaches a desired state. Instead of writing your own retry loops with `time.sleep()`, you call a waiter and let it handle the polling logic for you. Behind the scenes, a waiter makes repeated API calls at a configurable interval and checks whether the response matches the expected state.

Most AWS services that have long-running operations provide waiters out of the box. EC2 has waiters for instance states, RDS has them for database availability, and S3 has them for bucket and object existence.

## Using Built-In Waiters

Let's start with the most common use case: waiting for an EC2 instance to be running.

This example launches an instance and waits for it to reach the "running" state before proceeding.

```python
import boto3

ec2 = boto3.client('ec2')

# Launch an EC2 instance
response = ec2.run_instances(
    ImageId='ami-0abcdef1234567890',
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1
)

instance_id = response['Instances'][0]['InstanceId']
print(f"Launched instance: {instance_id}")

# Create a waiter that polls until the instance is running
waiter = ec2.get_waiter('instance_running')

# This blocks until the instance is running or the waiter times out
waiter.wait(InstanceIds=[instance_id])
print(f"Instance {instance_id} is now running")
```

You can also wait for an instance to stop or terminate.

```python
# Wait for an instance to stop
stop_waiter = ec2.get_waiter('instance_stopped')
ec2.stop_instances(InstanceIds=[instance_id])
stop_waiter.wait(InstanceIds=[instance_id])
print("Instance stopped")

# Wait for an instance to terminate
terminate_waiter = ec2.get_waiter('instance_terminated')
ec2.terminate_instances(InstanceIds=[instance_id])
terminate_waiter.wait(InstanceIds=[instance_id])
print("Instance terminated")
```

## Discovering Available Waiters

Not sure what waiters a service provides? You can list them programmatically.

```python
import boto3

# List all waiters available for EC2
ec2 = boto3.client('ec2')
print(ec2.waiter_names)
# Output: ['bundle_task_complete', 'conversion_task_cancelled',
#          'instance_exists', 'instance_running', 'instance_stopped', ...]

# List waiters for RDS
rds = boto3.client('rds')
print(rds.waiter_names)

# List waiters for S3
s3 = boto3.client('s3')
print(s3.waiter_names)
```

## Configuring Waiter Behavior

By default, waiters use sensible polling intervals and maximum retry counts. But you can customize these through the `WaiterConfig` parameter.

This configuration changes how long the waiter polls and how often it checks.

```python
from botocore.config import Config
import boto3

ec2 = boto3.client('ec2')

waiter = ec2.get_waiter('instance_running')

# Poll every 10 seconds, for a maximum of 30 attempts (5 minutes total)
waiter.wait(
    InstanceIds=['i-0123456789abcdef0'],
    WaiterConfig={
        'Delay': 10,       # seconds between polls
        'MaxAttempts': 30   # maximum number of polling attempts
    }
)
```

If the waiter exceeds the maximum number of attempts without the resource reaching the desired state, it raises a `WaiterError`.

## Handling Waiter Errors

You should always wrap waiter calls in try/except blocks, because they can fail if the operation takes longer than expected or if something goes wrong.

```python
from botocore.exceptions import WaiterError
import boto3

ec2 = boto3.client('ec2')
instance_id = 'i-0123456789abcdef0'

waiter = ec2.get_waiter('instance_running')

try:
    waiter.wait(
        InstanceIds=[instance_id],
        WaiterConfig={
            'Delay': 15,
            'MaxAttempts': 20
        }
    )
    print(f"Instance {instance_id} is running")
except WaiterError as e:
    print(f"Waiter failed: {e}")
    # Check the current state of the instance
    response = ec2.describe_instances(InstanceIds=[instance_id])
    state = response['Reservations'][0]['Instances'][0]['State']['Name']
    print(f"Current instance state: {state}")
```

## Real-World Example: S3 Waiters

S3 waiters are handy when you need to confirm a bucket or object exists before performing further operations.

This pattern ensures you don't try to upload to a bucket that hasn't finished creating yet.

```python
import boto3
from botocore.exceptions import WaiterError

s3 = boto3.client('s3')
bucket_name = 'my-new-bucket-12345'

# Create a bucket
s3.create_bucket(
    Bucket=bucket_name,
    CreateBucketConfiguration={'LocationConstraint': 'us-west-2'}
)

# Wait for the bucket to exist
waiter = s3.get_waiter('bucket_exists')
try:
    waiter.wait(Bucket=bucket_name)
    print(f"Bucket {bucket_name} is ready")
except WaiterError:
    print("Bucket creation timed out")

# Upload an object
s3.put_object(Bucket=bucket_name, Key='test.txt', Body=b'Hello')

# Wait for the object to exist
object_waiter = s3.get_waiter('object_exists')
object_waiter.wait(Bucket=bucket_name, Key='test.txt')
print("Object uploaded and confirmed")
```

## Building Custom Waiters

Sometimes the built-in waiters don't cover your use case. You can build custom waiters using the `botocore.waiter` module.

This custom waiter checks the status of a CloudFormation stack.

```python
import boto3
import botocore.waiter
import json

# Define a custom waiter model
waiter_model = botocore.waiter.WaiterModel({
    'version': 2,
    'waiters': {
        'StackCreateComplete': {
            'operation': 'DescribeStacks',
            'delay': 30,
            'maxAttempts': 60,
            'acceptors': [
                {
                    'matcher': 'pathAll',
                    'expected': 'CREATE_COMPLETE',
                    'argument': 'Stacks[].StackStatus',
                    'state': 'success'
                },
                {
                    'matcher': 'pathAny',
                    'expected': 'CREATE_FAILED',
                    'argument': 'Stacks[].StackStatus',
                    'state': 'failure'
                },
                {
                    'matcher': 'pathAny',
                    'expected': 'ROLLBACK_COMPLETE',
                    'argument': 'Stacks[].StackStatus',
                    'state': 'failure'
                }
            ]
        }
    }
})

cf = boto3.client('cloudformation')
custom_waiter = botocore.waiter.create_waiter_with_client(
    'StackCreateComplete', waiter_model, cf
)

# Use it just like a built-in waiter
try:
    custom_waiter.wait(StackName='my-stack')
    print("Stack creation complete")
except botocore.exceptions.WaiterError as e:
    print(f"Stack creation failed: {e}")
```

## Combining Waiters with Monitoring

In production systems, you'll want to log what's happening during the wait. One approach is to use a callback-based polling loop alongside waiter concepts.

This approach gives you visibility into the waiting process for debugging and monitoring purposes.

```python
import boto3
import time
from datetime import datetime

def wait_with_logging(client, instance_id, target_state='running',
                      max_attempts=30, delay=10):
    """Wait for an EC2 instance with logging at each poll."""
    for attempt in range(1, max_attempts + 1):
        response = client.describe_instances(InstanceIds=[instance_id])
        state = response['Reservations'][0]['Instances'][0]['State']['Name']

        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"[{timestamp}] Attempt {attempt}/{max_attempts}: "
              f"Instance state is '{state}'")

        if state == target_state:
            return True

        if state in ('terminated', 'shutting-down') and target_state == 'running':
            raise Exception(f"Instance entered unexpected state: {state}")

        time.sleep(delay)

    raise TimeoutError(
        f"Instance did not reach '{target_state}' after {max_attempts} attempts"
    )

ec2 = boto3.client('ec2')
# wait_with_logging(ec2, 'i-0123456789abcdef0')
```

## Best Practices

There are a few things to keep in mind when working with waiters:

- **Set appropriate timeouts.** The default `MaxAttempts` and `Delay` values work for most cases, but long-running operations like RDS instance creation might need higher limits.
- **Handle errors gracefully.** Always catch `WaiterError` and provide fallback logic or meaningful error messages.
- **Don't forget API throttling.** Each waiter poll is an API call. If you're waiting on many resources simultaneously, you could hit rate limits. Increase the delay or stagger your waiter calls.
- **Use built-in waiters when available.** They handle edge cases that custom polling loops often miss.
- **Log during long waits.** In production, silent waits make debugging painful. Add logging so you know what state resources are in.

For more on handling Boto3 errors that can occur during waiter operations, check out the companion post on [Boto3 error handling](https://oneuptime.com/blog/post/boto3-errors-and-exceptions/view). And if you're monitoring your AWS infrastructure, integrating waiter outcomes with your observability stack can help you catch deployment issues early.

Waiters aren't glamorous, but they're one of those features that make your AWS automation significantly more reliable. Use them instead of rolling your own polling loops, and you'll save yourself a lot of debugging time.
