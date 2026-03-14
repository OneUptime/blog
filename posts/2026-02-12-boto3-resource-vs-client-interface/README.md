# How to Use Boto3 Resource vs Client Interface

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Boto3, Python

Description: Understand the differences between Boto3 resource and client interfaces, when to use each, and how to combine them effectively in your AWS Python projects.

---

Boto3 gives you two distinct ways to interact with AWS services: the **client** interface and the **resource** interface. Both let you accomplish the same tasks, but they work quite differently. Picking the right one - or knowing when to mix them - can make your code cleaner and more maintainable. Let's break down the differences and figure out when to use each.

## The Client Interface

The client interface is the low-level API. It maps directly to AWS service API operations. Every method on a client corresponds to a single API call, and the responses come back as plain Python dictionaries.

Here's what basic S3 operations look like with the client interface.

```python
import boto3

# Create an S3 client
s3_client = boto3.client('s3')

# List all buckets
response = s3_client.list_buckets()
for bucket in response['Buckets']:
    print(bucket['Name'])

# Get an object - response is a dictionary
response = s3_client.get_object(Bucket='my-bucket', Key='data.json')
body = response['Body'].read().decode('utf-8')
print(body)
```

The client interface covers every API action for every AWS service. If an operation exists in the AWS API, the client has a method for it.

## The Resource Interface

The resource interface is the higher-level, object-oriented API. Instead of working with dictionaries, you work with Python objects that have attributes and methods. Resources handle pagination automatically and provide a more intuitive programming model.

The same S3 operations look notably different with resources.

```python
import boto3

# Create an S3 resource
s3_resource = boto3.resource('s3')

# List all buckets - returns Bucket objects
for bucket in s3_resource.buckets.all():
    print(bucket.name)

# Get an object - it's an object, not a dictionary
obj = s3_resource.Object('my-bucket', 'data.json')
body = obj.get()['Body'].read().decode('utf-8')
print(body)
```

## Side-by-Side Comparison

Let's look at a few more operations to really see the difference.

Creating and uploading to an S3 bucket with the client interface requires separate API calls that you manage yourself.

```python
import boto3

# Client approach
client = boto3.client('s3')

# Create bucket
client.create_bucket(
    Bucket='my-new-bucket',
    CreateBucketConfiguration={'LocationConstraint': 'us-west-2'}
)

# Upload a file
client.upload_file('local-file.txt', 'my-new-bucket', 'remote-file.txt')

# List objects in the bucket
response = client.list_objects_v2(Bucket='my-new-bucket')
if 'Contents' in response:
    for obj in response['Contents']:
        print(f"{obj['Key']} - {obj['Size']} bytes")
```

The resource interface wraps these in a more natural object model.

```python
import boto3

# Resource approach
s3 = boto3.resource('s3')

# Create bucket - returns a Bucket object
bucket = s3.create_bucket(
    Bucket='my-new-bucket',
    CreateBucketConfiguration={'LocationConstraint': 'us-west-2'}
)

# Upload a file directly on the bucket object
bucket.upload_file('local-file.txt', 'remote-file.txt')

# List objects - automatic pagination
for obj in bucket.objects.all():
    print(f"{obj.key} - {obj.size} bytes")
```

## EC2 Comparison

The difference becomes even more apparent with EC2 operations.

Managing EC2 instances with the client requires parsing nested dictionaries.

```python
import boto3

# Client approach
ec2_client = boto3.client('ec2')

# Launch an instance
response = ec2_client.run_instances(
    ImageId='ami-0abcdef1234567890',
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1
)
instance_id = response['Instances'][0]['InstanceId']

# Get instance details
desc = ec2_client.describe_instances(InstanceIds=[instance_id])
instance = desc['Reservations'][0]['Instances'][0]
print(f"State: {instance['State']['Name']}")
print(f"Public IP: {instance.get('PublicIpAddress', 'None')}")

# Stop the instance
ec2_client.stop_instances(InstanceIds=[instance_id])
```

The resource interface gives you proper objects with methods.

```python
import boto3

# Resource approach
ec2 = boto3.resource('ec2')

# Launch an instance - returns Instance objects
instances = ec2.create_instances(
    ImageId='ami-0abcdef1234567890',
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1
)
instance = instances[0]

# Wait for it to be running
instance.wait_until_running()
instance.reload()  # refresh attributes

print(f"State: {instance.state['Name']}")
print(f"Public IP: {instance.public_ip_address}")

# Stop the instance
instance.stop()
```

## Pagination Differences

One of the biggest practical differences is how pagination works. The client requires you to handle pagination tokens manually or use a paginator. Resources handle it automatically.

Pagination with the client requires explicit handling of continuation tokens.

```python
import boto3

# Client - manual pagination
client = boto3.client('s3')

all_objects = []
paginator = client.get_paginator('list_objects_v2')
for page in paginator.paginate(Bucket='my-bucket'):
    if 'Contents' in page:
        all_objects.extend(page['Contents'])

print(f"Total objects: {len(all_objects)}")
```

Resources abstract pagination away entirely.

```python
import boto3

# Resource - automatic pagination
s3 = boto3.resource('s3')
bucket = s3.Bucket('my-bucket')

all_objects = list(bucket.objects.all())
print(f"Total objects: {len(all_objects)}")
```

## When to Use the Client

Choose the client interface when:

- **You need full API coverage.** The resource interface only covers a handful of services (S3, EC2, DynamoDB, SQS, SNS, IAM, CloudFormation, CloudWatch, Glacier). The client covers everything.
- **You need fine-grained control over API calls.** The client maps 1:1 to API operations, so you know exactly what's happening.
- **You're working with newer AWS features.** New API operations appear in the client first. Resources sometimes lag behind.
- **You want raw dictionary responses.** If you're serializing responses to JSON or passing them to other systems, dictionaries are easier to work with.

## When to Use the Resource

Choose the resource interface when:

- **Readability matters.** `instance.stop()` is clearer than `client.stop_instances(InstanceIds=[instance_id])`.
- **You're doing CRUD operations.** Resources shine for creating, reading, updating, and deleting individual resources.
- **You want automatic pagination.** Collections like `bucket.objects.all()` handle pagination transparently.
- **You're building object-oriented code.** Resources fit naturally into class-based Python architectures.

## Mixing Both Interfaces

In practice, most projects end up using both. You can get the underlying client from a resource, or access resource objects from client responses.

```python
import boto3

s3_resource = boto3.resource('s3')

# Get the client from a resource
s3_client = s3_resource.meta.client

# Use the client for operations the resource doesn't support
response = s3_client.get_bucket_versioning(Bucket='my-bucket')
print(f"Versioning: {response.get('Status', 'Disabled')}")

# Use the resource for object-oriented operations
bucket = s3_resource.Bucket('my-bucket')
for obj in bucket.objects.filter(Prefix='logs/'):
    print(obj.key)
```

## A Note on Resource Deprecation

AWS has stated that they won't be adding resource interface support for new services. The existing resource interfaces for S3, EC2, DynamoDB, and others will continue to work, but don't expect resources for newer services like Bedrock or App Runner. For new services, the client interface is your only option.

That said, the existing resource interfaces aren't going anywhere. They're still perfectly fine to use for the services they support.

## Quick Reference

| Feature | Client | Resource |
|---------|--------|----------|
| API coverage | All services | ~10 services |
| Response format | Dictionaries | Objects |
| Pagination | Manual/Paginator | Automatic |
| New features | Immediate | Delayed |
| Object-oriented | No | Yes |
| Batch operations | Manual | Built-in |

## My Recommendation

Start with the resource interface for services that support it, and fall back to the client when you need something the resource doesn't offer. If you need to handle errors in detail, check out the guide on [Boto3 error handling](https://oneuptime.com/blog/post/2026-02-12-boto3-errors-and-exceptions/view) to make sure you're catching exceptions properly regardless of which interface you choose.

The client gives you power and coverage. The resource gives you clarity and convenience. Use both.
