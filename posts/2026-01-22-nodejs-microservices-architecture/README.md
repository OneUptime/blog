# How to Create Microservices with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Microservices, Architecture, REST API, gRPC

Description: Learn how to design and build microservices architecture in Node.js including service communication, API gateways, service discovery, and best practices.

---

Microservices architecture breaks down applications into small, independently deployable services. Each service handles a specific business capability and communicates with others through well-defined APIs.

## Basic Microservice Structure

```
project/
  services/
    user-service/
      src/
        index.js
        routes/
        models/
        services/
      package.json
      Dockerfile
    order-service/
      src/
        index.js
        routes/
        models/
        services/
      package.json
      Dockerfile
    payment-service/
      ...
  gateway/
    src/
      index.js
    package.json
    Dockerfile
  docker-compose.yml
```

## Simple Microservice

### User Service

```javascript
// services/user-service/src/index.js
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// User routes
const User = mongoose.model('User', {
  email: { type: String, required: true, unique: true },
  name: String,
  createdAt: { type: Date, default: Date.now },
});

app.get('/users', async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/users')
  .then(() => {
    app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });
  });
```

### Order Service

```javascript
// services/order-service/src/index.js
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json());

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

const Order = mongoose.model('Order', {
  userId: { type: String, required: true },
  items: [{
    productId: String,
    quantity: Number,
    price: Number,
  }],
  total: Number,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Verify user exists before creating order
async function verifyUser(userId) {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/${userId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('User not found');
    }
    throw error;
  }
}

app.get('/orders', async (req, res) => {
  const { userId } = req.query;
  const filter = userId ? { userId } : {};
  const orders = await Order.find(filter);
  res.json(orders);
});

app.post('/orders', async (req, res) => {
  try {
    // Verify user exists
    await verifyUser(req.body.userId);
    
    // Calculate total
    const total = req.body.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    
    const order = await Order.create({
      ...req.body,
      total,
    });
    
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/orders/:id/status', async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  res.json(order);
});

const PORT = process.env.PORT || 3002;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/orders')
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Order service running on port ${PORT}`);
    });
  });
```

## API Gateway

The gateway routes requests to appropriate services and handles cross-cutting concerns.

```javascript
// gateway/src/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Service URLs
const services = {
  users: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  orders: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  products: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  payments: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
};

// Proxy options
const createProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: (path, req) => path.replace(/^\/api\/[^\/]+/, ''),
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(503).json({ error: 'Service unavailable' });
  },
});

// Public routes
app.use('/api/auth', createProxy(services.users));

// Protected routes
app.use('/api/users', authenticate, createProxy(services.users));
app.use('/api/orders', authenticate, createProxy(services.orders));
app.use('/api/products', createProxy(services.products));
app.use('/api/payments', authenticate, createProxy(services.payments));

// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 3000 });
        return { service: name, status: 'healthy' };
      } catch (error) {
        return { service: name, status: 'unhealthy' };
      }
    })
  );
  
  const allHealthy = checks.every(c => c.status === 'healthy');
  res.status(allHealthy ? 200 : 503).json({ services: checks });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

## Service Communication

### HTTP/REST Communication

```javascript
// services/shared/http-client.js
const axios = require('axios');

class ServiceClient {
  constructor(baseURL, options = {}) {
    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 5000,
    });
    
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      config.headers['X-Request-ID'] = generateRequestId();
      return config;
    });
    
    // Retry interceptor
    this.client.interceptors.response.use(
      response => response,
      async (error) => {
        const { config } = error;
        if (!config || config.__retryCount >= 3) {
          throw error;
        }
        
        config.__retryCount = (config.__retryCount || 0) + 1;
        await delay(1000 * config.__retryCount);
        return this.client(config);
      }
    );
  }
  
  async get(path, options) {
    return this.client.get(path, options);
  }
  
  async post(path, data, options) {
    return this.client.post(path, data, options);
  }
}

// Usage
const userService = new ServiceClient(process.env.USER_SERVICE_URL);
const user = await userService.get(`/users/${userId}`);
```

### Message Queue Communication

Using RabbitMQ for async communication:

```bash
npm install amqplib
```

```javascript
// services/shared/message-queue.js
const amqp = require('amqplib');

class MessageQueue {
  constructor() {
    this.connection = null;
    this.channel = null;
  }
  
  async connect(url) {
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
  }
  
  async publish(exchange, routingKey, message) {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }
  
  async subscribe(exchange, queue, routingKey, handler) {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);
    
    this.channel.consume(queue, async (msg) => {
      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        this.channel.ack(msg);
      } catch (error) {
        console.error('Message processing error:', error);
        this.channel.nack(msg, false, false);  // Dead letter
      }
    });
  }
  
  async close() {
    await this.channel.close();
    await this.connection.close();
  }
}

module.exports = new MessageQueue();
```

### Event Publishing

```javascript
// services/order-service/src/events.js
const mq = require('./shared/message-queue');

// Publish order created event
async function publishOrderCreated(order) {
  await mq.publish('orders', 'order.created', {
    event: 'order.created',
    data: order,
    timestamp: new Date().toISOString(),
  });
}

// In order creation
app.post('/orders', async (req, res) => {
  const order = await Order.create(req.body);
  
  // Publish event asynchronously
  publishOrderCreated(order).catch(err => {
    console.error('Failed to publish event:', err);
  });
  
  res.status(201).json(order);
});
```

### Event Subscription

```javascript
// services/notification-service/src/index.js
const mq = require('./shared/message-queue');

async function start() {
  await mq.connect(process.env.RABBITMQ_URL);
  
  // Subscribe to order events
  await mq.subscribe('orders', 'notifications', 'order.*', async (event) => {
    switch (event.event) {
      case 'order.created':
        await sendOrderConfirmation(event.data);
        break;
      case 'order.shipped':
        await sendShippingNotification(event.data);
        break;
    }
  });
  
  console.log('Notification service started');
}

start();
```

## gRPC Communication

For high-performance inter-service communication:

```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

### Proto Definition

```protobuf
// proto/user.proto
syntax = "proto3";

package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (UserList);
}

message GetUserRequest {
  string id = 1;
}

message CreateUserRequest {
  string email = 1;
  string name = 2;
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
}

message UserList {
  repeated User users = 1;
}

message ListUsersRequest {
  int32 limit = 1;
  int32 offset = 2;
}
```

### gRPC Server

```javascript
// services/user-service/src/grpc-server.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Implementation
const userService = {
  async getUser(call, callback) {
    try {
      const user = await User.findById(call.request.id);
      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found',
        });
      }
      callback(null, { id: user._id.toString(), email: user.email, name: user.name });
    } catch (error) {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    }
  },
  
  async createUser(call, callback) {
    try {
      const user = await User.create(call.request);
      callback(null, { id: user._id.toString(), email: user.email, name: user.name });
    } catch (error) {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    }
  },
  
  async listUsers(call, callback) {
    const users = await User.find()
      .skip(call.request.offset || 0)
      .limit(call.request.limit || 10);
    callback(null, {
      users: users.map(u => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
      })),
    });
  },
};

// Start server
const server = new grpc.Server();
server.addService(userProto.UserService.service, userService);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('gRPC server running on port 50051');
});
```

### gRPC Client

```javascript
// services/order-service/src/grpc-client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const userClient = new userProto.UserService(
  process.env.USER_SERVICE_GRPC || 'localhost:50051',
  grpc.credentials.createInsecure()
);

// Promisify client methods
function getUser(id) {
  return new Promise((resolve, reject) => {
    userClient.getUser({ id }, (error, response) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
}

// Usage in order service
app.post('/orders', async (req, res) => {
  try {
    const user = await getUser(req.body.userId);
    // Create order...
  } catch (error) {
    if (error.code === grpc.status.NOT_FOUND) {
      return res.status(404).json({ error: 'User not found' });
    }
    throw error;
  }
});
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  gateway:
    build: ./gateway
    ports:
      - "3000:3000"
    environment:
      - USER_SERVICE_URL=http://user-service:3001
      - ORDER_SERVICE_URL=http://order-service:3002
      - JWT_SECRET=your-secret
    depends_on:
      - user-service
      - order-service

  user-service:
    build: ./services/user-service
    environment:
      - PORT=3001
      - MONGO_URI=mongodb://mongo:27017/users
    depends_on:
      - mongo

  order-service:
    build: ./services/order-service
    environment:
      - PORT=3002
      - MONGO_URI=mongodb://mongo:27017/orders
      - USER_SERVICE_URL=http://user-service:3001
    depends_on:
      - mongo
      - user-service

  notification-service:
    build: ./services/notification-service
    environment:
      - RABBITMQ_URL=amqp://rabbitmq
    depends_on:
      - rabbitmq

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "15672:15672"

volumes:
  mongo-data:
```

## Summary

| Pattern | Use Case |
|---------|----------|
| API Gateway | Request routing, auth, rate limiting |
| HTTP/REST | Simple synchronous requests |
| Message Queue | Async events, decoupling |
| gRPC | High-performance internal calls |
| Event Sourcing | Audit trail, event-driven |

| Best Practice | Description |
|---------------|-------------|
| Single responsibility | One service per business domain |
| Database per service | Avoid shared databases |
| Health checks | Monitor service availability |
| Circuit breaker | Handle service failures |
| Distributed tracing | Track requests across services |
| Centralized logging | Aggregate logs from all services |
