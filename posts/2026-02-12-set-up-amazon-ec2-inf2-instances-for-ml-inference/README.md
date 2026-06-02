# How to Set Up Amazon EC2 Inf2 Instances for ML Inference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Inf2, Inferentia2, Machine Learning, Inference, AI, Neuron SDK

Description: Complete guide to setting up Amazon EC2 Inf2 instances with AWS Inferentia2 chips for cost-effective and high-throughput machine learning inference workloads.

---

If you are serving ML models in production and your GPU bill is getting out of hand, EC2 Inf2 instances deserve a serious look. Powered by AWS Inferentia2 chips, Inf2 instances are purpose-built for ML inference and deliver up to 4x higher throughput and up to 10x lower latency compared to first-generation Inf1 instances.

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
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters "Name=name,Values=Deep Learning AMI Neuron PyTorch 2.9 (Ubuntu 24.04)*" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text)

aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type inf2.xlarge \
  --count 1 \
  --key-name my-key \
  --subnet-id subnet-0abc123 \
  --security-group-ids sg-0abc123 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=inf2-inference}]'
```

Use an AWS Deep Learning AMI for Neuron, such as the current Neuron PyTorch DLAMI, which comes with Neuron components pre-installed. This saves you from manually installing drivers and the compiler.

## Step 2: Verify the Neuron Setup

```bash
# SSH into the instance
# Use ubuntu@<instance-ip> for Ubuntu DLAMIs, or ec2-user@<instance-ip> for Amazon Linux AMIs
ssh -i my-key.pem ubuntu@<instance-ip>

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
# Configure the Neuron repository on Ubuntu 24.04
. /etc/os-release
sudo tee /etc/apt/sources.list.d/neuron.list > /dev/null << EOF
deb https://apt.repos.neuron.amazonaws.com ${VERSION_CODENAME} main
EOF
wget -qO - https://apt.repos.neuron.amazonaws.com/GPG-PUB-KEY-AMAZON-AWS-NEURON.PUB | sudo apt-key add -
sudo apt-get update -y

# Install Neuron driver, runtime, and tools
sudo apt-get install -y linux-headers-$(uname -r) git
sudo apt-get install -y aws-neuronx-dkms=2.* aws-neuronx-collectives=2.* aws-neuronx-runtime-lib=2.* aws-neuronx-tools=2.*
export PATH=/opt/aws/neuron/bin:$PATH

# Create a Python virtual environment for Neuron
sudo apt-get install -y python3.12-venv g++
python3.12 -m venv ~/neuron_env
source ~/neuron_env/bin/activate
python -m pip install -U pip

# Point pip at the Neuron package repository
python -m pip config set global.extra-index-url https://pip.repos.neuron.amazonaws.com

# Install PyTorch Neuron (torch-neuronx)
python -m pip install neuronx-cc==2.* torch-neuronx==2.9.* torchvision transformers
```

## Step 4: Compile a Model for Inferentia2

Models need to be compiled (traced) for the Neuron hardware before they can run. Here is an example with a BERT model.

```python
# compile_bert.py
import torch
import torch_neuronx
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Load a BERT model fine-tuned for sentiment classification
model_name = "textattack/bert-base-uncased-SST-2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name, torchscript=True)
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
    (example_input['input_ids'], example_input['attention_mask'], example_input['token_type_ids']),
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

The `--auto-cast all --auto-cast-type bf16` flags tell the compiler to cast FP32 operations to BF16 for higher performance. This can reduce precision, so validate model accuracy after compilation.

## Step 5: Run Inference

```python
# inference.py
import torch
import torch_neuronx
from transformers import AutoTokenizer
import time

# Load the compiled model
model = torch.jit.load("bert_neuron.pt")
tokenizer = AutoTokenizer.from_pretrained("textattack/bert-base-uncased-SST-2")

# Warm up the model
dummy_input = tokenizer(
    "warmup",
    return_tensors="pt",
    max_length=128,
    padding="max_length",
    truncation=True
)
_ = model(dummy_input['input_ids'], dummy_input['attention_mask'], dummy_input['token_type_ids'])

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
        output = model(inputs['input_ids'], inputs['attention_mask'], inputs['token_type_ids'])

    latency = (time.time() - start) * 1000
    logits = output[0]
    prediction = torch.argmax(logits, dim=1).item()
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
tokenizer = AutoTokenizer.from_pretrained("textattack/bert-base-uncased-SST-2")

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
        output = model(inputs['input_ids'], inputs['attention_mask'], inputs['token_type_ids'])

    logits = output[0]
    probabilities = torch.softmax(logits, dim=1)
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

```bash
pip install transformers-neuronx --extra-index-url=https://pip.repos.neuron.amazonaws.com
```

```python
# compile_llm.py
from transformers_neuronx import LlamaForSampling

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

The exact numbers depend on your model, region, batch size, and concurrency. Benchmark your workload before committing to an instance family.

## Limitations to Know

- Not all model architectures compile cleanly. Custom operators may need workarounds.
- Compilation can take minutes to hours for large models.
- Dynamic input shapes require separate compilations for each shape, or you need to pad to a fixed size.
- Debugging compiled models is harder than GPU debugging.

For models that do not work well on Inferentia2, consider GPU instances or other AWS inference options. [AWS Inferentia (first generation)](https://oneuptime.com/blog/post/2026-02-12-use-aws-inferentia-instances-for-ml-inference/view) is still useful for some simpler supported models, but it uses the older Neuron stack.

## Wrapping Up

EC2 Inf2 instances can be a cost-effective way to serve ML models on AWS, as long as your model compiles successfully with the Neuron SDK. For standard transformer models, CNNs, and most common architectures, the compilation process is smooth and the performance gains can be substantial. If inference costs are a significant part of your ML spend, Inf2 should be at the top of your evaluation list.
