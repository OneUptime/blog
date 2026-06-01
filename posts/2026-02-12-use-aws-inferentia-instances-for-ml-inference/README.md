# How to Use AWS Inferentia Instances for ML Inference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Inferentia, EC2, Machine Learning, Inference, Neuron SDK, Cost Optimization

Description: Guide to deploying machine learning models on AWS Inferentia-powered EC2 Inf1 instances for high-performance and cost-effective inference at scale.

---

AWS Inferentia is Amazon's first-generation custom ML inference chip. While the newer Inferentia2 (Inf2 instances) gets most of the attention now, the original Inf1 instances remain a cost-effective choice for legacy inference workloads. Treat Inf1 as a legacy platform: it can work well for models that fit within its capabilities, but new projects should also evaluate Inf2 and the current Neuron SDK support matrix.

Inf1 instances deliver up to 2.3x higher throughput and up to 70% lower cost-per-inference compared to GPU instances for supported models. If you are running production inference for standard model architectures and cost is your primary concern, Inf1 deserves consideration.

## Inf1 Instance Types

| Instance | Inferentia Chips | NeuronCores | vCPUs | Memory |
|---|---|---|---|---|
| inf1.xlarge | 1 | 4 | 4 | 8 GB |
| inf1.2xlarge | 1 | 4 | 8 | 16 GB |
| inf1.6xlarge | 4 | 16 | 24 | 48 GB |
| inf1.24xlarge | 16 | 64 | 96 | 192 GB |

Each first-generation Inferentia chip has 4 NeuronCores (compared to 2 NeuronCores-v2 on Inferentia2). The cores are optimized for matrix operations common in ML inference.

## Step 1: Launch an Inf1 Instance

```bash
# Launch an Inf1 instance with the Neuron Deep Learning AMI

aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/neuron/dlami/pytorch-1.13/amazon-linux-2/latest/image_id \
  --instance-type inf1.xlarge \
  --count 1 \
  --key-name my-key \
  --subnet-id subnet-0abc123 \
  --security-group-ids sg-0abc123 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=inf1-inference}]'
```

## Step 2: Set Up the Environment

```bash
# SSH into the instance
ssh -i my-key.pem ec2-user@<instance-ip>

# Verify Neuron devices
neuron-ls
# Should show Inferentia devices

# Activate the pre-installed Neuron PyTorch environment
source activate aws_neuron_pytorch_p36

# Verify the setup
python3 -c "import torch; import torch_neuron; print('Neuron SDK ready')"
```

Note that Inf1 uses `torch_neuron` (not `torch_neuronx` which is for Inf2/Trn1). The APIs are similar but there are differences.

## Step 3: Compile a Model

```python
# compile_model.py
import torch
import torch_neuron
from transformers import AutoTokenizer, AutoModelForSequenceClassification


class SentimentModel(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        return self.model(input_ids=input_ids, attention_mask=attention_mask).logits

# Load a pre-trained model
model_name = "distilbert-base-uncased-finetuned-sst-2-english"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = SentimentModel(AutoModelForSequenceClassification.from_pretrained(model_name))
model.eval()

# Create example inputs matching your expected input shape
example_inputs = tokenizer(
    "This is an example sentence",
    return_tensors="pt",
    max_length=128,
    padding="max_length",
    truncation=True
)

# Trace and compile for Inferentia
print("Compiling model for Inferentia...")
neuron_model = torch.neuron.trace(
    model,
    (example_inputs['input_ids'], example_inputs['attention_mask']),
    compiler_args=['--neuroncore-pipeline-cores', '1'],
    dynamic_batch_size=True
)

# Save the compiled model
neuron_model.save("distilbert_neuron.pt")
print("Model compiled successfully!")
```

The `--neuroncore-pipeline-cores` flag controls how many NeuronCores the model uses. Set it to 1 for smaller models to leave cores free for parallel requests.

## Step 4: Run Inference

```python
# inference.py
import torch
import torch_neuron
from transformers import AutoTokenizer
import time

# Load compiled model
model = torch.jit.load("distilbert_neuron.pt")
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased-finetuned-sst-2-english")

# Benchmark inference
texts = [
    "I absolutely loved this movie, it was fantastic!",
    "The service was terrible and the food was cold.",
    "It was an okay experience, nothing special.",
    "Best purchase I have ever made, highly recommend!",
    "Would not buy this again, very disappointed.",
]

# Warm up
warmup_input = tokenizer("warmup", return_tensors="pt", max_length=128,
                          padding="max_length", truncation=True)
for _ in range(10):
    _ = model(warmup_input['input_ids'], warmup_input['attention_mask'])

# Run inference with timing
latencies = []
for text in texts:
    inputs = tokenizer(text, return_tensors="pt", max_length=128,
                       padding="max_length", truncation=True)

    start = time.time()
    with torch.no_grad():
        output = model(inputs['input_ids'], inputs['attention_mask'])
    latency_ms = (time.time() - start) * 1000
    latencies.append(latency_ms)

    logits = output
    prediction = torch.argmax(logits, dim=1).item()
    label = "Positive" if prediction == 1 else "Negative"
    print(f"[{latency_ms:.1f}ms] {label}: {text[:60]}")

print(f"\nAverage latency: {sum(latencies)/len(latencies):.1f}ms")
print(f"P99 latency: {sorted(latencies)[int(len(latencies)*0.99)]:.1f}ms")
```

## Step 5: Batch Inference for Throughput

To maximize throughput, batch multiple requests together.

```python
# batch_inference.py
import torch
import torch_neuron
from transformers import AutoTokenizer
import time

model = torch.jit.load("distilbert_neuron.pt")
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased-finetuned-sst-2-english")

def batch_predict(texts, batch_size=8):
    """Run inference on a batch of texts"""
    results = []

    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i+batch_size]

        # Tokenize the batch
        inputs = tokenizer(
            batch_texts,
            return_tensors="pt",
            max_length=128,
            padding="max_length",
            truncation=True
        )

        with torch.no_grad():
            outputs = model(inputs['input_ids'], inputs['attention_mask'])

        predictions = torch.argmax(outputs, dim=1).tolist()
        labels = ["Positive" if p == 1 else "Negative" for p in predictions]
        results.extend(labels)

    return results

# Process 1000 texts
import random
sample_texts = ["This is great!"] * 500 + ["This is terrible!"] * 500
random.shuffle(sample_texts)

start = time.time()
results = batch_predict(sample_texts, batch_size=16)
elapsed = time.time() - start

print(f"Processed {len(sample_texts)} texts in {elapsed:.2f}s")
print(f"Throughput: {len(sample_texts)/elapsed:.0f} inferences/second")
```

## Step 6: Deploy with Multiple NeuronCores

On an inf1.6xlarge with 16 NeuronCores, you can run multiple model instances in parallel.

```python
# multi_core_server.py
import torch
import torch_neuron
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer

app = FastAPI()
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased-finetuned-sst-2-english")


class PredictionRequest(BaseModel):
    text: str

# Load the model on multiple NeuronCores
NUM_MODELS = 4  # One per NeuronCore group
models = []
for i in range(NUM_MODELS):
    model = torch.jit.load("distilbert_neuron.pt")
    models.append(model)

# Round-robin assignment
request_counter = 0

@app.post("/predict")
async def predict(request: PredictionRequest):
    global request_counter
    model_idx = request_counter % NUM_MODELS
    request_counter += 1

    model = models[model_idx]

    inputs = tokenizer(request.text, return_tensors="pt", max_length=128,
                       padding="max_length", truncation=True)

    with torch.no_grad():
        output = model(inputs['input_ids'], inputs['attention_mask'])

    prediction = torch.argmax(output, dim=1).item()
    return {"label": "Positive" if prediction == 1 else "Negative"}
```

## Inf1 vs Inf2: When to Use Which

| Feature | Inf1 (Inferentia) | Inf2 (Inferentia2) |
|---|---|---|
| NeuronCores per chip | 4 | 2 (more powerful) |
| Memory per chip | 8 GB | 32 GB |
| Best for | Smaller models (BERT, DistilBERT) | Larger models (LLaMA, GPT) |
| Cost | Lower | Higher |
| Dynamic shapes | Limited | Better support |
| SDK | torch_neuron | torch_neuronx |

Use Inf1 when:
- Your model fits in 8GB or less per chip
- You are running well-established architectures (BERT, ResNet, etc.)
- Cost is the top priority and you need maximum inference per dollar

Use Inf2 when:
- Your model needs more accelerator memory
- You are running large language models
- You need better support for dynamic input shapes

For a deeper look at Inf2, see our guide on [setting up EC2 Inf2 instances for ML inference](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-ec2-inf2-instances-for-ml-inference/view).

## Deployment with SageMaker

For production deployments with auto-scaling, you can use Inf1 with SageMaker. Compile for the same target instance family you deploy to, such as `ml_inf1`.

```python
import sagemaker
from sagemaker.pytorch import PyTorchModel

# Create a SageMaker model from your SageMaker Neo-compiled artifact
model = PyTorchModel(
    model_data="s3://my-models/distilbert_neo_compiled.tar.gz",
    role="arn:aws:iam::123456789012:role/SageMakerRole",
    framework_version="1.5",
    py_version="py3",
    entry_point="inference.py",
    source_dir="code",
    image_uri="<pytorch-neo-inference-image-uri>"
)

# Deploy to an Inf1 endpoint
predictor = model.deploy(
    instance_type="ml.inf1.xlarge",
    initial_instance_count=2,
    endpoint_name="sentiment-inf1"
)
```

## Monitoring Inf1 Performance

```bash
# Monitor NeuronCore utilization
neuron-top

# Check inference latency and throughput metrics
neuron-monitor

# Watch for compilation cache hits (improves startup time)
ls /var/tmp/neuron-compile-cache/
```

## Common Issues

- **Compilation fails** - Some PyTorch operations are not supported. Check the Neuron SDK documentation for the operator support matrix.
- **Accuracy differs from GPU** - Neuron uses its own number formats. Verify accuracy on a test set after compilation.
- **Memory errors** - The model may be too large for the available NeuronCore memory. Try reducing batch size or using a smaller model variant.

## Wrapping Up

AWS Inferentia Inf1 instances can still be a cost-effective way to run inference for common ML model architectures that already fit the legacy Inf1 software and hardware constraints. While Inf2 offers more capabilities for larger models, Inf1's lower price point can still make sense for teams running standard transformer or CNN models at scale. The compilation step adds some friction to your deployment pipeline, so validate model support, accuracy, and current Neuron SDK support before committing to Inf1 for a new deployment.
