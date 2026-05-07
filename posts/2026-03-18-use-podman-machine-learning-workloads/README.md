# How to Use Podman for Machine Learning Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Machine Learning, GPU, Data Science

Description: Learn how to use Podman to run machine learning workloads in containers with GPU access, reproducible environments, and efficient resource management for training and inference.

---

> Podman containers for machine learning provide reproducible training environments, GPU passthrough for accelerated computation, and isolated inference serving that scales predictably.

Machine learning workflows demand precise control over software versions, library dependencies, and hardware access. A model that trains successfully with one combination of CUDA, cuDNN, and PyTorch versions may fail silently with another. Podman solves this by encapsulating the user-space ML stack in a container, including CUDA and framework libraries, while relying on the host GPU driver through CDI, ensuring that experiments are reproducible and deployable. The rootless architecture of Podman is particularly valuable in shared computing environments where multiple data scientists need GPU access without root privileges.

---

## Setting Up GPU Access

Before running ML workloads, configure Podman to access host GPUs. Install the NVIDIA Container Toolkit:

```bash
# On Fedora/RHEL

curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | \
  sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo

sudo dnf install nvidia-container-toolkit
```

```bash
# On Ubuntu/Debian
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
```

Configure the CDI specification for Podman:

```bash
sudo nvidia-ctk cdi generate --output=/etc/cdi/nvidia.yaml
nvidia-ctk cdi list
```

Verify GPU access:

```bash
podman run --rm \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvidia/cuda:12.3.1-base-ubuntu22.04 \
  nvidia-smi
```

## Building a PyTorch Training Environment

Create a comprehensive ML training container:

```dockerfile
FROM nvidia/cuda:12.3.1-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
    torch==2.2.0 \
    torchvision==0.17.0 \
    torchaudio==2.2.0 \
    --index-url https://download.pytorch.org/whl/cu121

RUN pip3 install --no-cache-dir \
    numpy \
    pandas \
    scikit-learn \
    matplotlib \
    tensorboard \
    wandb \
    tqdm \
    Pillow

WORKDIR /workspace

ENTRYPOINT ["python3"]
```

```bash
podman build -t ml-pytorch:latest -f Containerfile.pytorch .
```

## Running a Training Job

Here is how to launch a training job with GPU access and persistent storage for datasets and model checkpoints:

```bash
podman run --rm \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  --shm-size=8g \
  --memory 32g \
  --cpus 8.0 \
  -v $(pwd)/data:/workspace/data:Z \
  -v $(pwd)/models:/workspace/models:Z \
  -v $(pwd)/logs:/workspace/logs:Z \
  -v $(pwd)/train.py:/workspace/train.py:ro,Z \
  ml-pytorch:latest \
  /workspace/train.py --epochs 100 --batch-size 64
```

A sample training script:

```python
# train.py
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import os
import argparse
from datetime import datetime

def get_device():
    if torch.cuda.is_available():
        device = torch.device('cuda')
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    else:
        device = torch.device('cpu')
        print("Using CPU")
    return device

class SimpleNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Linear(64 * 7 * 7, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 10),
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

def train(args):
    device = get_device()

    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),
    ])

    train_dataset = datasets.MNIST(
        '/workspace/data', train=True, download=True, transform=transform
    )
    train_loader = DataLoader(
        train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=4
    )

    model = SimpleNet().to(device)
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(args.epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(device), target.to(device)
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            _, predicted = output.max(1)
            total += target.size(0)
            correct += predicted.eq(target).sum().item()

        accuracy = 100.0 * correct / total
        avg_loss = total_loss / len(train_loader)
        print(f"Epoch {epoch+1}/{args.epochs} - Loss: {avg_loss:.4f}, Accuracy: {accuracy:.2f}%")

        # Save checkpoint
        if (epoch + 1) % 10 == 0:
            checkpoint_path = f'/workspace/models/checkpoint_epoch_{epoch+1}.pt'
            torch.save({
                'epoch': epoch + 1,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'loss': avg_loss,
            }, checkpoint_path)
            print(f"Checkpoint saved: {checkpoint_path}")

    # Save final model
    torch.save(model.state_dict(), '/workspace/models/final_model.pt')
    print("Training complete. Model saved.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--lr', type=float, default=0.001)
    args = parser.parse_args()
    train(args)
```

## Jupyter Notebook Environment

Run Jupyter notebooks inside a container for interactive ML development:

```dockerfile
FROM ml-pytorch:latest

RUN pip3 install --no-cache-dir \
    jupyterlab \
    ipywidgets \
    seaborn

EXPOSE 8888

ENTRYPOINT ["jupyter", "lab"]

CMD ["--ip=0.0.0.0", \
     "--port=8888", \
     "--no-browser", \
     "--allow-root"]
```

```bash
podman build -t ml-jupyter:latest -f Containerfile.jupyter .
```

```bash
podman run --rm -d \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  --shm-size=8g \
  -p 8888:8888 \
  -v $(pwd)/notebooks:/workspace/notebooks:Z \
  -v $(pwd)/data:/workspace/data:Z \
  --name jupyter-ml \
  ml-jupyter:latest
```

Run `podman logs jupyter-ml` and open the tokenized Jupyter URL that it prints.

## Model Serving with Podman

Deploy trained models for inference:

```dockerfile
FROM python:3.12-slim

RUN pip install --no-cache-dir \
    torch==2.2.0 \
    torchvision==0.17.0 \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    flask \
    gunicorn

COPY serve.py /app/serve.py

WORKDIR /app
EXPOSE 8080

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "serve:app"]
```

```bash
podman build -t ml-serving:latest -f Containerfile.serving .
```

```python
# serve.py
from flask import Flask, request, jsonify
import torch
import torch.nn as nn
from PIL import Image
import io
import torchvision.transforms as transforms

app = Flask(__name__)

model = None

class SimpleNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Linear(64 * 7 * 7, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 10),
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

def load_model():
    global model
    model = SimpleNet()
    model.load_state_dict(torch.load('/models/final_model.pt', map_location='cpu'))
    model.eval()

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        load_model()

    image_bytes = request.data
    image = Image.open(io.BytesIO(image_bytes)).convert('L')

    transform = transforms.Compose([
        transforms.Resize((28, 28)),
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),
    ])

    tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(tensor)
        probabilities = torch.softmax(output, dim=1)
        prediction = output.argmax(dim=1).item()
        confidence = probabilities[0][prediction].item()

    return jsonify({
        'prediction': prediction,
        'confidence': round(confidence, 4),
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})
```

```bash
podman run --rm -d \
  -p 8080:8080 \
  -v $(pwd)/models:/models:ro,Z \
  --memory 2g \
  --cpus 2.0 \
  --name model-server \
  ml-serving:latest
```

## Experiment Tracking

Track multiple experiments using different container configurations:

```bash
#!/bin/bash
# run-experiments.sh

EXPERIMENTS=(
    "--lr 0.001 --batch-size 32"
    "--lr 0.001 --batch-size 64"
    "--lr 0.01 --batch-size 32"
    "--lr 0.01 --batch-size 64"
)

for i in "${!EXPERIMENTS[@]}"; do
    exp_name="exp-$(printf '%03d' $i)"
    echo "Running experiment $exp_name: ${EXPERIMENTS[$i]}"

    mkdir -p "results/$exp_name"

    podman run --rm \
      --device nvidia.com/gpu=all \
      --security-opt=label=disable \
      --shm-size=8g \
      -v $(pwd)/data:/workspace/data:Z \
      -v $(pwd)/results/$exp_name:/workspace/models:Z \
      -v $(pwd)/train.py:/workspace/train.py:ro,Z \
      ml-pytorch:latest \
      /workspace/train.py --epochs 50 ${EXPERIMENTS[$i]} \
      2>&1 | tee "results/$exp_name/training.log"
done
```

## Conclusion

Podman provides a practical foundation for machine learning workloads. GPU passthrough via CDI gives containers direct access to accelerator hardware, while volume mounts enable persistent storage of datasets and model checkpoints. The containerized approach ensures that training environments are reproducible, experiments are isolated, and models can transition smoothly from development to production serving. Whether you are running quick experiments on a workstation or deploying inference services, Podman gives you the control and isolation that machine learning workflows demand.
