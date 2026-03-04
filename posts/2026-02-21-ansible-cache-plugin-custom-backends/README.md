# How to Create a Cache Plugin for Custom Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Caching, Redis, DynamoDB

Description: Build Ansible cache plugins for custom storage backends like DynamoDB, Consul, and S3 to share facts across your automation fleet.

---

Ansible's fact caching dramatically speeds up playbook runs by storing gathered facts between executions. The built-in cache plugins support memory, JSON files, Redis, and memcached. But when your infrastructure relies on a different storage system, or you need features like cross-region replication or encryption at rest, building a custom cache plugin is the way forward.

This guide builds cache plugins for two popular backends: Amazon DynamoDB and HashiCorp Consul.

## DynamoDB Cache Plugin

DynamoDB is a great choice for caching Ansible facts in AWS environments. It is serverless, scales automatically, and supports TTL for automatic cleanup.

### Setting Up the DynamoDB Table

Create the table with a simple partition key:

```bash
# Create the DynamoDB table for Ansible fact caching
aws dynamodb create-table \
  --table-name ansible-fact-cache \
  --attribute-definitions AttributeName=cache_key,AttributeType=S \
  --key-schema AttributeName=cache_key,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Purpose,Value=ansible-caching

# Enable TTL on the table
aws dynamodb update-time-to-live \
  --table-name ansible-fact-cache \
  --time-to-live-specification Enabled=true,AttributeName=ttl
```

### The DynamoDB Plugin

Create `plugins/cache/dynamodb.py`:

```python
# dynamodb.py - Cache plugin using Amazon DynamoDB
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: dynamodb
    short_description: DynamoDB-backed fact cache
    description:
        - Stores Ansible facts in an Amazon DynamoDB table.
        - Supports TTL for automatic expiration.
    requirements:
        - boto3 Python library
    options:
      _uri:
        description: DynamoDB table name.
        required: true
        env:
          - name: ANSIBLE_CACHE_PLUGIN_CONNECTION
        ini:
          - key: fact_caching_connection
            section: defaults
      _timeout:
        description: Cache TTL in seconds. Set to 0 for no expiration.
        default: 86400
        type: integer
        env:
          - name: ANSIBLE_CACHE_PLUGIN_TIMEOUT
        ini:
          - key: fact_caching_timeout
            section: defaults
      region:
        description: AWS region for the DynamoDB table.
        type: str
        default: us-east-1
        env:
          - name: AWS_DEFAULT_REGION
        ini:
          - key: region
            section: dynamodb_cache
"""

import json
import time
import decimal

from ansible.plugins.cache import BaseCacheModule
from ansible.errors import AnsibleError
from ansible.module_utils.common.text.converters import to_text

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False


class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types from DynamoDB."""
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


class CacheModule(BaseCacheModule):
    """DynamoDB-backed cache for Ansible facts."""

    def __init__(self, *args, **kwargs):
        if not HAS_BOTO3:
            raise AnsibleError(
                "The dynamodb cache plugin requires boto3. "
                "Install it with: pip install boto3"
            )

        super(CacheModule, self).__init__(*args, **kwargs)

        self._table_name = self.get_option('_uri')
        self._timeout = int(self.get_option('_timeout'))
        self._region = self.get_option('region')

        self._dynamodb = boto3.resource('dynamodb', region_name=self._region)
        self._table = self._dynamodb.Table(self._table_name)

    def get(self, key):
        """Retrieve a cached value from DynamoDB."""
        try:
            response = self._table.get_item(Key={'cache_key': to_text(key)})
        except ClientError as e:
            raise AnsibleError(
                "DynamoDB get failed for key '%s': %s"
                % (key, e.response['Error']['Message'])
            )

        item = response.get('Item')
        if item is None:
            raise KeyError(key)

        # Check if the item has expired
        if self._timeout > 0:
            ttl = item.get('ttl', 0)
            if ttl > 0 and time.time() > ttl:
                self.delete(key)
                raise KeyError(key)

        return json.loads(item['cache_value'])

    def set(self, key, value):
        """Store a value in DynamoDB."""
        item = {
            'cache_key': to_text(key),
            'cache_value': json.dumps(value, cls=DecimalEncoder),
            'updated_at': int(time.time()),
        }

        # Set TTL for automatic DynamoDB cleanup
        if self._timeout > 0:
            item['ttl'] = int(time.time()) + self._timeout

        try:
            self._table.put_item(Item=item)
        except ClientError as e:
            raise AnsibleError(
                "DynamoDB put failed for key '%s': %s"
                % (key, e.response['Error']['Message'])
            )

    def keys(self):
        """List all cache keys."""
        try:
            response = self._table.scan(
                ProjectionExpression='cache_key',
            )
            items = response.get('Items', [])

            # Handle pagination
            while 'LastEvaluatedKey' in response:
                response = self._table.scan(
                    ProjectionExpression='cache_key',
                    ExclusiveStartKey=response['LastEvaluatedKey'],
                )
                items.extend(response.get('Items', []))

            return [item['cache_key'] for item in items]
        except ClientError as e:
            raise AnsibleError(
                "DynamoDB scan failed: %s" % e.response['Error']['Message']
            )

    def contains(self, key):
        """Check if a key exists in the cache."""
        try:
            self.get(key)
            return True
        except KeyError:
            return False

    def delete(self, key):
        """Remove a key from the cache."""
        try:
            self._table.delete_item(Key={'cache_key': to_text(key)})
        except ClientError as e:
            raise AnsibleError(
                "DynamoDB delete failed for key '%s': %s"
                % (key, e.response['Error']['Message'])
            )

    def flush(self):
        """Clear all cached data."""
        keys = self.keys()
        for key in keys:
            self.delete(key)

    def copy(self):
        """Return all cached data as a dictionary."""
        result = {}
        for key in self.keys():
            try:
                result[key] = self.get(key)
            except KeyError:
                pass
        return result
```

### DynamoDB Configuration

```ini
# ansible.cfg
[defaults]
fact_caching = dynamodb
fact_caching_connection = ansible-fact-cache
fact_caching_timeout = 3600

[dynamodb_cache]
region = us-west-2
```

## Consul Cache Plugin

Create `plugins/cache/consul_cache.py`:

```python
# consul_cache.py - Cache plugin using HashiCorp Consul KV
from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = """
    name: consul_cache
    short_description: Consul KV-backed fact cache
    description:
        - Stores Ansible facts in Consul's key-value store.
    options:
      _uri:
        description: Consul HTTP address.
        required: true
        env:
          - name: ANSIBLE_CACHE_PLUGIN_CONNECTION
        ini:
          - key: fact_caching_connection
            section: defaults
      _timeout:
        description: Cache TTL in seconds.
        default: 86400
        type: integer
        env:
          - name: ANSIBLE_CACHE_PLUGIN_TIMEOUT
        ini:
          - key: fact_caching_timeout
            section: defaults
      _prefix:
        description: KV prefix for cached data.
        default: ansible/cache
        env:
          - name: ANSIBLE_CONSUL_CACHE_PREFIX
        ini:
          - key: prefix
            section: consul_cache
      token:
        description: Consul ACL token.
        type: str
        env:
          - name: CONSUL_HTTP_TOKEN
        ini:
          - key: token
            section: consul_cache
"""

import json
import time
import base64

from ansible.plugins.cache import BaseCacheModule
from ansible.errors import AnsibleError
from ansible.module_utils.urls import open_url
from ansible.module_utils.common.text.converters import to_text


class CacheModule(BaseCacheModule):
    """Consul KV cache plugin."""

    def __init__(self, *args, **kwargs):
        super(CacheModule, self).__init__(*args, **kwargs)
        self._consul_url = self.get_option('_uri').rstrip('/')
        self._timeout = int(self.get_option('_timeout'))
        self._prefix = self.get_option('_prefix').strip('/')
        self._token = self.get_option('token')

    def _consul_request(self, method, path, data=None):
        """Make a request to the Consul HTTP API."""
        url = '%s/v1/kv/%s/%s' % (self._consul_url, self._prefix, path)
        headers = {'Content-Type': 'application/json'}
        if self._token:
            headers['X-Consul-Token'] = self._token

        try:
            response = open_url(
                url,
                data=data,
                headers=headers,
                method=method,
                timeout=10,
            )
            return response
        except Exception as e:
            if '404' in str(e):
                return None
            raise

    def get(self, key):
        response = self._consul_request('GET', to_text(key))
        if response is None:
            raise KeyError(key)

        entries = json.loads(response.read())
        if not entries:
            raise KeyError(key)

        value_data = json.loads(
            base64.b64decode(entries[0]['Value']).decode('utf-8')
        )

        # Check expiration
        if self._timeout > 0:
            stored_at = value_data.get('_stored_at', 0)
            if time.time() - stored_at > self._timeout:
                self.delete(key)
                raise KeyError(key)

        return value_data.get('data', {})

    def set(self, key, value):
        payload = json.dumps({
            'data': value,
            '_stored_at': time.time(),
        })
        self._consul_request('PUT', to_text(key), data=payload)

    def keys(self):
        url = '%s/v1/kv/%s/?keys' % (self._consul_url, self._prefix)
        headers = {}
        if self._token:
            headers['X-Consul-Token'] = self._token

        try:
            response = open_url(url, headers=headers, method='GET', timeout=10)
            all_keys = json.loads(response.read())
            prefix_len = len('%s/' % self._prefix) + 1
            return [k[prefix_len:] for k in all_keys if k.startswith(self._prefix)]
        except Exception:
            return []

    def contains(self, key):
        try:
            self.get(key)
            return True
        except KeyError:
            return False

    def delete(self, key):
        self._consul_request('DELETE', to_text(key))

    def flush(self):
        for key in self.keys():
            self.delete(key)
```

## Choosing a Backend

| Backend | Best For | Pros | Cons |
|---------|----------|------|------|
| DynamoDB | AWS environments | Serverless, auto-scaling, TTL | AWS lock-in |
| Consul | Multi-cloud | Cross-DC replication, KV native | Needs cluster |
| Redis | High performance | Fast, pub/sub capable | Volatile memory |
| S3 | Long-term storage | Cheap, durable | High latency |

## Summary

Custom cache plugins let you store Ansible facts wherever makes sense for your infrastructure. DynamoDB works well in AWS with its serverless model and built-in TTL. Consul fits multi-cloud setups with its built-in replication. The cache plugin interface is simple: implement `get`, `set`, `delete`, `keys`, `contains`, and `flush`. Pick the backend that matches your existing infrastructure and scale requirements.
