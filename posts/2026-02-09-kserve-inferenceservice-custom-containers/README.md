# How to Configure KServe InferenceService with Custom Transformer and Predictor Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KServe, Machine Learning, MLOps, Model Serving

Description: Learn how to configure KServe InferenceService with custom transformer and predictor containers for advanced preprocessing and inference workflows on Kubernetes.

---

KServe provides a standardized way to serve machine learning models on Kubernetes, but production scenarios often require custom preprocessing logic, feature engineering, or post-processing steps that go beyond standard model inference. By implementing custom transformer and predictor containers, you can build sophisticated inference pipelines that handle complex data transformations while maintaining KServe's benefits like autoscaling, revision management, and canary deployments.

This guide walks through configuring KServe InferenceService with custom containers to create end-to-end inference workflows.

## Understanding KServe Component Architecture

KServe InferenceService supports multiple components that work together to handle inference requests:

- **Predictor**: The core component that loads the model and performs inference
- **Transformer**: Preprocesses incoming requests before sending them to the predictor
- **Explainer**: Provides model explanations for predictions (optional)

The transformer component is particularly useful when you need to perform feature engineering, data normalization, tokenization, or other preprocessing steps before the model receives data. Custom predictor containers let you load models in non-standard formats or implement custom serving logic.

## Building a Custom Transformer Container

Let's start by building a custom transformer that performs text preprocessing before sending data to a sentiment analysis model.

Create a transformer implementation:

```python
# transformer.py
import kserve
import logging
from typing import Dict
import re
import json

logging.basicConfig(level=logging.INFO)

class CustomTransformer(kserve.Model):
    def __init__(self, name: str, predictor_host: str):
        super().__init__(name)
        self.predictor_host = predictor_host
        self.ready = False

    def load(self):
        """Initialize transformer resources"""
        self.ready = True
        logging.info("Custom transformer loaded successfully")

    def preprocess(self, inputs: Dict) -> Dict:
        """
        Preprocess incoming request data.
        Apply text cleaning and normalization.
        """
        instances = inputs.get("instances", [])
        processed_instances = []

        for instance in instances:
            text = instance.get("text", "")

            # Convert to lowercase
            text = text.lower()

            # Remove URLs
            text = re.sub(r'http\S+|www.\S+', '', text)

            # Remove special characters but keep punctuation
            text = re.sub(r'[^a-zA-Z0-9\s.,!?]', '', text)

            # Remove extra whitespace
            text = ' '.join(text.split())

            processed_instances.append({"text": text})

        return {"instances": processed_instances}

    def postprocess(self, outputs: Dict) -> Dict:
        """
        Postprocess prediction results.
        Add confidence thresholds and labels.
        """
        predictions = outputs.get("predictions", [])
        processed_predictions = []

        for pred in predictions:
            score = pred[0] if isinstance(pred, list) else pred

            # Apply confidence threshold
            if score > 0.7:
                sentiment = "positive"
                confidence = "high"
            elif score > 0.3:
                sentiment = "neutral"
                confidence = "medium"
            else:
                sentiment = "negative"
                confidence = "high"

            processed_predictions.append({
                "sentiment": sentiment,
                "score": float(score),
                "confidence": confidence
            })

        return {"predictions": processed_predictions}

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(parents=[kserve.model_server.parser])
    parser.add_argument(
        "--predictor_host",
        required=True,
        help="The host URL for the predictor service"
    )
    args, _ = parser.parse_known_args()

    transformer = CustomTransformer(
        name=args.model_name,
        predictor_host=args.predictor_host
    )

    kserve.ModelServer().start([transformer])
```

Create a Dockerfile for the transformer:

```dockerfile
# Dockerfile.transformer
FROM python:3.9-slim

WORKDIR /app

# Install KServe SDK
RUN pip install --no-cache-dir kserve==0.11.0

# Copy transformer code
COPY transformer.py /app/

# Set environment variables
ENV MODEL_NAME=sentiment-transformer

# Run transformer
ENTRYPOINT ["python", "transformer.py"]
```

Build and push the transformer image:

```bash
# Build the transformer image
docker build -t your-registry/sentiment-transformer:v1 -f Dockerfile.transformer .

# Push to container registry
docker push your-registry/sentiment-transformer:v1
```

## Building a Custom Predictor Container

Now create a custom predictor that loads a PyTorch model and performs inference:

```python
# predictor.py
import kserve
import torch
import torch.nn as nn
import logging
from typing import Dict
import json

logging.basicConfig(level=logging.INFO)

class SentimentModel(nn.Module):
    """Simple sentiment analysis model"""
    def __init__(self, vocab_size=10000, embedding_dim=128):
        super(SentimentModel, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, 64, batch_first=True)
        self.fc = nn.Linear(64, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        embedded = self.embedding(x)
        lstm_out, _ = self.lstm(embedded)
        # Take last output
        last_output = lstm_out[:, -1, :]
        output = self.fc(last_output)
        return self.sigmoid(output)

class CustomPredictor(kserve.Model):
    def __init__(self, name: str):
        super().__init__(name)
        self.name = name
        self.model = None
        self.ready = False
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def load(self):
        """Load the PyTorch model"""
        try:
            # Initialize model
            self.model = SentimentModel()

            # Load trained weights (in production, load from storage)
            # self.model.load_state_dict(torch.load('/mnt/models/model.pt'))

            self.model.to(self.device)
            self.model.eval()

            self.ready = True
            logging.info(f"Model loaded successfully on {self.device}")
        except Exception as e:
            logging.error(f"Failed to load model: {str(e)}")
            raise

    def predict(self, request: Dict) -> Dict:
        """
        Perform inference on preprocessed data.
        """
        try:
            instances = request.get("instances", [])
            predictions = []

            with torch.no_grad():
                for instance in instances:
                    # Tokenize text (simplified - use proper tokenizer in production)
                    text = instance.get("text", "")
                    tokens = self._simple_tokenize(text)

                    # Convert to tensor
                    input_tensor = torch.tensor([tokens]).to(self.device)

                    # Perform inference
                    output = self.model(input_tensor)
                    score = output.item()

                    predictions.append(score)

            return {"predictions": predictions}
        except Exception as e:
            logging.error(f"Prediction failed: {str(e)}")
            raise

    def _simple_tokenize(self, text: str, max_length=100):
        """Simple word-level tokenization (use proper tokenizer in production)"""
        words = text.split()[:max_length]
        # Map words to indices (simplified)
        tokens = [hash(word) % 10000 for word in words]
        # Pad to max_length
        tokens += [0] * (max_length - len(tokens))
        return tokens

if __name__ == "__main__":
    predictor = CustomPredictor("sentiment-predictor")
    predictor.load()
    kserve.ModelServer().start([predictor])
```

Create the predictor Dockerfile:

```dockerfile
# Dockerfile.predictor
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    kserve==0.11.0 \
    torch==2.0.0 \
    --index-url https://download.pytorch.org/whl/cpu

# Copy predictor code
COPY predictor.py /app/

# Set environment variables
ENV MODEL_NAME=sentiment-predictor

# Run predictor
ENTRYPOINT ["python", "predictor.py"]
```

Build and push the predictor:

```bash
docker build -t your-registry/sentiment-predictor:v1 -f Dockerfile.predictor .
docker push your-registry/sentiment-predictor:v1
```

## Deploying the InferenceService

Create the KServe InferenceService manifest that uses both custom containers:

```yaml
# inference-service.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: sentiment-analysis
  namespace: kserve-inference
spec:
  # Transformer component for preprocessing
  transformer:
    containers:
    - name: kserve-container
      image: your-registry/sentiment-transformer:v1
      env:
      - name: STORAGE_URI
        value: "pvc://model-store"
      resources:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "1"
          memory: "2Gi"
      # Health checks
      livenessProbe:
        httpGet:
          path: /v1/models/sentiment-transformer
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /v1/models/sentiment-transformer
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10

  # Predictor component for inference
  predictor:
    containers:
    - name: kserve-container
      image: your-registry/sentiment-predictor:v1
      env:
      - name: STORAGE_URI
        value: "pvc://model-store"
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
      livenessProbe:
        httpGet:
          path: /v1/models/sentiment-predictor
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /v1/models/sentiment-predictor
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10

  # Autoscaling configuration
  scaleTarget: 1
  scaleMetric: concurrency
  minReplicas: 1
  maxReplicas: 5
```

Deploy the InferenceService:

```bash
# Create namespace if it doesn't exist
kubectl create namespace kserve-inference

# Apply the InferenceService
kubectl apply -f inference-service.yaml

# Check the status
kubectl get inferenceservices sentiment-analysis -n kserve-inference

# Watch the pods come up
kubectl get pods -n kserve-inference -w
```

## Testing the Custom Inference Pipeline

Once deployed, test the end-to-end pipeline:

```bash
# Get the service URL
SERVICE_URL=$(kubectl get inferenceservice sentiment-analysis -n kserve-inference -o jsonpath='{.status.url}')

# Test with sample data
curl -X POST $SERVICE_URL/v1/models/sentiment-analysis:predict \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      {"text": "This product is AMAZING!!! Check it out at http://example.com"},
      {"text": "Terrible experience, would not recommend!!!"}
    ]
  }'
```

Expected response after preprocessing and prediction:

```json
{
  "predictions": [
    {
      "sentiment": "positive",
      "score": 0.87,
      "confidence": "high"
    },
    {
      "sentiment": "negative",
      "score": 0.15,
      "confidence": "high"
    }
  ]
}
```

## Monitoring and Debugging

Add observability to your custom containers:

```python
# Add to transformer.py and predictor.py
import time
from prometheus_client import Counter, Histogram

# Metrics
REQUEST_COUNT = Counter('transformer_requests_total', 'Total requests processed')
REQUEST_LATENCY = Histogram('transformer_request_latency_seconds', 'Request latency')

def preprocess(self, inputs: Dict) -> Dict:
    REQUEST_COUNT.inc()
    start_time = time.time()

    try:
        # Processing logic here
        result = self._do_preprocessing(inputs)
        return result
    finally:
        REQUEST_LATENCY.observe(time.time() - start_time)
```

View logs from the components:

```bash
# Get transformer logs
kubectl logs -n kserve-inference -l serving.kserve.io/inferenceservice=sentiment-analysis,component=transformer

# Get predictor logs
kubectl logs -n kserve-inference -l serving.kserve.io/inferenceservice=sentiment-analysis,component=predictor

# Follow logs in real-time
kubectl logs -f -n kserve-inference deployment/sentiment-analysis-transformer-default
```

## Conclusion

Custom transformer and predictor containers in KServe give you complete control over your inference pipeline while leveraging KServe's production-ready features. This approach works well when you need complex preprocessing, custom model formats, or specialized inference logic that standard serving frameworks don't support. The separation of concerns between transformation and prediction makes the system more maintainable and allows independent scaling of each component based on their resource requirements.
