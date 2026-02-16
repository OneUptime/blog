# How to Build a Custom Image Classification Model with Azure Custom Vision

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Custom Vision, Image Classification, Computer Vision, AI, Deep Learning

Description: Build and deploy a custom image classification model using Azure Custom Vision with minimal code and no deep learning expertise required.

---

Azure Custom Vision is a no-code/low-code service that lets you build custom image classification and object detection models without needing deep learning expertise. You upload images, label them, click train, and get a model that you can deploy as an API endpoint or export to run on edge devices. Under the hood, it uses transfer learning on top of pre-trained convolutional neural networks, which means you can get good results with as few as 50 images per class. In this post, I will walk through building an image classification model from scratch.

## When to Use Custom Vision

Custom Vision is ideal when:

- You need to classify images into categories specific to your business (product defects, plant species, document types, etc.)
- You have a small to medium dataset (50-10,000 images per class)
- You want a working model quickly without building a deep learning pipeline
- You need to deploy models to edge devices (iOS, Android, ONNX, TensorFlow Lite)

If you have millions of images or need very fine-grained control over the model architecture, you would be better served by building a custom model in Azure Machine Learning. But for most practical image classification tasks, Custom Vision gets you 90% of the way there in a fraction of the time.

## Step 1: Create a Custom Vision Resource

In the Azure Portal, search for "Custom Vision" and create a new resource. You will see two resource types:

- **Custom Vision Training**: For uploading images and training models.
- **Custom Vision Prediction**: For serving predictions from trained models.

You can create both in one step by selecting "Both" during creation. Note the endpoint URL and keys for both the training and prediction resources.

## Step 2: Create a Project

You can work through the Custom Vision Portal (customvision.ai) or the SDK. I will show both approaches.

### Using the SDK

```python
from azure.cognitiveservices.vision.customvision.training import (
    CustomVisionTrainingClient
)
from azure.cognitiveservices.vision.customvision.training.models import (
    ImageFileCreateBatch,
    ImageFileCreateEntry
)
from msrest.authentication import ApiKeyCredentials
import os

# Connect to the training endpoint
training_key = "your-training-key"
training_endpoint = "https://your-resource.cognitiveservices.azure.com/"

credentials = ApiKeyCredentials(in_headers={"Training-key": training_key})
trainer = CustomVisionTrainingClient(training_endpoint, credentials)

# Create a new classification project
project = trainer.create_project(
    name="product-quality-classifier",
    description="Classify product images as good or defective",
    classification_type="Multiclass",     # One label per image
    domain_id=None                         # Use general domain (auto-selected)
)
print(f"Project created: {project.id}")
```

### Classification Types

- **Multiclass**: Each image belongs to exactly one class. Use this for mutually exclusive categories (cat vs dog, good vs defective).
- **Multilabel**: Each image can have multiple labels. Use this when categories can overlap (an image could be both "outdoor" and "sunny").

## Step 3: Create Tags and Upload Images

Tags are the class labels for your images. Create a tag for each category.

```python
# Create tags (categories)
good_tag = trainer.create_tag(project.id, "Good")
defective_tag = trainer.create_tag(project.id, "Defective")
print(f"Created tags: Good ({good_tag.id}), Defective ({defective_tag.id})")

def upload_images_for_tag(project_id, tag, image_folder):
    """
    Upload all images from a folder and assign them a tag.
    Images are uploaded in batches of 64 (the API limit per call).
    """
    image_entries = []

    for filename in os.listdir(image_folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
            filepath = os.path.join(image_folder, filename)
            with open(filepath, "rb") as f:
                image_entries.append(
                    ImageFileCreateEntry(
                        name=filename,
                        contents=f.read(),
                        tag_ids=[tag.id]
                    )
                )

    # Upload in batches of 64
    batch_size = 64
    for i in range(0, len(image_entries), batch_size):
        batch = image_entries[i:i + batch_size]
        upload_result = trainer.create_images_from_files(
            project_id,
            ImageFileCreateBatch(images=batch)
        )

        success = sum(1 for img in upload_result.images if img.status == "OK")
        failed = sum(1 for img in upload_result.images if img.status != "OK")
        print(f"Batch {i // batch_size + 1}: {success} uploaded, {failed} failed")

    return len(image_entries)


# Upload images for each category
good_count = upload_images_for_tag(project.id, good_tag, "./data/images/good/")
defect_count = upload_images_for_tag(project.id, defective_tag, "./data/images/defective/")
print(f"\nTotal: {good_count} good images, {defect_count} defective images")
```

### Image Guidelines

- **Minimum**: 50 images per tag, but 200+ gives significantly better results.
- **Variety**: Include images with different backgrounds, lighting conditions, angles, and scales.
- **Balance**: Try to have roughly equal numbers of images per class. If that is not possible, have at least half as many images in the smallest class as in the largest.
- **Resolution**: Images should be at least 256x256 pixels. The service accepts up to 6MB per image.

## Step 4: Train the Model

```python
import time

# Start a training iteration
print("Starting training...")
iteration = trainer.train_project(project.id)

# Wait for training to complete
while iteration.status != "Completed":
    iteration = trainer.get_iteration(project.id, iteration.id)
    print(f"Training status: {iteration.status}")
    time.sleep(10)

print(f"Training complete! Iteration: {iteration.id}")

# View training performance
performance = trainer.get_iteration_performance(project.id, iteration.id)
print(f"Precision: {performance.precision:.2%}")
print(f"Recall: {performance.recall:.2%}")
print(f"Average Precision (AP): {performance.average_precision:.2%}")

# Per-tag performance
for tag_perf in performance.per_tag_performance:
    print(f"  {tag_perf.name}: "
          f"Precision={tag_perf.precision:.2%}, "
          f"Recall={tag_perf.recall:.2%}")
```

### Training Options

Custom Vision offers two training types:

- **Quick Training**: Fast (minutes), good for prototyping. Uses fewer compute resources.
- **Advanced Training**: Takes longer (up to an hour) but tries more model architectures and hyperparameters. Recommended for production models.

```python
# Use advanced training for better results
iteration = trainer.train_project(
    project.id,
    training_type="Advanced",
    reserved_budget_in_hours=1  # Train for up to 1 hour
)
```

## Step 5: Publish and Test the Model

Before you can make predictions, you need to publish the trained iteration to the prediction endpoint.

```python
# Publish the iteration
prediction_resource_id = "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{prediction-resource-name}"

trainer.publish_iteration(
    project.id,
    iteration.id,
    "production-v1",           # Published name
    prediction_resource_id      # Prediction resource ID
)
print("Model published as 'production-v1'")
```

Now test the published model:

```python
from azure.cognitiveservices.vision.customvision.prediction import (
    CustomVisionPredictionClient
)

# Connect to the prediction endpoint
prediction_key = "your-prediction-key"
prediction_endpoint = "https://your-resource.cognitiveservices.azure.com/"

predictor = CustomVisionPredictionClient(prediction_endpoint,
    ApiKeyCredentials(in_headers={"Prediction-key": prediction_key}))

def classify_image(image_path):
    """
    Classify a local image using the published model.
    Returns predictions sorted by probability.
    """
    with open(image_path, "rb") as image_file:
        results = predictor.classify_image(
            project.id,
            "production-v1",   # Published iteration name
            image_file.read()
        )

    predictions = []
    for prediction in results.predictions:
        predictions.append({
            "tag": prediction.tag_name,
            "probability": prediction.probability
        })

    # Sort by probability descending
    predictions.sort(key=lambda x: x["probability"], reverse=True)
    return predictions


# Classify a test image
results = classify_image("test_image.jpg")
for r in results:
    print(f"{r['tag']}: {r['probability']:.2%}")
```

## Step 6: Export the Model for Edge Deployment

One of Custom Vision's unique features is the ability to export trained models for offline use on edge devices.

```python
# Export the model in different formats
exports = trainer.export_iteration(
    project.id,
    iteration.id,
    platform="TensorFlow",    # Options: TensorFlow, CoreML, ONNX, Dockerfile, OpenVINO
    flavor="TensorFlowLite"   # For mobile deployment
)

# The export takes time to generate - poll for the download URL
while True:
    exports = trainer.get_exports(project.id, iteration.id)
    if exports and exports[0].status == "Done":
        print(f"Download URL: {exports[0].download_uri}")
        break
    time.sleep(5)
```

Supported export formats:

| Format | Use Case |
|--------|----------|
| TensorFlow Lite | Android mobile apps |
| CoreML | iOS mobile apps |
| ONNX | Windows apps, Azure IoT Edge |
| Dockerfile | Container-based deployment |
| OpenVINO | Intel hardware acceleration |

## Improving Model Performance

If your model's accuracy is not good enough, try these strategies:

**Add more training images.** This is almost always the most effective improvement. Focus on adding images where the model currently makes mistakes.

**Improve image diversity.** If all your training images are taken in a lab with perfect lighting, the model will struggle with real-world images. Add images from different environments.

**Add negative examples.** If you have a "product" classifier but the model keeps classifying random objects as products, add a "Not Product" category with diverse non-product images.

**Use Smart Labeler.** After your first training iteration, Custom Vision can suggest labels for untagged images. Review and correct these suggestions to quickly expand your training set.

**Review misclassified images.** In the Custom Vision Portal, look at the images the model gets wrong. These often reveal systematic issues like label errors or underrepresented scenarios.

## Wrapping Up

Azure Custom Vision dramatically lowers the barrier to building custom image classification models. You do not need to understand convolutional neural networks, transfer learning, or data augmentation strategies - the service handles all of that. Start with 50 images per class, train a quick model, test it, and iterate. Add more diverse images where the model struggles. For production deployment, use advanced training and consider exporting to edge devices if low latency is critical. The combination of ease of use and export flexibility makes Custom Vision a solid choice for practical image classification needs.
