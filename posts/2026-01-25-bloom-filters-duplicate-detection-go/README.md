# How to Use Bloom Filters for Duplicate Detection in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Bloom Filters, Data Structures, Duplicate Detection, Performance

Description: Learn how to implement and use Bloom filters in Go for memory-efficient duplicate detection, with practical examples for real-world applications like URL deduplication and spam filtering.

---

You need to check if an item exists in a set of millions of elements. A hash map would work, but it eats up memory fast. Enter Bloom filters - a probabilistic data structure that can tell you "definitely not in the set" or "probably in the set" using a fraction of the memory.

This guide covers Bloom filter fundamentals, Go implementations, and production patterns for duplicate detection.

## What is a Bloom Filter?

A Bloom filter is a space-efficient probabilistic data structure that tests whether an element is a member of a set. It can produce false positives (saying something is in the set when it is not) but never false negatives (if it says something is not in the set, it definitely is not).

| Operation | Hash Map | Bloom Filter |
|-----------|----------|--------------|
| **Memory** | O(n) | O(1) fixed |
| **False positives** | No | Yes |
| **False negatives** | No | No |
| **Deletions** | Yes | No (usually) |

The tradeoff is simple: you save a ton of memory in exchange for accepting some false positives. For many applications like web crawlers, spam filters, and caching layers, this tradeoff makes sense.

## How Bloom Filters Work

A Bloom filter uses a bit array and multiple hash functions. When you add an element:

1. Hash the element with k different hash functions
2. Set the bits at the resulting positions to 1

When you check for an element:

1. Hash the element with the same k hash functions
2. If all bits at those positions are 1, the element is "probably" present
3. If any bit is 0, the element is definitely not present

```
Add "hello":
  hash1("hello") = 3  ->  [0,0,0,1,0,0,0,0,0,0]
  hash2("hello") = 7  ->  [0,0,0,1,0,0,0,1,0,0]

Add "world":
  hash1("world") = 1  ->  [0,1,0,1,0,0,0,1,0,0]
  hash2("world") = 3  ->  [0,1,0,1,0,0,0,1,0,0]  (already set)

Check "test":
  hash1("test") = 5   ->  bit at 5 is 0 -> DEFINITELY NOT PRESENT
```

## Basic Bloom Filter in Go

Let us build a Bloom filter from scratch to understand the internals. This implementation uses two hash functions combined with a technique called double hashing to simulate k hash functions.

```go
package bloom

import (
    "hash"
    "hash/fnv"
    "math"
)

// BloomFilter is a basic Bloom filter implementation
type BloomFilter struct {
    bits    []bool      // bit array
    size    uint        // size of bit array
    hashNum uint        // number of hash functions
}

// New creates a Bloom filter optimized for expected items and false positive rate
func New(expectedItems uint, falsePositiveRate float64) *BloomFilter {
    // Calculate optimal size: m = -n*ln(p) / (ln(2)^2)
    m := uint(math.Ceil(-float64(expectedItems) * math.Log(falsePositiveRate) /
        (math.Ln2 * math.Ln2)))

    // Calculate optimal hash functions: k = (m/n) * ln(2)
    k := uint(math.Ceil(float64(m) / float64(expectedItems) * math.Ln2))

    return &BloomFilter{
        bits:    make([]bool, m),
        size:    m,
        hashNum: k,
    }
}

// hashValues returns k hash values for the given data
// Uses double hashing: h(i) = h1 + i*h2
func (bf *BloomFilter) hashValues(data []byte) []uint {
    h1 := fnv.New64()
    h2 := fnv.New64a()

    h1.Write(data)
    h2.Write(data)

    hash1 := h1.Sum64()
    hash2 := h2.Sum64()

    hashes := make([]uint, bf.hashNum)
    for i := uint(0); i < bf.hashNum; i++ {
        // Combine hashes to simulate k different hash functions
        hashes[i] = uint((hash1 + uint64(i)*hash2) % uint64(bf.size))
    }
    return hashes
}

// Add inserts an element into the Bloom filter
func (bf *BloomFilter) Add(data []byte) {
    for _, h := range bf.hashValues(data) {
        bf.bits[h] = true
    }
}

// AddString is a convenience method for strings
func (bf *BloomFilter) AddString(s string) {
    bf.Add([]byte(s))
}

// Contains checks if an element might be in the set
// Returns false if definitely not present
// Returns true if probably present (may be false positive)
func (bf *BloomFilter) Contains(data []byte) bool {
    for _, h := range bf.hashValues(data) {
        if !bf.bits[h] {
            return false  // Definitely not present
        }
    }
    return true  // Probably present
}

// ContainsString is a convenience method for strings
func (bf *BloomFilter) ContainsString(s string) bool {
    return bf.Contains([]byte(s))
}
```

## Using the Bloom Filter

Here is a simple example that demonstrates the core behavior of Bloom filters.

```go
package main

import (
    "fmt"
    "bloom"
)

func main() {
    // Create filter expecting 1000 items with 1% false positive rate
    bf := bloom.New(1000, 0.01)

    // Add some URLs we have seen
    urls := []string{
        "https://example.com/page1",
        "https://example.com/page2",
        "https://example.com/page3",
    }

    for _, url := range urls {
        bf.AddString(url)
    }

    // Check for duplicates
    testURLs := []string{
        "https://example.com/page1",  // Added - will return true
        "https://example.com/page4",  // Not added - will return false
        "https://example.com/page2",  // Added - will return true
    }

    for _, url := range testURLs {
        if bf.ContainsString(url) {
            fmt.Printf("SKIP (probably seen): %s\n", url)
        } else {
            fmt.Printf("NEW (definitely new): %s\n", url)
        }
    }
}
```

## Production-Ready Implementation

For production use, I recommend the popular `github.com/bits-and-blooms/bloom/v3` package. It handles the math correctly, is thread-safe, and supports serialization.

```go
package main

import (
    "fmt"
    "github.com/bits-and-blooms/bloom/v3"
)

func main() {
    // Create filter: 1 million items, 0.1% false positive rate
    filter := bloom.NewWithEstimates(1_000_000, 0.001)

    // Add items
    filter.AddString("user:12345")
    filter.AddString("user:67890")

    // Check membership
    fmt.Println(filter.TestString("user:12345"))  // true
    fmt.Println(filter.TestString("user:99999"))  // false (probably)

    // Thread-safe operations using TestOrAdd
    // Returns true if item was already present
    wasPresent := filter.TestOrAddString("user:12345")
    fmt.Println("Was already present:", wasPresent)  // true

    wasPresent = filter.TestOrAddString("user:11111")
    fmt.Println("Was already present:", wasPresent)  // false
}
```

## URL Deduplication for Web Crawlers

A common use case is deduplicating URLs in web crawlers. Without a Bloom filter, storing millions of URLs would consume gigabytes of memory.

```go
package crawler

import (
    "net/url"
    "strings"
    "sync"

    "github.com/bits-and-blooms/bloom/v3"
)

// URLDeduplicator tracks seen URLs using a Bloom filter
type URLDeduplicator struct {
    filter *bloom.BloomFilter
    mu     sync.RWMutex
}

// NewURLDeduplicator creates a deduplicator for the expected number of URLs
func NewURLDeduplicator(expectedURLs uint, falsePositiveRate float64) *URLDeduplicator {
    return &URLDeduplicator{
        filter: bloom.NewWithEstimates(expectedURLs, falsePositiveRate),
    }
}

// normalizeURL cleans up URL for consistent hashing
func normalizeURL(rawURL string) string {
    parsed, err := url.Parse(rawURL)
    if err != nil {
        return rawURL
    }

    // Remove fragment
    parsed.Fragment = ""

    // Lowercase host
    parsed.Host = strings.ToLower(parsed.Host)

    // Remove default ports
    if parsed.Port() == "80" && parsed.Scheme == "http" {
        parsed.Host = parsed.Hostname()
    }
    if parsed.Port() == "443" && parsed.Scheme == "https" {
        parsed.Host = parsed.Hostname()
    }

    // Remove trailing slash from path
    parsed.Path = strings.TrimSuffix(parsed.Path, "/")

    return parsed.String()
}

// IsNew returns true if the URL has not been seen before
// If new, it also marks the URL as seen
func (d *URLDeduplicator) IsNew(rawURL string) bool {
    normalized := normalizeURL(rawURL)

    d.mu.Lock()
    defer d.mu.Unlock()

    // TestOrAdd returns true if already present
    alreadySeen := d.filter.TestOrAddString(normalized)
    return !alreadySeen
}

// MightHaveSeen checks without adding (useful for read-only checks)
func (d *URLDeduplicator) MightHaveSeen(rawURL string) bool {
    normalized := normalizeURL(rawURL)

    d.mu.RLock()
    defer d.mu.RUnlock()

    return d.filter.TestString(normalized)
}
```

Using the deduplicator in a crawler:

```go
func main() {
    // Expect 10 million URLs with 0.01% false positive rate
    dedup := crawler.NewURLDeduplicator(10_000_000, 0.0001)

    urlsToCrawl := []string{
        "https://example.com/page1",
        "https://example.com/page2",
        "https://EXAMPLE.COM/page1",  // Same as first, normalized
        "https://example.com/page1/", // Same as first, trailing slash
        "https://example.com/page3",
    }

    for _, u := range urlsToCrawl {
        if dedup.IsNew(u) {
            fmt.Printf("Crawling: %s\n", u)
            // crawl(u)
        } else {
            fmt.Printf("Skipping duplicate: %s\n", u)
        }
    }
}
```

## Saving and Loading Bloom Filters

For long-running applications, you will want to persist the Bloom filter to disk.

```go
package main

import (
    "bytes"
    "io"
    "os"

    "github.com/bits-and-blooms/bloom/v3"
)

// SaveFilter writes the Bloom filter to a file
func SaveFilter(filter *bloom.BloomFilter, filename string) error {
    file, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer file.Close()

    _, err = filter.WriteTo(file)
    return err
}

// LoadFilter reads a Bloom filter from a file
func LoadFilter(filename string) (*bloom.BloomFilter, error) {
    file, err := os.Open(filename)
    if err != nil {
        return nil, err
    }
    defer file.Close()

    filter := &bloom.BloomFilter{}
    _, err = filter.ReadFrom(file)
    if err != nil {
        return nil, err
    }

    return filter, nil
}

// Example usage
func main() {
    // Create and populate filter
    filter := bloom.NewWithEstimates(1_000_000, 0.001)
    filter.AddString("item1")
    filter.AddString("item2")

    // Save to disk
    if err := SaveFilter(filter, "bloom.dat"); err != nil {
        panic(err)
    }

    // Load from disk
    loaded, err := LoadFilter("bloom.dat")
    if err != nil {
        panic(err)
    }

    // Verify
    fmt.Println(loaded.TestString("item1"))  // true
    fmt.Println(loaded.TestString("item3"))  // false
}
```

## Choosing the Right Parameters

The two parameters you need to decide are:

1. **Expected number of items (n)**: How many items will you add?
2. **False positive rate (p)**: What percentage of false positives is acceptable?

The library calculates optimal bit array size and hash functions from these.

```go
// Memory usage examples for 1 million items:
// p = 0.01 (1%)   -> ~1.2 MB
// p = 0.001 (0.1%) -> ~1.8 MB
// p = 0.0001 (0.01%) -> ~2.4 MB

// Quick calculation: bits per item = -1.44 * log2(p)
// For p = 0.01: -1.44 * log2(0.01) = ~9.6 bits per item
```

## Common Pitfalls

**1. Underestimating item count**

If you add more items than expected, the false positive rate increases dramatically. Always overestimate.

```go
// Bad: exactly what you expect
filter := bloom.NewWithEstimates(1_000_000, 0.01)

// Better: add 20% buffer
filter := bloom.NewWithEstimates(1_200_000, 0.01)
```

**2. Not normalizing input**

Inconsistent input creates duplicates. Always normalize before adding or checking.

```go
// These are "different" to the Bloom filter
filter.AddString("Hello")
filter.TestString("hello")  // might return false

// Normalize first
filter.AddString(strings.ToLower("Hello"))
filter.TestString(strings.ToLower("hello"))  // works correctly
```

**3. Using Bloom filters when you need exact answers**

Bloom filters are for "probably" answers. If you need certainty, use a hash map or database.

```go
// Use Bloom filter as first pass, then verify
if filter.TestString(userID) {
    // Probably seen - verify with database
    exists := db.UserExists(userID)
    if exists {
        return "User already registered"
    }
}
// Definitely new - safe to proceed
filter.AddString(userID)
```

**4. Forgetting thread safety**

The `bits-and-blooms` package methods are not thread-safe by default. Wrap with mutex for concurrent access.

## When to Use Bloom Filters

Good use cases:
- Web crawler URL deduplication
- Spam email filtering (first pass)
- Cache lookups (avoid expensive DB queries for non-existent keys)
- Network packet filtering
- Database query optimization (skip shards that definitely do not have the data)

Bad use cases:
- When you need to delete items (use Counting Bloom Filter instead)
- When false positives are unacceptable
- When memory is not a constraint (just use a hash map)

## Summary

Bloom filters trade certainty for memory efficiency. They are perfect when you can tolerate some false positives and need to check membership across millions of items. The key points:

- False positives are possible, false negatives are not
- Choose parameters based on expected items and acceptable false positive rate
- Always normalize input consistently
- Use `bits-and-blooms/bloom/v3` for production Go code
- Combine with a secondary check when you need certainty

For duplicate detection specifically, Bloom filters let you process massive datasets with minimal memory while catching the vast majority of duplicates on the first pass.
