# How to Handle Pricing and Discount Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, E-Commerce, Pricing, Discounts, Coupons, Caching

Description: A comprehensive guide to implementing pricing and discount caching with Redis for dynamic pricing, coupon validation, and promotional campaigns.

---

Pricing in e-commerce is complex - base prices, tiered pricing, promotional discounts, coupons, and personalized offers all need to be computed quickly. Redis provides the speed and data structures needed to cache pricing data and validate discounts in real-time.

## Understanding Pricing Challenges

E-commerce pricing involves:

- **Base pricing**: Product catalog prices
- **Dynamic pricing**: Time-based or demand-based adjustments
- **Promotional pricing**: Sales, flash deals, seasonal discounts
- **Coupon codes**: Single-use, multi-use, user-specific
- **Tiered pricing**: Volume discounts, membership tiers
- **Personalized pricing**: User-specific offers

## Product Price Cache

### Basic Price Caching

```python
import redis
import json
import time
from decimal import Decimal

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class PriceCache:
    def __init__(self, prefix='price', default_ttl=3600):
        self.prefix = prefix
        self.default_ttl = default_ttl

    def set_price(self, product_id, price_data, ttl=None):
        """
        Cache product price data.

        price_data: {
            'base_price': Decimal,
            'sale_price': Decimal (optional),
            'currency': str,
            'sale_start': timestamp (optional),
            'sale_end': timestamp (optional)
        }
        """
        key = f"{self.prefix}:{product_id}"
        ttl = ttl or self.default_ttl

        # Convert Decimal to string for JSON
        cache_data = {
            'base_price': str(price_data['base_price']),
            'sale_price': str(price_data.get('sale_price')) if price_data.get('sale_price') else None,
            'currency': price_data.get('currency', 'USD'),
            'sale_start': price_data.get('sale_start'),
            'sale_end': price_data.get('sale_end'),
            'cached_at': int(time.time())
        }

        r.setex(key, ttl, json.dumps(cache_data))

    def get_price(self, product_id):
        """Get current effective price for a product."""
        key = f"{self.prefix}:{product_id}"
        data = r.get(key)

        if not data:
            return None

        price_data = json.loads(data)
        current_time = int(time.time())

        # Check if sale is active
        sale_active = False
        if price_data.get('sale_price'):
            sale_start = price_data.get('sale_start', 0)
            sale_end = price_data.get('sale_end', float('inf'))

            if sale_start <= current_time <= sale_end:
                sale_active = True

        return {
            'base_price': Decimal(price_data['base_price']),
            'sale_price': Decimal(price_data['sale_price']) if price_data['sale_price'] else None,
            'current_price': Decimal(price_data['sale_price']) if sale_active else Decimal(price_data['base_price']),
            'currency': price_data['currency'],
            'on_sale': sale_active
        }

    def get_prices_bulk(self, product_ids):
        """Get prices for multiple products efficiently."""
        pipe = r.pipeline()
        for pid in product_ids:
            pipe.get(f"{self.prefix}:{pid}")

        results = pipe.execute()

        prices = {}
        for pid, data in zip(product_ids, results):
            if data:
                # Parse and return (simplified)
                price_data = json.loads(data)
                prices[pid] = {
                    'base_price': Decimal(price_data['base_price']),
                    'current_price': Decimal(price_data.get('sale_price') or price_data['base_price'])
                }

        return prices

    def invalidate_price(self, product_id):
        """Invalidate cached price."""
        r.delete(f"{self.prefix}:{product_id}")

    def invalidate_all(self):
        """Invalidate all cached prices."""
        keys = r.keys(f"{self.prefix}:*")
        if keys:
            r.delete(*keys)

# Usage
cache = PriceCache()

# Cache product price
cache.set_price('prod_001', {
    'base_price': Decimal('99.99'),
    'sale_price': Decimal('79.99'),
    'currency': 'USD',
    'sale_start': int(time.time()),
    'sale_end': int(time.time()) + 86400 * 7  # 7 days
})

# Get price
price = cache.get_price('prod_001')
print(f"Current price: {price['current_price']} (on sale: {price['on_sale']})")

# Bulk fetch
prices = cache.get_prices_bulk(['prod_001', 'prod_002', 'prod_003'])
print(f"Bulk prices: {prices}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const Decimal = require('decimal.js');

const redis = new Redis();

class PriceCache {
  constructor(prefix = 'price', defaultTTL = 3600) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  async setPrice(productId, priceData, ttl = null) {
    const key = `${this.prefix}:${productId}`;
    const expiry = ttl || this.defaultTTL;

    const cacheData = {
      base_price: priceData.basePrice.toString(),
      sale_price: priceData.salePrice ? priceData.salePrice.toString() : null,
      currency: priceData.currency || 'USD',
      sale_start: priceData.saleStart,
      sale_end: priceData.saleEnd,
      cached_at: Math.floor(Date.now() / 1000)
    };

    await redis.setex(key, expiry, JSON.stringify(cacheData));
  }

  async getPrice(productId) {
    const key = `${this.prefix}:${productId}`;
    const data = await redis.get(key);

    if (!data) return null;

    const priceData = JSON.parse(data);
    const currentTime = Math.floor(Date.now() / 1000);

    let saleActive = false;
    if (priceData.sale_price) {
      const saleStart = priceData.sale_start || 0;
      const saleEnd = priceData.sale_end || Infinity;
      saleActive = saleStart <= currentTime && currentTime <= saleEnd;
    }

    return {
      basePrice: new Decimal(priceData.base_price),
      salePrice: priceData.sale_price ? new Decimal(priceData.sale_price) : null,
      currentPrice: saleActive
        ? new Decimal(priceData.sale_price)
        : new Decimal(priceData.base_price),
      currency: priceData.currency,
      onSale: saleActive
    };
  }

  async getPricesBulk(productIds) {
    const pipeline = redis.pipeline();
    for (const pid of productIds) {
      pipeline.get(`${this.prefix}:${pid}`);
    }

    const results = await pipeline.exec();
    const prices = {};

    for (let i = 0; i < productIds.length; i++) {
      const [err, data] = results[i];
      if (data) {
        const priceData = JSON.parse(data);
        prices[productIds[i]] = {
          basePrice: new Decimal(priceData.base_price),
          currentPrice: new Decimal(priceData.sale_price || priceData.base_price)
        };
      }
    }

    return prices;
  }
}

// Usage
async function example() {
  const cache = new PriceCache();

  await cache.setPrice('prod_001', {
    basePrice: new Decimal('99.99'),
    salePrice: new Decimal('79.99'),
    currency: 'USD',
    saleStart: Math.floor(Date.now() / 1000),
    saleEnd: Math.floor(Date.now() / 1000) + 86400 * 7
  });

  const price = await cache.getPrice('prod_001');
  console.log('Price:', price);
}

example().catch(console.error);
```

## Coupon and Discount Validation

### Coupon System

```python
import secrets

class CouponService:
    def __init__(self, prefix='coupon'):
        self.prefix = prefix

    def create_coupon(self, code, config):
        """
        Create a coupon code.

        config: {
            'discount_type': 'percentage' | 'fixed',
            'discount_value': Decimal,
            'min_purchase': Decimal (optional),
            'max_discount': Decimal (optional for percentage),
            'max_uses': int (optional, None for unlimited),
            'max_uses_per_user': int (optional),
            'valid_from': timestamp,
            'valid_until': timestamp,
            'product_ids': list (optional, for product-specific),
            'category_ids': list (optional),
            'user_ids': list (optional, for user-specific)
        }
        """
        key = f"{self.prefix}:{code.upper()}"

        coupon_data = {
            'code': code.upper(),
            'discount_type': config['discount_type'],
            'discount_value': str(config['discount_value']),
            'min_purchase': str(config.get('min_purchase', 0)),
            'max_discount': str(config.get('max_discount')) if config.get('max_discount') else None,
            'max_uses': config.get('max_uses'),
            'max_uses_per_user': config.get('max_uses_per_user', 1),
            'valid_from': config.get('valid_from', int(time.time())),
            'valid_until': config['valid_until'],
            'product_ids': json.dumps(config.get('product_ids', [])),
            'category_ids': json.dumps(config.get('category_ids', [])),
            'user_ids': json.dumps(config.get('user_ids', [])),
            'uses': 0,
            'active': 'true',
            'created_at': int(time.time())
        }

        r.hset(key, mapping=coupon_data)

        # Set expiration
        ttl = config['valid_until'] - int(time.time()) + 86400  # Extra day for cleanup
        r.expire(key, max(ttl, 1))

        return code.upper()

    def validate_coupon(self, code, user_id, cart_total, product_ids=None, category_ids=None):
        """Validate a coupon for a user and cart."""
        key = f"{self.prefix}:{code.upper()}"
        coupon = r.hgetall(key)

        if not coupon:
            return {'valid': False, 'error': 'INVALID_CODE'}

        if coupon.get('active') != 'true':
            return {'valid': False, 'error': 'COUPON_INACTIVE'}

        current_time = int(time.time())

        # Check validity period
        if current_time < int(coupon.get('valid_from', 0)):
            return {'valid': False, 'error': 'NOT_YET_VALID'}

        if current_time > int(coupon.get('valid_until', 0)):
            return {'valid': False, 'error': 'EXPIRED'}

        # Check minimum purchase
        min_purchase = Decimal(coupon.get('min_purchase', 0))
        if cart_total < min_purchase:
            return {
                'valid': False,
                'error': 'MIN_PURCHASE_NOT_MET',
                'min_purchase': min_purchase
            }

        # Check total usage limit
        max_uses = coupon.get('max_uses')
        if max_uses and int(coupon.get('uses', 0)) >= int(max_uses):
            return {'valid': False, 'error': 'USAGE_LIMIT_REACHED'}

        # Check user-specific usage
        user_uses = r.get(f"{self.prefix}:user_uses:{code.upper()}:{user_id}")
        max_user_uses = int(coupon.get('max_uses_per_user', 1))
        if user_uses and int(user_uses) >= max_user_uses:
            return {'valid': False, 'error': 'USER_LIMIT_REACHED'}

        # Check user restriction
        allowed_users = json.loads(coupon.get('user_ids', '[]'))
        if allowed_users and user_id not in allowed_users:
            return {'valid': False, 'error': 'USER_NOT_ELIGIBLE'}

        # Check product restriction
        allowed_products = json.loads(coupon.get('product_ids', '[]'))
        if allowed_products and product_ids:
            if not any(p in allowed_products for p in product_ids):
                return {'valid': False, 'error': 'PRODUCTS_NOT_ELIGIBLE'}

        # Calculate discount
        discount = self._calculate_discount(coupon, cart_total)

        return {
            'valid': True,
            'discount_type': coupon['discount_type'],
            'discount_value': Decimal(coupon['discount_value']),
            'discount_amount': discount,
            'final_total': cart_total - discount
        }

    def _calculate_discount(self, coupon, cart_total):
        """Calculate the discount amount."""
        discount_type = coupon['discount_type']
        discount_value = Decimal(coupon['discount_value'])

        if discount_type == 'percentage':
            discount = cart_total * (discount_value / 100)
            max_discount = coupon.get('max_discount')
            if max_discount:
                discount = min(discount, Decimal(max_discount))
        else:  # fixed
            discount = min(discount_value, cart_total)

        return discount

    def apply_coupon(self, code, user_id, order_id):
        """Apply a coupon (record usage)."""
        key = f"{self.prefix}:{code.upper()}"
        user_key = f"{self.prefix}:user_uses:{code.upper()}:{user_id}"

        lua_script = """
        local key = KEYS[1]
        local user_key = KEYS[2]
        local max_uses = tonumber(redis.call('HGET', key, 'max_uses'))
        local max_user_uses = tonumber(redis.call('HGET', key, 'max_uses_per_user') or 1)
        local current_uses = tonumber(redis.call('HGET', key, 'uses') or 0)
        local user_uses = tonumber(redis.call('GET', user_key) or 0)

        -- Check limits again atomically
        if max_uses and current_uses >= max_uses then
            return 'USAGE_LIMIT'
        end

        if user_uses >= max_user_uses then
            return 'USER_LIMIT'
        end

        -- Increment usage
        redis.call('HINCRBY', key, 'uses', 1)
        redis.call('INCR', user_key)
        redis.call('EXPIRE', user_key, 86400 * 365)

        return 'SUCCESS'
        """

        result = r.eval(lua_script, 2, key, user_key)

        if result == 'SUCCESS':
            # Track order-coupon mapping
            r.hset(f"{self.prefix}:orders", order_id, code.upper())
            return True

        return False

    def deactivate_coupon(self, code):
        """Deactivate a coupon."""
        key = f"{self.prefix}:{code.upper()}"
        r.hset(key, 'active', 'false')

# Usage
coupons = CouponService()

# Create a percentage discount coupon
coupons.create_coupon('SUMMER20', {
    'discount_type': 'percentage',
    'discount_value': Decimal('20'),
    'min_purchase': Decimal('50'),
    'max_discount': Decimal('100'),
    'max_uses': 1000,
    'max_uses_per_user': 1,
    'valid_from': int(time.time()),
    'valid_until': int(time.time()) + 86400 * 30
})

# Validate coupon
result = coupons.validate_coupon(
    'SUMMER20',
    'user_123',
    cart_total=Decimal('150.00')
)
print(f"Validation result: {result}")

# Apply coupon after payment
if result['valid']:
    applied = coupons.apply_coupon('SUMMER20', 'user_123', 'order_456')
    print(f"Coupon applied: {applied}")
```

## Tiered Pricing

```python
class TieredPricingCache:
    def __init__(self, prefix='tiered_price'):
        self.prefix = prefix

    def set_tiered_prices(self, product_id, tiers, ttl=3600):
        """
        Set tiered pricing for a product.

        tiers: [
            {'min_qty': 1, 'max_qty': 9, 'price': Decimal('19.99')},
            {'min_qty': 10, 'max_qty': 49, 'price': Decimal('17.99')},
            {'min_qty': 50, 'max_qty': None, 'price': Decimal('14.99')}
        ]
        """
        key = f"{self.prefix}:{product_id}"

        # Sort tiers by min_qty
        sorted_tiers = sorted(tiers, key=lambda x: x['min_qty'])

        tier_data = [
            {
                'min_qty': t['min_qty'],
                'max_qty': t['max_qty'],
                'price': str(t['price'])
            }
            for t in sorted_tiers
        ]

        r.setex(key, ttl, json.dumps(tier_data))

    def get_price_for_quantity(self, product_id, quantity):
        """Get the price for a specific quantity."""
        key = f"{self.prefix}:{product_id}"
        data = r.get(key)

        if not data:
            return None

        tiers = json.loads(data)

        for tier in tiers:
            min_qty = tier['min_qty']
            max_qty = tier['max_qty']

            if quantity >= min_qty and (max_qty is None or quantity <= max_qty):
                return {
                    'unit_price': Decimal(tier['price']),
                    'total_price': Decimal(tier['price']) * quantity,
                    'tier': tier
                }

        return None

    def get_all_tiers(self, product_id):
        """Get all pricing tiers for a product."""
        key = f"{self.prefix}:{product_id}"
        data = r.get(key)

        if not data:
            return None

        tiers = json.loads(data)
        return [
            {
                'min_qty': t['min_qty'],
                'max_qty': t['max_qty'],
                'price': Decimal(t['price'])
            }
            for t in tiers
        ]

# Usage
tiered = TieredPricingCache()

# Set tiered pricing
tiered.set_tiered_prices('prod_001', [
    {'min_qty': 1, 'max_qty': 9, 'price': Decimal('19.99')},
    {'min_qty': 10, 'max_qty': 49, 'price': Decimal('17.99')},
    {'min_qty': 50, 'max_qty': 99, 'price': Decimal('14.99')},
    {'min_qty': 100, 'max_qty': None, 'price': Decimal('12.99')}
])

# Get price for quantity
price = tiered.get_price_for_quantity('prod_001', 25)
print(f"Price for 25 units: {price}")
```

## Membership/Tier-Based Pricing

```python
class MembershipPricingService:
    def __init__(self, prefix='member_pricing'):
        self.prefix = prefix

    def set_member_discount(self, tier, discount_percentage, categories=None):
        """Set discount for a membership tier."""
        key = f"{self.prefix}:tier:{tier}"

        data = {
            'discount_percentage': str(discount_percentage),
            'categories': json.dumps(categories or [])  # Empty = all categories
        }

        r.hset(key, mapping=data)

    def get_member_price(self, user_tier, product_id, base_price, category_id=None):
        """Get the member price for a product."""
        if not user_tier:
            return {'price': base_price, 'discount': Decimal('0')}

        key = f"{self.prefix}:tier:{user_tier}"
        tier_data = r.hgetall(key)

        if not tier_data:
            return {'price': base_price, 'discount': Decimal('0')}

        # Check category restriction
        allowed_categories = json.loads(tier_data.get('categories', '[]'))
        if allowed_categories and category_id not in allowed_categories:
            return {'price': base_price, 'discount': Decimal('0')}

        discount_pct = Decimal(tier_data['discount_percentage'])
        discount_amount = base_price * (discount_pct / 100)
        member_price = base_price - discount_amount

        return {
            'price': member_price,
            'discount': discount_amount,
            'discount_percentage': discount_pct
        }

# Usage
membership = MembershipPricingService()

# Set tier discounts
membership.set_member_discount('gold', Decimal('10'))
membership.set_member_discount('platinum', Decimal('15'))
membership.set_member_discount('vip', Decimal('20'))

# Get member price
price = membership.get_member_price(
    'gold',
    'prod_001',
    base_price=Decimal('99.99')
)
print(f"Gold member price: {price}")
```

## Complete Pricing Engine

```python
class PricingEngine:
    def __init__(self):
        self.price_cache = PriceCache()
        self.coupon_service = CouponService()
        self.tiered_pricing = TieredPricingCache()
        self.membership_pricing = MembershipPricingService()

    def calculate_cart_total(self, user_id, user_tier, cart_items, coupon_code=None):
        """
        Calculate complete cart total with all discounts.

        cart_items: [
            {'product_id': str, 'quantity': int, 'category_id': str}
        ]
        """
        line_items = []
        subtotal = Decimal('0')

        for item in cart_items:
            product_id = item['product_id']
            quantity = item['quantity']
            category_id = item.get('category_id')

            # Get base price
            price_data = self.price_cache.get_price(product_id)
            if not price_data:
                continue

            base_price = price_data['current_price']

            # Check tiered pricing
            tiered_price = self.tiered_pricing.get_price_for_quantity(product_id, quantity)
            if tiered_price:
                base_price = tiered_price['unit_price']

            # Apply membership discount
            member_price = self.membership_pricing.get_member_price(
                user_tier, product_id, base_price, category_id
            )

            line_total = member_price['price'] * quantity

            line_items.append({
                'product_id': product_id,
                'quantity': quantity,
                'unit_price': member_price['price'],
                'line_total': line_total,
                'discounts_applied': {
                    'sale': price_data['on_sale'],
                    'tiered': tiered_price is not None,
                    'membership': member_price['discount'] > 0
                }
            })

            subtotal += line_total

        # Apply coupon if provided
        coupon_discount = Decimal('0')
        if coupon_code:
            product_ids = [item['product_id'] for item in cart_items]
            coupon_result = self.coupon_service.validate_coupon(
                coupon_code, user_id, subtotal, product_ids
            )

            if coupon_result['valid']:
                coupon_discount = coupon_result['discount_amount']

        final_total = subtotal - coupon_discount

        return {
            'line_items': line_items,
            'subtotal': subtotal,
            'coupon_discount': coupon_discount,
            'coupon_code': coupon_code if coupon_discount > 0 else None,
            'final_total': final_total
        }

# Usage
engine = PricingEngine()

# Calculate cart
result = engine.calculate_cart_total(
    user_id='user_123',
    user_tier='gold',
    cart_items=[
        {'product_id': 'prod_001', 'quantity': 2, 'category_id': 'electronics'},
        {'product_id': 'prod_002', 'quantity': 5, 'category_id': 'clothing'}
    ],
    coupon_code='SUMMER20'
)

print(f"Cart calculation: {result}")
```

## Best Practices

### 1. Cache Invalidation Strategy

```python
def invalidate_product_prices(product_ids):
    """Invalidate prices when products are updated."""
    pipe = r.pipeline()
    for pid in product_ids:
        pipe.delete(f"price:{pid}")
        pipe.delete(f"tiered_price:{pid}")
    pipe.execute()
```

### 2. Handle Currency Properly

```python
from decimal import Decimal, ROUND_HALF_UP

def format_price(amount, currency='USD'):
    """Format price with proper rounding."""
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

### 3. Audit Discount Usage

```python
def log_discount_applied(order_id, discount_type, discount_amount, details):
    """Log discount for auditing."""
    log_entry = {
        'order_id': order_id,
        'type': discount_type,
        'amount': str(discount_amount),
        'details': json.dumps(details),
        'timestamp': int(time.time())
    }
    r.lpush('discount_audit_log', json.dumps(log_entry))
    r.ltrim('discount_audit_log', 0, 99999)
```

## Conclusion

Implementing pricing and discount caching with Redis enables fast, flexible e-commerce pricing. Key takeaways:

- Cache product prices with sale period awareness
- Implement atomic coupon validation and usage tracking
- Support tiered pricing for volume discounts
- Layer membership discounts with other promotions
- Build a comprehensive pricing engine for cart calculation
- Maintain audit trails for discounts

Redis's speed and atomic operations make it ideal for real-time pricing calculations, ensuring customers see accurate prices while promotional rules are correctly enforced.
