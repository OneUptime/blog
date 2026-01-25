# How to Filter Duplicates with Redis Bloom Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, Deduplication, Probabilistic Data Structures, Caching, Performance

Description: Learn how to use Redis Bloom Filters to efficiently detect duplicate data at scale. This guide covers Bloom Filter theory, practical implementation with RedisBloom, and real-world use cases like email deduplication and URL tracking.

---

> Bloom Filters are probabilistic data structures that can tell you if an element is definitely not in a set or possibly in a set. When you need to check billions of items for duplicates without exhausting memory, Bloom Filters are your best friend.

Traditional deduplication approaches like hash sets work well for small datasets, but they quickly become impractical when dealing with millions or billions of records. A Bloom Filter uses a fraction of the memory while providing fast lookups with a controllable false positive rate.

---

## What is a Bloom Filter?

A Bloom Filter is a space-efficient probabilistic data structure that tests whether an element is a member of a set. It can produce false positives (saying an element exists when it does not) but never false negatives (if it says an element does not exist, it definitely does not).

```
+--------------------------------------------------+
|              Bloom Filter (bit array)            |
+--------------------------------------------------+
| 0 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 1 |
+--------------------------------------------------+
      ^           ^           ^
      |           |           |
   hash1(x)    hash2(x)    hash3(x)
```

When you add an element, multiple hash functions map it to positions in a bit array, setting those bits to 1. When checking membership, the filter checks if all corresponding bits are set. If any bit is 0, the element is definitely not in the set.

---

## Setting Up RedisBloom

RedisBloom is a Redis module that provides Bloom Filter functionality. You can run it using Docker:

```bash
# Run Redis with RedisBloom module
# The redis/redis-stack image includes RedisBloom and other useful modules
docker run -d --name redis-bloom \
  -p 6379:6379 \
  redis/redis-stack:latest

# Verify the module is loaded
redis-cli MODULE LIST
```

For production environments, you can compile the module from source or use Redis Enterprise which includes RedisBloom.

---

## Basic Bloom Filter Operations

Let's start with fundamental operations using the Redis CLI:

```bash
# Create a Bloom Filter with custom error rate and capacity
# BF.RESERVE creates a filter with 0.01 (1%) false positive rate
# and expected capacity of 1000000 items
BF.RESERVE user_emails 0.01 1000000

# Add a single item to the filter
# Returns 1 if newly added, 0 if it might already exist
BF.ADD user_emails "alice@example.com"

# Add multiple items at once for better performance
BF.MADD user_emails "bob@example.com" "charlie@example.com" "dave@example.com"

# Check if an item exists in the filter
# Returns 1 if possibly exists, 0 if definitely does not exist
BF.EXISTS user_emails "alice@example.com"  # Returns 1

# Check multiple items at once
BF.MEXISTS user_emails "alice@example.com" "unknown@example.com"

# Get information about the filter
BF.INFO user_emails
```

---

## Python Implementation for Email Deduplication

Here is a practical example of deduplicating incoming emails using Python:

```python
import redis
from typing import List, Tuple

class EmailDeduplicator:
    """
    Handles email deduplication using Redis Bloom Filters.
    Useful for preventing duplicate processing of incoming messages.
    """

    def __init__(self, redis_host: str = 'localhost', redis_port: int = 6379):
        # Connect to Redis with connection pooling for better performance
        self.redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True,
            connection_pool=redis.ConnectionPool(
                host=redis_host,
                port=redis_port,
                max_connections=10
            )
        )
        self.filter_name = 'email_dedup_filter'
        self._initialize_filter()

    def _initialize_filter(self):
        """
        Create the Bloom Filter if it does not exist.
        We use a low error rate for email deduplication since
        false positives mean missing legitimate emails.
        """
        try:
            # Check if filter already exists
            self.redis_client.execute_command('BF.INFO', self.filter_name)
        except redis.ResponseError:
            # Filter does not exist, create it
            # 0.001 = 0.1% false positive rate
            # 10000000 = expected 10 million unique emails
            self.redis_client.execute_command(
                'BF.RESERVE',
                self.filter_name,
                '0.001',  # Error rate
                '10000000',  # Capacity
                'EXPANSION', '2'  # Auto-expand if capacity is reached
            )

    def generate_email_fingerprint(self, email_data: dict) -> str:
        """
        Create a unique fingerprint for an email.
        Combines multiple fields to reduce collision risk.
        """
        import hashlib

        # Combine sender, subject, and timestamp for uniqueness
        fingerprint_parts = [
            email_data.get('from', ''),
            email_data.get('subject', ''),
            email_data.get('date', ''),
            email_data.get('message_id', '')
        ]

        combined = '|'.join(fingerprint_parts)
        return hashlib.sha256(combined.encode()).hexdigest()

    def is_duplicate(self, email_data: dict) -> bool:
        """
        Check if an email is a duplicate.
        Returns True if the email has possibly been seen before.
        """
        fingerprint = self.generate_email_fingerprint(email_data)

        # BF.EXISTS returns 1 if item might exist, 0 if definitely not
        result = self.redis_client.execute_command(
            'BF.EXISTS',
            self.filter_name,
            fingerprint
        )
        return result == 1

    def mark_as_processed(self, email_data: dict) -> bool:
        """
        Mark an email as processed by adding it to the filter.
        Returns True if this is a new email, False if it was already in the filter.
        """
        fingerprint = self.generate_email_fingerprint(email_data)

        # BF.ADD returns 1 if newly added, 0 if possibly already existed
        result = self.redis_client.execute_command(
            'BF.ADD',
            self.filter_name,
            fingerprint
        )
        return result == 1

    def process_email_batch(self, emails: List[dict]) -> Tuple[List[dict], List[dict]]:
        """
        Process a batch of emails, separating new from duplicate.
        More efficient than processing one at a time.
        """
        new_emails = []
        duplicates = []

        # Generate fingerprints for all emails
        fingerprints = [self.generate_email_fingerprint(e) for e in emails]

        # Check all fingerprints in one command
        existence_results = self.redis_client.execute_command(
            'BF.MEXISTS',
            self.filter_name,
            *fingerprints
        )

        # Separate new emails from duplicates
        for email, fingerprint, exists in zip(emails, fingerprints, existence_results):
            if exists:
                duplicates.append(email)
            else:
                new_emails.append(email)
                # Add new emails to the filter
                self.redis_client.execute_command(
                    'BF.ADD',
                    self.filter_name,
                    fingerprint
                )

        return new_emails, duplicates


# Usage example
if __name__ == '__main__':
    deduplicator = EmailDeduplicator()

    # Simulate incoming emails
    incoming_emails = [
        {
            'from': 'alice@example.com',
            'subject': 'Meeting tomorrow',
            'date': '2026-01-25T10:00:00Z',
            'message_id': 'msg-001'
        },
        {
            'from': 'bob@example.com',
            'subject': 'Project update',
            'date': '2026-01-25T11:00:00Z',
            'message_id': 'msg-002'
        },
        {
            'from': 'alice@example.com',
            'subject': 'Meeting tomorrow',
            'date': '2026-01-25T10:00:00Z',
            'message_id': 'msg-001'  # Duplicate
        }
    ]

    new_emails, duplicates = deduplicator.process_email_batch(incoming_emails)
    print(f"New emails: {len(new_emails)}")
    print(f"Duplicates filtered: {len(duplicates)}")
```

---

## URL Deduplication for Web Crawlers

Another common use case is tracking visited URLs in web crawlers:

```python
import redis
from urllib.parse import urlparse, urljoin
import hashlib

class CrawlerURLTracker:
    """
    Tracks visited URLs for a web crawler using Bloom Filters.
    Prevents re-crawling the same pages.
    """

    def __init__(self, redis_client: redis.Redis, crawler_id: str):
        self.redis = redis_client
        self.filter_name = f'crawler:{crawler_id}:visited_urls'

        # Create filter with capacity for 100 million URLs
        try:
            self.redis.execute_command('BF.INFO', self.filter_name)
        except redis.ResponseError:
            self.redis.execute_command(
                'BF.RESERVE',
                self.filter_name,
                '0.0001',  # Very low false positive rate
                '100000000'
            )

    def normalize_url(self, url: str) -> str:
        """
        Normalize URL to avoid treating slight variations as different.
        """
        parsed = urlparse(url.lower())

        # Remove trailing slashes and default ports
        path = parsed.path.rstrip('/')
        if not path:
            path = '/'

        # Reconstruct normalized URL
        normalized = f"{parsed.scheme}://{parsed.netloc}{path}"
        if parsed.query:
            # Sort query parameters for consistency
            params = sorted(parsed.query.split('&'))
            normalized += '?' + '&'.join(params)

        return normalized

    def should_crawl(self, url: str) -> bool:
        """
        Check if a URL should be crawled.
        Returns False if already visited or invalid.
        """
        normalized = self.normalize_url(url)
        url_hash = hashlib.sha256(normalized.encode()).hexdigest()

        # Check if URL exists in filter
        exists = self.redis.execute_command(
            'BF.EXISTS',
            self.filter_name,
            url_hash
        )

        return exists == 0  # Should crawl if not in filter

    def mark_visited(self, url: str) -> None:
        """
        Mark a URL as visited.
        """
        normalized = self.normalize_url(url)
        url_hash = hashlib.sha256(normalized.encode()).hexdigest()

        self.redis.execute_command(
            'BF.ADD',
            self.filter_name,
            url_hash
        )

    def filter_new_urls(self, urls: list) -> list:
        """
        Filter a list of URLs, returning only unvisited ones.
        """
        if not urls:
            return []

        # Normalize and hash all URLs
        url_hashes = [
            hashlib.sha256(self.normalize_url(url).encode()).hexdigest()
            for url in urls
        ]

        # Check all at once
        results = self.redis.execute_command(
            'BF.MEXISTS',
            self.filter_name,
            *url_hashes
        )

        # Return URLs that are not in the filter
        return [url for url, exists in zip(urls, results) if not exists]
```

---

## Choosing the Right Error Rate and Capacity

The error rate and capacity directly impact memory usage:

| Capacity | Error Rate | Approx Memory |
|----------|------------|---------------|
| 1M items | 1% | 1.14 MB |
| 1M items | 0.1% | 1.71 MB |
| 10M items | 1% | 11.4 MB |
| 10M items | 0.1% | 17.1 MB |
| 100M items | 1% | 114 MB |
| 100M items | 0.1% | 171 MB |

For comparison, storing 100 million 32-byte hashes in a Redis Set would require about 4.7 GB of memory. Bloom Filters can reduce this by 25-40x.

---

## Best Practices

1. **Choose error rate based on cost of false positives**: If missing an item is expensive (like missing a legitimate email), use a lower error rate like 0.001.

2. **Overestimate capacity**: It is better to reserve more capacity than needed. Expanding the filter later can be complex.

3. **Use fingerprints, not raw data**: Hash your input data to ensure uniform distribution across the filter.

4. **Consider time-based filters**: For data that expires, use separate filters per time window and delete old ones.

5. **Monitor filter saturation**: Track the number of items added and recreate the filter before it becomes too full.

Bloom Filters in Redis provide an excellent solution for high-volume duplicate detection. They trade a small, controllable chance of false positives for massive memory savings and consistent O(k) lookup time, where k is the number of hash functions.
