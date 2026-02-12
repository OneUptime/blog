# How to Set Up Amazon EC2 Inf2 Instances for ML Inference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Inf2, Inferentia2, Machine Learning, Inference, AI, Neuron SDK

Description: Complete guide to setting up Amazon EC2 Inf2 instances with AWS Inferentia2 chips for cost-effective and high-throughput machine learning inference workloads.

---

If you are serving ML models in production and your GPU bill is getting out of hand, EC2 Inf2 instances deserve a serious look. Powered by AWS Inferentia2 chips, Inf2 instances are purpose-built for ML inference and deliver up to 4x higher throughput and up to 10x lower cost-per-inference compared to GPU-based instances for many model architectures.

The trade-off is that you need to compile your model using the AWS Neuron SDK, which adds a step to your deployment pipeline. But for models that are well-supported (transformers, CNNs, standard architectures), the compilation is straightforward and the cost savings are significant.

## Inf2 Instance Types

| Instance | Inferentia2 Chips | Neuron Cores | vCPUs | Memory | Accelerator Memory |
|---|---|---|---|---|---|
| inf2.xlarge | 1 | 2 | 4 | 16 GB | 32 GB |
| inf2.8xlarge | 1 | 2 | 32 | 128 GB | 32 GB |
| inf2.24xlarge | 6 | 12 | 96 | 384 GB | 192 GB |
| inf2.48xlarge | 12 | 24 | 192 | 768 GB | 384 GB |

Each Inferentia2 chip has 2 NeuronCores-v2. The larger instances connect chips with NeuronLink for running models across multiple chips.

## Step 1: Launch an Inf2 Instance

```bash
# Launch an Inf2 instance with the Deep Learning AMI
aws ec2 run-instances \
  --image-id ami-0abc123-deep-learning \
  --instance-type inf2.xlarge \
  --count 1 \
  --key-name my-key \
  --subnet-id subnet-0abc123 \
  --security-group-ids sg-0abc123 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=inf2-inference}]'
```

Use the AWS Deep Learning AMI (Neuron), which comes with the Neuron SDK pre-installed. This saves you from manually installing drivers and the compiler.

## Step 2: Verify the Neuron Setup

```bash
# SSH into the instance
ssh -i my-key.pem ec2-user@<instance-ip>

# Check Neuron devices are visible
neuron-ls

# Expected output shows Inferentia2 devices
# For inf2.xlarge, you'll see 1 device with 2 NeuronCores

# Check Neuron runtime
neuron-top
# This is like nvidia-smi but for Neuron devices
```

## Step 3: Install the Neuron SDK

If you are not using the pre-built AMI, install the SDK manually.

```bash
# Configure the Neuron repository
sudo tee /etc/yum.repos.d/neuron.repo > /dev/null << EOF
[neuron]
name=Neuron YUM Repository
baseurl=https://yum.repos.neuron.amazonaws.com
enabled=1
gpgcheck=1
gpgkey=https://yum.repos.neuron.amazonaws.com/GPG-PUB-KEY-AMAZON-AWS-NEURON.PUB
EOF

# Install Neuron driver and tools
sudo yum install -y aws-neuronx-dkms aws-neuronx-tools

# Create a Python virtual environment for Neuron
python3 -m venv ~/neuron_env
source ~/neuron_env/bin/activate

# Install PyTorch Neuron (torch-neuronx)
pip install torch-neuronx neuronx-cc transformers
```

## Step 4: Compile a Model for Inferentia2

Models need to be compiled (traced) for the Neuron hardware before they can run. Here is an example with a BERT model.

```python
# compile_bert.py
import torch
import torch_neuronx
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Load the model
model_name = "bert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
model.eval()

# Create example inputs for tracing
# The model will be compiled for this specific input shape
example_input = tokenizer(
    "This is an example sentence for compilation",
    return_tensors="pt",
    max_length=128,
    padding="max_length",
    truncation=True
)

# Compile the model for Neuron
print("Compiling model for Inferentia2...")
neuron_model = torch_neuronx.trace(
    model,
    (example_input['input_ids'], example_input['attention_mask']),
    compiler_args=['--auto-cast', 'all', '--auto-cast-type', 'bf16']
)

# Save the compiled model
neuron_model.save("bert_neuron.pt")
print("Model compiled and saved!")
```

```bash
# Run the compilation (takes a few minutes)
python compile_bert.py
```

The `--auto-cast bf16` flag tells the compiler to use BF16 precision, which is well-suited for inference and runs efficiently on Inferentia2.

## Step 5: Run Inference

```python
# inference.py
import torch
import torch_neuronx
from transformers import AutoTokenizer
import time

# Load the compiled model
model = torch.jit.load("bert_neuron.pt")
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# Warm up the model
dummy_input = tokenizer(
    "warmup",
    return_tensors="pt",
    max_length=128,
    padding="max_length",
    truncation=True
)
_ = model(dummy_input['input_ids'], dummy_input['attention_mask'])

# Run inference
texts = [
    "This movie was absolutely fantastic!",
    "I did not enjoy this product at all.",
    "The weather is nice today.",
    "Outstanding customer service experience.",
]

for text in texts:
    inputs = tokenizer(
        text,
        return_tensors="pt",
        max_length=128,
        padding="max_length",
        truncation=True
    )

    start = time.time()
    with torch.no_grad():
        output = model(inputs['input_ids'], inputs['attention_mask'])

    latency = (time.time() - start) * 1000
    prediction = torch.argmax(output[0], dim=1).item()
    label = "Positive" if prediction == 1 else "Negative"
    print(f"{text[:50]:50s} -> {label} ({latency:.1f}ms)")
```

## Step 6: Serve with a Web Server

For production serving, wrap the model in a web server.

```python
# serve.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import torch_neuronx
from transformers import AutoTokenizer
import uvicorn

app = FastAPI()

# Load model and tokenizer at startup
model = torch.jit.load("bert_neuron.pt")
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

class PredictionRequest(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    label: str
    confidence: float

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    inputs = tokenizer(
        request.text,
        return_tensors="pt",
        max_length=128,
        padding="max_length",
        truncation=True
    )

    with torch.no_grad():
        output = model(inputs['input_ids'], inputs['attention_mask'])

    probabilities = torch.softmax(output[0], dim=1)
    prediction = torch.argmax(probabilities, dim=1).item()
    confidence = probabilities[0][prediction].item()

    return PredictionResponse(
        label="Positive" if prediction == 1 else "Negative",
        confidence=confidence
    )

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

## Step 7: Compile Large Language Models

For larger models like LLaMA or GPT variants, use the `transformers-neuronx` library which handles model parallelism across multiple NeuronCores.

```python
# compile_llm.py
from transformers_neuronx import LlamaForSampling
from transformers import AutoTokenizer

# Compile LLaMA for Inf2
# This distributes the model across available NeuronCores
model = LlamaForSampling.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    batch_size=1,
    tp_degree=2,  # Tensor parallelism across 2 NeuronCores
    amp='bf16',
    n_positions=2048
)

# Compile (this takes 10-20 minutes for a 7B model)
model.to_neuron()

# Save for later use
model.save("llama2_7b_neuron/")
```

## Cost Comparison

| Instance | Hourly Cost | Throughput (BERT inferences/sec) | Cost per 1M inferences |
|---|---|---|---|
| g5.xlarge (A10G GPU) | $1.01 | ~2,500 | $0.11 |
| inf2.xlarge (Inferentia2) | $0.76 | ~5,000 | $0.04 |
| Savings | 25% less | 2x more | 64% less |

The exact numbers depend on your model and batch size, but Inf2 consistently delivers better price-performance for inference workloads.

## Limitations to Know

- Not all model architectures compile cleanly. Custom operators may need workarounds.
- Compilation can take minutes to hours for large models.
- Dynamic input shapes require separate compilations for each shape, or you need to pad to a fixed size.
- Debugging compiled models is harder than GPU debugging.

For models that do not work well on Inferentia2, consider [AWS Inferentia (first generation)](https://oneuptime.com/blog/post/use-aws-inferentia-instances-for-ml-inference/view) for simpler models, or stick with GPU instances.

## Wrapping Up

EC2 Inf2 instances are the most cost-effective way to serve ML models on AWS, as long as your model compiles successfully with the Neuron SDK. For standard transformer models, CNNs, and most common architectures, the compilation process is smooth and the performance gains are substantial. If inference costs are a significant part of your ML spend, Inf2 should be at the top of your evaluation list.
