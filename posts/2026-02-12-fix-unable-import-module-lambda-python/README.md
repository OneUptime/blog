# How to Fix 'Unable to import module' in Lambda Python Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Python, Serverless, Troubleshooting

Description: Resolve the common Unable to import module error in AWS Lambda Python functions caused by packaging issues, wrong handler paths, and missing dependencies.

---

You deploy your Lambda function, invoke it, and get:

```
[ERROR] Runtime.ImportModuleError: Unable to import module 'lambda_function': No module named 'lambda_function'
```

or

```
[ERROR] Runtime.ImportModuleError: Unable to import module 'app': No module named 'requests'
```

This error has two main flavors: either Lambda can't find your handler file, or your code imports a package that isn't included in the deployment. Both are fixable. Let's go through every variation of this problem.

## Problem 1: Lambda Can't Find Your Handler File

The Lambda handler setting tells AWS which file and function to execute. It's in the format `filename.function_name` (without the `.py` extension).

```bash
# Check your function's handler setting
aws lambda get-function-configuration \
  --function-name my-function \
  --query 'Handler'
```

If your handler is set to `lambda_function.lambda_handler`, Lambda expects a file called `lambda_function.py` at the root of your deployment package with a function called `lambda_handler` inside it.

### Common mistake: Wrong file structure in the zip

Your zip file's structure matters. The Python file must be at the root of the zip, not inside a subfolder.

```bash
# WRONG: File is inside a directory
unzip -l function.zip
# Archive:  function.zip
#   Length      Date    Time    Name
# ---------  ---------- -----   ----
#         0  2024-01-01 00:00   src/
#       256  2024-01-01 00:00   src/lambda_function.py

# RIGHT: File is at the root
unzip -l function.zip
# Archive:  function.zip
#   Length      Date    Time    Name
# ---------  ---------- -----   ----
#       256  2024-01-01 00:00   lambda_function.py
```

Fix the zip packaging:

```bash
# Wrong way - creates nested directory
cd /path/to/project
zip -r function.zip src/

# Right way - package from within the directory
cd /path/to/project/src
zip -r ../function.zip .
```

### Common mistake: Handler doesn't match file name

If your file is `app.py`, your handler must start with `app`:

```bash
# File: app.py, Function: handler
# Handler setting should be: app.handler

aws lambda update-function-configuration \
  --function-name my-function \
  --handler app.handler
```

### Common mistake: Handler in a subdirectory

If you want your handler in a subdirectory, use dots for the path:

```
my-package/
  handlers/
    __init__.py
    user_handler.py     # contains def handle(event, context)
```

Handler setting: `handlers.user_handler.handle`

Make sure every directory in the path has an `__init__.py` file.

## Problem 2: Missing Third-Party Dependencies

Lambda's Python runtime includes `boto3`, `botocore`, `urllib3`, and a few other standard libraries. Anything else - `requests`, `pymysql`, `pydantic`, `pillow` - must be included in your deployment package.

### Package Dependencies with Your Code

```bash
# Create a clean directory for packaging
mkdir -p /tmp/lambda-package

# Install dependencies into the package directory
pip install -t /tmp/lambda-package requests pymysql

# Copy your function code
cp lambda_function.py /tmp/lambda-package/

# Create the zip
cd /tmp/lambda-package
zip -r /tmp/function.zip .

# Deploy
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb:///tmp/function.zip
```

### Use a Requirements File

```bash
# requirements.txt
# requests==2.31.0
# pymysql==1.1.0

pip install -t /tmp/lambda-package -r requirements.txt
cp lambda_function.py /tmp/lambda-package/
cd /tmp/lambda-package && zip -r /tmp/function.zip .
```

### Platform-Specific Dependencies

Some Python packages have compiled C extensions (like `numpy`, `pandas`, `pillow`, `psycopg2`). These must be compiled for Linux x86_64 (or arm64 if using ARM Lambda), not for your Mac or Windows machine.

```bash
# Install Linux-compatible packages (even from a Mac)
pip install \
  --platform manylinux2014_x86_64 \
  --target /tmp/lambda-package \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  numpy pandas

# For ARM Lambda functions
pip install \
  --platform manylinux2014_aarch64 \
  --target /tmp/lambda-package \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  numpy pandas
```

If this doesn't work for a particular package, use Docker:

```bash
# Build packages using the Lambda runtime Docker image
docker run --rm -v /tmp/lambda-package:/output \
  public.ecr.aws/lambda/python:3.12 \
  pip install requests pymysql numpy -t /output
```

## Problem 3: Using Lambda Layers for Dependencies

Instead of bundling everything together, you can put dependencies in a Lambda layer:

```bash
# Create the layer structure (Python requires this exact path)
mkdir -p python/lib/python3.12/site-packages
pip install -t python/lib/python3.12/site-packages requests pymysql

# Zip the layer
zip -r layer.zip python/

# Publish the layer
aws lambda publish-layer-version \
  --layer-name my-dependencies \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.12

# Attach to your function
aws lambda update-function-configuration \
  --function-name my-function \
  --layers arn:aws:lambda:us-east-1:123456789012:layer:my-dependencies:1
```

The layer path is important. Python packages must be in `python/` or `python/lib/pythonX.Y/site-packages/` within the layer zip.

## Problem 4: Import Errors in Application Code

Sometimes the error isn't about missing packages but about your own code having circular imports or syntax errors.

```python
# This will cause an import error at module load time
import json
from my_module import helper  # If my_module has an error, the whole thing fails

def lambda_handler(event, context):
    return helper(event)
```

Test your imports locally first:

```bash
# Quick local test
python3 -c "import lambda_function; print('Imports OK')"
```

If you get an error here, fix it before deploying.

## Problem 5: Container Image Functions

If you're using container images for Lambda, the import error usually means your Dockerfile isn't copying files to the right location:

```dockerfile
FROM public.ecr.aws/lambda/python:3.12

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy function code to the Lambda task root
COPY app.py ${LAMBDA_TASK_ROOT}/

# Set the handler
CMD ["app.handler"]
```

Make sure the `CMD` matches your file and function name, and the file is copied to `${LAMBDA_TASK_ROOT}`.

## Debugging Script

Here's a quick script to verify your deployment package is correct:

```bash
FUNCTION_ZIP="function.zip"
HANDLER="lambda_function.lambda_handler"

# Extract the module name from the handler
MODULE=$(echo $HANDLER | cut -d. -f1)
echo "Looking for module: $MODULE"

# Check if the file exists in the zip
echo "=== Files in zip ==="
unzip -l $FUNCTION_ZIP | grep ".py"

# Check if the handler file is at the root
if unzip -l $FUNCTION_ZIP | grep -q "^.*${MODULE}.py$"; then
  echo "PASS: ${MODULE}.py found at root"
else
  echo "FAIL: ${MODULE}.py not found at root level"
fi

# Check for common dependencies
echo "=== Checking for common dependencies ==="
for pkg in requests pymysql pydantic; do
  if unzip -l $FUNCTION_ZIP | grep -q "$pkg"; then
    echo "  Found: $pkg"
  fi
done
```

## Summary

The "Unable to import module" error in Lambda almost always comes down to:

1. **Wrong handler setting** - Make sure it matches `filename.function_name`
2. **File not at zip root** - The .py file must be at the top level, not in a subdirectory
3. **Missing dependencies** - Use `pip install -t` to include them in your package
4. **Platform mismatch** - Compiled packages must be built for Linux
5. **Layer path wrong** - Dependencies must be in `python/` directory

Monitor your Lambda functions for import errors and other failures with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to catch deployment issues immediately after they go live.
