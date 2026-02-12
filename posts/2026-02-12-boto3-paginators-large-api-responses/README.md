# How to Use Boto3 Paginators for Large API Responses

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Boto3, Python, Pagination, SDK

Description: Learn how to use Boto3 paginators to efficiently handle large API responses in Python, avoiding incomplete data and memory issues.

---

If you've ever called `s3.list_objects_v2()` and wondered why you only got 1000 objects back when your bucket has millions, you've run into API pagination. AWS APIs cap the number of items per response, and if you're not paginating, you're only seeing a slice of your data. Boto3 paginators solve this cleanly.

Instead of manually tracking continuation tokens and writing loops, paginators handle the repetitive work of fetching every page. You get an iterator that yields pages until there are no more results. Let's look at how to use them effectively.

## The Problem: Truncated Results

Here's the trap that catches people.

```python
import boto3

s3 = boto3.client('s3')

# This only returns UP TO 1000 objects
response = s3.list_objects_v2(Bucket='my-bucket')
objects = response.get('Contents', [])
print(f"Found {len(objects)} objects")  # Max 1000, even if there are more

# You'd need to check IsTruncated and use ContinuationToken manually
# That's tedious and error-prone
```

With a paginator, you don't worry about any of that.

```python
import boto3

s3 = boto3.client('s3')

# This gets ALL objects, regardless of count
paginator = s3.get_paginator('list_objects_v2')
pages = paginator.paginate(Bucket='my-bucket')

total = 0
for page in pages:
    objects = page.get('Contents', [])
    total += len(objects)

print(f"Found {total} objects")  # Actual count, could be millions
```

## Basic Paginator Usage

Every boto3 client has a `get_paginator()` method that accepts the name of an API operation.

```python
import boto3

# EC2 instances
ec2 = boto3.client('ec2')
paginator = ec2.get_paginator('describe_instances')
for page in paginator.paginate():
    for reservation in page['Reservations']:
        for instance in reservation['Instances']:
            print(f"{instance['InstanceId']}: {instance['State']['Name']}")

# CloudWatch log groups
logs = boto3.client('logs')
paginator = logs.get_paginator('describe_log_groups')
for page in paginator.paginate():
    for group in page['logGroups']:
        print(group['logGroupName'])

# IAM users
iam = boto3.client('iam')
paginator = iam.get_paginator('list_users')
for page in paginator.paginate():
    for user in page['Users']:
        print(f"{user['UserName']} - created {user['CreateDate']}")
```

## Controlling Pagination

### Page Size

Control how many items per API call. This doesn't limit total results - it just changes the batch size.

```python
import boto3

s3 = boto3.client('s3')
paginator = s3.get_paginator('list_objects_v2')

# Fetch 100 objects per API call instead of the default 1000
pages = paginator.paginate(
    Bucket='my-bucket',
    PaginationConfig={
        'PageSize': 100  # items per page
    }
)

for page in pages:
    objects = page.get('Contents', [])
    print(f"Page has {len(objects)} objects")
```

Smaller page sizes are useful when you need to process results incrementally without holding large responses in memory, or when you're hitting API rate limits.

### Maximum Items

Limit the total number of items returned across all pages.

```python
import boto3

s3 = boto3.client('s3')
paginator = s3.get_paginator('list_objects_v2')

# Get only the first 250 objects total
pages = paginator.paginate(
    Bucket='my-bucket',
    PaginationConfig={
        'MaxItems': 250,
        'PageSize': 100
    }
)

total = 0
for page in pages:
    objects = page.get('Contents', [])
    total += len(objects)
    print(f"Got {len(objects)} this page, {total} total")
```

### Starting Token

Resume pagination from where you left off.

```python
import boto3
import json

s3 = boto3.client('s3')
paginator = s3.get_paginator('list_objects_v2')

# First batch: get 100 items and save the token
pages = paginator.paginate(
    Bucket='my-bucket',
    PaginationConfig={
        'MaxItems': 100,
        'PageSize': 100
    }
)

last_token = None
for page in pages:
    objects = page.get('Contents', [])
    last_token = page.get('NextToken')  # Save this
    for obj in objects:
        process_object(obj)

# Later: resume from where we left off
if last_token:
    pages = paginator.paginate(
        Bucket='my-bucket',
        PaginationConfig={
            'MaxItems': 100,
            'PageSize': 100,
            'StartingToken': last_token
        }
    )
    for page in pages:
        for obj in page.get('Contents', []):
            process_object(obj)
```

## JMESPath Filtering with Paginators

Paginators support JMESPath filtering through the `search()` method. This is powerful for extracting specific data from paginated results.

```python
import boto3

ec2 = boto3.client('ec2')
paginator = ec2.get_paginator('describe_instances')

# Use JMESPath to filter and flatten results
running_instances = paginator.paginate().search(
    "Reservations[].Instances[?State.Name == 'running'].InstanceId[]"
)

# running_instances is a generator that yields individual instance IDs
for instance_id in running_instances:
    print(instance_id)
```

The `search()` method applies the JMESPath expression to each page and yields matching results. This is memory-efficient because it processes one page at a time.

More examples of search patterns.

```python
import boto3

# Find all large S3 objects
s3 = boto3.client('s3')
paginator = s3.get_paginator('list_objects_v2')

large_objects = paginator.paginate(Bucket='my-bucket').search(
    "Contents[?Size > `104857600`].{Key: Key, SizeMB: Size}"
)

for obj in large_objects:
    if obj:  # search can yield None for empty pages
        size_mb = obj['SizeMB'] / 1024 / 1024
        print(f"{obj['Key']}: {size_mb:.1f} MB")

# Find EC2 instances with a specific tag
ec2 = boto3.client('ec2')
paginator = ec2.get_paginator('describe_instances')

prod_instances = paginator.paginate().search(
    "Reservations[].Instances[?Tags[?Key=='Environment' && Value=='production']].{ID: InstanceId, Type: InstanceType}[]"
)

for instance in prod_instances:
    if instance:
        print(f"{instance['ID']}: {instance['Type']}")
```

## Building Reusable Paginator Helpers

Here's a helper class that makes pagination even easier.

```python
import boto3
from typing import Generator, Any

class PaginatedQuery:
    """Helper for common paginated AWS queries."""

    def __init__(self, profile_name=None, region_name=None):
        self.session = boto3.Session(
            profile_name=profile_name,
            region_name=region_name
        )

    def _paginate(self, service, operation, jmespath=None, **kwargs):
        """Generic paginator with optional JMESPath search."""
        client = self.session.client(service)
        paginator = client.get_paginator(operation)
        pages = paginator.paginate(**kwargs)

        if jmespath:
            for item in pages.search(jmespath):
                if item is not None:
                    yield item
        else:
            for page in pages:
                yield page

    def list_all_s3_objects(self, bucket, prefix=''):
        """List all objects in an S3 bucket."""
        return self._paginate(
            's3', 'list_objects_v2',
            jmespath="Contents[]",
            Bucket=bucket,
            Prefix=prefix
        )

    def list_all_instances(self, filters=None):
        """List all EC2 instances with optional filters."""
        kwargs = {}
        if filters:
            kwargs['Filters'] = filters

        return self._paginate(
            'ec2', 'describe_instances',
            jmespath="Reservations[].Instances[]",
            **kwargs
        )

    def list_all_log_groups(self, prefix=None):
        """List all CloudWatch log groups."""
        kwargs = {}
        if prefix:
            kwargs['logGroupNamePrefix'] = prefix

        return self._paginate(
            'logs', 'describe_log_groups',
            jmespath="logGroups[]",
            **kwargs
        )

    def list_all_lambda_functions(self):
        """List all Lambda functions."""
        return self._paginate(
            'lambda', 'list_functions',
            jmespath="Functions[]"
        )

# Usage
query = PaginatedQuery(region_name='us-east-1')

# Count S3 objects
count = sum(1 for _ in query.list_all_s3_objects('my-bucket'))
print(f"Total objects: {count}")

# Find running instances
for instance in query.list_all_instances(
    filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
):
    print(f"{instance['InstanceId']}: {instance['InstanceType']}")
```

## Handling Large Data Sets Efficiently

When processing millions of items, memory management matters. Paginators are already lazy (they fetch pages on demand), but you can optimize further.

```python
import boto3
import csv
from io import StringIO

def export_s3_inventory(bucket, output_file):
    """Export S3 bucket inventory to CSV without loading everything in memory."""
    s3 = boto3.client('s3')
    paginator = s3.get_paginator('list_objects_v2')

    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Key', 'Size', 'LastModified', 'StorageClass'])

        total = 0
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get('Contents', []):
                writer.writerow([
                    obj['Key'],
                    obj['Size'],
                    obj['LastModified'].isoformat(),
                    obj.get('StorageClass', 'STANDARD')
                ])
                total += 1

            # Progress update every page
            print(f"  Exported {total} objects...", end='\r')

    print(f"\nDone. Exported {total} objects to {output_file}")

# This handles millions of objects without memory issues
export_s3_inventory('my-huge-bucket', 'inventory.csv')
```

## Parallel Pagination

For multi-region or multi-account queries, parallelize the pagination.

```python
import boto3
from concurrent.futures import ThreadPoolExecutor, as_completed

def count_instances_in_region(region):
    """Count running EC2 instances in a specific region."""
    session = boto3.Session(region_name=region)
    ec2 = session.client('ec2')
    paginator = ec2.get_paginator('describe_instances')

    count = 0
    for page in paginator.paginate(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    ):
        for reservation in page['Reservations']:
            count += len(reservation['Instances'])

    return region, count

# Query all regions in parallel
regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']

with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {
        executor.submit(count_instances_in_region, region): region
        for region in regions
    }

    total = 0
    for future in as_completed(futures):
        region, count = future.result()
        total += count
        print(f"{region}: {count} running instances")

    print(f"\nTotal across all regions: {total}")
```

## Error Handling

Paginator calls can fail mid-pagination. Handle errors gracefully.

```python
import boto3
from botocore.exceptions import ClientError
import time

def resilient_paginate(client, operation, max_retries=3, **kwargs):
    """Paginate with retry logic for transient errors."""
    paginator = client.get_paginator(operation)

    retry_count = 0
    starting_token = None

    while True:
        try:
            config = {}
            if starting_token:
                config['StartingToken'] = starting_token

            pages = paginator.paginate(
                PaginationConfig=config,
                **kwargs
            )

            for page in pages:
                yield page
                # Save token for potential retry
                starting_token = page.get('NextToken')
                retry_count = 0  # Reset on success

            break  # All pages processed successfully

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'Throttling' and retry_count < max_retries:
                retry_count += 1
                wait_time = 2 ** retry_count  # exponential backoff
                print(f"Throttled. Retrying in {wait_time}s (attempt {retry_count}/{max_retries})")
                time.sleep(wait_time)
            else:
                raise

# Usage
s3 = boto3.client('s3')
for page in resilient_paginate(s3, 'list_objects_v2', Bucket='my-bucket'):
    for obj in page.get('Contents', []):
        print(obj['Key'])
```

## Monitoring

When your Python applications are processing large paginated datasets, monitoring performance and API usage is important. [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-logs-setup/view) can help you track API call rates, latencies, and errors across your boto3-powered services.

## Which Operations Support Paginators?

Not every API operation has a paginator. Check what's available.

```python
import boto3

# List available paginators for a service
s3 = boto3.client('s3')
print(s3.can_paginate('list_objects_v2'))  # True
print(s3.can_paginate('get_object'))      # False (single object, no pagination)

# Or check the paginator config
print(s3.meta.service_model.operation_names)
```

## Wrapping Up

Paginators are one of those boto3 features that you should always use when listing resources. The alternative - manually tracking tokens and writing while loops - is tedious, error-prone, and harder to read. Get comfortable with `get_paginator()`, `.search()` for JMESPath filtering, and `PaginationConfig` for controlling behavior. These three tools cover virtually every pagination scenario you'll encounter when working with AWS APIs in Python.
