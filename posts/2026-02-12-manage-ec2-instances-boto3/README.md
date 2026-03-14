# How to Manage EC2 Instances with Boto3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Boto3, Python

Description: A practical guide to managing Amazon EC2 instances with Boto3 in Python, covering launching, stopping, tagging, monitoring, and automating instance lifecycle operations.

---

Managing EC2 instances programmatically is at the heart of any AWS automation strategy. Whether you're building auto-scaling scripts, cost-optimization tools, or deployment pipelines, Boto3 gives you complete control over the EC2 lifecycle. Let's go through all the key operations you need to know.

## Launching an Instance

The most basic operation is launching a new instance. You'll need at minimum an AMI ID and an instance type.

```python
import boto3

ec2 = boto3.resource('ec2')

# Launch a single instance
instances = ec2.create_instances(
    ImageId='ami-0abcdef1234567890',
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1,
    KeyName='my-key-pair',
    SecurityGroupIds=['sg-0123456789abcdef0'],
    SubnetId='subnet-0123456789abcdef0',
    TagSpecifications=[
        {
            'ResourceType': 'instance',
            'Tags': [
                {'Key': 'Name', 'Value': 'my-web-server'},
                {'Key': 'Environment', 'Value': 'production'},
                {'Key': 'Team', 'Value': 'backend'}
            ]
        }
    ]
)

instance = instances[0]
print(f"Launched instance: {instance.id}")

# Wait for the instance to be running
instance.wait_until_running()
instance.reload()
print(f"Public IP: {instance.public_ip_address}")
print(f"Private IP: {instance.private_ip_address}")
```

## Launching with User Data

User data lets you pass a startup script that runs when the instance first boots.

```python
import boto3
import base64

ec2 = boto3.resource('ec2')

# Startup script to install and start nginx
user_data_script = """#!/bin/bash
yum update -y
yum install -y nginx
systemctl start nginx
systemctl enable nginx
echo "Hello from $(hostname)" > /usr/share/nginx/html/index.html
"""

instances = ec2.create_instances(
    ImageId='ami-0abcdef1234567890',
    InstanceType='t3.small',
    MinCount=1,
    MaxCount=1,
    UserData=user_data_script,
    TagSpecifications=[
        {
            'ResourceType': 'instance',
            'Tags': [{'Key': 'Name', 'Value': 'web-server-nginx'}]
        }
    ]
)

print(f"Launched {instances[0].id} with nginx user data")
```

## Listing and Filtering Instances

You'll often need to find instances based on tags, states, or other attributes.

```python
import boto3

ec2 = boto3.resource('ec2')

# List all running instances
running_instances = ec2.instances.filter(
    Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
)

for instance in running_instances:
    name_tag = next(
        (t['Value'] for t in (instance.tags or []) if t['Key'] == 'Name'),
        'No Name'
    )
    print(f"{instance.id} | {name_tag} | {instance.instance_type} | "
          f"{instance.public_ip_address}")

# Filter by tag
prod_instances = ec2.instances.filter(
    Filters=[
        {'Name': 'tag:Environment', 'Values': ['production']},
        {'Name': 'instance-state-name', 'Values': ['running']}
    ]
)

# Filter by instance type
large_instances = ec2.instances.filter(
    Filters=[
        {'Name': 'instance-type', 'Values': ['m5.xlarge', 'm5.2xlarge']},
        {'Name': 'instance-state-name', 'Values': ['running']}
    ]
)
```

## Stopping and Starting Instances

Basic lifecycle operations are straightforward with the resource interface.

```python
import boto3

ec2 = boto3.resource('ec2')

instance_id = 'i-0123456789abcdef0'
instance = ec2.Instance(instance_id)

# Stop an instance
print(f"Stopping {instance_id}...")
instance.stop()
instance.wait_until_stopped()
print(f"Instance stopped. State: {instance.state['Name']}")

# Start it back up
print(f"Starting {instance_id}...")
instance.start()
instance.wait_until_running()
instance.reload()
print(f"Instance running. IP: {instance.public_ip_address}")
```

## Bulk Operations

When you need to stop or start multiple instances at once, use the client interface for batch operations.

```python
import boto3

ec2_client = boto3.client('ec2')

instance_ids = ['i-0123456789abcdef0', 'i-0123456789abcdef1', 'i-0123456789abcdef2']

# Stop multiple instances
response = ec2_client.stop_instances(InstanceIds=instance_ids)
for change in response['StoppingInstances']:
    print(f"{change['InstanceId']}: {change['PreviousState']['Name']} -> "
          f"{change['CurrentState']['Name']}")

# Start multiple instances
response = ec2_client.start_instances(InstanceIds=instance_ids)
for change in response['StartingInstances']:
    print(f"{change['InstanceId']}: {change['PreviousState']['Name']} -> "
          f"{change['CurrentState']['Name']}")
```

## Terminating Instances

Termination permanently destroys an instance. Be careful with this one.

```python
import boto3

ec2 = boto3.resource('ec2')

instance = ec2.Instance('i-0123456789abcdef0')

# Check for termination protection first
client = boto3.client('ec2')
protection = client.describe_instance_attribute(
    InstanceId='i-0123456789abcdef0',
    Attribute='disableApiTermination'
)

if protection['DisableApiTermination']['Value']:
    print("Termination protection is ON - disable it first")
    client.modify_instance_attribute(
        InstanceId='i-0123456789abcdef0',
        DisableApiTermination={'Value': False}
    )

# Now terminate
instance.terminate()
instance.wait_until_terminated()
print("Instance terminated")
```

## Managing Tags

Tags are essential for organization, cost tracking, and automation.

```python
import boto3

ec2 = boto3.resource('ec2')
instance = ec2.Instance('i-0123456789abcdef0')

# Add or update tags
instance.create_tags(
    Tags=[
        {'Key': 'Project', 'Value': 'website-redesign'},
        {'Key': 'CostCenter', 'Value': 'engineering-42'},
        {'Key': 'AutoShutdown', 'Value': 'true'}
    ]
)

# Read tags
for tag in instance.tags:
    print(f"{tag['Key']}: {tag['Value']}")

# Delete specific tags
client = boto3.client('ec2')
client.delete_tags(
    Resources=['i-0123456789abcdef0'],
    Tags=[{'Key': 'AutoShutdown'}]
)
```

## Modifying Instance Attributes

You can change the instance type, security groups, and other attributes.

```python
import boto3

ec2 = boto3.resource('ec2')
client = boto3.client('ec2')
instance_id = 'i-0123456789abcdef0'
instance = ec2.Instance(instance_id)

# Change instance type (instance must be stopped)
instance.stop()
instance.wait_until_stopped()

client.modify_instance_attribute(
    InstanceId=instance_id,
    InstanceType={'Value': 't3.large'}
)

instance.start()
instance.wait_until_running()
print(f"Instance resized to t3.large")

# Modify security groups
client.modify_instance_attribute(
    InstanceId=instance_id,
    Groups=['sg-new-group-1', 'sg-new-group-2']
)
```

## Cost Optimization: Schedule Stop/Start

A common automation is stopping dev instances overnight to save money.

```python
import boto3
from datetime import datetime

def stop_dev_instances():
    """Stop all instances tagged with AutoShutdown=true."""
    ec2 = boto3.resource('ec2')

    instances = ec2.instances.filter(
        Filters=[
            {'Name': 'tag:AutoShutdown', 'Values': ['true']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )

    instance_ids = [i.id for i in instances]

    if not instance_ids:
        print("No instances to stop")
        return

    client = boto3.client('ec2')
    client.stop_instances(InstanceIds=instance_ids)
    print(f"Stopped {len(instance_ids)} instances: {instance_ids}")

def start_dev_instances():
    """Start all instances tagged with AutoShutdown=true."""
    ec2 = boto3.resource('ec2')

    instances = ec2.instances.filter(
        Filters=[
            {'Name': 'tag:AutoShutdown', 'Values': ['true']},
            {'Name': 'instance-state-name', 'Values': ['stopped']}
        ]
    )

    instance_ids = [i.id for i in instances]

    if not instance_ids:
        print("No instances to start")
        return

    client = boto3.client('ec2')
    client.start_instances(InstanceIds=instance_ids)
    print(f"Started {len(instance_ids)} instances: {instance_ids}")
```

## Monitoring Instance Metrics

You can retrieve CloudWatch metrics for your instances directly through Boto3.

```python
import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client('cloudwatch')

# Get CPU utilization for the last hour
response = cloudwatch.get_metric_statistics(
    Namespace='AWS/EC2',
    MetricName='CPUUtilization',
    Dimensions=[
        {'Name': 'InstanceId', 'Value': 'i-0123456789abcdef0'}
    ],
    StartTime=datetime.utcnow() - timedelta(hours=1),
    EndTime=datetime.utcnow(),
    Period=300,  # 5-minute intervals
    Statistics=['Average', 'Maximum']
)

for point in sorted(response['Datapoints'], key=lambda x: x['Timestamp']):
    print(f"{point['Timestamp']}: avg={point['Average']:.1f}%, "
          f"max={point['Maximum']:.1f}%")
```

## Creating AMI Snapshots

Before major changes, create an AMI backup of your instance.

```python
import boto3
from datetime import datetime

ec2 = boto3.resource('ec2')
instance = ec2.Instance('i-0123456789abcdef0')

# Create an AMI
timestamp = datetime.now().strftime('%Y%m%d-%H%M')
image = instance.create_image(
    Name=f"backup-{instance.id}-{timestamp}",
    Description=f"Automated backup of {instance.id}",
    NoReboot=True  # don't restart the instance
)

print(f"AMI created: {image.id}")

# Wait for the AMI to be available
image.wait_until_exists(
    Filters=[{'Name': 'state', 'Values': ['available']}]
)
print(f"AMI {image.id} is ready")
```

## Best Practices

- **Always tag your instances.** Tags make filtering, cost tracking, and automation so much easier.
- **Use waiter methods** instead of polling loops. Boto3's `wait_until_running()` and similar methods are more reliable than custom loops. See our guide on [Boto3 waiters](https://oneuptime.com/blog/post/2026-02-12-boto3-waiters-async-operations/view) for details.
- **Enable termination protection** for production instances to prevent accidental deletion.
- **Monitor costs.** Use tags and CloudWatch to track spending per instance and automate shutdowns for non-production resources.
- **Handle errors properly.** EC2 operations can fail for many reasons. See [Boto3 error handling](https://oneuptime.com/blog/post/2026-02-12-boto3-errors-and-exceptions/view) for comprehensive error management strategies.
- **Use the resource interface** for single-instance operations and the client for batch operations.
