# How to Use Amazon Bedrock Batch Inference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Bedrock, Batch Processing, AI, Cost Optimization

Description: Learn how to use Amazon Bedrock batch inference to process large volumes of prompts cost-effectively, including job setup, monitoring, and result handling.

---

When you have thousands or millions of prompts to process and don't need real-time responses, batch inference is the way to go. Amazon Bedrock batch inference lets you submit a file of prompts and get back all the results at a fraction of the cost of real-time API calls. You trade latency for savings - and when you're processing a backlog of documents, doing bulk analysis, or running evaluations, that tradeoff makes perfect sense.

Batch inference runs asynchronously. You upload your input file to S3, kick off the job, and come back later for the results. It typically costs around 50% less than on-demand invocations, which adds up fast at scale.

## Preparing Your Input Data

Bedrock batch inference expects a JSONL file where each line contains a single inference request. The format follows the same structure as real-time API calls, wrapped in a record format.

Here's what the input file looks like.

```json
{"recordId": "rec-001", "modelInput": {"anthropic_version": "bedrock-2023-05-31", "max_tokens": 512, "messages": [{"role": "user", "content": "Summarize the key benefits of microservices architecture."}]}}
{"recordId": "rec-002", "modelInput": {"anthropic_version": "bedrock-2023-05-31", "max_tokens": 512, "messages": [{"role": "user", "content": "Explain the difference between SQL and NoSQL databases."}]}}
{"recordId": "rec-003", "modelInput": {"anthropic_version": "bedrock-2023-05-31", "max_tokens": 512, "messages": [{"role": "user", "content": "What are the best practices for API rate limiting?"}]}}
```

Let's write a script that generates this file from a list of prompts.

```python
import json

def create_batch_input(prompts, output_file, model_params=None):
    """Create a JSONL input file for Bedrock batch inference.

    Args:
        prompts: List of dicts with 'id' and 'text' keys
        output_file: Path to the output JSONL file
        model_params: Optional dict of model parameters
    """
    params = model_params or {
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 1024,
        'temperature': 0.3
    }

    with open(output_file, 'w') as f:
        for prompt in prompts:
            record = {
                'recordId': prompt['id'],
                'modelInput': {
                    **params,
                    'messages': [
                        {'role': 'user', 'content': prompt['text']}
                    ]
                }
            }
            f.write(json.dumps(record) + '\n')

    print(f"Created batch input with {len(prompts)} records: {output_file}")

# Example: generate batch input for document summarization
prompts = [
    {'id': f'doc-{i:04d}', 'text': f'Summarize this document: {doc}'}
    for i, doc in enumerate(documents_to_summarize)
]

create_batch_input(prompts, 'batch_input.jsonl')
```

## Uploading to S3 and Starting the Job

Upload your input file to S3, then create the batch inference job.

```python
import boto3

s3 = boto3.client('s3', region_name='us-east-1')
bedrock = boto3.client('bedrock', region_name='us-east-1')

# Upload input file to S3
bucket = 'my-bedrock-batch-bucket'
input_key = 'batch-jobs/input/summarization-batch.jsonl'

s3.upload_file('batch_input.jsonl', bucket, input_key)
print(f"Uploaded input to s3://{bucket}/{input_key}")

# Create the batch inference job
response = bedrock.create_model_invocation_job(
    jobName='summarization-batch-2026-02',
    modelId='anthropic.claude-3-sonnet-20240229-v1:0',
    roleArn='arn:aws:iam::123456789012:role/BedrockBatchRole',
    inputDataConfig={
        's3InputDataConfig': {
            's3Uri': f's3://{bucket}/{input_key}',
            's3InputFormat': 'JSONL'
        }
    },
    outputDataConfig={
        's3OutputDataConfig': {
            's3Uri': f's3://{bucket}/batch-jobs/output/'
        }
    }
)

job_arn = response['jobArn']
print(f"Batch job started: {job_arn}")
```

## IAM Permissions

Your batch inference role needs specific permissions. Here's the IAM policy.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel"
            ],
            "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::my-bedrock-batch-bucket",
                "arn:aws:s3:::my-bedrock-batch-bucket/batch-jobs/input/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::my-bedrock-batch-bucket/batch-jobs/output/*"
        }
    ]
}
```

## Monitoring Job Progress

Batch jobs can take anywhere from minutes to hours depending on the volume. Monitor the status through the API.

```python
import time

def monitor_batch_job(job_arn):
    """Monitor a batch inference job until completion."""
    while True:
        response = bedrock.get_model_invocation_job(jobIdentifier=job_arn)
        status = response['status']
        job_name = response['jobName']

        print(f"[{job_name}] Status: {status}")

        if status == 'Completed':
            output_uri = response['outputDataConfig']['s3OutputDataConfig']['s3Uri']
            print(f"Job complete! Output at: {output_uri}")

            # Print stats if available
            if 'stats' in response:
                stats = response['stats']
                print(f"  Processed: {stats.get('inputTokenCount', 'N/A')} input tokens")
                print(f"  Generated: {stats.get('outputTokenCount', 'N/A')} output tokens")

            return response

        elif status == 'Failed':
            message = response.get('message', 'No error message')
            print(f"Job failed: {message}")
            return response

        elif status in ['Stopping', 'Stopped']:
            print("Job was stopped")
            return response

        # Poll every 30 seconds
        time.sleep(30)

monitor_batch_job(job_arn)
```

## Processing Results

The output is also a JSONL file, with each line containing the model's response for one input record.

```python
import json
from io import BytesIO

def process_batch_results(bucket, output_prefix):
    """Download and parse batch inference results from S3."""

    # List output files
    response = s3.list_objects_v2(Bucket=bucket, Prefix=output_prefix)

    results = {}
    errors = []

    for obj in response.get('Contents', []):
        key = obj['Key']
        if not key.endswith('.jsonl.out'):
            continue

        # Download and parse the output file
        file_obj = s3.get_object(Bucket=bucket, Key=key)
        content = file_obj['Body'].read().decode('utf-8')

        for line in content.strip().split('\n'):
            if not line:
                continue

            record = json.loads(line)
            record_id = record['recordId']

            if record.get('error'):
                errors.append({
                    'id': record_id,
                    'error': record['error']
                })
            else:
                # Extract the model's response
                model_output = record['modelOutput']
                text = model_output['content'][0]['text']
                results[record_id] = {
                    'text': text,
                    'input_tokens': model_output.get('usage', {}).get('input_tokens', 0),
                    'output_tokens': model_output.get('usage', {}).get('output_tokens', 0)
                }

    print(f"Processed {len(results)} results, {len(errors)} errors")
    return results, errors

results, errors = process_batch_results(bucket, 'batch-jobs/output/')

# Do something with the results
for record_id, data in list(results.items())[:5]:
    print(f"\n--- {record_id} ---")
    print(data['text'][:200])
```

## Cost Comparison

Let's put the cost savings in perspective. Say you're processing 10,000 prompts, each averaging 500 input tokens and 200 output tokens.

```python
def estimate_batch_savings(num_prompts, avg_input_tokens, avg_output_tokens):
    """Estimate cost savings from batch vs on-demand inference."""
    # Approximate pricing per 1K tokens (check current pricing)
    on_demand_input = 0.003   # per 1K input tokens
    on_demand_output = 0.015  # per 1K output tokens
    batch_discount = 0.5      # 50% discount for batch

    total_input = num_prompts * avg_input_tokens / 1000
    total_output = num_prompts * avg_output_tokens / 1000

    on_demand_cost = (total_input * on_demand_input) + (total_output * on_demand_output)
    batch_cost = on_demand_cost * batch_discount

    savings = on_demand_cost - batch_cost

    print(f"On-demand cost:  ${on_demand_cost:.2f}")
    print(f"Batch cost:      ${batch_cost:.2f}")
    print(f"Savings:         ${savings:.2f} ({(1 - batch_cost/on_demand_cost)*100:.0f}%)")

estimate_batch_savings(10000, 500, 200)
```

## When to Use Batch vs Real-Time

Batch inference is ideal for:
- Bulk document processing (summarization, classification, extraction)
- Evaluation pipelines where you're testing prompt variations
- Data enrichment tasks on existing datasets
- Periodic report generation
- Any workload where results can wait hours

Stick with real-time inference when:
- Users are waiting for responses (chatbots, interactive tools)
- You need sub-second latency
- The volume is low enough that the cost difference doesn't matter

## Error Handling Strategies

Some records in your batch might fail while others succeed. Build your pipeline to handle partial failures gracefully.

```python
def retry_failed_records(errors, original_input_file, retry_output_file):
    """Create a new batch input file for failed records only."""
    failed_ids = {e['id'] for e in errors}

    retry_records = []
    with open(original_input_file, 'r') as f:
        for line in f:
            record = json.loads(line)
            if record['recordId'] in failed_ids:
                retry_records.append(record)

    with open(retry_output_file, 'w') as f:
        for record in retry_records:
            f.write(json.dumps(record) + '\n')

    print(f"Created retry file with {len(retry_records)} records")
```

For monitoring your batch jobs alongside other AWS workloads, a comprehensive observability setup helps you track processing times, error rates, and costs across all your services. Check out our post on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view) for strategies that work well here.

Batch inference is one of those features that pays for itself almost immediately once you find the right use case. If you're running any kind of bulk AI processing, it should be your default choice over real-time invocations.
