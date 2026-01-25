# How to Configure Test Data Generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Test Data, Data Generation, Testing, Faker, Factory Pattern, Test Automation

Description: Learn how to generate realistic test data using factories and faker libraries to create maintainable, reproducible test suites.

---

Good tests need good data. Hardcoding test values creates brittle tests that break when requirements change. Copy-pasting production data raises privacy concerns and creates inconsistent test results. Test data generation solves these problems by creating realistic, reproducible data on demand.

## Why Generate Test Data?

Manual test data has problems:
- Hardcoded values hide what matters in tests
- Production data contains PII (privacy risk)
- Incomplete data misses edge cases
- Maintenance burden as schemas change

Generated data provides:
- Realistic values that match production patterns
- Privacy-safe synthetic data
- Easy creation of edge cases
- Automatic updates when schemas change

## Using Faker Libraries

### JavaScript with @faker-js/faker

```bash
npm install --save-dev @faker-js/faker
```

Basic usage:

```javascript
// test/factories/user.factory.js
const { faker } = require('@faker-js/faker');

function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country()
    },
    createdAt: faker.date.past(),
    ...overrides  // Allow overriding specific fields
  };
}

// Usage in tests
const user = createUser();
const adminUser = createUser({ role: 'admin' });
const users = Array.from({ length: 10 }, () => createUser());
```

### Python with Faker

```bash
pip install faker
```

```python
# test/factories/user_factory.py
from faker import Faker
from datetime import datetime, timedelta
import random

fake = Faker()

def create_user(**overrides):
    user = {
        'id': fake.uuid4(),
        'first_name': fake.first_name(),
        'last_name': fake.last_name(),
        'email': fake.email(),
        'phone': fake.phone_number(),
        'address': {
            'street': fake.street_address(),
            'city': fake.city(),
            'state': fake.state(),
            'zip_code': fake.zipcode(),
            'country': fake.country()
        },
        'created_at': fake.date_time_between(
            start_date='-2y',
            end_date='now'
        )
    }
    user.update(overrides)
    return user

# Localized data
fake_de = Faker('de_DE')
german_user = {
    'name': fake_de.name(),
    'address': fake_de.address()
}
```

## Factory Patterns

### JavaScript Factory with Builder Pattern

```javascript
// factories/orderFactory.js
const { faker } = require('@faker-js/faker');

class OrderFactory {
  constructor() {
    this.order = {
      id: faker.string.uuid(),
      customerId: faker.string.uuid(),
      items: [],
      status: 'pending',
      createdAt: new Date(),
      shippingAddress: null,
      total: 0
    };
  }

  withCustomer(customerId) {
    this.order.customerId = customerId;
    return this;
  }

  withItems(count = 3) {
    this.order.items = Array.from({ length: count }, () => ({
      productId: faker.string.uuid(),
      name: faker.commerce.productName(),
      quantity: faker.number.int({ min: 1, max: 5 }),
      price: parseFloat(faker.commerce.price())
    }));
    this.calculateTotal();
    return this;
  }

  withStatus(status) {
    this.order.status = status;
    return this;
  }

  withShipping() {
    this.order.shippingAddress = {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode()
    };
    return this;
  }

  asCompleted() {
    this.order.status = 'completed';
    this.order.completedAt = faker.date.recent();
    return this;
  }

  asCancelled(reason = 'Customer request') {
    this.order.status = 'cancelled';
    this.order.cancelReason = reason;
    this.order.cancelledAt = faker.date.recent();
    return this;
  }

  calculateTotal() {
    this.order.total = this.order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  build() {
    return { ...this.order };
  }

  static create(overrides = {}) {
    const factory = new OrderFactory().withItems();
    return { ...factory.build(), ...overrides };
  }
}

// Usage
const simpleOrder = OrderFactory.create();
const completedOrder = new OrderFactory()
  .withItems(5)
  .withShipping()
  .asCompleted()
  .build();
```

### Python Factory with factory_boy

```bash
pip install factory_boy
```

```python
# factories.py
import factory
from factory import fuzzy
from datetime import datetime, timedelta
from models import User, Order, OrderItem

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Faker('uuid4')
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    created_at = factory.Faker('date_time_between', start_date='-2y')
    is_active = True

    class Params:
        # Traits for different user types
        admin = factory.Trait(
            role='admin',
            is_staff=True
        )
        inactive = factory.Trait(
            is_active=False,
            deactivated_at=factory.Faker('date_time_between', start_date='-1y')
        )

class OrderItemFactory(factory.Factory):
    class Meta:
        model = OrderItem

    product_id = factory.Faker('uuid4')
    name = factory.Faker('word')
    quantity = fuzzy.FuzzyInteger(1, 10)
    price = fuzzy.FuzzyDecimal(1.00, 100.00)

class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    id = factory.Faker('uuid4')
    customer = factory.SubFactory(UserFactory)
    status = 'pending'
    created_at = factory.LazyFunction(datetime.now)

    @factory.post_generation
    def items(self, create, extracted, **kwargs):
        if extracted:
            self.items = extracted
        else:
            self.items = OrderItemFactory.create_batch(3)

    class Params:
        completed = factory.Trait(
            status='completed',
            completed_at=factory.Faker('date_time_between', start_date='-30d')
        )

# Usage
user = UserFactory()
admin = UserFactory(admin=True)
order = OrderFactory(completed=True)
orders = OrderFactory.create_batch(10)
```

## Database Seeding

### Seeding with Knex.js

```javascript
// seeds/001_users.js
const { faker } = require('@faker-js/faker');

exports.seed = async function(knex) {
  // Clear existing data
  await knex('users').del();

  // Generate users
  const users = Array.from({ length: 100 }, () => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    created_at: faker.date.past()
  }));

  // Insert in batches
  await knex.batchInsert('users', users, 30);
};
```

```javascript
// seeds/002_orders.js
const { faker } = require('@faker-js/faker');

exports.seed = async function(knex) {
  await knex('orders').del();
  await knex('order_items').del();

  // Get user IDs
  const users = await knex('users').select('id');

  const orders = [];
  const orderItems = [];

  for (let i = 0; i < 500; i++) {
    const orderId = faker.string.uuid();
    const user = faker.helpers.arrayElement(users);

    orders.push({
      id: orderId,
      user_id: user.id,
      status: faker.helpers.arrayElement(['pending', 'shipped', 'delivered']),
      created_at: faker.date.past()
    });

    // Add 1-5 items per order
    const itemCount = faker.number.int({ min: 1, max: 5 });
    for (let j = 0; j < itemCount; j++) {
      orderItems.push({
        id: faker.string.uuid(),
        order_id: orderId,
        product_name: faker.commerce.productName(),
        quantity: faker.number.int({ min: 1, max: 3 }),
        price: parseFloat(faker.commerce.price())
      });
    }
  }

  await knex.batchInsert('orders', orders, 50);
  await knex.batchInsert('order_items', orderItems, 100);
};
```

Run seeds:

```bash
npx knex seed:run
```

## Reproducible Data

### Using Seeds for Deterministic Generation

```javascript
const { faker } = require('@faker-js/faker');

// Set seed for reproducible data
faker.seed(12345);

// These will always generate the same values
const user1 = {
  name: faker.person.fullName(),  // Always "John Smith"
  email: faker.internet.email()   // Always "john@example.com"
};

// Reset seed between test files
beforeEach(() => {
  faker.seed(Date.now());
});
```

### Snapshot-Based Test Data

```javascript
// fixtures/users.json - Generated once, committed to repo
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test User 1",
    "email": "test1@example.com"
  }
]
```

```javascript
// Generate fixtures script
const fs = require('fs');
const { createUser } = require('./factories/user.factory');

const users = Array.from({ length: 10 }, createUser);
fs.writeFileSync(
  'fixtures/users.json',
  JSON.stringify(users, null, 2)
);
```

## Edge Case Generation

```javascript
// factories/edgeCases.js
const { faker } = require('@faker-js/faker');

const edgeCaseStrings = {
  empty: '',
  whitespace: '   ',
  unicode: faker.string.sample(10) + 'emoji' + faker.internet.emoji(),
  veryLong: faker.string.alpha(10000),
  sqlInjection: "'; DROP TABLE users; --",
  xss: '<script>alert("xss")</script>',
  nullBytes: 'test\x00value',
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

const edgeCaseNumbers = {
  zero: 0,
  negative: -1,
  maxInt: Number.MAX_SAFE_INTEGER,
  minInt: Number.MIN_SAFE_INTEGER,
  float: 0.1 + 0.2,  // Floating point issues
  infinity: Infinity,
  nan: NaN
};

const edgeCaseDates = {
  epoch: new Date(0),
  y2k: new Date('2000-01-01'),
  future: new Date('2099-12-31'),
  leapYear: new Date('2024-02-29'),
  dstChange: new Date('2024-03-10T02:30:00')
};

function createUserWithEdgeCases() {
  return [
    createUser({ email: '' }),
    createUser({ name: edgeCaseStrings.veryLong }),
    createUser({ age: edgeCaseNumbers.negative }),
    createUser({ createdAt: edgeCaseDates.future })
  ];
}
```

## Integration Testing Data

```javascript
// test/integration/order.test.js
const { OrderFactory, UserFactory, ProductFactory } = require('../factories');
const { db } = require('../../src/database');

describe('Order Integration Tests', () => {
  let testUser;
  let testProducts;

  beforeAll(async () => {
    // Create test data in database
    testUser = await UserFactory.createInDb();
    testProducts = await ProductFactory.createBatchInDb(5);
  });

  afterAll(async () => {
    // Clean up test data
    await db('orders').where('user_id', testUser.id).del();
    await db('users').where('id', testUser.id).del();
    await db('products').whereIn('id', testProducts.map(p => p.id)).del();
  });

  test('creates order with products', async () => {
    const orderData = OrderFactory.create({
      userId: testUser.id,
      items: testProducts.slice(0, 2).map(p => ({
        productId: p.id,
        quantity: 2
      }))
    });

    const response = await api.post('/orders').send(orderData);

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(2);
  });
});
```

## Best Practices

1. Use factories instead of hardcoded values
2. Make data generation reproducible with seeds
3. Generate edge cases systematically
4. Clean up generated data after tests
5. Use realistic data that matches production patterns
6. Separate factory definitions from test logic
7. Version control fixture files
8. Document factory parameters

---

Test data generation transforms brittle, hardcoded tests into maintainable, comprehensive test suites. Factories provide a clean API for creating test objects. Faker libraries generate realistic values. Together, they make it easy to test happy paths and edge cases alike.
