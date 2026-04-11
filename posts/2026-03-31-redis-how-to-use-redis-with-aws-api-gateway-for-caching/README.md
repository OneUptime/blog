# How to Use Redis with AWS API Gateway for Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AWS, API Gateway, Lambda, Caching

Description: Learn how to use Redis as a caching layer for AWS API Gateway and Lambda functions to reduce latency and database load for API responses.

---

## Architecture Overview

AWS API Gateway has built-in caching, but it is expensive and limited. A better pattern uses Redis in AWS ElastiCache as an application-level cache inside your Lambda functions or ECS services:

```text
Client -> API Gateway -> Lambda -> Redis (ElastiCache) -> [Cache Hit]
                                         -> RDS/DynamoDB -> Redis (Cache Miss + Store)
```

This pattern gives you:
- Fine-grained cache key control
- Lower cost than API Gateway caching
- Consistent behavior across regions
- Programmatic invalidation

## Lambda + ElastiCache Setup

Lambda functions must be deployed inside a VPC to access ElastiCache. Configure in your serverless.yml or CloudFormation:

```yaml
# serverless.yml
provider:
  name: aws
  runtime: nodejs18.x
  vpc:
    securityGroupIds:
      - !Ref LambdaSecurityGroup
    subnetIds:
      - !Ref PrivateSubnet1
      - !Ref PrivateSubnet2

  environment:
    REDIS_HOST: !GetAtt RedisCluster.RedisEndpoint.Address
    REDIS_PORT: 6379

resources:
  Resources:
    RedisCluster:
      Type: AWS::ElastiCache::CacheCluster
      Properties:
        CacheNodeType: cache.t3.micro
        Engine: redis
        NumCacheNodes: 1
        VpcSecurityGroupIds:
          - !Ref RedisSecurityGroup
        CacheSubnetGroupName: !Ref RedisSubnetGroup

    RedisSubnetGroup:
      Type: AWS::ElastiCache::SubnetGroup
      Properties:
        Description: Redis subnet group
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2

    LambdaSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Lambda SG
        VpcId: !Ref VPC

    RedisSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Redis SG
        VpcId: !Ref VPC
        SecurityGroupIngress:
          - IpProtocol: tcp
            FromPort: 6379
            ToPort: 6379
            SourceSecurityGroupId: !Ref LambdaSecurityGroup
```

## Lambda Handler with Redis Caching

```javascript
const Redis = require('ioredis');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Reuse clients across Lambda invocations
let redis;
const ddbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

function getRedisClient() {
  if (!redis || redis.status === 'end') {
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 2000,
    });
  }
  return redis;
}

async function getProductFromDB(productId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: process.env.PRODUCTS_TABLE,
    Key: { id: productId }
  }));
  return result.Item;
}

exports.handler = async (event) => {
  const productId = event.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'productId is required' })
    };
  }

  const client = getRedisClient();
  const cacheKey = `product:${productId}`;

  try {
    // Check Redis cache
    const cached = await client.get(cacheKey);
    if (cached) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300'
        },
        body: cached
      };
    }

    // Cache miss - fetch from DynamoDB
    const product = await getProductFromDB(productId);

    if (!product) {
      // Cache negative result briefly
      await client.setex(`${cacheKey}:notfound`, 60, '1');
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Product not found' })
      };
    }

    // Store in Redis
    const serialized = JSON.stringify(product);
    await client.setex(cacheKey, 300, serialized);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      },
      body: serialized
    };
  } catch (redisError) {
    // Redis failure - gracefully fall back to database
    console.warn('Redis error, falling back to DB:', redisError.message);
    const product = await getProductFromDB(productId);

    if (!product) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    }

    return {
      statusCode: 200,
      headers: { 'X-Cache': 'BYPASS' },
      body: JSON.stringify(product)
    };
  }
};
```

## Python Lambda with Redis Cache

```python
import json
import os
import hashlib
import redis
import boto3
from functools import wraps

# Module-level Redis client (persists across invocations)
_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=os.environ['REDIS_HOST'],
            port=int(os.environ.get('REDIS_PORT', 6379)),
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=1,
        )
    return _redis_client

def cache_response(ttl: int = 300, key_prefix: str = "api"):
    """Decorator to cache Lambda handler responses in Redis."""
    def decorator(handler):
        @wraps(handler)
        def wrapper(event, context):
            path = event.get('path', '')
            params = json.dumps(event.get('queryStringParameters', {}), sort_keys=True)
            cache_key = f"{key_prefix}:{path}:{hashlib.md5(params.encode()).hexdigest()}"

            try:
                r = get_redis()
                cached = r.get(cache_key)
                if cached:
                    response = json.loads(cached)
                    response.setdefault('headers', {})['X-Cache'] = 'HIT'
                    return response
            except Exception as e:
                print(f"Redis read error: {e}")

            # Execute handler
            response = handler(event, context)

            # Cache successful responses
            if response.get('statusCode', 500) == 200:
                try:
                    r = get_redis()
                    r.setex(cache_key, ttl, json.dumps(response))
                    response.setdefault('headers', {})['X-Cache'] = 'MISS'
                except Exception as e:
                    print(f"Redis write error: {e}")

            return response
        return wrapper
    return decorator

@cache_response(ttl=300, key_prefix="catalog")
def handler(event, context):
    category = event.get('queryStringParameters', {}).get('category', 'all')

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['PRODUCTS_TABLE'])

    if category == 'all':
        result = table.scan(Limit=50)
    else:
        result = table.query(
            IndexName='CategoryIndex',
            KeyConditionExpression='category = :cat',
            ExpressionAttributeValues={':cat': category}
        )

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(result.get('Items', []), default=str)
    }
```

## Cache Invalidation Lambda

Create a separate Lambda triggered by DynamoDB Streams to invalidate cache:

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
});

exports.handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === 'MODIFY' || record.eventName === 'REMOVE') {
      const keys = record.dynamodb?.Keys;
      if (keys?.id?.S) {
        const productId = keys.id.S;
        await redis.del(`product:${productId}`);

        // Also invalidate list caches
        const listKeys = await redis.keys('catalog:/products*');
        if (listKeys.length > 0) {
          await redis.del(...listKeys);
        }

        console.log(`Invalidated cache for product: ${productId}`);
      }
    }
  }
};
```

## Summary

Using Redis with AWS API Gateway and Lambda provides a cost-effective, flexible caching layer that gives you full control over cache keys, TTLs, and invalidation logic. Deploy Lambda functions inside a VPC to access ElastiCache Redis, reuse the Redis connection across invocations via module-level clients, and always implement graceful fallback to the database when Redis is unavailable. Use DynamoDB Streams or SNS events to trigger cache invalidation Lambdas that keep Redis consistent with your data source, and add X-Cache headers to API responses to monitor cache effectiveness.
