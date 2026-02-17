# How to Implement Data Labeling Workflows with Vertex AI Data Labeling Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Data Labeling, Machine Learning, Training Data

Description: Set up efficient data labeling workflows using Vertex AI Data Labeling Service to create high-quality training datasets for machine learning models on Google Cloud.

---

The quality of your ML model is directly tied to the quality of your training data, and the quality of your training data depends on how well you label it. Vertex AI Data Labeling Service provides managed labeling workflows that can scale from a few hundred examples to millions, with built-in quality control and the option to use human labelers, automated labeling, or a combination of both.

In this post, I'll walk through setting up labeling workflows for different data types, configuring quality controls, and building a pipeline that feeds labeled data directly into model training.

## Understanding Labeling Options

Vertex AI offers three labeling approaches:

1. **Human labeling** through Google's managed labeling workforce or your own team
2. **Active learning** where a model suggests labels and humans verify them
3. **Automated labeling** using pre-trained models for common tasks

The right choice depends on your data complexity and budget. For most projects, starting with human labeling and transitioning to active learning as your model improves is the most practical path.

## Setting Up a Labeling Dataset

First, prepare your data in Vertex AI's dataset format:

```python
from google.cloud import aiplatform

def create_image_dataset(project_id, location, display_name, gcs_source):
    """Create a Vertex AI dataset for image labeling"""
    aiplatform.init(project=project_id, location=location)

    # Create the dataset
    dataset = aiplatform.ImageDataset.create(
        display_name=display_name,
        gcs_source=gcs_source,  # URI to import file
        import_schema_uri=aiplatform.schema.dataset.ioformat.image.single_label_classification,
    )

    print(f"Dataset created: {dataset.resource_name}")
    return dataset

def create_text_dataset(project_id, location, display_name, gcs_source):
    """Create a dataset for text classification labeling"""
    aiplatform.init(project=project_id, location=location)

    dataset = aiplatform.TextDataset.create(
        display_name=display_name,
        gcs_source=gcs_source,
        import_schema_uri=aiplatform.schema.dataset.ioformat.text.single_label_classification,
    )

    print(f"Dataset created: {dataset.resource_name}")
    return dataset
```

## Preparing Import Files

The import file tells Vertex AI where your data is and what labels to offer:

```python
import json
from google.cloud import storage

def generate_import_file(
    bucket_name,
    data_prefix,
    labels,
    output_path,
    data_type="image",
):
    """Generate an import file for Vertex AI dataset"""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    import_lines = []

    # List all files in the data prefix
    blobs = bucket.list_blobs(prefix=data_prefix)

    for blob in blobs:
        if data_type == "image" and not blob.name.endswith(('.jpg', '.png', '.jpeg')):
            continue
        if data_type == "text" and not blob.name.endswith(('.txt', '.csv')):
            continue

        gcs_uri = f"gs://{bucket_name}/{blob.name}"

        # For unlabeled data, just include the URI
        import_lines.append(json.dumps({
            "imageGcsUri" if data_type == "image" else "textGcsUri": gcs_uri,
            "dataItemResourceLabels": {
                "aiplatform.googleapis.com/ml_use": "training",
            },
        }))

    # Write the import file
    output_blob = bucket.blob(output_path)
    output_blob.upload_from_string("\n".join(import_lines))

    return f"gs://{bucket_name}/{output_path}"
```

## Creating Labeling Jobs

### Image Classification Labeling

```python
def create_image_labeling_job(
    project_id,
    location,
    dataset_id,
    display_name,
    labels,
    instruction_uri=None,
):
    """Create a labeling job for image classification"""
    aiplatform.init(project=project_id, location=location)

    # Define the label categories
    inputs = {
        "annotationSpecs": [
            {"displayName": label} for label in labels
        ],
    }

    # Create the labeling job
    job = aiplatform.DataLabelingJob.create(
        display_name=display_name,
        dataset=aiplatform.ImageDataset(dataset_id),
        labeler_count=3,  # Number of labelers per item
        instruction_uri=instruction_uri,  # GCS URI to PDF with labeling instructions
        inputs_schema_uri=aiplatform.schema.dataset.annotation.image.classification,
        inputs=inputs,
    )

    print(f"Labeling job created: {job.resource_name}")
    return job

# Example usage
labels = [
    "product_photo",
    "lifestyle_photo",
    "infographic",
    "screenshot",
    "user_generated",
]

job = create_image_labeling_job(
    project_id="your-project",
    location="us-central1",
    dataset_id="1234567890",
    display_name="Product Image Classification",
    labels=labels,
    instruction_uri="gs://your-bucket/labeling-instructions/image-classification.pdf",
)
```

### Object Detection Labeling

```python
def create_object_detection_labeling_job(
    project_id,
    location,
    dataset_id,
    display_name,
    object_classes,
):
    """Create a labeling job for bounding box object detection"""
    aiplatform.init(project=project_id, location=location)

    inputs = {
        "annotationSpecs": [
            {"displayName": cls} for cls in object_classes
        ],
    }

    job = aiplatform.DataLabelingJob.create(
        display_name=display_name,
        dataset=aiplatform.ImageDataset(dataset_id),
        labeler_count=3,
        inputs_schema_uri=aiplatform.schema.dataset.annotation.image.bounding_box,
        inputs=inputs,
    )

    print(f"Object detection labeling job: {job.resource_name}")
    return job
```

### Text Entity Extraction Labeling

```python
def create_entity_extraction_labeling_job(
    project_id,
    location,
    dataset_id,
    display_name,
    entity_types,
):
    """Create a labeling job for text entity extraction (NER)"""
    aiplatform.init(project=project_id, location=location)

    inputs = {
        "annotationSpecs": [
            {"displayName": entity_type} for entity_type in entity_types
        ],
    }

    job = aiplatform.DataLabelingJob.create(
        display_name=display_name,
        dataset=aiplatform.TextDataset(dataset_id),
        labeler_count=3,
        inputs_schema_uri=aiplatform.schema.dataset.annotation.text.extraction,
        inputs=inputs,
    )

    return job

# Example: Label support tickets for entity extraction
entity_types = [
    "PRODUCT_NAME",
    "ERROR_CODE",
    "CUSTOMER_ACTION",
    "EXPECTED_BEHAVIOR",
    "ACTUAL_BEHAVIOR",
]
```

## Active Learning Pipeline

Active learning dramatically reduces labeling costs by focusing human effort on the examples the model is least confident about:

```python
def run_active_learning_cycle(
    project_id,
    dataset_id,
    model_id,
    unlabeled_data_uri,
    batch_size=100,
):
    """Run one cycle of active learning"""
    aiplatform.init(project=project_id, location="us-central1")

    # Step 1: Use the current model to predict labels for unlabeled data
    model = aiplatform.Model(model_id)
    endpoint = model.deploy(machine_type="n1-standard-4")

    try:
        predictions = batch_predict(endpoint, unlabeled_data_uri)

        # Step 2: Find the most uncertain predictions
        uncertain_samples = select_uncertain_samples(
            predictions, batch_size
        )

        # Step 3: Create a labeling job for just the uncertain samples
        export_samples_for_labeling(uncertain_samples, dataset_id)

        print(f"Selected {len(uncertain_samples)} uncertain samples for labeling")
        print(f"Confidence range: {uncertain_samples[0]['confidence']:.3f} - "
              f"{uncertain_samples[-1]['confidence']:.3f}")

    finally:
        endpoint.undeploy_all()

def select_uncertain_samples(predictions, batch_size):
    """Select the samples where the model is least confident"""
    scored = []
    for pred in predictions:
        # Calculate uncertainty as 1 - max_confidence
        max_confidence = max(pred["confidences"])
        scored.append({
            "data_uri": pred["data_uri"],
            "confidence": max_confidence,
            "predicted_label": pred["predicted_label"],
        })

    # Sort by confidence (ascending) to get most uncertain first
    scored.sort(key=lambda x: x["confidence"])

    return scored[:batch_size]
```

## Quality Control

Implement quality checks to ensure labeling accuracy:

```python
def calculate_labeling_quality(labeled_dataset_id, project_id):
    """Calculate quality metrics for a labeled dataset"""
    aiplatform.init(project=project_id, location="us-central1")

    dataset = aiplatform.Dataset(labeled_dataset_id)

    # Export labeled data for analysis
    export = dataset.export_data(
        output_dir="gs://your-bucket/exports/quality-check/"
    )

    # Calculate inter-annotator agreement
    from collections import defaultdict
    annotations_by_item = defaultdict(list)

    for item in export:
        item_id = item["dataItemResourceName"]
        label = item.get("annotation", {}).get("displayName", "")
        annotations_by_item[item_id].append(label)

    # Calculate agreement rate
    agreement_count = 0
    total_items = 0

    for item_id, labels in annotations_by_item.items():
        if len(labels) > 1:
            total_items += 1
            # Check if all labelers agreed
            if len(set(labels)) == 1:
                agreement_count += 1

    agreement_rate = agreement_count / total_items if total_items > 0 else 0

    # Find items with disagreement for review
    disagreed_items = [
        {"item_id": item_id, "labels": labels}
        for item_id, labels in annotations_by_item.items()
        if len(set(labels)) > 1
    ]

    return {
        "total_labeled_items": len(annotations_by_item),
        "agreement_rate": round(agreement_rate, 3),
        "disagreed_items_count": len(disagreed_items),
        "disagreed_items": disagreed_items[:20],  # Sample for review
    }
```

## Automated Labeling with Pre-trained Models

For common tasks, use Gemini to generate initial labels that humans can verify:

```python
def auto_label_images(project_id, image_uris, label_categories):
    """Use Gemini to generate label suggestions for images"""
    import vertexai
    from vertexai.generative_models import GenerativeModel, Part

    vertexai.init(project=project_id, location="us-central1")
    model = GenerativeModel("gemini-1.5-pro")

    categories_str = ", ".join(label_categories)
    auto_labels = []

    for uri in image_uris:
        image_part = Part.from_uri(uri, mime_type="image/jpeg")

        response = model.generate_content(
            [
                image_part,
                f"Classify this image into exactly one of these categories: "
                f"{categories_str}. "
                f"Output JSON with fields: label (the category), "
                f"confidence (0-1), reasoning (brief explanation)."
            ],
            generation_config={"temperature": 0.1, "max_output_tokens": 200},
        )

        try:
            result = json.loads(response.text)
            result["image_uri"] = uri
            auto_labels.append(result)
        except json.JSONDecodeError:
            auto_labels.append({
                "image_uri": uri,
                "label": "unknown",
                "confidence": 0,
            })

    # Split into high-confidence (auto-accept) and low-confidence (human review)
    auto_accepted = [l for l in auto_labels if l["confidence"] > 0.95]
    needs_review = [l for l in auto_labels if l["confidence"] <= 0.95]

    return {
        "auto_accepted": auto_accepted,
        "needs_human_review": needs_review,
        "auto_accept_rate": len(auto_accepted) / len(auto_labels) if auto_labels else 0,
    }
```

## Pipeline Integration

Connect labeling workflows to model training:

```python
def labeling_to_training_pipeline(
    project_id,
    dataset_id,
    min_labeled_count=500,
    min_quality_score=0.85,
):
    """Pipeline that triggers training when enough quality labels exist"""
    aiplatform.init(project=project_id, location="us-central1")

    # Check if we have enough labeled data
    dataset = aiplatform.ImageDataset(dataset_id)
    stats = get_dataset_stats(dataset)

    if stats["labeled_count"] < min_labeled_count:
        print(f"Not enough labels: {stats['labeled_count']}/{min_labeled_count}")
        return None

    # Check labeling quality
    quality = calculate_labeling_quality(dataset_id, project_id)
    if quality["agreement_rate"] < min_quality_score:
        print(f"Quality too low: {quality['agreement_rate']}/{min_quality_score}")
        return None

    # Quality and quantity thresholds met - trigger training
    print(f"Starting training with {stats['labeled_count']} labels "
          f"(quality: {quality['agreement_rate']})")

    job = aiplatform.AutoMLImageTrainingJob(
        display_name=f"auto-trained-{datetime.now().strftime('%Y%m%d')}",
        prediction_type="classification",
        model_type="CLOUD",
    )

    model = job.run(
        dataset=dataset,
        training_fraction_split=0.8,
        validation_fraction_split=0.1,
        test_fraction_split=0.1,
    )

    return model
```

## Wrapping Up

Data labeling is often the bottleneck in ML projects. Vertex AI Data Labeling Service provides the managed infrastructure to handle it at scale, but the real wins come from how you design your workflows. Start with clear labeling instructions - ambiguous guidelines lead to noisy labels. Use multiple labelers and measure inter-annotator agreement to catch quality issues early. Introduce active learning as soon as you have a baseline model to focus human effort where it matters most. And consider automated labeling with Gemini for straightforward tasks, reserving human labelers for nuanced decisions. The goal is building a feedback loop where better labels lead to better models, which lead to better label suggestions, which reduce labeling costs over time.
