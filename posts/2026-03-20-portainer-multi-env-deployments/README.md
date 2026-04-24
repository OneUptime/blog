# How to Automate Multi-Environment Deployments with Portainer - Env

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Multi-Environment, CI/CD, Automation

Description: Automate deployment pipelines that promote container workloads through development, staging, and production environments using the Portainer API.

## Introduction

Multi-environment deployment pipelines promote releases through stages: development → staging → production. Each stage has different configurations but identical stack definitions. The Portainer API enables automated promotion pipelines that manage this process consistently and repeatably.

## Environment Setup in Portainer

```bash
# The three environments should be separate Portainer endpoints

# dev  (endpoint ID: 1) - Development
# staging (endpoint ID: 2) - Staging
# production (endpoint ID: 3) - Production

# Get endpoint IDs
curl -s -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints" \
  | python3 -c "
import sys, json
for ep in json.load(sys.stdin):
    print(f'{ep[\"Id\"]}: {ep[\"Name\"]}')
"
```

## Promotion Pipeline Script

```python
#!/usr/bin/env python3
# promote.py

import os
import requests
import sys
import json
import argparse
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

PORTAINER_URL = os.getenv("PORTAINER_URL", "https://portainer.example.com")
API_KEY = os.getenv("PORTAINER_API_KEY", "your-api-key")

# Environment configuration
ENVIRONMENTS = {
    "development": {
        "endpoint_id": 1,
        "env_vars": {
            "APP_ENV": "development",
            "LOG_LEVEL": "debug",
            "REPLICAS": "1",
            "DB_HOST": "dev-db.internal"
        }
    },
    "staging": {
        "endpoint_id": 2,
        "env_vars": {
            "APP_ENV": "staging",
            "LOG_LEVEL": "info",
            "REPLICAS": "2",
            "DB_HOST": "staging-db.internal"
        }
    },
    "production": {
        "endpoint_id": 3,
        "env_vars": {
            "APP_ENV": "production",
            "LOG_LEVEL": "warn",
            "REPLICAS": "3",
            "DB_HOST": "prod-db.internal"
        }
    }
}

PROMOTION_PATH = ["development", "staging", "production"]

headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}


def get_stack(endpoint_id: int, stack_name: str) -> dict:
    """Get a stack by name from an endpoint."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/stacks",
        params={"filters": json.dumps({"EndpointID": str(endpoint_id)})},
        headers=headers
    )
    resp.raise_for_status()
    
    for stack in resp.json():
        if stack['Name'] == stack_name:
            return stack
    return None


def get_stack_file(stack_id: int) -> str:
    """Get the compose file content of a stack."""
    resp = requests.get(
        f"{PORTAINER_URL}/api/stacks/{stack_id}/file",
        headers=headers
    )
    resp.raise_for_status()
    return resp.json()['StackFileContent']


def deploy_stack(endpoint_id: int, stack_name: str, compose_content: str,
                  env_config: dict, image_tag: str) -> dict:
    """Deploy or update a stack on an endpoint."""
    env_vars = [
        {"name": k, "value": v} for k, v in env_config.items()
    ]
    env_vars.append({"name": "IMAGE_TAG", "value": image_tag})
    
    # Update image tag in compose content
    import re
    updated_compose = re.sub(
        r'image: (.+?):[^\s\n]+',
        lambda m: f"image: {m.group(1)}:{image_tag}",
        compose_content
    )
    
    # Check if stack exists
    existing = get_stack(endpoint_id, stack_name)
    
    if existing:
        # Update existing stack
        resp = requests.put(
            f"{PORTAINER_URL}/api/stacks/{existing['Id']}?endpointId={endpoint_id}",
            headers=headers,
            json={
                "StackFileContent": updated_compose,
                "Env": env_vars
            }
        )
    else:
        # Create new stack
        resp = requests.post(
            f"{PORTAINER_URL}/api/stacks/create/standalone/string?endpointId={endpoint_id}",
            headers=headers,
            json={
                "Name": stack_name,
                "StackFileContent": updated_compose,
                "Env": env_vars
            }
        )
    
    resp.raise_for_status()
    return resp.json()


def verify_stack_active(endpoint_id: int, stack_name: str, timeout: int = 120) -> bool:
    """Verify Portainer reports the stack as active within timeout."""
    start = time.time()
    
    while time.time() - start < timeout:
        stack = get_stack(endpoint_id, stack_name)
        if stack and stack.get('Status') == 1:
            logger.info(f"Stack {stack_name} is active")
            return True
        time.sleep(10)
    
    return False


def promote(stack_name: str, from_env: str, to_env: str, image_tag: str):
    """Promote a stack from one environment to another."""
    
    if from_env not in ENVIRONMENTS or to_env not in ENVIRONMENTS:
        raise ValueError(f"Unknown environment. Valid: {list(ENVIRONMENTS.keys())}")
    
    from_config = ENVIRONMENTS[from_env]
    to_config = ENVIRONMENTS[to_env]
    
    logger.info(f"Promoting {stack_name} from {from_env} → {to_env} (image: {image_tag})")
    
    # Get compose file from source environment
    source_stack = get_stack(from_config['endpoint_id'], stack_name)
    if not source_stack:
        raise ValueError(f"Stack '{stack_name}' not found in {from_env}")
    
    compose_content = get_stack_file(source_stack['Id'])
    
    # Deploy to target environment with target env vars
    deploy_stack(
        endpoint_id=to_config['endpoint_id'],
        stack_name=stack_name,
        compose_content=compose_content,
        env_config=to_config['env_vars'],
        image_tag=image_tag
    )
    
    logger.info(f"Stack deployed to {to_env}, verifying stack status...")
    
    # Verify the stack is active in Portainer
    if verify_stack_active(to_config['endpoint_id'], stack_name):
        logger.info(f"Promotion to {to_env} successful!")
        return True
    else:
        logger.error(f"Promotion to {to_env} failed - stack did not become active")
        return False


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Promote container stack between environments')
    parser.add_argument('stack_name', help='Stack name to promote')
    parser.add_argument('from_env', choices=list(ENVIRONMENTS.keys()))
    parser.add_argument('to_env', choices=list(ENVIRONMENTS.keys()))
    parser.add_argument('--image-tag', default='latest')
    args = parser.parse_args()
    
    success = promote(args.stack_name, args.from_env, args.to_env, args.image_tag)
    sys.exit(0 if success else 1)
```

## GitHub Actions Multi-Environment Pipeline

```yaml
# .github/workflows/pipeline.yml
name: Multi-Environment Deployment

on:
  push:
    branches: [main, staging, develop]

env:
  PORTAINER_URL: ${{ secrets.PORTAINER_URL }}
  PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}

jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: '3.x'
      - name: Install dependencies
        run: python3 -m pip install requests
      - name: Deploy to Development
        run: python3 promote.py my-app development development --image-tag ${{ github.sha }}

  promote-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: '3.x'
      - name: Install dependencies
        run: python3 -m pip install requests
      - name: Promote to Staging
        run: python3 promote.py my-app development staging --image-tag ${{ github.sha }}

  promote-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Protection rules can require manual approval
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: '3.x'
      - name: Install dependencies
        run: python3 -m pip install requests
      - name: Promote to Production
        run: python3 promote.py my-app staging production --image-tag ${{ github.sha }}
```

## Conclusion

Multi-environment deployment automation with Portainer creates consistent, reliable promotion pipelines. By using environment-specific configurations stored in the pipeline code rather than the application code, you maintain environment parity while allowing environment-specific tuning. The Portainer API acts as the deployment engine, ensuring each promotion follows the same process.
