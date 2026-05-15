# How to Install InstructLab on RHEL for Local AI Model Training

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, InstructLab, AI, Machine Learning, LLM

Description: Install and configure InstructLab on RHEL to fine-tune large language models locally using synthetic data generation and taxonomy-driven training.

---

InstructLab is an open-source project that lets you contribute knowledge and skills to large language models (LLMs) without needing massive training infrastructure. It uses a taxonomy-driven approach to generate synthetic training data and fine-tune models locally on RHEL.

## Prerequisites

- RHEL 9.2 or later with Python 3.11
- At least 16 GB RAM (more for larger models)
- A GPU with CUDA support is recommended but not required for CPU-only training

## Install InstructLab

```bash
# Install Python 3.11 and development tools

sudo dnf install -y python3.11 python3.11-devel python3.11-pip gcc gcc-c++ make

# Create a virtual environment
python3.11 -m venv --upgrade-deps ~/instructlab-venv
source ~/instructlab-venv/bin/activate

# Install InstructLab
python -m pip install instructlab

# Verify the installation
ilab --version
```

## Initialize the Project

```bash
# Initialize the InstructLab project directory
ilab config init

# This creates:
# ~/.config/instructlab/config.yaml
# ~/.local/share/instructlab/taxonomy/
```

## Download a Base Model

```bash
# Download the default model
ilab model download

# Or download the Granite GGUF model
ilab model download --repository instructlab/granite-7b-lab-GGUF \
    --filename granite-7b-lab-Q4_K_M.gguf

# List downloaded models
ilab model list
```

## Serve the Model Locally

```bash
# Start the model server
ilab model serve

# In another terminal, test with a chat session
ilab model chat
```

## Add Knowledge to the Taxonomy

Create a knowledge contribution in the taxonomy:

```bash
# Navigate to the taxonomy directory
cd ~/.local/share/instructlab/taxonomy

# Create a knowledge directory
mkdir -p knowledge/technology/rhel

# Create a qna.yaml file with questions and answers
cat > knowledge/technology/rhel/qna.yaml << 'EOF'
created_by: nawazdhandala
version: 3
domain: technology
seed_examples:
  - context: |
      Red Hat Enterprise Linux 9 uses DNF as its software package manager.
      The dnf command installs, updates, and removes software packages.
    questions_and_answers:
      - question: What package manager does RHEL use?
        answer: RHEL uses DNF as its software package manager.
      - question: What tasks can DNF perform on RHEL?
        answer: DNF can install, update, and remove software packages on RHEL.
      - question: How do you install a package on RHEL?
        answer: Use the command sudo dnf install package-name to install packages on RHEL.
  - context: |
      RHEL 9 includes Python 3.9 as the default Python implementation.
      Python 3.11 is available as the python3.11 package suite on RHEL 9.2 and later.
    questions_and_answers:
      - question: What is the default Python implementation in RHEL 9?
        answer: RHEL 9 includes Python 3.9 as the default Python implementation.
      - question: Which package suite provides Python 3.11 on RHEL 9.2 and later?
        answer: The python3.11 package suite provides Python 3.11 on RHEL 9.2 and later.
      - question: How can you check the installed Python 3.11 version?
        answer: Run python3.11 --version to check the installed Python 3.11 version.
  - context: |
      Python virtual environments isolate Python packages from the system Python installation.
      On RHEL, using pip inside a virtual environment avoids installing third-party packages into system locations.
    questions_and_answers:
      - question: Why use a Python virtual environment on RHEL?
        answer: A virtual environment isolates Python packages from the system Python installation.
      - question: How does a virtual environment help when using pip?
        answer: It lets pip install third-party packages outside system Python locations.
      - question: What command creates a Python 3.11 virtual environment?
        answer: Use python3.11 -m venv followed by the target directory to create a Python 3.11 virtual environment.
  - context: |
      The CodeReady Linux Builder repository contains additional developer tools for RHEL.
      Some Python developer packages are distributed through CodeReady Linux Builder.
    questions_and_answers:
      - question: What does the CodeReady Linux Builder repository provide?
        answer: It provides additional developer tools and packages for RHEL.
      - question: Where are some Python developer packages distributed for RHEL?
        answer: Some Python developer packages are distributed through the CodeReady Linux Builder repository.
      - question: Is every upstream Python package available as a RHEL package?
        answer: No, not all upstream Python-related packages are available in RHEL.
  - context: |
      InstructLab stores its configuration file separately from its data directory.
      The default configuration file is in ~/.config/instructlab/config.yaml, while generated data and the taxonomy are stored under ~/.local/share/instructlab/.
    questions_and_answers:
      - question: Where is the default InstructLab configuration file stored?
        answer: The default InstructLab configuration file is stored at ~/.config/instructlab/config.yaml.
      - question: Where does InstructLab store generated data by default?
        answer: InstructLab stores generated data under ~/.local/share/instructlab/ by default.
      - question: Where is the default local taxonomy directory?
        answer: The default local taxonomy directory is ~/.local/share/instructlab/taxonomy/.
document_outline: Overview of RHEL package management with DNF
document:
  repo: https://github.com/your-repo/rhel-docs.git
  commit: 0123456789abcdef0123456789abcdef01234567
  patterns:
    - "*.md"
EOF
```

## Generate Synthetic Training Data

```bash
# Generate training data from the taxonomy
ilab data generate

# This creates synthetic question-answer pairs based on your taxonomy contributions
# Output is saved to ~/.local/share/instructlab/datasets/
```

## Train the Model

```bash
# Run training on the generated data
ilab model train

# For CPU-only training (slower but works without GPU)
ilab model train --pipeline full --device cpu --data-path ~/.local/share/instructlab/datasets/knowledge_train_msgs_<timestamp>.jsonl

# This creates a fine-tuned model checkpoint
```

## Test the Fine-Tuned Model

```bash
# Serve the trained model
ilab model serve --model-path <new-model-path>

# Chat with the fine-tuned model
ilab model chat --model <new-model-path>
```

## Validate the Taxonomy

```bash
# Check that your taxonomy changes are valid
ilab taxonomy diff

# Validate the entire taxonomy
ilab taxonomy diff --taxonomy-base=empty
```

InstructLab on RHEL provides a practical workflow for customizing LLMs with domain-specific knowledge without needing cloud-scale GPU infrastructure.
