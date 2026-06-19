# How to Implement Label Studio for Data Annotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Label Studio, Data Annotation, Machine Learning, MLOps, Labeling

Description: Learn how to set up Label Studio for data annotation, from basic labeling tasks to ML-assisted annotation and team workflows.

---

Quality training data is the foundation of successful ML models. Label Studio is an open-source data labeling platform that supports text, images, audio, video, and time series. It can run locally or scale to team environments with collaboration features.

## Why Label Studio?

Label Studio provides flexible data labeling with:

- Support for multiple data types (text, images, audio, video, HTML, time series)
- Customizable labeling interfaces
- ML-assisted labeling with pre-annotations
- Team collaboration and review workflows
- REST API for integration
- Import/export in common formats
- Self-hosted or cloud options

## Installation

Install Label Studio and start the server:

```bash
# Install via pip

pip install label-studio

# Start the server
label-studio start

# Or specify port and data directory
label-studio start --port 8080 --data-dir ./label-studio-data

# Start with specific project
label-studio start my_project --port 8080
```

Access the UI at http://localhost:8080.

## Docker Deployment

For production deployments, use Docker:

```yaml
# docker-compose.yml
version: '3.8'

services:
  label-studio:
    image: heartexlabs/label-studio:latest
    ports:
      - "8080:8080"
    volumes:
      - label-studio-data:/label-studio/data
      - ./files:/label-studio/files
    environment:
      - DJANGO_DB=default
      - POSTGRE_NAME=labelstudio
      - POSTGRE_USER=labelstudio
      - POSTGRE_PASSWORD=labelstudio
      - POSTGRE_PORT=5432
      - POSTGRE_HOST=postgres
      - LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true
      - LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/label-studio/files
    depends_on:
      - postgres

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=labelstudio
      - POSTGRES_PASSWORD=labelstudio
      - POSTGRES_DB=labelstudio
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  label-studio-data:
  postgres-data:
```

Start the stack:

```bash
docker-compose up -d
```

## Creating a Labeling Project

### Text Classification

```xml
<!-- Labeling config for sentiment analysis -->
<View>
  <Header value="Classify the sentiment of this text"/>
  <Text name="text" value="$text"/>
  <Choices name="sentiment" toName="text" choice="single" showInline="true">
    <Choice value="Positive"/>
    <Choice value="Negative"/>
    <Choice value="Neutral"/>
  </Choices>
</View>
```

### Named Entity Recognition

```xml
<!-- NER labeling config -->
<View>
  <Labels name="label" toName="text">
    <Label value="Person" background="red"/>
    <Label value="Organization" background="blue"/>
    <Label value="Location" background="green"/>
    <Label value="Date" background="orange"/>
  </Labels>
  <Text name="text" value="$text"/>
</View>
```

### Image Classification

```xml
<!-- Image classification config -->
<View>
  <Image name="image" value="$image"/>
  <Choices name="choice" toName="image" choice="single">
    <Choice value="Cat"/>
    <Choice value="Dog"/>
    <Choice value="Bird"/>
    <Choice value="Other"/>
  </Choices>
</View>
```

### Object Detection

```xml
<!-- Bounding box annotation -->
<View>
  <Image name="image" value="$image"/>
  <RectangleLabels name="label" toName="image">
    <Label value="Car" background="blue"/>
    <Label value="Person" background="red"/>
    <Label value="Bicycle" background="green"/>
  </RectangleLabels>
</View>
```

### Image Segmentation

```xml
<!-- Polygon segmentation -->
<View>
  <Image name="image" value="$image" zoom="true"/>
  <PolygonLabels name="label" toName="image" strokeWidth="3">
    <Label value="Building" background="blue"/>
    <Label value="Road" background="gray"/>
    <Label value="Vegetation" background="green"/>
  </PolygonLabels>
</View>
```

### Audio Transcription

```xml
<!-- Audio transcription config -->
<View>
  <Audio name="audio" value="$audio"/>
  <TextArea name="transcription" toName="audio"
            rows="4" editable="true" maxSubmissions="1"/>
  <Choices name="quality" toName="audio">
    <Choice value="Clear"/>
    <Choice value="Noisy"/>
    <Choice value="Unclear"/>
  </Choices>
</View>
```

## Using the Python SDK

Manage projects programmatically:

```python
from label_studio_sdk import LabelStudio

# Connect to Label Studio
client = LabelStudio(base_url='http://localhost:8080', api_key='your-api-key')

# Create a new project
project = client.projects.create(
    title='Sentiment Analysis',
    label_config='''
    <View>
        <Text name="text" value="$text"/>
        <Choices name="sentiment" toName="text" choice="single">
            <Choice value="Positive"/>
            <Choice value="Negative"/>
            <Choice value="Neutral"/>
        </Choices>
    </View>
    '''
)

print(f"Created project: {project.id}")

# Import tasks from a list
tasks = [
    {"text": "This product is amazing!"},
    {"text": "Terrible experience, would not recommend."},
    {"text": "It was okay, nothing special."},
]

client.projects.import_tasks(id=project.id, request=tasks)

# Import from file
import json
with open('data/texts.json') as f:
    file_tasks = json.load(f)
client.projects.import_tasks(id=project.id, request=file_tasks)

# To import from S3, connect an S3 import storage to the project
# and sync it from Label Studio or the API.
```

## Exporting Annotations

```python
from label_studio_sdk import LabelStudio

client = LabelStudio(base_url='http://localhost:8080', api_key='your-api-key')
project = client.projects.get(id=1)

# Export all annotations
annotations = client.projects.exports.as_json(project.id)

# Export in specific format
import time

def wait_for_export(export_id, export_type=None):
    while True:
        job = client.projects.exports.get(id=project.id, export_pk=export_id)

        if export_type is None:
            if job.status == 'completed':
                return
            if job.status == 'failed':
                raise RuntimeError('Export failed')
        else:
            converted = next(
                (
                    item for item in (job.converted_formats or [])
                    if item.export_type == export_type
                ),
                None,
            )
            if converted and converted.status == 'completed':
                return
            if converted and converted.status == 'failed':
                raise RuntimeError(f'{export_type} conversion failed')

        time.sleep(1)

export_job = client.projects.exports.create(id=project.id, title='Training export')
wait_for_export(export_job.id)

for export_type, filename in [
    ('JSON', 'annotations.json'),
    ('CSV', 'annotations.csv'),
    ('COCO', 'annotations-coco.json'),
]:
    if export_type != 'JSON':
        client.projects.exports.convert(
            id=project.id,
            export_pk=export_job.id,
            export_type=export_type,
        )
        wait_for_export(export_job.id, export_type)

    with open(filename, 'wb') as f:
        for chunk in client.projects.exports.download(
            id=project.id,
            export_pk=export_job.id,
            export_type=export_type,
        ):
            f.write(chunk)

# Save to file
import json
with open('annotations.json', 'w') as f:
    json.dump(annotations, f, indent=2)

# Process annotations for training
for task in annotations:
    text = task['data']['text']
    if task['annotations']:
        label = task['annotations'][0]['result'][0]['value']['choices'][0]
        print(f"Text: {text[:50]}... -> {label}")
```

## ML-Assisted Labeling

Set up an ML backend for pre-annotations:

```python
# ml_backend.py
from label_studio_ml import LabelStudioMLBase
from transformers import pipeline

class SentimentBackend(LabelStudioMLBase):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Load pre-trained model
        self.model = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english"
        )

    def predict(self, tasks, context=None, **kwargs):
        """Generate predictions for tasks."""
        predictions = []

        for task in tasks:
            text = task['data']['text']

            # Get model prediction
            result = self.model(text)[0]
            label = result['label']
            score = result['score']

            # Map model output to Label Studio format
            predictions.append({
                'result': [{
                    'from_name': 'sentiment',
                    'to_name': 'text',
                    'type': 'choices',
                    'value': {
                        'choices': [label.capitalize()]
                    }
                }],
                'score': score
            })

        return predictions

    def fit(self, event, data, **kwargs):
        """Optional: Train/fine-tune on new annotations."""
        # Extract training data from annotations
        training_data = []
        annotation = data.get('annotation') if isinstance(data, dict) else None
        task = data.get('task') if isinstance(data, dict) else None
        if annotation and task:
            text = task['data']['text']
            if annotation.get('result'):
                label = annotation['result'][0]['value']['choices'][0]
                training_data.append({'text': text, 'label': label})

        # Fine-tune model (simplified)
        print(f"Training on {len(training_data)} samples")
        return {'model_updated': True}
```

Run the ML backend:

```bash
# Start ML backend server
label-studio-ml create ./ml_backend
label-studio-ml start ./ml_backend

# Or with Docker
cd ml_backend
docker-compose up
```

Connect the backend in Label Studio settings, then pre-annotations appear automatically.

## Team Workflows

Set up review workflows for quality control. Task assignment and review queues are available in Label Studio Enterprise and Starter Cloud:

```python
from label_studio_sdk import LabelStudio

client = LabelStudio(base_url='http://localhost:8080', api_key='your-api-key')

# Create project with overlap settings for quality control
project = client.projects.create(
    title='Reviewed Annotations',
    label_config='...',
    overlap_cohort_percentage=20,  # 20% of tasks are labeled by multiple annotators
)

# Assign tasks to specific annotators
for task_id in [1, 2, 3]:
    client.projects.assignments.assign(
        id=project.id,
        task_pk=task_id,
        type='AN',
        users=[10, 11],
    )

# Get annotation statistics
stats = client.projects.get(id=project.id)
print(f"Total tasks: {stats.task_number}")
print(f"Completed: {stats.num_tasks_with_annotations}")

# Get tasks in the review queue
reviewed = client.tasks.list(project=project.id, review=True, fields='all')
```

## Kubernetes Deployment

```yaml
# label-studio-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: label-studio
  namespace: ml-tools
spec:
  replicas: 2
  selector:
    matchLabels:
      app: label-studio
  template:
    metadata:
      labels:
        app: label-studio
    spec:
      containers:
        - name: label-studio
          image: heartexlabs/label-studio:latest
          ports:
            - containerPort: 8080
          env:
            - name: DJANGO_DB
              value: "default"
            - name: POSTGRE_HOST
              value: "postgres-service"
            - name: POSTGRE_NAME
              valueFrom:
                secretKeyRef:
                  name: label-studio-secrets
                  key: db-name
            - name: POSTGRE_USER
              valueFrom:
                secretKeyRef:
                  name: label-studio-secrets
                  key: db-user
            - name: POSTGRE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: label-studio-secrets
                  key: db-password
            - name: LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED
              value: "true"
          volumeMounts:
            - name: data
              mountPath: /label-studio/data
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1"
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: label-studio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: label-studio
  namespace: ml-tools
spec:
  selector:
    app: label-studio
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP
```

## Integration Pipeline

Build an automated annotation pipeline:

```python
import json
from label_studio_sdk import LabelStudio
from pathlib import Path

def create_annotation_pipeline():
    """End-to-end annotation pipeline."""

    # Initialize client
    client = LabelStudio(base_url='http://localhost:8080', api_key='your-api-key')

    # 1. Create or get project
    projects = client.projects.list()
    project = next(
        (p for p in projects if p.title == 'Production Labeling'),
        None
    )

    if not project:
        project = client.projects.create(
            title='Production Labeling',
            label_config='''
            <View>
                <Text name="text" value="$text"/>
                <Choices name="category" toName="text" choice="single">
                    <Choice value="Support"/>
                    <Choice value="Sales"/>
                    <Choice value="Feedback"/>
                </Choices>
            </View>
            '''
        )

    # 2. Import new data
    new_data = load_new_data_from_queue()
    if new_data:
        client.projects.import_tasks(id=project.id, request=new_data)
        print(f"Imported {len(new_data)} new tasks")

    # 3. Export annotations
    completed = client.projects.exports.as_json(project.id)

    # 4. Convert to training format
    training_data = []
    for task in completed:
        if task['annotations']:
            text = task['data']['text']
            label = task['annotations'][0]['result'][0]['value']['choices'][0]
            training_data.append({
                'text': text,
                'label': label
            })

    # 5. Save for model training
    output_path = Path('data/labeled/training_data.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(training_data, f, indent=2)

    print(f"Exported {len(training_data)} labeled samples")
    return training_data

def load_new_data_from_queue():
    """Load unlabeled data from your data pipeline."""
    # Example: Load from a queue, database, or file
    return [
        {"text": "How do I reset my password?"},
        {"text": "I want to upgrade my plan"},
        {"text": "Great product, love it!"}
    ]

if __name__ == "__main__":
    create_annotation_pipeline()
```

---

Label Studio handles the labeling infrastructure so your team can focus on creating quality training data. Start with a simple local setup, then scale to team workflows with review processes. The ML backend integration accelerates labeling by providing smart pre-annotations that annotators simply verify or correct.
