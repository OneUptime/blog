# How to Use MongoDB with AWS API Gateway and Lambda

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AWS Lambda, API Gateway, Serverless, Database

Description: Connect MongoDB Atlas to AWS API Gateway and Lambda to build serverless APIs that read and write documents without managing servers.

---

## Overview

AWS API Gateway combined with Lambda lets you expose HTTP endpoints backed by serverless functions. Pairing this stack with MongoDB Atlas gives you a fully managed database with global clusters, automatic scaling, and rich query capabilities - without provisioning any servers.

## Setting Up the Lambda Layer for the MongoDB Driver

Lambda functions are stateless. To avoid installing the driver on every cold start, package the MongoDB Node.js driver as a Lambda Layer.

```bash
mkdir -p nodejs && cd nodejs
npm install mongodb
cd .. && zip -r mongodb-layer.zip nodejs
aws lambda publish-layer-version \
  --layer-name mongodb-driver \
  --zip-file fileb://mongodb-layer.zip \
  --compatible-runtimes nodejs20.x
```

## Connecting to MongoDB Atlas from Lambda

Lambda's execution environment is reused across warm invocations. Cache the client outside the handler to avoid creating a new connection on every request.

```javascript
const { MongoClient } = require("mongodb");

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  cachedClient = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 1,
  });
  await cachedClient.connect();
  return cachedClient;
}

exports.handler = async (event) => {
  const client = await getClient();
  const db = client.db("myapp");
  const col = db.collection("products");

  const pathParam = event.pathParameters?.id;
  if (pathParam) {
    const { ObjectId } = require("mongodb");
    const doc = await col.findOne({ _id: new ObjectId(pathParam) });
    return {
      statusCode: doc ? 200 : 404,
      body: JSON.stringify(doc),
    };
  }

  const items = await col.find({}).limit(20).toArray();
  return { statusCode: 200, body: JSON.stringify(items) };
};
```

## API Gateway HTTP API Configuration

Use the API Gateway v2 HTTP API for lower latency and cost compared to REST API. Define routes with a Lambda integration.

```yaml
Resources:
  ProductsApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: prod

  ProductsFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs20.x
      Layers:
        - !Ref MongoLayer
      Environment:
        Variables:
          MONGODB_URI: !Sub "{{resolve:secretsmanager:mongo/uri}}"
      Events:
        GetAll:
          Type: HttpApi
          Properties:
            ApiId: !Ref ProductsApi
            Path: /products
            Method: GET
        GetOne:
          Type: HttpApi
          Properties:
            ApiId: !Ref ProductsApi
            Path: /products/{id}
            Method: GET
```

## Handling Atlas Network Access

Lambda functions run inside a VPC-less environment by default. Add the Lambda outbound IP ranges to your Atlas IP Access List, or deploy the function inside a VPC and use VPC Peering with Atlas.

```bash
# Retrieve current NAT gateway IP and add to Atlas
NAT_IP=$(aws ec2 describe-nat-gateways \
  --query 'NatGateways[0].NatGatewayAddresses[0].PublicIp' \
  --output text)

atlas accessLists create "$NAT_IP/32" \
  --projectId <PROJECT_ID> \
  --comment "Lambda NAT gateway"
```

## Avoiding Connection Exhaustion

MongoDB Atlas free and shared tiers have strict connection limits. Keep `maxPoolSize` at 1 for Lambda, and consider using Atlas App Services as a connection-pooling proxy for high-concurrency scenarios.

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 1,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 3000,
});
```

## Summary

You can build a fully serverless CRUD API by connecting AWS API Gateway HTTP API to Lambda functions that cache a MongoDB Atlas client across warm invocations. Keep `maxPoolSize` at 1, store the connection string in AWS Secrets Manager, and add your Lambda's outbound IP to Atlas network access controls to keep the stack secure and efficient.
