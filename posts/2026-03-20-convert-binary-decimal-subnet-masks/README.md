# How to Convert Between Binary and Decimal Subnet Masks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnet Mask, Binary, Decimal, Subnetting, Networking

Description: Converting subnet masks between binary and dotted-decimal notation requires understanding that each octet's set bits map to power-of-two values, and the mask is always a string of contiguous...

## Binary to Decimal Conversion

Each octet is independent. For the third octet of 255.255.**240**.0:
```text
Binary:  11110000
Powers:  128 64 32 16 | 8 4 2 1
         128+ 64+ 32+ 16 + 0+ 0+ 0+ 0 = 240
```

## Decimal to Binary Conversion

For the octet value **224**:
```text
224 ≥ 128? Yes → 1, remainder 96
 96 ≥  64? Yes → 1, remainder 32
 32 ≥  32? Yes → 1, remainder  0
  0 ≥  16? No  → 0
  0 ≥   8? No  → 0
  0 ≥   4? No  → 0
  0 ≥   2? No  → 0
  0 ≥   1? No  → 0
= 11100000
```

## Python Conversions

```python
import socket, struct

def mask_to_binary(mask: str) -> str:
    """Convert dotted-decimal mask to binary string with dots."""
    return '.'.join(f'{int(o):08b}' for o in mask.split('.'))

def binary_to_mask(binary: str) -> str:
    """Convert binary string (no dots) to dotted-decimal mask."""
    # Ensure exactly 32 bits
    b = binary.replace('.', '')
    return '.'.join(str(int(b[i:i+8], 2)) for i in range(0, 32, 8))

def prefix_to_binary(prefix: int) -> str:
    """Convert CIDR prefix to binary mask string."""
    mask_int = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    packed = struct.pack("!I", mask_int)
    return '.'.join(f'{b:08b}' for b in packed)

# Examples

masks = ["255.255.255.0", "255.255.240.0", "255.255.255.252", "255.0.0.0"]
for mask in masks:
    binary = mask_to_binary(mask)
    print(f"{mask:18s} = {binary}")

print()
for prefix in [8, 20, 24, 26, 28, 30]:
    binary = prefix_to_binary(prefix)
    print(f"/{prefix:2d} = {binary}")
```

## Validation: Masks Must Be Contiguous

A valid subnet mask has all 1s before all 0s. Non-contiguous masks (like `11010000`) are invalid:

```python
def is_valid_mask(mask: str) -> bool:
    """Return True if the mask has contiguous leading 1s."""
    packed = socket.inet_aton(mask)
    mask_int = struct.unpack("!I", packed)[0]
    b = bin(mask_int)[2:].zfill(32)  # 32-bit binary string without '0b'
    # Find the first '0' and check no '1' follows it
    found_zero = False
    for bit in b:
        if bit == '0':
            found_zero = True
        elif found_zero:
            return False  # Found a 1 after a 0 - invalid
    return True

print(is_valid_mask("255.255.240.0"))   # True
print(is_valid_mask("255.255.245.0"))   # False (non-contiguous)
```

## Key Takeaways

- Subnet masks are always contiguous: a block of 1s followed by a block of 0s.
- Convert each octet independently using powers of 2 (128, 64, 32, 16, 8, 4, 2, 1).
- Memorize the critical partial-octet values: 128, 192, 224, 240, 248, 252, 254, 255.
- Non-contiguous masks are invalid; validate with the Python function above.
