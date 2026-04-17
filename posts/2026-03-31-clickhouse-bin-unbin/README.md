# How to Use bin() and unbin() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Encoding, Binary, String Function, Bit Manipulation

Description: Learn how bin() converts integers and strings to binary string representation and unbin() decodes them back in ClickHouse, useful for bit-level inspection and protocol debugging.

---

`bin(value)` converts an integer or string to its binary (base-2) string representation, with each byte represented as 8 bits. `unbin(binary_string)` is the inverse: it interprets groups of 8 characters as binary digits and returns the resulting byte string. These functions mirror `hex()` and `unhex()` but work in base-2, making them useful for visualizing bitfields, debugging protocol headers, and understanding low-level data encoding.

## Basic bin() on Integers

```sql
-- Simple integer to binary
SELECT
    bin(0)   AS zero,
    bin(1)   AS one,
    bin(2)   AS two,
    bin(7)   AS seven,
    bin(8)   AS eight,
    bin(255) AS ff;
```

```text
zero      one       two       seven     eight     ff
00000000  00000001  00000010  00000111  00001000  11111111
```

`bin()` pads output to the full byte width of the integer type.

```sql
-- Type width determines output length
SELECT
    bin(toUInt8(5))   AS u8_bin,   -- 8 chars
    bin(toUInt16(5))  AS u16_bin,  -- 16 chars
    bin(toUInt32(5))  AS u32_bin,  -- 32 chars
    bin(toUInt64(5))  AS u64_bin;  -- 64 chars
```

```text
u8_bin    u16_bin            u32_bin                            u64_bin
00000101  0000000000000101   00000000000000000000000000000101   0000000000000000000000000000000000000000000000000000000000000101
```

## bin() on Strings

When applied to a `String`, each byte becomes 8 binary digits.

```sql
-- Binary encoding of ASCII characters
SELECT
    bin('A')       AS bin_A,    -- ASCII 65
    bin('B')       AS bin_B,    -- ASCII 66
    bin(' ')       AS bin_space; -- ASCII 32
```

```text
bin_A     bin_B     bin_space
01000001  01000010  00100000
```

```sql
-- Multi-character string: each byte concatenated
SELECT
    bin('Hi') AS bin_hi;
```

```text
bin_hi
0100100001101001
```

## unbin() - Decoding Binary Strings

```sql
-- Decode binary string back to original
SELECT
    unbin('01000001') AS decoded_A,
    unbin('01001000' || '01101001') AS decoded_hi;
```

```text
decoded_A  decoded_hi
A          Hi
```

## Round-Trip Verification

```sql
SELECT
    original,
    bin(original)        AS encoded,
    unbin(bin(original)) AS roundtrip
FROM (SELECT 'OK' AS original);
```

```text
original  encoded            roundtrip
OK        0100111101001011   OK
```

## Inspecting Bit Flags

`bin()` is useful for visualizing bitmask values stored as integers.

```sql
-- Decode permission flags stored in a UInt8
-- Bit 0: read, Bit 1: write, Bit 2: execute, Bit 3: admin
SELECT
    user_id,
    permission_flags,
    bin(toUInt8(permission_flags)) AS binary_flags,
    bitAnd(permission_flags, 1)  AS can_read,
    bitAnd(permission_flags, 2)  AS can_write,
    bitAnd(permission_flags, 4)  AS can_execute,
    bitAnd(permission_flags, 8)  AS is_admin
FROM (
    SELECT number AS user_id, (number % 16) AS permission_flags
    FROM numbers(1, 8)
);
```

```text
user_id  permission_flags  binary_flags  can_read  can_write  can_execute  is_admin
1        1                 00000001      1         0          0            0
2        2                 00000010      0         2          0            0
3        3                 00000011      1         2          0            0
4        4                 00000100      0         0          4            0
5        5                 00000101      1         0          4            0
6        6                 00000110      0         2          4            0
7        7                 00000111      1         2          4            0
8        8                 00001000      0         0          0            8
```

## Checking Individual Bits with bin()

```sql
-- Show binary representation of network flags
SELECT
    flags,
    bin(toUInt8(flags))   AS binary,
    -- extract bit 7 (MSB) as SYN flag
    substring(bin(toUInt8(flags)), 1, 1) AS syn_bit,
    -- extract bit 6 as ACK flag
    substring(bin(toUInt8(flags)), 2, 1) AS ack_bit
FROM (
    SELECT number AS flags FROM numbers(0, 8)
);
```

## Using bin() for Debugging Protocol Headers

```sql
-- Decode a raw IP protocol byte to view its binary form
SELECT
    protocol_byte,
    bin(toUInt8(protocol_byte)) AS binary_repr,
    multiIf(
        protocol_byte = 6,   'TCP',
        protocol_byte = 17,  'UDP',
        protocol_byte = 1,   'ICMP',
        'Other'
    ) AS protocol_name
FROM (
    SELECT number AS protocol_byte FROM numbers(0, 20)
    WHERE number IN (1, 6, 17)
);
```

```text
protocol_byte  binary_repr  protocol_name
1              00000001     ICMP
6              00000110     TCP
17             00010001     UDP
```

## Comparing bin() and hex() Side by Side

```sql
SELECT
    value,
    bin(toUInt8(value))  AS binary_repr,
    hex(toUInt8(value))  AS hex_repr
FROM (
    SELECT number AS value FROM numbers(0, 16)
);
```

```text
value  binary_repr  hex_repr
0      00000000     00
1      00000001     01
2      00000010     02
...
15     00001111     0F
```

## unbin() for Decoding Stored Binary Strings

```sql
-- Decode binary-encoded payloads from a log table
SELECT
    message_id,
    binary_payload,
    unbin(binary_payload) AS decoded
FROM (
    SELECT
        number AS message_id,
        bin(concat('msg', toString(number))) AS binary_payload
    FROM numbers(1, 4)
);
```

## Summary

`bin(value)` converts integers and strings to zero-padded binary string representations, with each byte as exactly 8 characters. `unbin(binary_string)` decodes binary strings back to byte sequences. Use `bin()` to visualize bitfield values and permission flags, debug protocol headers, and understand byte-level encoding. For most data pipeline tasks, `hex()` is more compact and commonly used, but `bin()` is indispensable when you need to inspect individual bits directly.
