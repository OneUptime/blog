# How to Use Amazon Comprehend Custom Classification

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Comprehend, Custom Classification, Machine Learning, NLP

Description: Train custom text classifiers with Amazon Comprehend to categorize documents, tickets, emails, and other text into your own domain-specific categories.

---

Comprehend's built-in sentiment and entity detection cover general use cases well, but most businesses have classification needs that are unique to their domain. Support ticket routing, document categorization, content tagging, compliance flagging - these all need classifiers trained on your specific categories and data. Amazon Comprehend Custom Classification lets you train your own text classifiers without writing a single line of ML code.

You provide labeled training data, Comprehend trains the model, and you get an endpoint you can call to classify new documents. The whole process is managed - no infrastructure to set up, no hyperparameters to tune (unless you want to), and no ML expertise required.

## When Custom Classification Makes Sense

Use custom classification when:

- The built-in Comprehend features don't cover your categories (e.g., classifying support tickets as "billing", "technical", "feature request")
- You need multi-label classification (a document can belong to multiple categories)
- You have at least 50 labeled examples per category (more is better)
- You need consistent, repeatable classification that doesn't depend on prompt engineering

## Preparing Training Data

Training data quality is everything. Comprehend accepts training data in CSV format, where each row is a labeled example.

For single-label classification (each document belongs to exactly one category):

```csv
BILLING,I was charged twice for my subscription this month
TECHNICAL,The app crashes every time I try to upload a photo
FEATURE_REQUEST,It would be great if you could add dark mode
BILLING,Can you explain the charges on my latest invoice
TECHNICAL,Getting a 500 error when accessing the dashboard
ACCOUNT,I need to change the email address on my account
FEATURE_REQUEST,Would love to see integration with Slack
ACCOUNT,How do I reset my password
```

For multi-label classification (documents can have multiple labels), use a different format:

```csv
URGENT|BILLING,I was overcharged $500 and need this resolved immediately
TECHNICAL|FEATURE_REQUEST,The export feature is broken but adding PDF export would be great
BILLING,Simple question about my invoice
URGENT|TECHNICAL|ACCOUNT,My account is locked and I cannot access critical reports that are due today
```

Here's a script to validate and prepare your training data.

```python
import csv
from collections import Counter

def validate_training_data(file_path, multi_label=False):
    """Validate training data for Comprehend custom classification."""
    label_counts = Counter()
    total_rows = 0
    errors = []

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row_num, row in enumerate(reader, 1):
            if len(row) < 2:
                errors.append(f"Row {row_num}: Less than 2 columns")
                continue

            label = row[0].strip()
            text = row[1].strip()

            if not label:
                errors.append(f"Row {row_num}: Empty label")
                continue
            if not text:
                errors.append(f"Row {row_num}: Empty text")
                continue

            if multi_label:
                labels = label.split('|')
                for l in labels:
                    label_counts[l.strip()] += 1
            else:
                label_counts[label] += 1

            total_rows += 1

    print(f"Total valid rows: {total_rows}")
    print(f"Number of classes: {len(label_counts)}")
    print(f"\nLabel distribution:")
    for label, count in label_counts.most_common():
        print(f"  {label}: {count} ({count/total_rows:.1%})")

    # Check for minimum examples per class
    min_examples = 50
    for label, count in label_counts.items():
        if count < min_examples:
            errors.append(f"Label '{label}' has only {count} examples (minimum: {min_examples})")

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors[:20]:
            print(f"  - {e}")

    return len(errors) == 0

validate_training_data('training_data.csv')
```

## Uploading Data and Creating the Classifier

Upload your training data to S3 and create the classifier.

```python
import boto3
import time

s3 = boto3.client('s3', region_name='us-east-1')
comprehend = boto3.client('comprehend', region_name='us-east-1')

# Upload training data to S3
bucket = 'my-comprehend-training'
s3.upload_file(
    'training_data.csv',
    bucket,
    'classifiers/support-ticket/training.csv'
)

# Create the custom classifier
response = comprehend.create_document_classifier(
    DocumentClassifierName='support-ticket-classifier',
    DataAccessRoleArn='arn:aws:iam::123456789012:role/ComprehendRole',
    InputDataConfig={
        'S3Uri': f's3://{bucket}/classifiers/support-ticket/training.csv',
        'DataFormat': 'COMPREHEND_CSV'
    },
    OutputDataConfig={
        'S3Uri': f's3://{bucket}/classifiers/support-ticket/output/'
    },
    LanguageCode='en',
    Mode='MULTI_CLASS'  # or 'MULTI_LABEL' for multi-label classification
)

classifier_arn = response['DocumentClassifierArn']
print(f"Classifier ARN: {classifier_arn}")
```

## Monitoring Training Progress

Training can take anywhere from 30 minutes to several hours depending on dataset size.

```python
def wait_for_classifier(classifier_arn):
    """Monitor classifier training until completion."""
    while True:
        response = comprehend.describe_document_classifier(
            DocumentClassifierArn=classifier_arn
        )
        status = response['DocumentClassifierProperties']['Status']
        print(f"Status: {status}")

        if status == 'TRAINED':
            props = response['DocumentClassifierProperties']
            metrics = props.get('ClassifierMetadata', {}).get('EvaluationMetrics', {})
            print(f"\nTraining complete!")
            print(f"Accuracy: {metrics.get('Accuracy', 'N/A')}")
            print(f"Precision: {metrics.get('Precision', 'N/A')}")
            print(f"Recall: {metrics.get('Recall', 'N/A')}")
            print(f"F1 Score: {metrics.get('F1Score', 'N/A')}")
            return response

        elif status in ['IN_ERROR', 'DELETING']:
            message = response['DocumentClassifierProperties'].get('Message', '')
            print(f"Training failed: {message}")
            return response

        time.sleep(60)

wait_for_classifier(classifier_arn)
```

## Creating a Real-Time Endpoint

To classify documents in real-time, create an endpoint from your trained classifier.

```python
# Create an endpoint for real-time classification
endpoint_response = comprehend.create_endpoint(
    EndpointName='support-ticket-endpoint',
    ModelArn=classifier_arn,
    DesiredInferenceUnits=1  # Scale up for higher throughput
)

endpoint_arn = endpoint_response['EndpointArn']
print(f"Endpoint ARN: {endpoint_arn}")

# Wait for the endpoint to be active
while True:
    response = comprehend.describe_endpoint(EndpointArn=endpoint_arn)
    status = response['EndpointProperties']['Status']
    print(f"Endpoint status: {status}")

    if status == 'IN_SERVICE':
        print("Endpoint is ready!")
        break
    elif status == 'FAILED':
        print("Endpoint creation failed")
        break

    time.sleep(30)
```

## Classifying Documents

With the endpoint running, classify documents with a simple API call.

```python
def classify_text(text, endpoint_arn):
    """Classify a piece of text using the custom classifier."""
    response = comprehend.classify_document(
        Text=text,
        EndpointArn=endpoint_arn
    )

    classes = response['Classes']
    # Sort by confidence
    classes.sort(key=lambda x: x['Score'], reverse=True)

    print(f"Text: {text[:80]}...")
    for cls in classes:
        print(f"  {cls['Name']}: {cls['Score']:.2%}")

    return classes[0]  # Return the top prediction

# Classify incoming support tickets
tickets = [
    "I was charged twice for my subscription last month and need a refund.",
    "The dashboard keeps showing a loading spinner and never loads.",
    "Can you add support for exporting reports to PDF format?",
    "I need to update the billing address on my account.",
    "The API is returning 503 errors intermittently since yesterday.",
]

for ticket in tickets:
    result = classify_text(ticket, endpoint_arn)
    print(f"  -> Routed to: {result['Name']}\n")
```

## Building an Automated Routing System

Here's a complete system that classifies incoming tickets and routes them to the right team.

```python
import json

class TicketRouter:
    """Automatically classify and route support tickets."""

    ROUTING_MAP = {
        'BILLING': {'queue': 'billing-team', 'priority': 'normal'},
        'TECHNICAL': {'queue': 'engineering', 'priority': 'high'},
        'FEATURE_REQUEST': {'queue': 'product-team', 'priority': 'low'},
        'ACCOUNT': {'queue': 'account-management', 'priority': 'normal'},
        'URGENT': {'queue': 'escalation-team', 'priority': 'critical'}
    }

    def __init__(self, endpoint_arn, confidence_threshold=0.7):
        self.comprehend = boto3.client('comprehend', region_name='us-east-1')
        self.endpoint_arn = endpoint_arn
        self.threshold = confidence_threshold

    def route_ticket(self, ticket_id, text):
        """Classify a ticket and determine routing."""
        response = self.comprehend.classify_document(
            Text=text[:5000],
            EndpointArn=self.endpoint_arn
        )

        top_class = max(response['Classes'], key=lambda x: x['Score'])

        if top_class['Score'] < self.threshold:
            # Low confidence - route to manual review
            return {
                'ticket_id': ticket_id,
                'classification': 'UNCERTAIN',
                'confidence': top_class['Score'],
                'routing': {'queue': 'manual-review', 'priority': 'normal'},
                'top_predictions': response['Classes'][:3]
            }

        routing = self.ROUTING_MAP.get(top_class['Name'], {
            'queue': 'general', 'priority': 'normal'
        })

        return {
            'ticket_id': ticket_id,
            'classification': top_class['Name'],
            'confidence': top_class['Score'],
            'routing': routing
        }

# Usage
router = TicketRouter(endpoint_arn)
result = router.route_ticket('TKT-001', 'My app crashes when I click the export button')
print(json.dumps(result, indent=2))
```

## Managing Costs

Custom classifier endpoints run continuously and charge by the hour. If you don't need real-time classification, consider using asynchronous classification jobs instead, which are more cost-effective for batch workloads.

```python
# Delete endpoint when not needed to stop charges
comprehend.delete_endpoint(EndpointArn=endpoint_arn)

# For batch classification, use async jobs instead
response = comprehend.start_document_classification_job(
    DocumentClassifierArn=classifier_arn,
    InputDataConfig={
        'S3Uri': 's3://my-bucket/documents-to-classify/',
        'InputFormat': 'ONE_DOC_PER_LINE'
    },
    OutputDataConfig={
        'S3Uri': 's3://my-bucket/classification-results/'
    },
    DataAccessRoleArn='arn:aws:iam::123456789012:role/ComprehendRole',
    JobName='batch-classification-job'
)
```

Custom classification with Comprehend is a solid choice when you need reliable, repeatable text categorization. The managed training process means you can iterate quickly - improve your training data, retrain, and deploy without touching any infrastructure. If you also need entity extraction from your classified documents, check out our guide on [entity recognition with Amazon Comprehend](https://oneuptime.com/blog/post/amazon-comprehend-entity-recognition/view).
