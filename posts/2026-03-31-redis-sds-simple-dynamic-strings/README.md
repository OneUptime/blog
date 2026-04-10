# How Redis SDS (Simple Dynamic Strings) Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Internal, String, Memory, Data Structure

Description: Learn how Redis implements its own string type called SDS to avoid C string limitations, reduce reallocations, and store binary-safe data.

---

Redis does not use C's native null-terminated strings. Instead, it uses a custom string implementation called SDS (Simple Dynamic Strings). SDS solves several problems with C strings and underpins nearly every Redis data structure.

## Problems with C Strings

C strings (`char *`) have three fundamental issues for a database:

1. `strlen()` is O(N) - must scan to the null byte
2. Not binary-safe - a null byte terminates the string early
3. Appending requires manual reallocation with risk of buffer overflow

SDS solves all three.

## SDS Structure

Each SDS value is a small header followed by the byte array:

```c
struct sdshdr {
    int    len;    // current length (O(1) access)
    int    free;   // unused allocated bytes (pre-allocated buffer)
    char   buf[];  // the actual bytes (null terminated for C compat)
};
```

Redis 3.2+ introduced five header sizes (sdshdr5, sdshdr8, sdshdr16, sdshdr32, sdshdr64) to minimize header overhead for small strings.

## Key Properties

**O(1) length**: `len` is stored in the header, so `STRLEN` is instant regardless of string size.

**Binary safe**: length is tracked explicitly, so strings can contain null bytes. This allows storing images, serialized binary data, or encrypted content.

**Pre-allocated buffer**: the `free` field tracks slack space. When you append to a string, Redis may pre-allocate extra space to avoid frequent `realloc` calls.

## Pre-allocation Strategy

When SDS needs to grow:

```text
If new_len < 1MB:  allocate 2x new_len (double)
If new_len >= 1MB: allocate new_len + 1MB (linear growth)
```

This reduces reallocations during repeated APPEND operations:

```bash
SET counter ""
APPEND counter "a"    # allocates 2 bytes (1 used + 1 pre-allocated)
APPEND counter "b"    # uses pre-allocated space, no realloc
APPEND counter "c"    # realloc needed (no free space left), allocates 6 bytes
```

## Lazy Shrinking

When you delete characters from an SDS string, the memory is not immediately freed. The `free` field increases instead. This avoids a `realloc` if the string grows again soon. Redis only physically shrinks an SDS when explicitly asked or during serialization.

## Binary-Safe Example

```bash
# Store a value with embedded null byte using redis-cli's -x flag
printf '\x00\x01\x02\x03' | redis-cli -x SET binkey
redis-cli STRLEN binkey
# (integer) 4  (not 0 as a C string would return)
```

## Memory Impact

SDS adds a small header (1 to 17 bytes depending on string length) to every string value. For tiny strings like short keys or integer strings, Redis uses the embedded string optimization: the header and content are stored in a single allocation.

```bash
SET tiny "hi"
OBJECT ENCODING tiny
# "embstr"   (embedded string: header + content in one block)

SET big "$(python3 -c "print('x'*45)")"
OBJECT ENCODING big
# "raw"      (separate SDS allocation)
```

The threshold between embstr and raw is 44 bytes.

## Summary

SDS gives Redis O(1) length access, binary safety, and efficient append via pre-allocation and lazy shrinking. It is the foundation for Redis keys, string values, list elements, and many other internal uses. Understanding SDS explains why `STRLEN` is fast, why Redis can store arbitrary binary data, and why the `embstr` encoding exists for short strings.
