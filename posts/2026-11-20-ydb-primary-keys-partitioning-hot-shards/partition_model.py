from bisect import bisect_right
from collections import Counter

orders = range(10_000)
buckets = [order_id % 4 for order_id in orders]
explicit_boundaries = [1, 2, 3]
uniform_uint32_boundaries = [2**30, 2**31, 3 * 2**30]

print('Explicit:', dict(Counter(bisect_right(explicit_boundaries, b) for b in buckets)))
print('Uniform Uint32:', dict(Counter(bisect_right(uniform_uint32_boundaries, b) for b in buckets)))
