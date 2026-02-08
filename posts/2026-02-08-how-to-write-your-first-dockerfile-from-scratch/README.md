# How to Write Your First Dockerfile from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Containers, DevOps, Beginners, Tutorial

Description: A beginner-friendly guide to writing your first Dockerfile from scratch with practical examples and best practices.

---

A Dockerfile is a plain text file that contains instructions for building a Docker image. Each instruction in the file creates a layer in the image. When you run `docker build`, Docker reads the Dockerfile, executes each instruction in order, and produces an image that you can then run as a container.

Writing your first Dockerfile can feel intimidating if you have never done it before. This guide walks through the process from start to finish, building a real application image along the way.

## What You Need Before Starting

Make sure you have Docker installed on your system. You can verify this by running:

```bash
# Verify Docker is installed and running
docker --version
docker info
```

You also need a text editor and a basic understanding of the command line. No prior Docker experience is required.

## The Anatomy of a Dockerfile

Every Dockerfile follows the same basic structure. Here is a minimal example:

```dockerfile
# Start from a base image
FROM ubuntu:22.04

# Run a command to install software
RUN apt-get update && apt-get install -y curl

# Set the command that runs when the container starts
CMD ["curl", "--version"]
```

Let's break down what each line does:

- `FROM` specifies the base image. Every Dockerfile must start with a FROM instruction (or an ARG before it).
- `RUN` executes a command during the build process. The result is saved as a new layer.
- `CMD` defines the default command that runs when a container is started from this image.

## Building a Simple Python Application Image

Let's build something practical. We will create a Dockerfile for a simple Python web application.

First, create a project directory:

```bash
# Create and enter the project directory
mkdir my-python-app
cd my-python-app
```

Create a simple Python application file:

```python
# app.py - A minimal Flask web server
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello from Docker!"

@app.route("/health")
def health():
    return "OK", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

Create a requirements file for Python dependencies:

```
# requirements.txt - Python package dependencies
flask==3.0.0
```

Now, write the Dockerfile:

```dockerfile
# Use Python 3.11 slim as the base image (smaller than the full image)
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file first (for better build caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Document that the app listens on port 5000
EXPOSE 5000

# Define the command to run the application
CMD ["python", "app.py"]
```

## Building the Image

With the Dockerfile in place, build the image:

```bash
# Build the image and tag it with a name
docker build -t my-python-app .
```

The `-t` flag tags the image with a name. The `.` at the end tells Docker to use the current directory as the build context (where it looks for the Dockerfile and files to copy).

You will see output for each step as Docker executes the instructions:

```
Step 1/7 : FROM python:3.11-slim
 ---> abc123def456
Step 2/7 : WORKDIR /app
 ...
Successfully built 789abc123def
Successfully tagged my-python-app:latest
```

## Running the Container

Start a container from the image:

```bash
# Run the container, mapping port 5000 on the host to port 5000 in the container
docker run -p 5000:5000 my-python-app
```

Open a browser and go to `http://localhost:5000`. You should see "Hello from Docker!"

To run the container in the background (detached mode):

```bash
# Run in the background with -d flag
docker run -d -p 5000:5000 --name my-app my-python-app

# Check that it is running
docker ps

# View the logs
docker logs my-app
```

## Understanding Each Dockerfile Instruction

Let's go deeper into the instructions we used and some additional ones you will encounter.

### FROM - The Base Image

Every Dockerfile starts with FROM. It defines the starting point for your image.

```dockerfile
# Use a specific version tag (recommended for reproducibility)
FROM python:3.11-slim

# Or use the latest version (not recommended - builds become unpredictable)
FROM python:latest

# Or start from scratch (for statically compiled binaries)
FROM scratch
```

Choose slim or alpine variants when possible. They are much smaller than the full images.

### WORKDIR - Setting the Working Directory

WORKDIR sets the directory where subsequent instructions execute. If the directory does not exist, Docker creates it.

```dockerfile
# All subsequent commands will run from /app
WORKDIR /app
```

Using WORKDIR is cleaner than running `RUN mkdir /app && cd /app`. It also affects COPY, ADD, RUN, CMD, and ENTRYPOINT instructions.

### COPY vs ADD

Both copy files from the host into the image, but COPY is the simpler and more predictable choice.

```dockerfile
# COPY is straightforward - copies files from host to image
COPY app.py /app/
COPY . /app/

# ADD has extra features (auto-extracts tar files, supports URLs)
# Only use ADD when you specifically need these features
ADD archive.tar.gz /app/
```

Use COPY unless you specifically need ADD's tar extraction feature.

### RUN - Executing Commands During Build

RUN executes commands in a new layer. Each RUN instruction creates a separate layer in the image.

```dockerfile
# Install system packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    && rm -rf /var/lib/apt/lists/*
```

Combine related commands in a single RUN instruction to reduce the number of layers. Clean up package manager caches in the same RUN instruction to keep the layer small.

### ENV - Environment Variables

Set environment variables that persist in the running container:

```dockerfile
# Set environment variables
ENV FLASK_ENV=production
ENV APP_PORT=5000
```

### EXPOSE - Documenting Ports

EXPOSE documents which ports the container listens on. It does not actually publish the port.

```dockerfile
# Document the port the application uses
EXPOSE 5000
```

You still need `-p 5000:5000` when running the container to actually publish the port.

### CMD vs ENTRYPOINT

CMD defines the default command. It can be overridden when running the container.

```dockerfile
# Default command - can be overridden
CMD ["python", "app.py"]
```

ENTRYPOINT sets a command that always runs. CMD arguments are appended to it.

```dockerfile
# ENTRYPOINT always executes, CMD provides default arguments
ENTRYPOINT ["python"]
CMD ["app.py"]
```

With this setup, `docker run my-app` runs `python app.py`, but `docker run my-app other_script.py` runs `python other_script.py`.

## Building a Node.js Application Image

Here is another example with Node.js to reinforce the concepts:

```dockerfile
# Start from the official Node.js image
FROM node:20-alpine

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package files first for better cache utilization
COPY package*.json ./

# Install dependencies (ci is faster and more deterministic than install)
RUN npm ci --only=production

# Copy the application source code
COPY . .

# The app listens on port 3000
EXPOSE 3000

# Run the application
CMD ["node", "server.js"]
```

## The .dockerignore File

Just like `.gitignore`, a `.dockerignore` file tells Docker which files to exclude from the build context. This speeds up builds and prevents sensitive files from being included in the image.

```
# .dockerignore - files and directories to exclude from the build
node_modules
.git
.gitignore
*.md
.env
.env.local
docker-compose.yml
Dockerfile
.dockerignore
```

Always create a `.dockerignore` file. Without it, Docker copies everything in the build context into the image, including things like `.git` directories, `node_modules`, and potentially secrets in `.env` files.

## Common Mistakes to Avoid

**Not using a .dockerignore file**: Without it, your build context is larger than necessary and may include sensitive files.

**Using `latest` tags**: Always pin your base image to a specific version. `FROM python:latest` can break your build when a new version is released.

**Running as root**: By default, containers run as root. For security, create and switch to a non-root user.

```dockerfile
# Create a non-root user and switch to it
RUN useradd -m appuser
USER appuser
```

**Not combining RUN commands**: Each RUN instruction creates a new layer. Combine related commands to reduce image size.

**Copying files before installing dependencies**: Copy dependency files (like `requirements.txt` or `package.json`) before copying the full application code. This way, Docker can cache the dependency installation layer.

## Verifying Your Image

After building, inspect your image:

```bash
# List your images
docker images my-python-app

# View the layers in your image
docker history my-python-app

# Inspect detailed image metadata
docker inspect my-python-app
```

## Summary

Writing a Dockerfile comes down to choosing a base image, installing dependencies, copying your code, and defining how the container should run. Start with a slim base image, use WORKDIR to keep paths clean, copy dependency files before source code for better caching, and always create a `.dockerignore` file. Build the image with `docker build`, test it with `docker run`, and iterate. Every complex Dockerfile started as a simple one.
