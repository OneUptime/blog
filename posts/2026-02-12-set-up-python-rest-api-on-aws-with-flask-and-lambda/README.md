# How to Set Up a Python REST API on AWS with Flask and Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Python, Flask, Lambda, API Gateway

Description: Build and deploy a Python REST API using Flask on AWS Lambda with API Gateway, DynamoDB integration, request validation, and automated deployments.

---

Flask is Python's go-to microframework for building APIs, and running it on AWS Lambda is a surprisingly smooth experience. You write your Flask app the same way you always would, test it locally, and then deploy it to Lambda where it scales automatically from zero to thousands of concurrent requests. The only real difference is how the app gets invoked.

Let's build a production-quality Flask API on Lambda from the ground up.

## Project Setup

Create your project structure and install dependencies:

```bash
mkdir flask-lambda-api
cd flask-lambda-api
python -m venv venv
source venv/bin/activate
pip install flask mangum boto3 marshmallow
```

The key package is `mangum` - it's an ASGI/WSGI adapter that lets Flask (and other Python frameworks) run inside Lambda. It handles the translation between API Gateway events and WSGI requests.

Set up your project structure:

```
flask-lambda-api/
  src/
    app.py
    routes/
      users.py
    services/
      dynamodb.py
    schemas/
      user.py
  handler.py
  requirements.txt
  serverless.yml
```

## Building the Flask Application

Create your Flask app with proper error handling and logging:

```python
# src/app.py
from flask import Flask, jsonify, request
import logging
import json
import time

def create_app():
    app = Flask(__name__)

    # Configure structured logging
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        json.dumps({
            "timestamp": "%(asctime)s",
            "level": "%(levelname)s",
            "message": "%(message)s",
            "module": "%(module)s",
        })
    ))
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

    # Request timing middleware
    @app.before_request
    def start_timer():
        request.start_time = time.time()

    @app.after_request
    def log_request(response):
        duration = time.time() - request.start_time
        app.logger.info(json.dumps({
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": round(duration * 1000, 2),
        }))
        return response

    # Health check
    @app.route('/health')
    def health():
        return jsonify({
            "status": "healthy",
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        })

    # Register blueprints
    from src.routes.users import users_bp
    app.register_blueprint(users_bp, url_prefix='/api/users')

    # Error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "message": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

    return app
```

## Request Validation with Marshmallow

Define schemas for input validation:

```python
# src/schemas/user.py
from marshmallow import Schema, fields, validate

class UserCreateSchema(Schema):
    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100)
    )
    email = fields.Email(required=True)
    role = fields.String(
        validate=validate.OneOf(["admin", "user", "viewer"]),
        load_default="user"
    )

class UserUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=100))
    email = fields.Email()
    role = fields.String(
        validate=validate.OneOf(["admin", "user", "viewer"])
    )
```

## API Routes

Build out the CRUD routes with proper validation and error handling:

```python
# src/routes/users.py
from flask import Blueprint, jsonify, request
from src.schemas.user import UserCreateSchema, UserUpdateSchema
from src.services.dynamodb import DynamoDBService
import uuid
import time

users_bp = Blueprint('users', __name__)
db = DynamoDBService('flask-api-users')
create_schema = UserCreateSchema()
update_schema = UserUpdateSchema()

@users_bp.route('/', methods=['GET'])
def list_users():
    limit = request.args.get('limit', 20, type=int)
    users = db.scan(limit=limit)
    return jsonify({
        "data": users,
        "count": len(users),
    })

@users_bp.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    user = db.get_item(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"data": user})

@users_bp.route('/', methods=['POST'])
def create_user():
    # Validate input
    errors = create_schema.validate(request.json)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    data = create_schema.load(request.json)
    user = {
        "id": str(uuid.uuid4()),
        "name": data["name"],
        "email": data["email"],
        "role": data["role"],
        "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }

    db.put_item(user)
    return jsonify({"data": user}), 201

@users_bp.route('/<user_id>', methods=['PUT'])
def update_user(user_id):
    existing = db.get_item(user_id)
    if not existing:
        return jsonify({"error": "User not found"}), 404

    errors = update_schema.validate(request.json)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    data = update_schema.load(request.json)
    updated = {**existing, **data, "updated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}

    db.put_item(updated)
    return jsonify({"data": updated})

@users_bp.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    existing = db.get_item(user_id)
    if not existing:
        return jsonify({"error": "User not found"}), 404

    db.delete_item(user_id)
    return '', 204
```

## DynamoDB Service

Create a reusable DynamoDB service class:

```python
# src/services/dynamodb.py
import boto3
from botocore.exceptions import ClientError
import os

class DynamoDBService:
    def __init__(self, table_name):
        self.table_name = table_name
        stage = os.environ.get('STAGE', 'dev')
        self.full_table_name = f"{table_name}-{stage}"

        dynamodb = boto3.resource('dynamodb',
            region_name=os.environ.get('AWS_REGION', 'us-east-1')
        )
        self.table = dynamodb.Table(self.full_table_name)

    def get_item(self, item_id):
        try:
            response = self.table.get_item(Key={'id': item_id})
            return response.get('Item')
        except ClientError as e:
            raise Exception(f"DynamoDB error: {e.response['Error']['Message']}")

    def put_item(self, item):
        try:
            self.table.put_item(Item=item)
            return item
        except ClientError as e:
            raise Exception(f"DynamoDB error: {e.response['Error']['Message']}")

    def scan(self, limit=20):
        try:
            response = self.table.scan(Limit=limit)
            return response.get('Items', [])
        except ClientError as e:
            raise Exception(f"DynamoDB error: {e.response['Error']['Message']}")

    def delete_item(self, item_id):
        try:
            self.table.delete_item(Key={'id': item_id})
        except ClientError as e:
            raise Exception(f"DynamoDB error: {e.response['Error']['Message']}")
```

## Lambda Handler

The handler file bridges Flask and Lambda:

```python
# handler.py
from mangum import Mangum
from src.app import create_app

app = create_app()

# Mangum wraps the Flask app for Lambda
handler = Mangum(app, lifespan="off")
```

## Serverless Configuration

Configure the deployment with the Serverless Framework:

```yaml
# serverless.yml
service: flask-lambda-api

provider:
  name: aws
  runtime: python3.11
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  memorySize: 256
  timeout: 30
  environment:
    STAGE: ${self:provider.stage}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
          Resource:
            - !GetAtt UsersTable.Arn

functions:
  api:
    handler: handler.handler
    events:
      - httpApi: '*'

plugins:
  - serverless-python-requirements

custom:
  pythonRequirements:
    dockerizePip: true
    slim: true

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: flask-api-users-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
```

## Local Development

Run the API locally for testing:

```python
# local.py
from src.app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

```bash
# Run locally
python local.py

# Test endpoints
curl http://localhost:5000/health
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

## Deploying

```bash
# Deploy to dev
npx serverless deploy

# Deploy to production
npx serverless deploy --stage production

# View logs
npx serverless logs -f api --tail
```

## Monitoring

For monitoring your Flask Lambda API, CloudWatch gives you invocation counts, error rates, and duration metrics automatically. For more comprehensive monitoring with uptime checks and incident management, check out [OneUptime's approach to AWS monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view).

If you're also building a Flask app for a traditional server deployment, take a look at our guide on [deploying Flask to AWS](https://oneuptime.com/blog/post/2026-02-12-deploy-flask-app-to-aws/view).

## Summary

Flask on Lambda is a great choice for Python APIs. You get the simplicity of Flask's routing and ecosystem with Lambda's automatic scaling and minimal ops overhead. The mangum adapter makes the integration nearly transparent - you write Flask code and it just works on Lambda. For APIs that handle variable traffic or need to scale to zero during quiet periods, this architecture is hard to beat.
