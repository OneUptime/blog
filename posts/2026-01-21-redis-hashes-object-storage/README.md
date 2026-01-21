# How to Use Redis Hashes for Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hashes, Data Structures, Object Storage, HSET, HGET, Memory Optimization

Description: A comprehensive guide to using Redis Hashes for efficient object storage, covering HSET, HGET, HMSET commands, memory optimization techniques, and practical examples in Python, Node.js, and Go for storing structured data.

---

Redis Hashes are ideal for storing objects with multiple fields, such as user profiles, product information, or configuration settings. Unlike storing serialized JSON in strings, hashes allow you to access and modify individual fields without retrieving the entire object.

In this guide, we will explore Redis Hashes in depth, covering essential commands, memory optimization, and practical implementations for object storage.

## Understanding Redis Hashes

A Redis Hash is a collection of field-value pairs, similar to a dictionary or map. Each hash is identified by a key and can contain up to 2^32 - 1 field-value pairs (over 4 billion).

Benefits of using Hashes:
- Access individual fields without fetching the entire object
- Memory-efficient for objects with many small fields
- Atomic operations on individual fields
- Natural representation of objects

## Essential Hash Commands

### HSET and HGET

```bash
# Set a single field
HSET user:1 name "Alice"

# Set multiple fields
HSET user:1 name "Alice" email "alice@example.com" age 30

# Get a single field
HGET user:1 name
# "Alice"

# Get multiple fields
HMGET user:1 name email age
# 1) "Alice"
# 2) "alice@example.com"
# 3) "30"

# Get all fields and values
HGETALL user:1
# 1) "name"
# 2) "Alice"
# 3) "email"
# 4) "alice@example.com"
# 5) "age"
# 6) "30"
```

### HSETNX - Set If Not Exists

```bash
# Only set if field doesn't exist
HSETNX user:1 name "Bob"
# Returns 0 (field exists)

HSETNX user:1 country "USA"
# Returns 1 (field created)
```

### Field Operations

```bash
# Check if field exists
HEXISTS user:1 email
# 1 (exists)

HEXISTS user:1 phone
# 0 (doesn't exist)

# Delete fields
HDEL user:1 age
# Returns number of fields deleted

# Get number of fields
HLEN user:1
# 2

# Get all field names
HKEYS user:1
# 1) "name"
# 2) "email"

# Get all values
HVALS user:1
# 1) "Alice"
# 2) "alice@example.com"
```

### Numeric Operations

```bash
# Increment integer field
HSET product:1 stock 100
HINCRBY product:1 stock -5
HGET product:1 stock
# "95"

# Increment float field
HSET product:1 price 19.99
HINCRBYFLOAT product:1 price 0.50
HGET product:1 price
# "20.49"
```

### Scanning Hash Fields

```bash
# Iterate through fields (for large hashes)
HSCAN user:1 0
# Returns cursor and field-value pairs

HSCAN user:1 0 MATCH "email*" COUNT 10
# Scan with pattern matching
```

### String Length

```bash
# Get string length of a field
HSTRLEN user:1 name
# 5
```

## Hashes vs Strings for Objects

### When to Use Hashes

```bash
# Hash approach - access individual fields
HSET user:1 name "Alice" email "alice@example.com" age 30 city "NYC"

# Update single field
HSET user:1 city "LA"

# Get single field
HGET user:1 email
```

### When to Use Strings

```bash
# String approach - store serialized JSON
SET user:1 '{"name":"Alice","email":"alice@example.com","age":30,"city":"NYC"}'

# Must get entire object to read or modify
GET user:1
# Parse, modify, serialize, and SET again
```

**Use Hashes when:**
- You frequently access or update individual fields
- Object has many fields but you only need a few at a time
- You need atomic increments on numeric fields
- Memory efficiency is important for many small objects

**Use Strings when:**
- You always read/write the entire object
- Object structure is complex (nested objects, arrays)
- You need the exact JSON structure preserved

## Practical Examples

### Python Implementation

```python
import redis
import json
from datetime import datetime
from typing import Optional, Dict, Any, List

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# User Profile Storage
# =============================================================================

class UserProfile:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.key = f"user:{user_id}"

    def create(self, name: str, email: str, age: int = None, **kwargs) -> None:
        """Create or update user profile."""
        data = {
            "name": name,
            "email": email,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        if age:
            data["age"] = age
        data.update(kwargs)

        client.hset(self.key, mapping=data)

    def get(self) -> Optional[Dict[str, Any]]:
        """Get full user profile."""
        data = client.hgetall(self.key)
        return data if data else None

    def get_field(self, field: str) -> Optional[str]:
        """Get single field."""
        return client.hget(self.key, field)

    def get_fields(self, *fields) -> Dict[str, str]:
        """Get multiple fields."""
        values = client.hmget(self.key, *fields)
        return dict(zip(fields, values))

    def update(self, **kwargs) -> None:
        """Update specific fields."""
        kwargs["updated_at"] = datetime.now().isoformat()
        client.hset(self.key, mapping=kwargs)

    def increment_field(self, field: str, amount: int = 1) -> int:
        """Increment numeric field."""
        return client.hincrby(self.key, field, amount)

    def delete_field(self, *fields) -> int:
        """Delete specific fields."""
        return client.hdel(self.key, *fields)

    def exists(self) -> bool:
        """Check if user exists."""
        return client.exists(self.key) > 0

    def delete(self) -> None:
        """Delete entire profile."""
        client.delete(self.key)


# =============================================================================
# Product Catalog
# =============================================================================

class ProductCatalog:
    @staticmethod
    def create_product(product_id: str, name: str, price: float, stock: int,
                       category: str, **kwargs) -> None:
        """Create a product."""
        key = f"product:{product_id}"
        data = {
            "name": name,
            "price": price,
            "stock": stock,
            "category": category,
            "created_at": datetime.now().isoformat()
        }
        data.update(kwargs)
        client.hset(key, mapping=data)

    @staticmethod
    def get_product(product_id: str) -> Optional[Dict]:
        """Get product details."""
        key = f"product:{product_id}"
        return client.hgetall(key)

    @staticmethod
    def update_stock(product_id: str, quantity: int) -> int:
        """Update stock (negative for decrease)."""
        key = f"product:{product_id}"
        return client.hincrby(key, "stock", quantity)

    @staticmethod
    def update_price(product_id: str, new_price: float) -> None:
        """Update product price."""
        key = f"product:{product_id}"
        client.hset(key, "price", new_price)

    @staticmethod
    def get_stock(product_id: str) -> int:
        """Get current stock level."""
        key = f"product:{product_id}"
        stock = client.hget(key, "stock")
        return int(stock) if stock else 0

    @staticmethod
    def reserve_stock(product_id: str, quantity: int) -> bool:
        """Reserve stock atomically using Lua script."""
        key = f"product:{product_id}"
        script = """
        local stock = tonumber(redis.call('HGET', KEYS[1], 'stock'))
        if stock >= tonumber(ARGV[1]) then
            redis.call('HINCRBY', KEYS[1], 'stock', -tonumber(ARGV[1]))
            return 1
        end
        return 0
        """
        result = client.eval(script, 1, key, quantity)
        return result == 1


# =============================================================================
# Session Storage
# =============================================================================

class SessionStore:
    def __init__(self, session_ttl: int = 3600):
        self.ttl = session_ttl

    def create_session(self, session_id: str, user_id: int, **metadata) -> None:
        """Create a new session."""
        key = f"session:{session_id}"
        data = {
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat()
        }
        data.update(metadata)

        pipe = client.pipeline()
        pipe.hset(key, mapping=data)
        pipe.expire(key, self.ttl)
        pipe.execute()

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session data."""
        key = f"session:{session_id}"
        return client.hgetall(key)

    def update_activity(self, session_id: str) -> None:
        """Update last activity and refresh TTL."""
        key = f"session:{session_id}"
        pipe = client.pipeline()
        pipe.hset(key, "last_activity", datetime.now().isoformat())
        pipe.expire(key, self.ttl)
        pipe.execute()

    def set_data(self, session_id: str, field: str, value: str) -> None:
        """Store data in session."""
        key = f"session:{session_id}"
        client.hset(key, field, value)

    def get_data(self, session_id: str, field: str) -> Optional[str]:
        """Get data from session."""
        key = f"session:{session_id}"
        return client.hget(key, field)

    def destroy_session(self, session_id: str) -> None:
        """Delete session."""
        key = f"session:{session_id}"
        client.delete(key)


# =============================================================================
# Configuration Storage
# =============================================================================

class ConfigStore:
    def __init__(self, namespace: str = "config"):
        self.namespace = namespace

    def _key(self, config_name: str) -> str:
        return f"{self.namespace}:{config_name}"

    def set_config(self, config_name: str, settings: Dict) -> None:
        """Set configuration."""
        # Flatten nested dicts for storage
        flat_settings = self._flatten_dict(settings)
        client.hset(self._key(config_name), mapping=flat_settings)

    def get_config(self, config_name: str) -> Dict:
        """Get full configuration."""
        data = client.hgetall(self._key(config_name))
        return self._unflatten_dict(data)

    def get_setting(self, config_name: str, key: str) -> Optional[str]:
        """Get single setting."""
        return client.hget(self._key(config_name), key)

    def update_setting(self, config_name: str, key: str, value: Any) -> None:
        """Update single setting."""
        client.hset(self._key(config_name), key, str(value))

    @staticmethod
    def _flatten_dict(d: Dict, parent_key: str = '', sep: str = '.') -> Dict:
        """Flatten nested dictionary."""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(ConfigStore._flatten_dict(v, new_key, sep).items())
            else:
                items.append((new_key, json.dumps(v) if isinstance(v, (list, dict)) else str(v)))
        return dict(items)

    @staticmethod
    def _unflatten_dict(d: Dict, sep: str = '.') -> Dict:
        """Unflatten dictionary."""
        result = {}
        for key, value in d.items():
            parts = key.split(sep)
            target = result
            for part in parts[:-1]:
                target = target.setdefault(part, {})
            try:
                target[parts[-1]] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                target[parts[-1]] = value
        return result


# =============================================================================
# Usage Examples
# =============================================================================

# User Profile
user = UserProfile(1)
user.create(name="Alice", email="alice@example.com", age=30, city="NYC")
print(user.get())
print(user.get_field("email"))

user.update(city="LA")
user.increment_field("login_count")

# Product Catalog
ProductCatalog.create_product(
    "SKU001",
    name="Laptop",
    price=999.99,
    stock=50,
    category="Electronics"
)

print(ProductCatalog.get_product("SKU001"))
print(f"Stock: {ProductCatalog.get_stock('SKU001')}")

# Reserve stock atomically
if ProductCatalog.reserve_stock("SKU001", 5):
    print("Stock reserved successfully")
print(f"New stock: {ProductCatalog.get_stock('SKU001')}")

# Session Storage
session = SessionStore(ttl=3600)
session.create_session("sess_abc123", user_id=1, ip_address="192.168.1.1")
session.set_data("sess_abc123", "cart_items", "5")
print(session.get_session("sess_abc123"))

# Configuration
config = ConfigStore()
config.set_config("app", {
    "debug": True,
    "max_connections": 100,
    "database": {
        "host": "localhost",
        "port": 5432
    }
})
print(config.get_config("app"))
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// User Profile Storage
// =============================================================================

class UserProfile {
  constructor(userId) {
    this.userId = userId;
    this.key = `user:${userId}`;
  }

  async create(name, email, age = null, extra = {}) {
    const data = {
      name,
      email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...extra,
    };
    if (age) data.age = age;

    await redis.hset(this.key, data);
  }

  async get() {
    const data = await redis.hgetall(this.key);
    return Object.keys(data).length ? data : null;
  }

  async getField(field) {
    return await redis.hget(this.key, field);
  }

  async getFields(...fields) {
    const values = await redis.hmget(this.key, ...fields);
    return fields.reduce((acc, field, i) => {
      acc[field] = values[i];
      return acc;
    }, {});
  }

  async update(fields) {
    fields.updated_at = new Date().toISOString();
    await redis.hset(this.key, fields);
  }

  async incrementField(field, amount = 1) {
    return await redis.hincrby(this.key, field, amount);
  }

  async deleteField(...fields) {
    return await redis.hdel(this.key, ...fields);
  }

  async exists() {
    return (await redis.exists(this.key)) > 0;
  }

  async delete() {
    await redis.del(this.key);
  }
}

// =============================================================================
// Product Catalog
// =============================================================================

class ProductCatalog {
  static async createProduct(productId, name, price, stock, category, extra = {}) {
    const key = `product:${productId}`;
    const data = {
      name,
      price,
      stock,
      category,
      created_at: new Date().toISOString(),
      ...extra,
    };
    await redis.hset(key, data);
  }

  static async getProduct(productId) {
    const key = `product:${productId}`;
    return await redis.hgetall(key);
  }

  static async updateStock(productId, quantity) {
    const key = `product:${productId}`;
    return await redis.hincrby(key, 'stock', quantity);
  }

  static async updatePrice(productId, newPrice) {
    const key = `product:${productId}`;
    await redis.hset(key, 'price', newPrice);
  }

  static async getStock(productId) {
    const key = `product:${productId}`;
    const stock = await redis.hget(key, 'stock');
    return stock ? parseInt(stock) : 0;
  }

  static async reserveStock(productId, quantity) {
    const key = `product:${productId}`;
    const script = `
      local stock = tonumber(redis.call('HGET', KEYS[1], 'stock'))
      if stock >= tonumber(ARGV[1]) then
        redis.call('HINCRBY', KEYS[1], 'stock', -tonumber(ARGV[1]))
        return 1
      end
      return 0
    `;
    const result = await redis.eval(script, 1, key, quantity);
    return result === 1;
  }
}

// =============================================================================
// Session Storage
// =============================================================================

class SessionStore {
  constructor(ttl = 3600) {
    this.ttl = ttl;
  }

  async createSession(sessionId, userId, metadata = {}) {
    const key = `session:${sessionId}`;
    const data = {
      user_id: userId,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      ...metadata,
    };

    const pipeline = redis.pipeline();
    pipeline.hset(key, data);
    pipeline.expire(key, this.ttl);
    await pipeline.exec();
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await redis.hgetall(key);
  }

  async updateActivity(sessionId) {
    const key = `session:${sessionId}`;
    const pipeline = redis.pipeline();
    pipeline.hset(key, 'last_activity', new Date().toISOString());
    pipeline.expire(key, this.ttl);
    await pipeline.exec();
  }

  async setData(sessionId, field, value) {
    const key = `session:${sessionId}`;
    await redis.hset(key, field, value);
  }

  async getData(sessionId, field) {
    const key = `session:${sessionId}`;
    return await redis.hget(key, field);
  }

  async destroySession(sessionId) {
    const key = `session:${sessionId}`;
    await redis.del(key);
  }
}

// =============================================================================
// Shopping Cart
// =============================================================================

class ShoppingCart {
  constructor(userId) {
    this.key = `cart:${userId}`;
  }

  async addItem(productId, quantity = 1) {
    await redis.hincrby(this.key, productId, quantity);
  }

  async removeItem(productId) {
    await redis.hdel(this.key, productId);
  }

  async updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      await this.removeItem(productId);
    } else {
      await redis.hset(this.key, productId, quantity);
    }
  }

  async getItems() {
    const items = await redis.hgetall(this.key);
    return Object.entries(items).map(([productId, quantity]) => ({
      productId,
      quantity: parseInt(quantity),
    }));
  }

  async getItemCount() {
    return await redis.hlen(this.key);
  }

  async clear() {
    await redis.del(this.key);
  }

  async setExpiration(seconds) {
    await redis.expire(this.key, seconds);
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  // User Profile
  const user = new UserProfile(1);
  await user.create('Alice', 'alice@example.com', 30, { city: 'NYC' });
  console.log(await user.get());
  console.log(await user.getField('email'));

  await user.update({ city: 'LA' });
  await user.incrementField('login_count');

  // Product Catalog
  await ProductCatalog.createProduct(
    'SKU001',
    'Laptop',
    999.99,
    50,
    'Electronics'
  );

  console.log(await ProductCatalog.getProduct('SKU001'));
  console.log(`Stock: ${await ProductCatalog.getStock('SKU001')}`);

  if (await ProductCatalog.reserveStock('SKU001', 5)) {
    console.log('Stock reserved successfully');
  }
  console.log(`New stock: ${await ProductCatalog.getStock('SKU001')}`);

  // Session Storage
  const session = new SessionStore(3600);
  await session.createSession('sess_abc123', 1, { ip_address: '192.168.1.1' });
  await session.setData('sess_abc123', 'cart_items', '5');
  console.log(await session.getSession('sess_abc123'));

  // Shopping Cart
  const cart = new ShoppingCart(1);
  await cart.addItem('SKU001', 2);
  await cart.addItem('SKU002', 1);
  console.log(await cart.getItems());
  console.log(`Item count: ${await cart.getItemCount()}`);

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "strconv"
    "time"

    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// User Profile
// =============================================================================

type UserProfile struct {
    UserID int
    Key    string
}

func NewUserProfile(userID int) *UserProfile {
    return &UserProfile{
        UserID: userID,
        Key:    fmt.Sprintf("user:%d", userID),
    }
}

func (u *UserProfile) Create(name, email string, age int, extra map[string]interface{}) error {
    data := map[string]interface{}{
        "name":       name,
        "email":      email,
        "created_at": time.Now().Format(time.RFC3339),
        "updated_at": time.Now().Format(time.RFC3339),
    }
    if age > 0 {
        data["age"] = age
    }
    for k, v := range extra {
        data[k] = v
    }

    return client.HSet(ctx, u.Key, data).Err()
}

func (u *UserProfile) Get() (map[string]string, error) {
    return client.HGetAll(ctx, u.Key).Result()
}

func (u *UserProfile) GetField(field string) (string, error) {
    return client.HGet(ctx, u.Key, field).Result()
}

func (u *UserProfile) Update(fields map[string]interface{}) error {
    fields["updated_at"] = time.Now().Format(time.RFC3339)
    return client.HSet(ctx, u.Key, fields).Err()
}

func (u *UserProfile) IncrementField(field string, amount int64) (int64, error) {
    return client.HIncrBy(ctx, u.Key, field, amount).Result()
}

func (u *UserProfile) Delete() error {
    return client.Del(ctx, u.Key).Err()
}

// =============================================================================
// Product Catalog
// =============================================================================

type Product struct {
    Name      string  `redis:"name"`
    Price     float64 `redis:"price"`
    Stock     int     `redis:"stock"`
    Category  string  `redis:"category"`
    CreatedAt string  `redis:"created_at"`
}

func CreateProduct(productID, name string, price float64, stock int, category string) error {
    key := fmt.Sprintf("product:%s", productID)
    data := map[string]interface{}{
        "name":       name,
        "price":      price,
        "stock":      stock,
        "category":   category,
        "created_at": time.Now().Format(time.RFC3339),
    }
    return client.HSet(ctx, key, data).Err()
}

func GetProduct(productID string) (*Product, error) {
    key := fmt.Sprintf("product:%s", productID)
    var product Product
    err := client.HGetAll(ctx, key).Scan(&product)
    if err != nil {
        return nil, err
    }
    return &product, nil
}

func UpdateStock(productID string, quantity int64) (int64, error) {
    key := fmt.Sprintf("product:%s", productID)
    return client.HIncrBy(ctx, key, "stock", quantity).Result()
}

func GetStock(productID string) (int64, error) {
    key := fmt.Sprintf("product:%s", productID)
    return client.HGet(ctx, key, "stock").Int64()
}

func ReserveStock(productID string, quantity int) (bool, error) {
    key := fmt.Sprintf("product:%s", productID)
    script := `
        local stock = tonumber(redis.call('HGET', KEYS[1], 'stock'))
        if stock >= tonumber(ARGV[1]) then
            redis.call('HINCRBY', KEYS[1], 'stock', -tonumber(ARGV[1]))
            return 1
        end
        return 0
    `
    result, err := client.Eval(ctx, script, []string{key}, quantity).Int64()
    if err != nil {
        return false, err
    }
    return result == 1, nil
}

// =============================================================================
// Session Store
// =============================================================================

type SessionStore struct {
    TTL time.Duration
}

func NewSessionStore(ttl time.Duration) *SessionStore {
    return &SessionStore{TTL: ttl}
}

func (s *SessionStore) CreateSession(sessionID string, userID int, metadata map[string]string) error {
    key := fmt.Sprintf("session:%s", sessionID)
    data := map[string]interface{}{
        "user_id":       userID,
        "created_at":    time.Now().Format(time.RFC3339),
        "last_activity": time.Now().Format(time.RFC3339),
    }
    for k, v := range metadata {
        data[k] = v
    }

    pipe := client.Pipeline()
    pipe.HSet(ctx, key, data)
    pipe.Expire(ctx, key, s.TTL)
    _, err := pipe.Exec(ctx)
    return err
}

func (s *SessionStore) GetSession(sessionID string) (map[string]string, error) {
    key := fmt.Sprintf("session:%s", sessionID)
    return client.HGetAll(ctx, key).Result()
}

func (s *SessionStore) UpdateActivity(sessionID string) error {
    key := fmt.Sprintf("session:%s", sessionID)
    pipe := client.Pipeline()
    pipe.HSet(ctx, key, "last_activity", time.Now().Format(time.RFC3339))
    pipe.Expire(ctx, key, s.TTL)
    _, err := pipe.Exec(ctx)
    return err
}

func (s *SessionStore) DestroySession(sessionID string) error {
    key := fmt.Sprintf("session:%s", sessionID)
    return client.Del(ctx, key).Err()
}

// =============================================================================
// Shopping Cart
// =============================================================================

type ShoppingCart struct {
    Key string
}

func NewShoppingCart(userID int) *ShoppingCart {
    return &ShoppingCart{
        Key: fmt.Sprintf("cart:%d", userID),
    }
}

func (c *ShoppingCart) AddItem(productID string, quantity int64) error {
    return client.HIncrBy(ctx, c.Key, productID, quantity).Err()
}

func (c *ShoppingCart) RemoveItem(productID string) error {
    return client.HDel(ctx, c.Key, productID).Err()
}

func (c *ShoppingCart) GetItems() (map[string]int, error) {
    items, err := client.HGetAll(ctx, c.Key).Result()
    if err != nil {
        return nil, err
    }

    result := make(map[string]int)
    for k, v := range items {
        qty, _ := strconv.Atoi(v)
        result[k] = qty
    }
    return result, nil
}

func (c *ShoppingCart) Clear() error {
    return client.Del(ctx, c.Key).Err()
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    // User Profile
    user := NewUserProfile(1)
    user.Create("Alice", "alice@example.com", 30, map[string]interface{}{"city": "NYC"})

    profile, _ := user.Get()
    fmt.Printf("User: %v\n", profile)

    email, _ := user.GetField("email")
    fmt.Printf("Email: %s\n", email)

    user.Update(map[string]interface{}{"city": "LA"})
    user.IncrementField("login_count", 1)

    // Product Catalog
    CreateProduct("SKU001", "Laptop", 999.99, 50, "Electronics")

    product, _ := GetProduct("SKU001")
    fmt.Printf("Product: %+v\n", product)

    stock, _ := GetStock("SKU001")
    fmt.Printf("Stock: %d\n", stock)

    reserved, _ := ReserveStock("SKU001", 5)
    if reserved {
        fmt.Println("Stock reserved successfully")
    }

    newStock, _ := GetStock("SKU001")
    fmt.Printf("New stock: %d\n", newStock)

    // Session Store
    session := NewSessionStore(time.Hour)
    session.CreateSession("sess_abc123", 1, map[string]string{"ip_address": "192.168.1.1"})

    sessionData, _ := session.GetSession("sess_abc123")
    fmt.Printf("Session: %v\n", sessionData)

    // Shopping Cart
    cart := NewShoppingCart(1)
    cart.AddItem("SKU001", 2)
    cart.AddItem("SKU002", 1)

    items, _ := cart.GetItems()
    fmt.Printf("Cart items: %v\n", items)
}
```

## Memory Optimization

### Ziplist Encoding

Redis uses memory-efficient ziplist encoding for small hashes:

```bash
# Check current encoding
DEBUG OBJECT user:1

# Configuration (redis.conf)
hash-max-ziplist-entries 512    # Max number of entries for ziplist
hash-max-ziplist-value 64       # Max value size for ziplist
```

### Memory Tips

1. **Use short field names** - "e" instead of "email" for high-volume data
2. **Avoid storing nulls** - Don't set fields with null values
3. **Consider field count** - Many small hashes are more efficient than few large ones
4. **Use HSCAN for large hashes** - Avoid HGETALL on large hashes

## Best Practices

1. **Key Naming**: Use consistent patterns like `entity:id` (e.g., `user:123`)
2. **Field Types**: Store numbers as strings, they'll be converted automatically for HINCRBY
3. **Atomic Operations**: Use HINCRBY/HINCRBYFLOAT for counters
4. **Batch Operations**: Use HSET with multiple fields instead of multiple HSET calls
5. **Expiration**: Hashes don't support per-field TTL - use EXPIRE on the entire hash

## Conclusion

Redis Hashes provide an efficient way to store and manipulate objects in Redis. Key takeaways:

- Use hashes when you need to access individual fields frequently
- Take advantage of atomic numeric operations
- Keep hashes small to benefit from ziplist encoding
- Use consistent key naming conventions
- Combine with pipelines for batch operations

Redis Hashes strike a balance between the simplicity of key-value storage and the structure of document databases, making them ideal for user profiles, product catalogs, session data, and configuration storage.
