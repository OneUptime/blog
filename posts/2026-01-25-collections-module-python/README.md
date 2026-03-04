# How to Use collections Module in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Collections, Data Structures, Standard Library, Performance

Description: Learn how to use Python's collections module for specialized data structures including Counter, defaultdict, namedtuple, deque, and OrderedDict to write cleaner, more efficient code.

---

Python's `collections` module provides specialized container datatypes that are alternatives to the built-in dict, list, set, and tuple. These containers are optimized for specific use cases and can make your code cleaner and more efficient.

## Counter

Counter is a dict subclass for counting hashable objects:

```python
from collections import Counter

# Count elements in a list
fruits = ["apple", "banana", "apple", "cherry", "banana", "apple"]
counter = Counter(fruits)
print(counter)  # Counter({'apple': 3, 'banana': 2, 'cherry': 1})

# Count characters in a string
letter_count = Counter("mississippi")
print(letter_count)  # Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})

# Most common elements
print(counter.most_common(2))  # [('apple', 3), ('banana', 2)]

# Access counts
print(counter["apple"])   # 3
print(counter["orange"])  # 0 (no KeyError!)

# Update counts
counter.update(["banana", "cherry", "cherry"])
print(counter)  # Counter({'apple': 3, 'cherry': 3, 'banana': 3})
```

### Counter Operations

```python
from collections import Counter

c1 = Counter(a=3, b=1)
c2 = Counter(a=1, b=2)

# Addition
print(c1 + c2)  # Counter({'a': 4, 'b': 3})

# Subtraction (keeps only positive counts)
print(c1 - c2)  # Counter({'a': 2})

# Intersection (min of counts)
print(c1 & c2)  # Counter({'a': 1, 'b': 1})

# Union (max of counts)
print(c1 | c2)  # Counter({'a': 3, 'b': 2})

# Get all elements (with repetition)
print(list(c1.elements()))  # ['a', 'a', 'a', 'b']

# Total count
print(c1.total())  # 4 (Python 3.10+)
print(sum(c1.values()))  # 4 (older Python)
```

### Practical Counter Examples

```python
from collections import Counter

# Word frequency in text
text = "the quick brown fox jumps over the lazy dog"
word_freq = Counter(text.split())
print(word_freq.most_common(3))

# Find most common error codes
error_codes = [404, 500, 404, 403, 404, 500, 200]
error_counter = Counter(error_codes)
print(f"Most common error: {error_counter.most_common(1)[0]}")

# Check if anagram
def is_anagram(word1, word2):
    return Counter(word1.lower()) == Counter(word2.lower())

print(is_anagram("listen", "silent"))  # True
```

## defaultdict

defaultdict provides default values for missing keys:

```python
from collections import defaultdict

# Default to empty list
groups = defaultdict(list)
groups["fruits"].append("apple")
groups["fruits"].append("banana")
groups["vegetables"].append("carrot")
print(dict(groups))  # {'fruits': ['apple', 'banana'], 'vegetables': ['carrot']}

# Default to 0
counts = defaultdict(int)
for word in "hello world".split():
    for char in word:
        counts[char] += 1
print(dict(counts))

# Default to set
unique_visitors = defaultdict(set)
unique_visitors["page1"].add("user1")
unique_visitors["page1"].add("user2")
unique_visitors["page1"].add("user1")  # Duplicate ignored
print(dict(unique_visitors))  # {'page1': {'user1', 'user2'}}
```

### Custom Default Factory

```python
from collections import defaultdict

# Default to custom value
defaults = defaultdict(lambda: "N/A")
defaults["name"] = "Alice"
print(defaults["name"])     # Alice
print(defaults["unknown"])  # N/A

# Default to nested defaultdict
def nested_dict():
    return defaultdict(nested_dict)

tree = nested_dict()
tree["level1"]["level2"]["level3"] = "value"
print(tree["level1"]["level2"]["level3"])  # value
```

### Practical defaultdict Examples

```python
from collections import defaultdict

# Group items by category
items = [
    ("fruit", "apple"),
    ("vegetable", "carrot"),
    ("fruit", "banana"),
    ("vegetable", "spinach"),
]

grouped = defaultdict(list)
for category, item in items:
    grouped[category].append(item)

print(dict(grouped))

# Build adjacency list for graph
edges = [(1, 2), (1, 3), (2, 3), (3, 4)]
graph = defaultdict(list)
for src, dst in edges:
    graph[src].append(dst)
    graph[dst].append(src)  # Undirected graph

print(dict(graph))  # {1: [2, 3], 2: [1, 3], 3: [1, 2, 4], 4: [3]}
```

## namedtuple

namedtuple creates tuple subclasses with named fields:

```python
from collections import namedtuple

# Define a named tuple
Point = namedtuple("Point", ["x", "y"])

# Create instances
p1 = Point(3, 4)
p2 = Point(x=1, y=2)

# Access by name or index
print(p1.x)    # 3
print(p1[0])   # 3
print(p1.y)    # 4

# Unpack like regular tuple
x, y = p1
print(f"Point at ({x}, {y})")

# Immutable
# p1.x = 10  # AttributeError!

# Convert to dict
print(p1._asdict())  # {'x': 3, 'y': 4}

# Create new instance with replaced values
p3 = p1._replace(x=10)
print(p3)  # Point(x=10, y=4)
```

### namedtuple with Defaults

```python
from collections import namedtuple

# With default values (Python 3.7+)
Config = namedtuple("Config", ["host", "port", "debug"], defaults=["localhost", 8080, False])

c1 = Config()  # Uses all defaults
c2 = Config("example.com")  # Uses defaults for port and debug
c3 = Config("example.com", 3000, True)

print(c1)  # Config(host='localhost', port=8080, debug=False)
print(c2)  # Config(host='example.com', port=8080, debug=False)
```

### Practical namedtuple Examples

```python
from collections import namedtuple

# Represent database rows
User = namedtuple("User", ["id", "name", "email"])

users = [
    User(1, "Alice", "alice@example.com"),
    User(2, "Bob", "bob@example.com"),
]

for user in users:
    print(f"{user.name}: {user.email}")

# Represent coordinates
Coordinate = namedtuple("Coordinate", ["latitude", "longitude"])

def distance(c1, c2):
    # Simplified distance calculation
    return ((c1.latitude - c2.latitude)**2 + (c1.longitude - c2.longitude)**2)**0.5

new_york = Coordinate(40.7128, -74.0060)
los_angeles = Coordinate(34.0522, -118.2437)
print(f"Distance: {distance(new_york, los_angeles):.2f}")
```

## deque

deque (double-ended queue) provides O(1) appends and pops from both ends:

```python
from collections import deque

# Create deque
d = deque([1, 2, 3])

# Add elements
d.append(4)      # Add to right
d.appendleft(0)  # Add to left
print(d)  # deque([0, 1, 2, 3, 4])

# Remove elements
d.pop()          # Remove from right
d.popleft()      # Remove from left
print(d)  # deque([1, 2, 3])

# Rotate
d.rotate(1)   # Rotate right
print(d)  # deque([3, 1, 2])

d.rotate(-1)  # Rotate left
print(d)  # deque([1, 2, 3])
```

### Fixed-Size deque

```python
from collections import deque

# Keep only last N items
recent = deque(maxlen=3)
for i in range(5):
    recent.append(i)
    print(list(recent))

# Output:
# [0]
# [0, 1]
# [0, 1, 2]
# [1, 2, 3]  # 0 dropped
# [2, 3, 4]  # 1 dropped
```

### Practical deque Examples

```python
from collections import deque

# Implement a sliding window
def sliding_window_max(nums, k):
    """Find max in each sliding window of size k."""
    result = []
    window = deque()

    for i, num in enumerate(nums):
        # Remove indices outside window
        while window and window[0] < i - k + 1:
            window.popleft()

        # Remove smaller elements
        while window and nums[window[-1]] < num:
            window.pop()

        window.append(i)

        if i >= k - 1:
            result.append(nums[window[0]])

    return result

# Implement BFS
def bfs(graph, start):
    """Breadth-first search using deque."""
    visited = set()
    queue = deque([start])

    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            print(f"Visiting: {node}")
            queue.extend(graph.get(node, []))

    return visited

# Recent history
class RecentHistory:
    def __init__(self, maxlen=10):
        self.history = deque(maxlen=maxlen)

    def add(self, item):
        self.history.append(item)

    def get_recent(self, n=5):
        return list(self.history)[-n:]
```

## OrderedDict

OrderedDict maintains insertion order (less important since Python 3.7 where regular dicts maintain order):

```python
from collections import OrderedDict

# Create ordered dict
od = OrderedDict()
od["first"] = 1
od["second"] = 2
od["third"] = 3

# Move to end
od.move_to_end("first")
print(list(od.keys()))  # ['second', 'third', 'first']

# Move to beginning
od.move_to_end("third", last=False)
print(list(od.keys()))  # ['third', 'second', 'first']

# Pop last item
key, value = od.popitem(last=True)
print(f"Popped: {key}={value}")

# Pop first item
key, value = od.popitem(last=False)
print(f"Popped: {key}={value}")
```

### LRU Cache with OrderedDict

```python
from collections import OrderedDict

class LRUCache:
    """Least Recently Used cache implementation."""

    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return None
        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value

        if len(self.cache) > self.capacity:
            # Remove least recently used (first item)
            self.cache.popitem(last=False)

# Usage
cache = LRUCache(3)
cache.put("a", 1)
cache.put("b", 2)
cache.put("c", 3)
cache.get("a")      # Access 'a'
cache.put("d", 4)   # Evicts 'b' (least recently used)
```

## ChainMap

ChainMap groups multiple dicts for single lookup:

```python
from collections import ChainMap

defaults = {"color": "red", "size": "medium"}
user_settings = {"color": "blue"}
cli_args = {"size": "large"}

# Search in order: cli_args -> user_settings -> defaults
config = ChainMap(cli_args, user_settings, defaults)

print(config["color"])  # blue (from user_settings)
print(config["size"])   # large (from cli_args)

# Modifications only affect first dict
config["new_key"] = "value"
print(cli_args)  # {'size': 'large', 'new_key': 'value'}
```

## Summary

| Container | Use Case |
|-----------|----------|
| `Counter` | Counting hashable objects |
| `defaultdict` | Dict with default values for missing keys |
| `namedtuple` | Immutable tuple with named fields |
| `deque` | Fast appends/pops from both ends |
| `OrderedDict` | Dict with move_to_end, popitem(last=) |
| `ChainMap` | Search through multiple dicts |

The collections module provides optimized data structures for common patterns. Using the right container can make your code cleaner and more efficient.
