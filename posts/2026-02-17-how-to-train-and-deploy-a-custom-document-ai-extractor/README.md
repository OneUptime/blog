# How to Train and Deploy a Custom Document AI Extractor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Custom Extractor, Model Training, Machine Learning

Description: Learn how to train a custom Document AI extractor on your labeled data, evaluate its performance, and deploy it as a processor version for production document processing.

---

You have defined your schema, uploaded your documents, and labeled them carefully in Document AI Workbench. Now comes the exciting part - training the model and deploying it so it can process new documents automatically. This guide picks up where the setup phase ends and walks you through training, evaluation, and deployment of a custom Document AI extractor.

## Before You Train

Make sure your dataset meets these requirements:

- At least 10 labeled documents in the training split (50+ recommended for production)
- At least 5 labeled documents in the test split
- All fields in your schema have been labeled in your training documents
- Labels are consistent across all documents

You can verify your readiness with a quick check.

```python
from google.cloud import documentai_v1

def check_training_readiness(project_id, location, processor_id):
    """Check if the dataset is ready for training."""
    client = documentai_v1.DocumentProcessorServiceClient()

    dataset_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}/dataset"
    )

    # List documents and count by split
    request = documentai_v1.ListDocumentsRequest(
        dataset=dataset_name,
        page_size=100
    )

    train_count = 0
    test_count = 0
    labeled_count = 0

    page_result = client.list_documents(request=request)

    for doc in page_result.document_metadata:
        if doc.dataset_type == documentai_v1.DatasetSplitType.DATASET_SPLIT_TRAIN:
            train_count += 1
        elif doc.dataset_type == documentai_v1.DatasetSplitType.DATASET_SPLIT_TEST:
            test_count += 1

        if doc.labeling_state == documentai_v1.DocumentLabelingState.DOCUMENT_LABELED:
            labeled_count += 1

    total = train_count + test_count

    print(f"Training documents: {train_count}")
    print(f"Test documents: {test_count}")
    print(f"Labeled documents: {labeled_count} / {total}")

    if train_count >= 10 and test_count >= 5:
        print("Dataset looks ready for training!")
    else:
        print("Need more labeled documents before training.")

    return train_count, test_count, labeled_count
```

## Starting the Training

Training creates a new processor version. You can trigger training from the Workbench console or via the API.

```python
from google.cloud import documentai_v1

def train_processor_version(project_id, location, processor_id):
    """Train a new version of the custom extractor processor."""
    client = documentai_v1.DocumentProcessorServiceClient()

    parent = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}"
    )

    # Configure the training request
    processor_version = documentai_v1.ProcessorVersion(
        display_name="v1-initial-training"
    )

    request = documentai_v1.TrainProcessorVersionRequest(
        parent=parent,
        processor_version=processor_version
    )

    # Training is a long-running operation
    operation = client.train_processor_version(request=request)

    print("Training started. This may take several hours.")
    print(f"Operation name: {operation.operation.name}")

    # You can poll for completion or check the console
    # For long training jobs, it is better to check periodically
    return operation

# Start training
operation = train_processor_version(
    "my-gcp-project", "us", "my-processor-id"
)
```

## Monitoring Training Progress

Training can take anywhere from 30 minutes to several hours depending on your dataset size and complexity. You can check the status through the API.

```python
from google.cloud import documentai_v1
from google.api_core import operations_v1

def check_training_status(operation_name):
    """Check the current status of a training operation."""
    client = documentai_v1.DocumentProcessorServiceClient()

    # Use the operations client to check status
    operations_client = client.transport.operations_client
    operation = operations_client.get_operation(operation_name)

    if operation.done:
        if operation.error.code != 0:
            print(f"Training failed: {operation.error.message}")
        else:
            print("Training complete!")
            # The result contains the new processor version name
            result = documentai_v1.TrainProcessorVersionResponse.deserialize(
                operation.response.value
            )
            print(f"New version: {result.processor_version}")
    else:
        print("Training still in progress...")
        if operation.metadata:
            metadata = documentai_v1.TrainProcessorVersionMetadata.deserialize(
                operation.metadata.value
            )
            print(f"Training state: {metadata.common_metadata.state}")

    return operation
```

## Evaluating the Trained Model

After training completes, Document AI automatically evaluates the model against your test set. The evaluation metrics tell you how well the model performs.

```python
from google.cloud import documentai_v1

def get_evaluation_results(project_id, location, processor_id, version_id):
    """Retrieve evaluation metrics for a trained processor version."""
    client = documentai_v1.DocumentProcessorServiceClient()

    # Get the evaluation for this processor version
    version_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}"
        f"/processorVersions/{version_id}"
    )

    # List evaluations for this version
    request = documentai_v1.ListEvaluationsRequest(
        parent=version_name
    )

    evaluations = client.list_evaluations(request=request)

    for evaluation in evaluations:
        print(f"Evaluation: {evaluation.name}")
        print(f"Create time: {evaluation.create_time}")

        # Overall metrics
        all_entities = evaluation.all_entities_metrics
        print(f"\nOverall F1 Score: {all_entities.f1_score:.3f}")
        print(f"Overall Precision: {all_entities.precision:.3f}")
        print(f"Overall Recall: {all_entities.recall:.3f}")

        # Per-entity metrics
        print("\nPer-field metrics:")
        for entity_name, metrics in evaluation.entity_metrics.items():
            print(f"  {entity_name}:")
            print(f"    F1: {metrics.f1_score:.3f}")
            print(f"    Precision: {metrics.precision:.3f}")
            print(f"    Recall: {metrics.recall:.3f}")

    return evaluations

# Check how well the model performs
get_evaluation_results("my-gcp-project", "us", "my-processor-id", "v1")
```

## Understanding the Metrics

Three key metrics tell you about model quality:

- **Precision**: Of all the fields the model extracted, what percentage were correct? High precision means few false positives.
- **Recall**: Of all the fields that should have been extracted, what percentage did the model find? High recall means few missed fields.
- **F1 Score**: The harmonic mean of precision and recall. This is your single best indicator of overall quality. Aim for 0.85 or higher for production use.

If your metrics are low, consider:

- Adding more labeled training documents
- Fixing labeling inconsistencies
- Simplifying your schema (fewer, clearer fields)
- Ensuring your test documents are representative

## Deploying the Processor Version

Once you are satisfied with the evaluation metrics, deploy the version to make it the active processor.

```python
from google.cloud import documentai_v1

def deploy_processor_version(project_id, location, processor_id, version_id):
    """Deploy a trained processor version to make it active."""
    client = documentai_v1.DocumentProcessorServiceClient()

    version_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}"
        f"/processorVersions/{version_id}"
    )

    # Deploy the version
    operation = client.deploy_processor_version(name=version_name)

    print("Deploying processor version...")
    operation.result(timeout=300)
    print("Deployment complete!")

def set_default_version(project_id, location, processor_id, version_id):
    """Set a deployed version as the default for the processor."""
    client = documentai_v1.DocumentProcessorServiceClient()

    processor_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}"
    )

    version_name = (
        f"{processor_name}/processorVersions/{version_id}"
    )

    request = documentai_v1.SetDefaultProcessorVersionRequest(
        processor=processor_name,
        default_processor_version=version_name
    )

    operation = client.set_default_processor_version(request=request)
    operation.result()
    print(f"Default version set to: {version_id}")

# Deploy and set as default
deploy_processor_version("my-gcp-project", "us", "my-processor-id", "v1")
set_default_version("my-gcp-project", "us", "my-processor-id", "v1")
```

## Processing Documents with the Custom Extractor

Now you can use your custom processor just like any other Document AI processor.

```python
from google.cloud import documentai_v1

def process_with_custom_extractor(project_id, location, processor_id, file_path):
    """Process a document using the deployed custom extractor."""
    client = documentai_v1.DocumentProcessorServiceClient()
    name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    with open(file_path, "rb") as f:
        content = f.read()

    raw_document = documentai_v1.RawDocument(
        content=content,
        mime_type="application/pdf"
    )

    request = documentai_v1.ProcessRequest(
        name=name,
        raw_document=raw_document
    )

    result = client.process_document(request=request)
    document = result.document

    # Extract the custom entities defined in your schema
    print("Extracted fields:")
    for entity in document.entities:
        print(f"  {entity.type_}: {entity.mention_text}")
        print(f"    Confidence: {entity.confidence:.3f}")

        # Handle nested entities (like line items)
        if entity.properties:
            for prop in entity.properties:
                print(f"    - {prop.type_}: {prop.mention_text}")

    return document

# Process a new document
doc = process_with_custom_extractor(
    "my-gcp-project", "us", "my-processor-id",
    "new_purchase_order.pdf"
)
```

## Managing Multiple Versions

As you improve your training data and retrain, you will accumulate multiple versions. Here is how to manage them.

```python
def list_processor_versions(project_id, location, processor_id):
    """List all versions of a processor with their status."""
    client = documentai_v1.DocumentProcessorServiceClient()
    parent = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    request = documentai_v1.ListProcessorVersionsRequest(parent=parent)
    versions = client.list_processor_versions(request=request)

    for version in versions:
        version_id = version.name.split("/")[-1]
        print(f"Version: {version_id}")
        print(f"  Display name: {version.display_name}")
        print(f"  State: {version.state}")
        print(f"  Created: {version.create_time}")
        print()

list_processor_versions("my-gcp-project", "us", "my-processor-id")
```

## Wrapping Up

Training and deploying a custom Document AI extractor follows a clear lifecycle: verify your data, start training, evaluate the results, and deploy the version that meets your quality bar. The evaluation metrics guide your decisions - if the F1 score is not high enough, invest in more training data rather than deploying a weak model. Once deployed, the custom extractor works exactly like any other Document AI processor, so integrating it into your existing pipelines requires no special handling. Keep iterating on your training data and retraining as you encounter new document variations in production.
