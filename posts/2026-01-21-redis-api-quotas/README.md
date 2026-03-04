# How to Implement API Quotas with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, API, Quotas, Rate Limiting, Usage Tracking, SaaS

Description: A comprehensive guide to implementing API quotas with Redis for daily, monthly, and custom billing period limits, including usage tracking, overage handling, and quota management.

---

API quotas are essential for SaaS applications, ensuring fair usage, preventing abuse, and enabling tiered pricing models. Unlike simple rate limiting that controls request frequency, quotas track total usage over longer periods like days or months. Redis provides the ideal foundation for implementing quota systems with its atomic operations and expiring keys.

## Quotas vs Rate Limits

| Aspect | Rate Limiting | Quotas |
|--------|--------------|--------|
| Time Period | Seconds/Minutes | Days/Months |
| Purpose | Prevent bursts | Control total usage |
| Reset | Sliding/Rolling | Fixed period end |
| Typical Limits | 100/minute | 10,000/month |
| Overage | Block/Retry | Bill or block |

## Basic Quota Implementation

```python
import redis
import time
from datetime import datetime, timedelta
from typing import Tuple, Dict, Optional
from dataclasses import dataclass
from enum import Enum

class QuotaPeriod(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

@dataclass
class QuotaConfig:
    limit: int
    period: QuotaPeriod
    allow_overage: bool = False
    overage_rate: float = 0.0  # Cost per request over quota

@dataclass
class QuotaStatus:
    allowed: bool
    limit: int
    used: int
    remaining: int
    reset_at: datetime
    overage: int = 0
    overage_cost: float = 0.0

class RedisQuotaManager:
    """Manage API quotas with Redis."""

    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis = redis.from_url(redis_url, decode_responses=True)

    def _get_period_key(self, user_id: str, period: QuotaPeriod) -> Tuple[str, int]:
        """Generate period-specific key and TTL."""
        now = datetime.utcnow()

        if period == QuotaPeriod.DAILY:
            period_id = now.strftime('%Y%m%d')
            # Expires at end of day + buffer
            tomorrow = (now + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            ttl = int((tomorrow - now).total_seconds()) + 3600

        elif period == QuotaPeriod.WEEKLY:
            # Week starts on Monday
            week_start = now - timedelta(days=now.weekday())
            period_id = week_start.strftime('%Y%W')
            next_week = week_start + timedelta(weeks=1)
            ttl = int((next_week - now).total_seconds()) + 3600

        elif period == QuotaPeriod.MONTHLY:
            period_id = now.strftime('%Y%m')
            # First day of next month
            if now.month == 12:
                next_month = now.replace(year=now.year + 1, month=1, day=1)
            else:
                next_month = now.replace(month=now.month + 1, day=1)
            next_month = next_month.replace(hour=0, minute=0, second=0, microsecond=0)
            ttl = int((next_month - now).total_seconds()) + 3600

        elif period == QuotaPeriod.YEARLY:
            period_id = now.strftime('%Y')
            next_year = now.replace(year=now.year + 1, month=1, day=1,
                                    hour=0, minute=0, second=0, microsecond=0)
            ttl = int((next_year - now).total_seconds()) + 3600

        key = f"quota:{user_id}:{period.value}:{period_id}"
        return key, ttl

    def _get_reset_time(self, period: QuotaPeriod) -> datetime:
        """Calculate when the quota resets."""
        now = datetime.utcnow()

        if period == QuotaPeriod.DAILY:
            return (now + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        elif period == QuotaPeriod.WEEKLY:
            days_until_monday = (7 - now.weekday()) % 7 or 7
            return (now + timedelta(days=days_until_monday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        elif period == QuotaPeriod.MONTHLY:
            if now.month == 12:
                return now.replace(year=now.year + 1, month=1, day=1,
                                   hour=0, minute=0, second=0, microsecond=0)
            return now.replace(month=now.month + 1, day=1,
                              hour=0, minute=0, second=0, microsecond=0)
        elif period == QuotaPeriod.YEARLY:
            return now.replace(year=now.year + 1, month=1, day=1,
                              hour=0, minute=0, second=0, microsecond=0)

    def check_and_increment(self, user_id: str,
                            config: QuotaConfig,
                            amount: int = 1) -> QuotaStatus:
        """Check quota and increment usage if allowed."""
        key, ttl = self._get_period_key(user_id, config.period)
        reset_at = self._get_reset_time(config.period)

        # Atomic increment and check
        pipe = self.redis.pipeline()
        pipe.incrby(key, amount)
        pipe.expire(key, ttl)
        results = pipe.execute()

        current_usage = results[0]
        previous_usage = current_usage - amount

        # Calculate status
        if current_usage <= config.limit:
            return QuotaStatus(
                allowed=True,
                limit=config.limit,
                used=current_usage,
                remaining=config.limit - current_usage,
                reset_at=reset_at
            )
        elif config.allow_overage:
            overage = current_usage - config.limit
            overage_cost = overage * config.overage_rate
            return QuotaStatus(
                allowed=True,
                limit=config.limit,
                used=current_usage,
                remaining=0,
                reset_at=reset_at,
                overage=overage,
                overage_cost=overage_cost
            )
        else:
            # Rollback the increment
            self.redis.decrby(key, amount)
            return QuotaStatus(
                allowed=False,
                limit=config.limit,
                used=previous_usage,
                remaining=0,
                reset_at=reset_at
            )

    def get_usage(self, user_id: str, period: QuotaPeriod) -> int:
        """Get current usage for a period."""
        key, _ = self._get_period_key(user_id, period)
        usage = self.redis.get(key)
        return int(usage) if usage else 0

    def get_status(self, user_id: str, config: QuotaConfig) -> QuotaStatus:
        """Get quota status without incrementing."""
        used = self.get_usage(user_id, config.period)
        reset_at = self._get_reset_time(config.period)

        return QuotaStatus(
            allowed=used < config.limit or config.allow_overage,
            limit=config.limit,
            used=used,
            remaining=max(0, config.limit - used),
            reset_at=reset_at,
            overage=max(0, used - config.limit),
            overage_cost=max(0, used - config.limit) * config.overage_rate
        )

    def reset_quota(self, user_id: str, period: QuotaPeriod):
        """Reset a user's quota (admin action)."""
        key, _ = self._get_period_key(user_id, period)
        self.redis.delete(key)

    def set_usage(self, user_id: str, period: QuotaPeriod, amount: int):
        """Set usage to a specific value (admin action)."""
        key, ttl = self._get_period_key(user_id, period)
        self.redis.set(key, amount, ex=ttl)


class TieredQuotaManager:
    """Manage quotas with different tiers/plans."""

    PLANS = {
        'free': {
            'daily_requests': QuotaConfig(100, QuotaPeriod.DAILY),
            'monthly_requests': QuotaConfig(1000, QuotaPeriod.MONTHLY),
            'monthly_storage_mb': QuotaConfig(100, QuotaPeriod.MONTHLY),
        },
        'starter': {
            'daily_requests': QuotaConfig(1000, QuotaPeriod.DAILY),
            'monthly_requests': QuotaConfig(50000, QuotaPeriod.MONTHLY),
            'monthly_storage_mb': QuotaConfig(1000, QuotaPeriod.MONTHLY),
        },
        'pro': {
            'daily_requests': QuotaConfig(10000, QuotaPeriod.DAILY),
            'monthly_requests': QuotaConfig(500000, QuotaPeriod.MONTHLY,
                                           allow_overage=True, overage_rate=0.001),
            'monthly_storage_mb': QuotaConfig(10000, QuotaPeriod.MONTHLY),
        },
        'enterprise': {
            'daily_requests': QuotaConfig(100000, QuotaPeriod.DAILY),
            'monthly_requests': QuotaConfig(5000000, QuotaPeriod.MONTHLY,
                                           allow_overage=True, overage_rate=0.0005),
            'monthly_storage_mb': QuotaConfig(100000, QuotaPeriod.MONTHLY),
        },
    }

    def __init__(self, redis_url='redis://localhost:6379'):
        self.quota_manager = RedisQuotaManager(redis_url)
        self.redis = redis.from_url(redis_url, decode_responses=True)

    def get_user_plan(self, user_id: str) -> str:
        """Get user's current plan."""
        plan = self.redis.hget(f"user:{user_id}", 'plan')
        return plan or 'free'

    def set_user_plan(self, user_id: str, plan: str):
        """Set user's plan."""
        if plan not in self.PLANS:
            raise ValueError(f"Invalid plan: {plan}")
        self.redis.hset(f"user:{user_id}", 'plan', plan)

    def check_quota(self, user_id: str, quota_type: str,
                    amount: int = 1) -> QuotaStatus:
        """Check if user can perform action within their plan quota."""
        plan = self.get_user_plan(user_id)
        plan_quotas = self.PLANS.get(plan, self.PLANS['free'])

        if quota_type not in plan_quotas:
            raise ValueError(f"Invalid quota type: {quota_type}")

        config = plan_quotas[quota_type]
        return self.quota_manager.check_and_increment(
            f"{user_id}:{quota_type}",
            config,
            amount
        )

    def get_all_quotas(self, user_id: str) -> Dict[str, QuotaStatus]:
        """Get status of all quotas for a user."""
        plan = self.get_user_plan(user_id)
        plan_quotas = self.PLANS.get(plan, self.PLANS['free'])

        statuses = {}
        for quota_type, config in plan_quotas.items():
            statuses[quota_type] = self.quota_manager.get_status(
                f"{user_id}:{quota_type}",
                config
            )
        return statuses


# Usage tracking for billing
class UsageTracker:
    """Track detailed usage for billing purposes."""

    def __init__(self, redis_url='redis://localhost:6379'):
        self.redis = redis.from_url(redis_url, decode_responses=True)

    def record_usage(self, user_id: str, resource: str,
                     amount: int = 1, metadata: Dict = None):
        """Record usage event for billing."""
        now = datetime.utcnow()
        month_key = f"usage:{user_id}:{resource}:{now.strftime('%Y%m')}"
        day_key = f"usage:{user_id}:{resource}:{now.strftime('%Y%m%d')}"

        pipe = self.redis.pipeline()

        # Increment counters
        pipe.incrby(month_key, amount)
        pipe.incrby(day_key, amount)

        # Set expiration (keep for billing period + buffer)
        pipe.expire(month_key, 45 * 24 * 3600)  # 45 days
        pipe.expire(day_key, 35 * 24 * 3600)    # 35 days

        # Store detailed event if metadata provided
        if metadata:
            event_key = f"usage_events:{user_id}:{now.strftime('%Y%m')}"
            event = {
                'resource': resource,
                'amount': amount,
                'timestamp': now.isoformat(),
                **metadata
            }
            pipe.lpush(event_key, json.dumps(event))
            pipe.ltrim(event_key, 0, 9999)  # Keep last 10000 events
            pipe.expire(event_key, 45 * 24 * 3600)

        pipe.execute()

    def get_monthly_usage(self, user_id: str, resource: str,
                          year: int = None, month: int = None) -> int:
        """Get usage for a specific month."""
        now = datetime.utcnow()
        year = year or now.year
        month = month or now.month

        key = f"usage:{user_id}:{resource}:{year:04d}{month:02d}"
        usage = self.redis.get(key)
        return int(usage) if usage else 0

    def get_daily_usage(self, user_id: str, resource: str,
                        date: datetime = None) -> int:
        """Get usage for a specific day."""
        date = date or datetime.utcnow()
        key = f"usage:{user_id}:{resource}:{date.strftime('%Y%m%d')}"
        usage = self.redis.get(key)
        return int(usage) if usage else 0

    def get_usage_breakdown(self, user_id: str, resource: str,
                            year: int, month: int) -> Dict[str, int]:
        """Get daily breakdown for a month."""
        pattern = f"usage:{user_id}:{resource}:{year:04d}{month:02d}*"
        keys = self.redis.keys(pattern)

        breakdown = {}
        if keys:
            values = self.redis.mget(keys)
            for key, value in zip(keys, values):
                day = key.split(':')[-1]
                breakdown[day] = int(value) if value else 0

        return breakdown
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');

class QuotaPeriod {
    static DAILY = 'daily';
    static WEEKLY = 'weekly';
    static MONTHLY = 'monthly';
    static YEARLY = 'yearly';
}

class QuotaManager {
    constructor(redisUrl = 'redis://localhost:6379') {
        this.redis = new Redis(redisUrl);
    }

    _getPeriodKey(userId, period) {
        const now = new Date();
        let periodId, ttl;

        switch (period) {
            case QuotaPeriod.DAILY:
                periodId = now.toISOString().slice(0, 10).replace(/-/g, '');
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                ttl = Math.ceil((tomorrow - now) / 1000) + 3600;
                break;

            case QuotaPeriod.MONTHLY:
                periodId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                ttl = Math.ceil((nextMonth - now) / 1000) + 3600;
                break;

            default:
                throw new Error(`Unsupported period: ${period}`);
        }

        return {
            key: `quota:${userId}:${period}:${periodId}`,
            ttl
        };
    }

    _getResetTime(period) {
        const now = new Date();

        switch (period) {
            case QuotaPeriod.DAILY:
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                return tomorrow;

            case QuotaPeriod.MONTHLY:
                return new Date(now.getFullYear(), now.getMonth() + 1, 1);

            default:
                throw new Error(`Unsupported period: ${period}`);
        }
    }

    async checkAndIncrement(userId, config, amount = 1) {
        const { key, ttl } = this._getPeriodKey(userId, config.period);
        const resetAt = this._getResetTime(config.period);

        const pipe = this.redis.pipeline();
        pipe.incrby(key, amount);
        pipe.expire(key, ttl);
        const results = await pipe.exec();

        const currentUsage = results[0][1];
        const previousUsage = currentUsage - amount;

        if (currentUsage <= config.limit) {
            return {
                allowed: true,
                limit: config.limit,
                used: currentUsage,
                remaining: config.limit - currentUsage,
                resetAt
            };
        } else if (config.allowOverage) {
            const overage = currentUsage - config.limit;
            return {
                allowed: true,
                limit: config.limit,
                used: currentUsage,
                remaining: 0,
                resetAt,
                overage,
                overageCost: overage * (config.overageRate || 0)
            };
        } else {
            await this.redis.decrby(key, amount);
            return {
                allowed: false,
                limit: config.limit,
                used: previousUsage,
                remaining: 0,
                resetAt
            };
        }
    }

    async getUsage(userId, period) {
        const { key } = this._getPeriodKey(userId, period);
        const usage = await this.redis.get(key);
        return parseInt(usage) || 0;
    }

    async close() {
        await this.redis.quit();
    }
}

// Express middleware
function quotaMiddleware(quotaManager, config, keyExtractor) {
    return async (req, res, next) => {
        const userId = keyExtractor(req);

        try {
            const status = await quotaManager.checkAndIncrement(userId, config);

            res.set({
                'X-Quota-Limit': status.limit,
                'X-Quota-Used': status.used,
                'X-Quota-Remaining': status.remaining,
                'X-Quota-Reset': status.resetAt.toISOString()
            });

            if (!status.allowed) {
                return res.status(429).json({
                    error: 'Quota Exceeded',
                    message: `You have exceeded your ${config.period} quota`,
                    limit: status.limit,
                    used: status.used,
                    resetAt: status.resetAt
                });
            }

            req.quotaStatus = status;
            next();
        } catch (error) {
            console.error('Quota check error:', error);
            next(); // Fail open
        }
    };
}

// Usage
const express = require('express');
const app = express();

const quotaManager = new QuotaManager();

const monthlyQuotaConfig = {
    limit: 10000,
    period: QuotaPeriod.MONTHLY,
    allowOverage: false
};

app.use('/api', quotaMiddleware(
    quotaManager,
    monthlyQuotaConfig,
    (req) => req.headers['x-api-key'] || req.ip
));
```

## Billing Integration

```python
import json
from decimal import Decimal
from datetime import datetime

class BillingIntegration:
    """Integrate quota system with billing."""

    def __init__(self, quota_manager: TieredQuotaManager,
                 usage_tracker: UsageTracker):
        self.quota_manager = quota_manager
        self.usage_tracker = usage_tracker

    def calculate_invoice(self, user_id: str, year: int,
                          month: int) -> Dict:
        """Calculate invoice for a billing period."""
        plan = self.quota_manager.get_user_plan(user_id)
        plan_config = self.quota_manager.PLANS.get(plan, {})

        line_items = []
        total = Decimal('0')

        # Base plan fee (example)
        plan_fees = {
            'free': Decimal('0'),
            'starter': Decimal('29'),
            'pro': Decimal('99'),
            'enterprise': Decimal('299')
        }
        base_fee = plan_fees.get(plan, Decimal('0'))
        line_items.append({
            'description': f'{plan.title()} Plan',
            'amount': float(base_fee)
        })
        total += base_fee

        # Check for overages
        for quota_type, config in plan_config.items():
            if config.allow_overage and config.overage_rate > 0:
                usage = self.usage_tracker.get_monthly_usage(
                    f"{user_id}:{quota_type}",
                    'requests',  # Assuming requests
                    year, month
                )

                if usage > config.limit:
                    overage = usage - config.limit
                    overage_cost = Decimal(str(overage * config.overage_rate))
                    line_items.append({
                        'description': f'{quota_type} overage ({overage} units)',
                        'amount': float(overage_cost)
                    })
                    total += overage_cost

        return {
            'user_id': user_id,
            'period': f'{year}-{month:02d}',
            'plan': plan,
            'line_items': line_items,
            'total': float(total),
            'currency': 'USD'
        }

    def record_api_call(self, user_id: str, endpoint: str,
                        response_time_ms: int):
        """Record an API call for billing and analytics."""
        self.usage_tracker.record_usage(
            user_id,
            'api_calls',
            1,
            {
                'endpoint': endpoint,
                'response_time_ms': response_time_ms
            }
        )
```

## Best Practices

1. **Use atomic operations**: Ensure quota checks and increments are atomic

2. **Handle period boundaries**: Be careful with timezone handling

3. **Track detailed usage**: Store enough data for billing disputes

4. **Implement alerts**: Notify users approaching quota limits

5. **Allow grace period**: Consider soft limits before hard cutoff

6. **Cache quota status**: Reduce Redis calls for frequent checks

7. **Monitor quota usage patterns**: Identify abuse and optimization opportunities

8. **Provide self-service**: Let users view their usage dashboards

## Conclusion

Redis provides an excellent foundation for implementing API quotas. By tracking usage across billing periods, supporting overage charges, and integrating with billing systems, you can build a complete quota management solution. The combination of atomic operations and expiring keys makes Redis ideal for this use case, while the flexibility allows for complex tiered pricing models.
