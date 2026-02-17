# How to Implement AutoML Entity Extraction for Custom Named Entity Recognition on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, AutoML, NER, Entity Extraction, NLP, Google Cloud

Description: Train a custom named entity recognition model using AutoML Entity Extraction on Vertex AI to identify domain-specific entities in text.

---

Named entity recognition (NER) out of the box handles standard entities like person names, locations, and organizations. But what about your domain-specific entities - drug names in medical records, part numbers in maintenance logs, or feature names in product feedback? That is where AutoML Entity Extraction on Vertex AI comes in. You label examples of your custom entities, AutoML trains a model tailored to your domain, and you deploy it as an API. No NLP expertise required.

## When to Use AutoML Entity Extraction

AutoML NER is the right choice when:
- You need to extract entities that pre-trained models do not recognize
- You have at least 200 labeled examples per entity type
- Your entities follow somewhat consistent patterns in text
- You want a deployed model without managing training infrastructure

If you only need standard entities (people, places, dates, currencies), use the Cloud Natural Language API instead. AutoML is for custom entity types.

## Step 1: Prepare Training Data

AutoML Entity Extraction expects data in JSONL format where each entry contains the text and the entity annotations:

```python
# prepare_ner_data.py - Format training data for AutoML Entity Extraction
import json

def create_training_entry(text, annotations):
    """Create a single training entry in AutoML's expected format.
    Each annotation marks the start/end of an entity in the text."""

    text_segment_annotations = []
    for ann in annotations:
        text_segment_annotations.append({
            "textSegment": {
                "startOffset": ann["start"],
                "endOffset": ann["end"],
            },
            "displayName": ann["label"],
        })

    return {
        "textSegmentAnnotations": text_segment_annotations,
        "textContent": text,
    }

# Example: Medical domain with custom entity types
training_data = [
    create_training_entry(
        text="Patient was prescribed Metformin 500mg twice daily for type 2 diabetes management.",
        annotations=[
            {"start": 22, "end": 31, "label": "DRUG_NAME"},
            {"start": 32, "end": 37, "label": "DOSAGE"},
            {"start": 38, "end": 49, "label": "FREQUENCY"},
            {"start": 54, "end": 69, "label": "CONDITION"},
        ]
    ),
    create_training_entry(
        text="Lab results show HbA1c at 7.2%, indicating moderate glycemic control.",
        annotations=[
            {"start": 16, "end": 21, "label": "LAB_TEST"},
            {"start": 25, "end": 29, "label": "LAB_VALUE"},
        ]
    ),
    # Add at least 200+ examples per entity type for good results
]

# Write to JSONL file
with open("training_data.jsonl", "w") as f:
    for entry in training_data:
        f.write(json.dumps(entry) + "\n")

print(f"Created {len(training_data)} training examples")
```

Upload the data to Cloud Storage:

```bash
# Upload training data to Cloud Storage
gsutil cp training_data.jsonl gs://your-ner-bucket/training/training_data.jsonl
```

## Step 2: Create the Dataset in Vertex AI

Register the data as a Vertex AI text dataset:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

# Create a text dataset for entity extraction
dataset = aiplatform.TextDataset.create(
    display_name="medical-ner-dataset",
    gcs_source="gs://your-ner-bucket/training/training_data.jsonl",
    import_schema_uri=aiplatform.schema.dataset.ioformat.text.extraction,
)

print(f"Dataset created: {dataset.resource_name}")
print(f"Items imported: check the Cloud Console for import status")
```

## Step 3: Train the Entity Extraction Model

Launch the AutoML training job:

```python
# Train the custom NER model
job = aiplatform.AutoMLTextTrainingJob(
    display_name="medical-ner-model-v1",
    prediction_type="extraction",  # This configures it for NER
)

model = job.run(
    dataset=dataset,
    model_display_name="medical-ner-v1",
    training_filter_split="labels.aiplatform.googleapis.com/ml_use=training",
    validation_filter_split="labels.aiplatform.googleapis.com/ml_use=validation",
    test_filter_split="labels.aiplatform.googleapis.com/ml_use=test",
)

print(f"Model trained: {model.resource_name}")
```

Training typically takes 3-6 hours. AutoML will split your data into train/validation/test sets automatically if you do not specify the split.

## Step 4: Evaluate the Model

Check the model's performance on the test set:

```python
# Review model evaluation metrics
evaluations = model.list_model_evaluations()

for evaluation in evaluations:
    metrics = evaluation.metrics

    print("Overall Metrics:")
    print(f"  Precision: {metrics.get('precision', 'N/A')}")
    print(f"  Recall: {metrics.get('recall', 'N/A')}")
    print(f"  F1 Score: {metrics.get('f1Score', 'N/A')}")

    # Per-entity-type metrics are crucial for understanding model strengths
    if 'confusionMatrix' in metrics:
        print("\nPer-Entity Metrics:")
        for entity_metrics in metrics.get('confidenceMetrics', []):
            print(f"  {entity_metrics.get('displayName', 'unknown')}:")
            print(f"    Precision: {entity_metrics.get('precision', 'N/A')}")
            print(f"    Recall: {entity_metrics.get('recall', 'N/A')}")
```

Good NER models typically achieve F1 scores above 0.85. If certain entity types have low scores, add more training examples for those types.

## Step 5: Deploy the Model

Deploy to an endpoint for online predictions:

```python
# Deploy the NER model to a serving endpoint
endpoint = model.deploy(
    deployed_model_display_name="medical-ner-v1-deployed",
    machine_type="n1-standard-2",
    min_replica_count=1,
    max_replica_count=5,
)

print(f"Endpoint: {endpoint.resource_name}")
```

## Step 6: Run Predictions

Extract entities from new text:

```python
def extract_entities(text, endpoint):
    """Extract custom entities from text using the deployed model.
    Returns a list of entities with their types, text, and confidence scores."""

    prediction = endpoint.predict(instances=[{"content": text}])

    entities = []
    for result in prediction.predictions:
        for entity in result.get("textSegmentAnnotations", []):
            entities.append({
                "text": text[
                    int(entity["textSegment"]["startOffset"]):
                    int(entity["textSegment"]["endOffset"])
                ],
                "type": entity["displayName"],
                "confidence": entity.get("confidence", 0.0),
                "start": int(entity["textSegment"]["startOffset"]),
                "end": int(entity["textSegment"]["endOffset"]),
            })

    return entities

# Test with new text
test_text = "The physician increased Lisinopril to 20mg daily due to persistent hypertension readings of 150/95."

entities = extract_entities(test_text, endpoint)
for entity in entities:
    print(f"  [{entity['type']}] '{entity['text']}' (confidence: {entity['confidence']:.2f})")
```

Expected output:
```
  [DRUG_NAME] 'Lisinopril' (confidence: 0.95)
  [DOSAGE] '20mg' (confidence: 0.93)
  [FREQUENCY] 'daily' (confidence: 0.91)
  [CONDITION] 'hypertension' (confidence: 0.89)
  [LAB_VALUE] '150/95' (confidence: 0.87)
```

## Step 7: Build a Processing Pipeline

Wrap the entity extraction in a batch processing pipeline for large volumes:

```python
# batch_extract.py - Process documents in batch using the NER model
from google.cloud import aiplatform, bigquery
import json

aiplatform.init(project="your-project-id", location="us-central1")

endpoint = aiplatform.Endpoint(
    endpoint_name="projects/your-project-id/locations/us-central1/endpoints/YOUR_ENDPOINT_ID"
)
bq_client = bigquery.Client(project="your-project-id")

def process_documents_batch(document_texts, batch_size=10):
    """Process multiple documents and store extracted entities in BigQuery.
    Uses batching to stay within API rate limits."""

    all_results = []

    for i in range(0, len(document_texts), batch_size):
        batch = document_texts[i:i + batch_size]

        # Predict on the batch
        instances = [{"content": text} for text in batch]
        predictions = endpoint.predict(instances=instances)

        for text, prediction in zip(batch, predictions.predictions):
            for entity in prediction.get("textSegmentAnnotations", []):
                all_results.append({
                    "source_text": text[:500],
                    "entity_text": text[
                        int(entity["textSegment"]["startOffset"]):
                        int(entity["textSegment"]["endOffset"])
                    ],
                    "entity_type": entity["displayName"],
                    "confidence": entity.get("confidence", 0.0),
                })

    # Store results in BigQuery
    table_ref = bq_client.dataset("ner_results").table("extracted_entities")
    bq_client.insert_rows_json(table_ref, all_results)

    return all_results
```

## Tips for Better Entity Extraction

**Label consistently.** The biggest source of model errors is inconsistent labeling. If "500mg" is sometimes labeled as DOSAGE and sometimes as part of a DRUG_NAME entity, the model gets confused. Create clear labeling guidelines before you start.

**Include negative examples.** Include text samples that contain similar words but are not the entity type. For example, include sentences where "daily" appears but is not a FREQUENCY entity.

**Label at least 200 examples per entity type.** Less than that and AutoML will struggle, especially with rare entity types.

**Test with varied sentence structures.** Your training data should include entities in different positions - beginning, middle, and end of sentences - and in different syntactic constructions.

## Monitoring

Monitor prediction latency and throughput for your deployed model. Use OneUptime to track the endpoint availability and set up alerts for when extraction accuracy drops below your quality threshold. Periodically sample predictions and review them manually to catch model drift before it becomes a problem.

## Summary

AutoML Entity Extraction gives you custom NER without building a model from scratch. The effort is in the labeling - invest time in creating high-quality, consistent annotations, and AutoML handles the model architecture, training, and optimization. Start with your most common entity types, validate the F1 scores, and expand to more entity types as you build confidence in the approach.
