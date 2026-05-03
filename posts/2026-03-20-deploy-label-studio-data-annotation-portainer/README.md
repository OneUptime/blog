# How to Deploy Label Studio for Data Annotation via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Label Studio, Data Annotation, Machine Learning, Portainer, Docker, MLOps, NLP

Description: Deploy Label Studio via Portainer to create a team data annotation platform for labeling images, text, audio, and video to build training datasets for machine learning models.

---

Label Studio is an open-source data labeling tool that supports images, text, audio, video, and time series. It provides a web-based annotation interface and a REST API for integrating with ML pipelines. Deploying it via Portainer gives your annotation team a shared, persistent labeling environment.

## Step 1: Deploy Label Studio via Portainer Stack

```yaml
# label-studio-stack.yml

version: "3.8"

services:
  label-studio:
    image: heartexlabs/label-studio:1.11.0
    environment:
      # Database settings
      - DJANGO_DB=default
      - POSTGRE_NAME=label_studio
      - POSTGRE_USER=label_studio
      - POSTGRE_PASSWORD=ls_password
      - POSTGRE_PORT=5432
      - POSTGRE_HOST=postgres
      # Storage settings
      - LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true
      - LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT=/label-studio/data
    volumes:
      - label-studio-data:/label-studio/data
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - label-studio-net

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=label_studio
      - POSTGRES_USER=label_studio
      - POSTGRES_PASSWORD=ls_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - label-studio-net

volumes:
  label-studio-data:
  postgres-data:

networks:
  label-studio-net:
    driver: bridge
```

## Step 2: Connect Cloud Storage for Large Datasets

For large datasets, configure Label Studio to read from MinIO or S3:

```python
# setup_storage.py - configure cloud storage via Label Studio API
import requests

LABEL_STUDIO_URL = "http://localhost:8080"
API_TOKEN = "your-api-token"  # Get from Account Settings in the UI

headers = {"Authorization": f"Token {API_TOKEN}"}

# Add MinIO S3 storage to a project
storage_config = {
    "title": "Training Dataset",
    "project": 1,    # Project ID
    "bucket": "ml-datasets",
    "prefix": "annotation-tasks/",
    "s3_endpoint": "http://minio:9000",
    "aws_access_key_id": "ml-admin",
    "aws_secret_access_key": "secure_password_here",
    "region_name": "us-east-1",
    "use_blob_urls": True
}

response = requests.post(
    f"{LABEL_STUDIO_URL}/api/storages/s3/",
    json=storage_config,
    headers=headers
)
print(f"Storage configured: {response.json()}")
```

## Step 3: Create an Annotation Project via API

```python
# create_project.py
import requests

LABEL_STUDIO_URL = "http://localhost:8080"
API_TOKEN = "your-api-token"
headers = {"Authorization": f"Token {API_TOKEN}"}

# Create a text classification project
project = {
    "title": "Customer Sentiment Classification",
    "description": "Label customer reviews as positive, negative, or neutral",
    # Label Studio XML template defines the annotation interface
    "label_config": """
    <View>
      <Text name="text" value="$text"/>
      <Choices name="sentiment" toName="text" choice="single">
        <Choice value="Positive"/>
        <Choice value="Negative"/>
        <Choice value="Neutral"/>
      </Choices>
    </View>
    """
}

response = requests.post(
    f"{LABEL_STUDIO_URL}/api/projects",
    json=project,
    headers=headers
)
project_id = response.json()["id"]
print(f"Project created with ID: {project_id}")
```

## Step 4: Export Annotations for Training

After labeling, export annotations in your preferred format:

```python
# export_annotations.py
import requests

LABEL_STUDIO_URL = "http://localhost:8080"
API_TOKEN = "your-api-token"
PROJECT_ID = 1

headers = {"Authorization": f"Token {API_TOKEN}"}

# Export in COCO format (for object detection)
response = requests.get(
    f"{LABEL_STUDIO_URL}/api/projects/{PROJECT_ID}/export",
    params={"exportType": "COCO"},
    headers=headers
)

# Save to file for training
with open("annotations_coco.json", "wb") as f:
    f.write(response.content)
print(f"Exported {len(response.content)} bytes of annotations")
```

Supported export formats:
- **JSON** - Label Studio native format
- **COCO** - Object detection (bounding boxes)
- **Pascal VOC** - XML format for object detection and image segmentation
- **CSV** - Simple tabular format for text classification
- **YOLO** - For YOLO object detection models

## Step 5: Active Learning Integration

Connect your model to Label Studio for active learning - automatically prioritizing the most uncertain samples for annotation:

```python
# Submit a prediction back to Label Studio to guide annotators
prediction = {
    "task": task_id,
    "model_version": "classifier-v1",
    "score": 0.45,    # Low confidence - annotators should review this
    "result": [
        {
            "from_name": "sentiment",
            "to_name": "text",
            "type": "choices",
            "value": {"choices": ["Neutral"]}
        }
    ]
}

requests.post(
    f"{LABEL_STUDIO_URL}/api/predictions/",
    json=prediction,
    headers=headers
)
```

## Summary

Label Studio via Portainer gives ML teams a collaborative annotation platform with a database backend, cloud storage integration, and a rich REST API. The combination of Portainer's stack management and Label Studio's flexibility supports annotation workflows for NLP, computer vision, and audio applications.
