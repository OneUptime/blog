# How to Set Up a Custom Document Extraction Processor in Document AI Workbench

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Document AI, Workbench, Custom Processor, Machine Learning

Description: Learn how to create and configure a custom document extraction processor in Document AI Workbench to extract specific fields from your unique document types.

---

The pre-built Document AI processors work well for common document types like invoices, receipts, and standard forms. But what about your company's proprietary forms? Or industry-specific documents that no generic processor understands? That is where Document AI Workbench comes in. It lets you create custom extraction processors tailored to your exact document layout and the specific fields you need.

In this guide, I will take you through the full process of setting up a custom document extraction processor, from defining your schema to labeling training data.

## When to Use a Custom Processor

You should consider building a custom processor when:

- Your documents have a unique layout that pre-built processors do not handle
- You need to extract very specific fields that generic processors miss
- You have industry-specific documents (medical records, legal contracts, shipping manifests)
- The pre-built processors extract too much irrelevant data and you want focused extraction

Custom processors require labeled training data, so there is upfront work involved. But the payoff is much higher accuracy on your specific documents.

## Prerequisites

Before starting, make sure you have:

- A GCP project with Document AI API enabled
- At least 20 sample documents of the type you want to process so you can have 10 training and 10 testing documents (50+ is recommended)
- Documents uploaded to a Cloud Storage bucket
- The Document AI Workbench console access

```bash
# Enable required APIs

gcloud services enable documentai.googleapis.com
gcloud services enable storage.googleapis.com

# Create a bucket for your training documents
gcloud storage buckets create gs://my-docai-training-data/ --location=us-central1
```

## Step 1: Create a Custom Processor

Navigate to the Document AI console or use the API to create a custom extraction processor.

```python
from google.api_core.client_options import ClientOptions
from google.cloud import documentai

def create_custom_extractor(project_id, location="us"):
    """Create a custom document extractor processor."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)
    parent = client.common_location_path(project_id, location)

    # CUSTOM_EXTRACTION_PROCESSOR lets you define your own schema
    processor = client.create_processor(
        parent=parent,
        processor=documentai.Processor(
            display_name="purchase-order-extractor",
            type_="CUSTOM_EXTRACTION_PROCESSOR"
        )
    )

    print(f"Custom processor created: {processor.name}")
    print(f"Processor ID: {processor.name.split('/')[-1]}")
    return processor

processor = create_custom_extractor("my-gcp-project")
```

## Step 2: Define Your Schema

The schema defines what fields you want to extract. For example, if you are processing purchase orders, you might want to extract vendor name, PO number, line items, and total amount.

In the Document AI Workbench console:

1. Open your newly created processor
2. On the Get Started tab, click "Create new field"
3. Add each field you want to extract

Here is what a purchase order schema might look like:

| Field Name | Data Type | Occurrence | Description |
|-----------|-----------|------------|-------------|
| vendor_name | Plain Text | Required, Single | Company name of the vendor |
| po_number | Plain Text | Required, Single | Purchase order number |
| order_date | DateTime | Required, Single | Date the PO was issued |
| ship_to_address | Address | Required, Single | Delivery address |
| line_item | Entity (nested) | Required, Multiple | Individual line items |
| line_item/description | Plain Text | Required, Single | Item description |
| line_item/quantity | Number | Required, Single | Quantity ordered |
| line_item/unit_price | Money | Required, Single | Price per unit |
| total_amount | Money | Required, Single | Total order amount |

You can also inspect the current dataset schema programmatically.

```python
from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1beta3

def get_processor_schema(project_id, location, processor_id):
    """Retrieve the current schema of a custom processor."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai_v1beta3.DocumentServiceClient(client_options=opts)
    name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}/dataset/datasetSchema"
    )

    dataset_schema = client.get_dataset_schema(name=name)

    print(f"Schema name: {dataset_schema.name}")
    for entity_type in dataset_schema.document_schema.entity_types:
        print(f"Field: {entity_type.display_name}")

    return dataset_schema
```

## Step 3: Upload Training Documents

Upload your sample documents to Cloud Storage. Organize them clearly.

```bash
# Upload your training documents
gcloud storage cp ./training-documents/*.pdf gs://my-docai-training-data/purchase-orders/

# Verify the upload
gcloud storage ls gs://my-docai-training-data/purchase-orders/
```

## Step 4: Import Documents into the Workbench

In the Workbench console, import your documents from Cloud Storage.

```python
from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1beta3

def import_documents_for_labeling(project_id, location, processor_id, gcs_prefix):
    """Import documents from GCS into the processor for labeling."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai_v1beta3.DocumentServiceClient(client_options=opts)

    # Build the dataset name
    dataset_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}/dataset"
    )

    # Configure the import source
    batch_input = documentai_v1beta3.BatchDocumentsInputConfig(
        gcs_prefix=documentai_v1beta3.GcsPrefix(
            gcs_uri_prefix=gcs_prefix
        )
    )

    # Import the documents
    request = documentai_v1beta3.ImportDocumentsRequest(
        dataset=dataset_name,
        batch_documents_import_configs=[
            documentai_v1beta3.BatchDocumentsImportConfig(
                batch_input_config=batch_input,
                dataset_split="DATASET_SPLIT_TRAIN"
            )
        ]
    )

    operation = client.import_documents(request=request)
    print("Importing documents... this may take a few minutes.")
    operation.result()
    print("Import complete!")
```

## Step 5: Label Your Documents

This is the most time-intensive step but also the most important. In the Workbench UI:

1. Open the labeling interface for your processor
2. For each document, draw bounding boxes around the values you want to extract
3. Assign each box to the correct field from your schema
4. Label at least 10 training documents and 10 testing documents (more gives better results)

Some tips for effective labeling:

- **Be consistent**: Always include the same type of content for each field
- **Handle variations**: If your documents have multiple layouts, label examples of each
- **Include edge cases**: Label documents with missing fields, unusual formatting, or poor scan quality
- **Split your data**: Label most documents for training and reserve some for testing

## Step 6: Review Your Labeled Data

Before training, verify your labels are correct.

```python
from google.api_core.client_options import ClientOptions
from google.cloud import documentai_v1beta3

def list_labeled_documents(project_id, location, processor_id):
    """List documents in the processor dataset and their labeling status."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai_v1beta3.DocumentServiceClient(client_options=opts)

    dataset_name = (
        f"projects/{project_id}/locations/{location}"
        f"/processors/{processor_id}/dataset"
    )

    # List documents in the dataset
    request = documentai_v1beta3.ListDocumentsRequest(
        dataset=dataset_name,
        page_size=20
    )

    page_result = client.list_documents(request=request)

    for doc_metadata in page_result:
        print(f"Document: {doc_metadata.display_name}")
        print(f"  Split: {doc_metadata.dataset_type}")
        print(f"  Labeling state: {doc_metadata.labeling_state}")
        print()
```

## Step 7: Organize Train/Test Split

Make sure you have documents in both training and test sets. A common split is 80% training, 20% test.

The Workbench UI lets you assign documents to either the training or test split. For best results:

- Use at least 10 documents for training
- Use at least 10 documents for testing
- Make sure both splits contain representative examples of all document variations

## What Happens Next

After labeling, you will train the processor (covered in a separate guide on training and deploying custom extractors). The training process uses your labeled examples to build a model that understands where to find each field in new, unseen documents.

The Workbench handles the ML pipeline for you - you do not need to write any model training code. You just provide good labeled examples, and the platform does the rest.

## Common Pitfalls to Avoid

Here are mistakes I have seen teams make:

- **Too few training samples**: Ten training documents and ten testing documents is the minimum for training a custom model, but aim for 50 or more for production quality
- **Inconsistent labeling**: If two people label documents differently, the model gets confused
- **Ignoring edge cases**: If 1% of your documents have a different layout, include those in training
- **Overly broad schema**: Start with the fields you actually need, not every piece of text on the form

## Wrapping Up

Setting up a custom document extraction processor in Document AI Workbench is a structured process: create the processor, define your schema, upload and label training documents, and organize your data splits. The Workbench UI makes the labeling process straightforward even for non-ML engineers. The time you invest in clean, consistent labeling directly translates to extraction accuracy, so do not rush that step. Once your data is ready, training the model is largely automated by the platform.
