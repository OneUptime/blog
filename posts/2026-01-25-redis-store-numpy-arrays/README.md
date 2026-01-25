# How to Store NumPy Arrays in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, NumPy, Machine Learning, Data Science, Caching

Description: Learn efficient methods to store and retrieve NumPy arrays in Redis using serialization, compression, and specialized data structures for machine learning and scientific computing.

---

NumPy arrays are fundamental to machine learning and scientific computing in Python. Caching these arrays in Redis can dramatically speed up data pipelines, model serving, and feature stores. This guide covers multiple approaches to storing NumPy arrays efficiently in Redis.

## Basic Serialization with Pickle

The simplest approach uses pickle to serialize arrays to bytes:

```python
import redis
import numpy as np
import pickle

r = redis.Redis(host='localhost', port=6379, db=0)

# Create a sample array
arr = np.array([[1.0, 2.0, 3.0],
                [4.0, 5.0, 6.0],
                [7.0, 8.0, 9.0]])

def store_array_pickle(key, array):
    """Store array using pickle serialization"""
    serialized = pickle.dumps(array)
    r.set(key, serialized)
    return len(serialized)

def load_array_pickle(key):
    """Load array from Redis"""
    data = r.get(key)
    if data is None:
        return None
    return pickle.loads(data)

# Store and retrieve
size = store_array_pickle('my_array', arr)
print(f"Stored {size} bytes")

loaded = load_array_pickle('my_array')
print(f"Loaded array:\n{loaded}")
print(f"Arrays equal: {np.array_equal(arr, loaded)}")
```

## Efficient Storage with tobytes/frombuffer

For better performance, use NumPy's native binary format:

```python
import redis
import numpy as np
import json

r = redis.Redis(host='localhost', port=6379, db=0)

def store_array_native(key, array):
    """
    Store array using NumPy's native binary format.
    Faster than pickle, but requires storing metadata.
    """
    # Store array data
    r.set(f'{key}:data', array.tobytes())

    # Store metadata for reconstruction
    metadata = {
        'dtype': str(array.dtype),
        'shape': array.shape
    }
    r.set(f'{key}:meta', json.dumps(metadata))

    return array.nbytes

def load_array_native(key):
    """Load array from native format"""
    # Get metadata
    meta_raw = r.get(f'{key}:meta')
    if meta_raw is None:
        return None

    metadata = json.loads(meta_raw)

    # Get data and reconstruct
    data = r.get(f'{key}:data')
    array = np.frombuffer(data, dtype=metadata['dtype'])

    # Reshape to original dimensions
    return array.reshape(metadata['shape'])

# Test with different array types
arrays_to_test = [
    np.random.rand(100, 100),           # Float64
    np.random.randint(0, 255, (100, 100), dtype=np.uint8),  # Uint8
    np.random.rand(10, 10, 3),          # 3D array
]

for i, arr in enumerate(arrays_to_test):
    key = f'array_{i}'
    size = store_array_native(key, arr)
    loaded = load_array_native(key)
    print(f"Array {i}: {arr.shape} {arr.dtype}, {size} bytes, match: {np.array_equal(arr, loaded)}")
```

## Compressed Storage for Large Arrays

Compress arrays before storing to reduce memory usage:

```python
import redis
import numpy as np
import zlib
import lz4.frame
import json

r = redis.Redis(host='localhost', port=6379, db=0)

def store_array_compressed(key, array, compression='lz4', level=1):
    """
    Store array with compression.
    lz4: Fast compression, moderate ratio
    zlib: Slower compression, better ratio
    """
    data = array.tobytes()

    if compression == 'lz4':
        compressed = lz4.frame.compress(data, compression_level=level)
    elif compression == 'zlib':
        compressed = zlib.compress(data, level=level)
    else:
        compressed = data

    # Store compressed data and metadata
    metadata = {
        'dtype': str(array.dtype),
        'shape': array.shape,
        'compression': compression,
        'original_size': len(data)
    }

    pipe = r.pipeline()
    pipe.set(f'{key}:data', compressed)
    pipe.set(f'{key}:meta', json.dumps(metadata))
    pipe.execute()

    ratio = len(data) / len(compressed)
    return len(compressed), ratio

def load_array_compressed(key):
    """Load and decompress array"""
    meta_raw = r.get(f'{key}:meta')
    if meta_raw is None:
        return None

    metadata = json.loads(meta_raw)
    compressed = r.get(f'{key}:data')

    # Decompress based on method
    if metadata['compression'] == 'lz4':
        data = lz4.frame.decompress(compressed)
    elif metadata['compression'] == 'zlib':
        data = zlib.decompress(compressed)
    else:
        data = compressed

    array = np.frombuffer(data, dtype=metadata['dtype'])
    return array.reshape(metadata['shape'])

# Compare compression methods
large_array = np.random.rand(1000, 1000)

print("Compression comparison:")
print(f"Original size: {large_array.nbytes:,} bytes")

for method in ['none', 'lz4', 'zlib']:
    for level in [1, 6, 9] if method != 'none' else [1]:
        size, ratio = store_array_compressed(
            f'test_{method}_{level}',
            large_array,
            compression=method if method != 'none' else None,
            level=level
        )
        print(f"{method} (level {level}): {size:,} bytes, ratio: {ratio:.2f}x")
```

## Storing Multiple Arrays Together

For related arrays (like features and labels), store them together:

```python
import redis
import numpy as np
import pickle

r = redis.Redis(host='localhost', port=6379, db=0)

class ArrayBatch:
    """Store and retrieve batches of related arrays"""

    def __init__(self, redis_client, prefix='batch'):
        self.r = redis_client
        self.prefix = prefix

    def store(self, batch_id, **arrays):
        """
        Store multiple arrays under one batch ID.
        Usage: batch.store('batch_1', features=X, labels=y, weights=w)
        """
        metadata = {}

        pipe = self.r.pipeline()

        for name, array in arrays.items():
            key = f'{self.prefix}:{batch_id}:{name}'
            pipe.set(key, array.tobytes())
            metadata[name] = {
                'dtype': str(array.dtype),
                'shape': array.shape
            }

        # Store metadata
        pipe.set(f'{self.prefix}:{batch_id}:__meta__', pickle.dumps(metadata))
        pipe.execute()

        return sum(arr.nbytes for arr in arrays.values())

    def load(self, batch_id, *names):
        """
        Load arrays from a batch.
        Usage: X, y = batch.load('batch_1', 'features', 'labels')
        """
        # Get metadata
        meta_raw = self.r.get(f'{self.prefix}:{batch_id}:__meta__')
        if meta_raw is None:
            return None

        metadata = pickle.loads(meta_raw)

        # If no names specified, load all
        if not names:
            names = list(metadata.keys())

        # Load requested arrays
        pipe = self.r.pipeline()
        for name in names:
            pipe.get(f'{self.prefix}:{batch_id}:{name}')

        raw_data = pipe.execute()

        # Reconstruct arrays
        arrays = []
        for name, data in zip(names, raw_data):
            meta = metadata[name]
            arr = np.frombuffer(data, dtype=meta['dtype'])
            arrays.append(arr.reshape(meta['shape']))

        return arrays if len(arrays) > 1 else arrays[0]

    def delete(self, batch_id):
        """Delete a batch and all its arrays"""
        pattern = f'{self.prefix}:{batch_id}:*'
        cursor = 0
        while True:
            cursor, keys = self.r.scan(cursor, match=pattern)
            if keys:
                self.r.delete(*keys)
            if cursor == 0:
                break

# Usage for ML training data
batch = ArrayBatch(r)

# Store training batch
X_train = np.random.rand(1000, 784)
y_train = np.random.randint(0, 10, 1000)

batch.store('train_001',
    features=X_train,
    labels=y_train
)

# Load for training
features, labels = batch.load('train_001', 'features', 'labels')
print(f"Loaded features: {features.shape}, labels: {labels.shape}")
```

## Feature Store Pattern

Build a simple feature store for ML models:

```python
import redis
import numpy as np
import json
import time

r = redis.Redis(host='localhost', port=6379, db=0)

class FeatureStore:
    """
    Simple feature store for ML model serving.
    Stores pre-computed feature vectors by entity ID.
    """

    def __init__(self, redis_client, name='features'):
        self.r = redis_client
        self.name = name

    def set_features(self, entity_id, features, ttl=None):
        """Store feature vector for an entity"""
        key = f'{self.name}:{entity_id}'

        # Store as bytes with metadata
        data = {
            'features': features.tobytes(),
            'dtype': str(features.dtype),
            'shape': features.shape,
            'updated_at': time.time()
        }

        self.r.hset(key, mapping={
            'data': features.tobytes(),
            'dtype': str(features.dtype),
            'shape': json.dumps(features.shape),
            'updated_at': str(time.time())
        })

        if ttl:
            self.r.expire(key, ttl)

    def get_features(self, entity_id):
        """Get feature vector for an entity"""
        key = f'{self.name}:{entity_id}'
        raw = self.r.hgetall(key)

        if not raw:
            return None

        dtype = raw[b'dtype'].decode()
        shape = tuple(json.loads(raw[b'shape']))
        data = raw[b'data']

        features = np.frombuffer(data, dtype=dtype)
        return features.reshape(shape)

    def get_batch(self, entity_ids):
        """Get features for multiple entities efficiently"""
        pipe = self.r.pipeline()

        for entity_id in entity_ids:
            pipe.hgetall(f'{self.name}:{entity_id}')

        results = pipe.execute()

        features = []
        for raw in results:
            if raw:
                dtype = raw[b'dtype'].decode()
                shape = tuple(json.loads(raw[b'shape']))
                data = raw[b'data']
                arr = np.frombuffer(data, dtype=dtype).reshape(shape)
                features.append(arr)
            else:
                features.append(None)

        return features

    def delete_features(self, entity_id):
        """Delete features for an entity"""
        self.r.delete(f'{self.name}:{entity_id}')

# Usage
store = FeatureStore(r, 'user_embeddings')

# Store user embeddings
for user_id in range(100):
    embedding = np.random.rand(128).astype(np.float32)
    store.set_features(user_id, embedding, ttl=3600)

# Retrieve for inference
user_embedding = store.get_features(42)
print(f"User 42 embedding shape: {user_embedding.shape}")

# Batch retrieval for recommendations
user_ids = [1, 2, 3, 4, 5]
embeddings = store.get_batch(user_ids)
print(f"Loaded {len(embeddings)} embeddings")
```

## Performance Comparison

```python
import redis
import numpy as np
import pickle
import time

r = redis.Redis(host='localhost', port=6379, db=0)

# Test array
arr = np.random.rand(1000, 1000)

methods = {
    'pickle': lambda a: pickle.dumps(a),
    'tobytes': lambda a: a.tobytes(),
    'tobytes+lz4': lambda a: lz4.frame.compress(a.tobytes()),
}

print("Serialization benchmarks:")
print(f"Array size: {arr.nbytes:,} bytes\n")

for name, serialize in methods.items():
    # Serialization time
    start = time.time()
    for _ in range(100):
        data = serialize(arr)
    ser_time = (time.time() - start) / 100

    # Size
    size = len(data)

    print(f"{name}:")
    print(f"  Size: {size:,} bytes ({size/arr.nbytes*100:.1f}%)")
    print(f"  Serialize: {ser_time*1000:.2f}ms")
```

## Summary

| Method | Speed | Size | Use Case |
|--------|-------|------|----------|
| pickle | Medium | Larger | Simple, portable |
| tobytes | Fast | Exact | Performance critical |
| tobytes + lz4 | Fast | Smaller | Large arrays, moderate compression |
| tobytes + zlib | Slow | Smallest | Storage constrained |

Key recommendations:
- Use tobytes for best performance with small overhead
- Add lz4 compression for large arrays
- Store metadata separately for reconstruction
- Use pipelines for batch operations
- Consider TTL for temporary features
- Profile your specific use case to choose the best method
