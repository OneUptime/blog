# How to Package Lambda Functions with Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Deployment

Description: Learn how to package AWS Lambda functions with third-party dependencies for Python, Node.js, and other runtimes, including handling native binaries.

---

A Lambda function that only uses the standard library doesn't need any special packaging. But the moment you import requests, numpy, pg8000, or any third-party library, you need to bundle those dependencies into your deployment package. This is where most Lambda beginners hit their first wall.

The packaging process depends on your runtime and whether your dependencies include compiled (native) code. Let's cover the main approaches.

## Python: pip Install to a Directory

For Python Lambda functions, you install dependencies into a local directory and zip everything together.

Suppose your function uses the `requests` and `boto3` libraries:

```
# requirements.txt
requests==2.31.0
boto3>=1.28.0
```

Build and package the function:

```bash
# Create a temporary build directory
mkdir -p build

# Install dependencies into the build directory
pip install -r requirements.txt -t build/

# Copy your function code into the build directory
cp lambda_function.py build/

# Create the deployment package
cd build && zip -r ../deployment.zip . && cd ..

# Deploy
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://deployment.zip

# Clean up
rm -rf build
```

The `-t` flag tells pip to install packages into a specific target directory instead of the system Python. This is the key step.

## Handling Native Dependencies in Python

Libraries like `numpy`, `pandas`, `psycopg2`, and `Pillow` contain compiled C code. If you install them on macOS or Windows and upload to Lambda (which runs on Amazon Linux), they won't work. The compiled binaries are platform-specific.

There are three solutions:

### Option 1: Build in Docker

Use a Docker container that matches the Lambda runtime:

```bash
# Build dependencies in a Lambda-compatible container
docker run --rm \
  -v "$PWD":/var/task \
  public.ecr.aws/sam/build-python3.12:latest \
  pip install -r requirements.txt -t /var/task/build/

# Add your function code
cp lambda_function.py build/

# Create the zip
cd build && zip -r ../deployment.zip . && cd ..
```

### Option 2: Use manylinux Wheels

Many Python packages publish pre-compiled wheels for Linux. Force pip to use them:

```bash
# Install Linux-compatible wheels
pip install \
  --platform manylinux2014_x86_64 \
  --target build/ \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  -r requirements.txt
```

This downloads pre-compiled Linux binaries even if you're on macOS. It works for most popular packages but not all.

### Option 3: Use Lambda Layers

For commonly used libraries, create a Lambda Layer that you can share across functions. More on this in our post about [Lambda Layers](https://oneuptime.com/blog/post/lambda-layers-share-code-functions/view).

## Node.js: npm Install

Node.js packaging follows a similar pattern. Your function code and `node_modules` go into a zip file.

Start with your project structure:

```
my-function/
  - index.mjs
  - package.json
```

The function code:

```javascript
// index.mjs
import axios from 'axios';

export const handler = async (event) => {
    try {
        const response = await axios.get('https://api.example.com/data');
        return {
            statusCode: 200,
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

Package and deploy:

```bash
# Install production dependencies only
cd my-function
npm install --production

# Create the deployment package
zip -r ../deployment.zip .

cd ..

# Deploy
aws lambda update-function-code \
  --function-name my-node-function \
  --zip-file fileb://deployment.zip
```

The `--production` flag skips devDependencies like test frameworks and linters, keeping the package smaller.

## Reducing Package Size

Lambda has a 50 MB zipped / 250 MB unzipped limit for deployment packages. Large dependencies can eat through this fast. Here are strategies to keep packages small:

### Strip Unnecessary Files

```bash
# After pip install, remove test files, docs, and cache
cd build
find . -type d -name "tests" -exec rm -rf {} + 2>/dev/null
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete
find . -name "*.pyo" -delete
find . -name "*.dist-info" -type d -exec rm -rf {} + 2>/dev/null

# Create the zip
zip -r ../deployment.zip .
```

### Use Slim Packages

Some libraries offer slim versions. For example, `boto3` is included in the Lambda runtime, so you don't need to bundle it (unless you need a specific newer version).

```
# requirements.txt - skip boto3 since Lambda includes it
requests==2.31.0
# boto3  <- already in Lambda runtime
```

### Tree Shaking for Node.js

Use a bundler like esbuild to create a single optimized file:

```bash
# Install esbuild
npm install --save-dev esbuild

# Bundle the function into a single file
npx esbuild index.mjs --bundle --platform=node --target=node20 \
  --outfile=dist/index.mjs --format=esm --minify

# Package just the bundled file
cd dist && zip ../deployment.zip index.mjs && cd ..
```

This can reduce a 50 MB `node_modules` to a few hundred KB.

## Using a Makefile for Repeatable Builds

Automate the build process with a Makefile:

```makefile
# Makefile
FUNCTION_NAME = my-function
RUNTIME = python3.12
BUILD_DIR = .build

.PHONY: build deploy clean

build: clean
	mkdir -p $(BUILD_DIR)
	pip install -r requirements.txt -t $(BUILD_DIR)/
	cp -r src/* $(BUILD_DIR)/
	cd $(BUILD_DIR) && find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null; true
	cd $(BUILD_DIR) && zip -r ../deployment.zip .

deploy: build
	aws lambda update-function-code \
		--function-name $(FUNCTION_NAME) \
		--zip-file fileb://deployment.zip
	@echo "Deployed successfully"

clean:
	rm -rf $(BUILD_DIR) deployment.zip
```

Run with:

```bash
# Build only
make build

# Build and deploy
make deploy
```

## Container Image Deployment

If your dependencies exceed the 250 MB limit, use a container image instead. Lambda supports Docker images up to 10 GB.

Create a Dockerfile:

```dockerfile
# Dockerfile
FROM public.ecr.aws/lambda/python:3.12

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy function code
COPY src/ ${LAMBDA_TASK_ROOT}/

# Set the handler
CMD ["lambda_function.lambda_handler"]
```

Build and push to ECR:

```bash
# Create ECR repository
aws ecr create-repository --repository-name my-lambda-function

# Get the login credentials
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build the image
docker build -t my-lambda-function .

# Tag for ECR
docker tag my-lambda-function:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda-function:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda-function:latest

# Create or update the Lambda function
aws lambda create-function \
  --function-name my-function \
  --package-type Image \
  --code ImageUri=123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda-function:latest \
  --role arn:aws:iam::123456789012:role/lambda-role
```

## SAM Build for Dependencies

If you're using SAM, the `sam build` command handles dependency installation automatically:

```bash
# SAM reads requirements.txt and installs dependencies
sam build

# Use a container for native dependencies
sam build --use-container
```

SAM looks for a `requirements.txt` (Python) or `package.json` (Node.js) in each function's code directory and installs dependencies as part of the build.

## Troubleshooting Common Issues

**"Unable to import module"** - Your dependencies aren't in the zip file, or they're in the wrong directory structure. The zip should have your `.py` files and the library directories at the root level.

**"Cannot load native module"** - You compiled dependencies on the wrong platform. Use Docker or manylinux wheels.

**"Unzipped size exceeds maximum"** - Your package is too big. Strip unnecessary files, use Lambda Layers, or switch to a container image.

**"Permission denied"** - Some files in the zip may have wrong permissions. Add them with:

```bash
chmod -R 755 build/
```

## Wrapping Up

Packaging dependencies is one of Lambda's rough edges, but once you have a build process set up, it becomes routine. Use pip's `-t` flag for Python, `npm install --production` for Node.js, and Docker for anything with native binaries. Automate it with a Makefile or SAM, and you'll never think about it again.

For sharing common dependencies across functions, check out our guide on [Lambda Layers](https://oneuptime.com/blog/post/lambda-layers-share-code-functions/view).
