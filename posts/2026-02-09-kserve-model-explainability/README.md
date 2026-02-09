# How to Implement Model Explainability Endpoints with KServe Explainer Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KServe, Model Explainability, XAI, Machine Learning

Description: Implement model explainability endpoints with KServe explainer containers using SHAP, LIME, and other interpretability techniques for transparent ML predictions.

---

Model explainability is critical for building trust in ML systems, especially in regulated industries. Users need to understand why a model made a particular prediction. KServe provides an explainer component that runs alongside your predictor to generate explanations using techniques like SHAP (SHapley Additive exPlanations) or LIME (Local Interpretable Model-agnostic Explanations).

This guide shows you how to implement explainability for models served with KServe on Kubernetes.

## Understanding KServe Explainer Architecture

KServe explainers work by:

1. Receiving the same input as the predictor
2. Querying the predictor for predictions
3. Computing explanations (feature importances, attributions)
4. Returning explanations to the client

The explainer runs as a separate container with access to the predictor endpoint.

## Creating a SHAP Explainer

Build a custom explainer using SHAP:

```python
# shap_explainer.py
import kserve
import logging
from typing import Dict
import numpy as np
import pickle
import shap

logging.basicConfig(level=logging.INFO)

class SHAPExplainer(kserve.Model):
    def __init__(self, name: str, predictor_host: str):
        super().__init__(name)
        self.name = name
        self.predictor_host = predictor_host
        self.explainer = None
        self.ready = False

    def load(self):
        """Load model and create SHAP explainer"""
        # Load the same model used by predictor
        with open('/mnt/models/model.pkl', 'rb') as f:
            model = pickle.load(f)

        # Create SHAP explainer
        # Use TreeExplainer for tree-based models
        self.explainer = shap.TreeExplainer(model)

        # Or use KernelExplainer for any model
        # background_data = np.load('/mnt/models/background_data.npy')
        # self.explainer = shap.KernelExplainer(model.predict, background_data)

        self.ready = True
        logging.info("SHAP explainer loaded successfully")

    def explain(self, request: Dict) -> Dict:
        """Generate explanations for predictions"""
        instances = request.get("instances", [])
        X = np.array(instances)

        # Compute SHAP values
        shap_values = self.explainer.shap_values(X)

        # Format explanations
        explanations = []
        for i, instance in enumerate(instances):
            if isinstance(shap_values, list):
                # Multi-class output
                shap_vals = shap_values[1][i]  # Use positive class
            else:
                # Binary or regression
                shap_vals = shap_values[i]

            # Create explanation dict
            explanation = {
                "instance": instance.tolist(),
                "shap_values": shap_vals.tolist(),
                "base_value": float(self.explainer.expected_value[1] if isinstance(self.explainer.expected_value, (list, np.ndarray)) else self.explainer.expected_value),
                "feature_importance": {
                    f"feature_{j}": float(abs(shap_vals[j]))
                    for j in range(len(shap_vals))
                }
            }

            explanations.append(explanation)

        return {"explanations": explanations}

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name", required=True)
    parser.add_argument("--predictor_host", required=True)
    args, _ = parser.parse_known_args()

    explainer = SHAPExplainer(
        name=args.model_name,
        predictor_host=args.predictor_host
    )
    explainer.load()

    kserve.ModelServer().start([explainer])
```

Create Dockerfile:

```dockerfile
# Dockerfile.shap-explainer
FROM python:3.10-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    kserve==0.11.0 \
    shap==0.43.0 \
    scikit-learn==1.3.0 \
    numpy==1.24.0 \
    pandas==2.0.0

COPY shap_explainer.py /app/

CMD ["python", "shap_explainer.py"]
```

Build and push:

```bash
docker build -t your-registry/shap-explainer:v1 -f Dockerfile.shap-explainer .
docker push your-registry/shap-explainer:v1
```

## Deploying InferenceService with Explainer

Create an InferenceService with both predictor and explainer:

```yaml
# explainable-model.yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: explainable-model
  namespace: ml-serving
spec:
  # Predictor component
  predictor:
    sklearn:
      storageUri: "gs://my-bucket/models/classifier"
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"

  # Explainer component
  explainer:
    containers:
    - name: kserve-container
      image: your-registry/shap-explainer:v1
      args:
      - --model_name=explainable-model
      - --predictor_host=explainable-model-predictor-default.ml-serving.svc.cluster.local
      resources:
        requests:
          cpu: "500m"
          memory: "2Gi"
        limits:
          cpu: "1"
          memory: "4Gi"
      volumeMounts:
      - name: model-storage
        mountPath: /mnt/models
        readOnly: true

    volumes:
    - name: model-storage
      persistentVolumeClaim:
        claimName: model-storage-pvc
```

Deploy:

```bash
kubectl apply -f explainable-model.yaml

kubectl wait --for=condition=Ready inferenceservice/explainable-model -n ml-serving --timeout=5m

# Get explainer endpoint
kubectl get inferenceservice explainable-model -n ml-serving -o jsonpath='{.status.components.explainer.url}'
```

## Testing the Explainer

Query the explainer endpoint:

```bash
# Get service URLs
MODEL_URL=$(kubectl get inferenceservice explainable-model -n ml-serving -o jsonpath='{.status.url}')
EXPLAINER_URL=$(kubectl get inferenceservice explainable-model -n ml-serving -o jsonpath='{.status.components.explainer.url}')

# Get prediction
curl -X POST $MODEL_URL/v1/models/explainable-model:predict \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      [1.0, 2.0, 3.0, 4.0, 5.0]
    ]
  }'

# Get explanation
curl -X POST $EXPLAINER_URL/v1/models/explainable-model:explain \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      [1.0, 2.0, 3.0, 4.0, 5.0]
    ]
  }'
```

Expected explanation response:

```json
{
  "explanations": [
    {
      "instance": [1.0, 2.0, 3.0, 4.0, 5.0],
      "shap_values": [0.15, -0.23, 0.42, 0.08, -0.11],
      "base_value": 0.5,
      "feature_importance": {
        "feature_0": 0.15,
        "feature_1": 0.23,
        "feature_2": 0.42,
        "feature_3": 0.08,
        "feature_4": 0.11
      }
    }
  ]
}
```

## Creating a LIME Explainer

Alternative explainer using LIME:

```python
# lime_explainer.py
import kserve
import logging
from typing import Dict
import numpy as np
from lime.lime_tabular import LimeTabularExplainer
import pickle

logging.basicConfig(level=logging.INFO)

class LIMEExplainer(kserve.Model):
    def __init__(self, name: str, predictor_host: str):
        super().__init__(name)
        self.name = name
        self.predictor_host = predictor_host
        self.explainer = None
        self.model = None
        self.ready = False

    def load(self):
        """Load model and create LIME explainer"""
        with open('/mnt/models/model.pkl', 'rb') as f:
            self.model = pickle.load(f)

        # Load training data for LIME
        training_data = np.load('/mnt/models/training_data.npy')

        # Create LIME explainer
        self.explainer = LimeTabularExplainer(
            training_data,
            mode='classification',
            feature_names=[f'feature_{i}' for i in range(training_data.shape[1])],
            class_names=['class_0', 'class_1'],
            discretize_continuous=True
        )

        self.ready = True
        logging.info("LIME explainer loaded")

    def explain(self, request: Dict) -> Dict:
        """Generate LIME explanations"""
        instances = request.get("instances", [])

        explanations = []
        for instance in instances:
            # Generate explanation for single instance
            exp = self.explainer.explain_instance(
                np.array(instance),
                self.model.predict_proba,
                num_features=10,
                top_labels=1
            )

            # Extract feature importances
            feature_weights = dict(exp.as_list())

            explanation = {
                "instance": instance,
                "feature_importance": feature_weights,
                "intercept": float(exp.intercept[1]),
                "prediction_confidence": float(exp.predict_proba[1])
            }

            explanations.append(explanation)

        return {"explanations": explanations}

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_name", required=True)
    parser.add_argument("--predictor_host", required=True)
    args, _ = parser.parse_known_args()

    explainer = LIMEExplainer(
        name=args.model_name,
        predictor_host=args.predictor_host
    )
    explainer.load()
    kserve.ModelServer().start([explainer])
```

## Creating a Visual Explanation Service

Build a service that generates visual explanations:

```python
# visual_explainer.py
import kserve
from typing import Dict
import numpy as np
import matplotlib.pyplot as plt
import shap
import io
import base64

class VisualExplainer(kserve.Model):
    def __init__(self, name: str, predictor_host: str):
        super().__init__(name)
        self.name = name
        self.predictor_host = predictor_host

    def load(self):
        with open('/mnt/models/model.pkl', 'rb') as f:
            model = pickle.load(f)

        self.explainer = shap.TreeExplainer(model)
        self.ready = True

    def explain(self, request: Dict) -> Dict:
        """Generate visual explanations"""
        instances = request.get("instances", [])
        X = np.array(instances)

        shap_values = self.explainer.shap_values(X)

        # Create SHAP force plot
        shap.initjs()

        explanations = []
        for i in range(len(instances)):
            # Generate force plot
            fig = shap.force_plot(
                self.explainer.expected_value[1],
                shap_values[1][i],
                X[i],
                matplotlib=True,
                show=False
            )

            # Convert plot to base64 image
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight')
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()

            explanations.append({
                "instance": instances[i],
                "explanation_plot": f"data:image/png;base64,{img_base64}",
                "shap_values": shap_values[1][i].tolist()
            })

        return {"explanations": explanations}
```

## Monitoring Explainer Performance

Add metrics to track explainer usage:

```python
from prometheus_client import Counter, Histogram

EXPLANATION_COUNTER = Counter(
    'model_explanations_total',
    'Total explanations generated',
    ['model_name', 'status']
)

EXPLANATION_LATENCY = Histogram(
    'model_explanation_latency_seconds',
    'Explanation generation latency',
    ['model_name']
)

def explain(self, request: Dict) -> Dict:
    import time
    start_time = time.time()

    try:
        result = self._generate_explanation(request)

        EXPLANATION_COUNTER.labels(
            model_name=self.name,
            status='success'
        ).inc()

        return result
    except Exception as e:
        EXPLANATION_COUNTER.labels(
            model_name=self.name,
            status='error'
        ).inc()
        raise
    finally:
        EXPLANATION_LATENCY.labels(
            model_name=self.name
        ).observe(time.time() - start_time)
```

## Conclusion

KServe explainer containers make it easy to add interpretability to ML models without modifying your existing predictor. By providing explanations through a separate endpoint, you give users the ability to understand model decisions while keeping the prediction path optimized for performance. Whether using SHAP for feature attributions or LIME for local explanations, explainers help build trust in ML systems and meet regulatory requirements for model transparency.
